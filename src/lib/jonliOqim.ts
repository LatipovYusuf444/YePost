// Jonli hodisalar oqimi (SSE) — backend: GET /api/v1/events (staff: /api/v1/platform/events), docs/designs/realtime-events.md.
// EventSource Authorization header'ini yubora olmaydi, shuning uchun fetch() + ReadableStream bilan o'qiladi.
// Bu modul toza (import yo'q): tarmoq, token va vaqt tashqaridan beriladi — testlarda soxta fetch/taymer bilan sinaladi.
//
// Qoidalar (backend kelishuvi):
// - `open` / `resync` — ekrandagi hamma narsani qayta olish (oqim o'tmish hodisalarni qayta yubormaydi).
// - `ping` har 25 s; istalgan hodisa 60 s taymerni yangilaydi; 60 s jimlik — uzib qayta ulanish.
// - `closed {reason}`: limit — shu tabda to'xtash (sekin polling); expired — token yangilab darhol qayta ulanish;
//   shutdown va notanish sabab — backoff bilan qayta ulanish.
// - 401 — token yangilab bir marta qayta urinish; 403 — to'xtash; 503/tarmoq — 1 s dan ikki baravar, ko'pi 30 s, + jitter.
//   Backoff faqat oqim kamida 30 s ishlagandan keyin nolga qaytadi.
// - `id:` maydoni e'tiborsiz; notanish hodisa nomlari tinglovchilarga uzatiladi, ular o'zlari filtrlaydi.

export type OqimHolati =
  /** Ishga tushmagan yoki to'xtatilgan (token yo'q / yangilab bo'lmadi). */
  | "toxtagan"
  | "ulanmoqda"
  /** `open` keldi — hodisalar jonli. */
  | "ulangan"
  /** Xatodan keyin qayta ulanishni kutyapti (backoff). */
  | "kutmoqda"
  /** Backend shu tabni yopdi (juda ko'p tab) — sekin polling. */
  | "limit"
  /** 403 — foydalanuvchida workspace yo'q yoki u staff emas. */
  | "taqiqlangan";

export type OqimHodisasi = { nom: string; data: Record<string, unknown> };

export type OqimVaqti = {
  hozir: () => number;
  kechiktir: (fn: () => void, ms: number) => unknown;
  bekorQil: (id: unknown) => void;
  tasodif: () => number;
};

export type JonliOqimSozlamasi = {
  url: string;
  /** Joriy access token (yo'q bo'lsa oqim ochilmaydi). */
  tokenOl: () => string | null;
  /** Tokenni yangilaydi; yangi token yoki yangilab bo'lmasa null. */
  tokenYangila: () => Promise<string | null>;
  hodisa: (hodisa: OqimHodisasi) => void;
  /** `open` va `resync`: hamma narsani qayta olish. */
  hammasiniYangila: () => void;
  holat: (holat: OqimHolati) => void;
  fetchFn?: typeof fetch;
  vaqt?: OqimVaqti;
};

export const JIMLIK_CHEGARASI_MS = 60_000;
export const BARQAROR_ULANISH_MS = 30_000;
export const MAKS_KUTISH_MS = 30_000;

/** n-urinishdagi kutish: 1 s, 2 s, 4 s ... 30 s gacha + 0–1 s tasodifiy jitter. */
export function kutishVaqti(urinish: number, tasodif: number) {
  const asos = Math.min(MAKS_KUTISH_MS, 1000 * 2 ** Math.max(0, urinish));
  return asos + Math.floor(tasodif * 1000);
}

/** SSE matnini bo'laklab qabul qiladi va to'liq hodisalarni qaytaradi (bo'lak qator o'rtasida uzilishi mumkin). */
export class SseAjratgich {
  private qoldiq = "";
  private nom = "";
  private malumot: string[] = [];

  qosh(bolak: string): Array<{ nom: string; data: string }> {
    this.qoldiq += bolak;
    const natija: Array<{ nom: string; data: string }> = [];
    let indeks: number;
    while ((indeks = this.qatorOxiri()) >= 0) {
      const qator = this.qoldiq.slice(0, indeks);
      const uzunlik = this.qoldiq.startsWith("\r\n", indeks) ? 2 : 1;
      this.qoldiq = this.qoldiq.slice(indeks + uzunlik);
      if (qator === "") {
        if (this.malumot.length || this.nom) natija.push({ nom: this.nom || "message", data: this.malumot.join("\n") });
        this.nom = "";
        this.malumot = [];
        continue;
      }
      if (qator.startsWith(":")) continue; // izoh (keep-alive)
      const ikkiNuqta = qator.indexOf(":");
      const maydon = ikkiNuqta < 0 ? qator : qator.slice(0, ikkiNuqta);
      let qiymat = ikkiNuqta < 0 ? "" : qator.slice(ikkiNuqta + 1);
      if (qiymat.startsWith(" ")) qiymat = qiymat.slice(1);
      if (maydon === "event") this.nom = qiymat;
      else if (maydon === "data") this.malumot.push(qiymat);
      // id: va retry: — kelishuv bo'yicha e'tiborsiz.
    }
    return natija;
  }

  private qatorOxiri() {
    const r = this.qoldiq.indexOf("\r");
    const n = this.qoldiq.indexOf("\n");
    if (r < 0) return n;
    if (n < 0) return r === this.qoldiq.length - 1 ? -1 : r; // "\r" oxirida — "\n" kelishi mumkin, kutamiz
    return Math.min(r, n);
  }
}

function jsonniOqish(matn: string): Record<string, unknown> {
  if (!matn) return {};
  try {
    const qiymat = JSON.parse(matn) as unknown;
    return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const standartVaqt: OqimVaqti = {
  hozir: () => Date.now(),
  kechiktir: (fn, ms) => setTimeout(fn, ms),
  bekorQil: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  tasodif: () => Math.random(),
};

export class JonliOqim {
  private readonly s: JonliOqimSozlamasi;
  private readonly vaqt: OqimVaqti;
  private faol = false;
  /** Har ulanish urinishi o'z raqamini oladi: eski urinishning kechikkan natijalari e'tiborsiz qoladi. */
  private avlod = 0;
  private boshqaruv: AbortController | null = null;
  private urinish = 0;
  private qaytaTaymer: unknown = null;
  private jimlikTaymer: unknown = null;
  private joriyHolat: OqimHolati = "toxtagan";
  /** Joriy oqim tanasi qachon kela boshlagan (backoff'ni nolga qaytarish uchun). */
  private oqimBoshlangan: number | null = null;

  constructor(sozlama: JonliOqimSozlamasi) {
    this.s = sozlama;
    this.vaqt = sozlama.vaqt ?? standartVaqt;
  }

  get holat() {
    return this.joriyHolat;
  }

  boshla() {
    if (this.faol) return;
    this.faol = true;
    this.urinish = 0;
    void this.ulan(++this.avlod, false);
  }

  toxtat() {
    this.faol = false;
    this.avlod++;
    this.tozala();
    this.holatniOrnat("toxtagan");
  }

  /** Internet qaytdi / token paydo bo'ldi: kutayotgan bo'lsa darhol ulanadi (backoff nolga). */
  hozirUlan() {
    // limit (shu tab yopilgan) va 403 — yakuniy: internet qaytishi ularni qayta ochmaydi (toxtat() + boshla() ochadi).
    if (this.joriyHolat === "limit" || this.joriyHolat === "taqiqlangan") return;
    if (!this.faol) {
      this.boshla();
      return;
    }
    if (this.joriyHolat === "ulangan" || this.joriyHolat === "ulanmoqda") return;
    this.tozala();
    this.urinish = 0;
    void this.ulan(++this.avlod, false);
  }

  private holatniOrnat(holat: OqimHolati) {
    if (this.joriyHolat === holat) return;
    this.joriyHolat = holat;
    this.s.holat(holat);
  }

  private tozala() {
    if (this.qaytaTaymer !== null) this.vaqt.bekorQil(this.qaytaTaymer);
    if (this.jimlikTaymer !== null) this.vaqt.bekorQil(this.jimlikTaymer);
    this.qaytaTaymer = null;
    this.jimlikTaymer = null;
    this.boshqaruv?.abort();
    this.boshqaruv = null;
  }

  private rejalashtir(avlod: number) {
    if (!this.faol || avlod !== this.avlod) return;
    this.tozala();
    const kutish = kutishVaqti(this.urinish, this.vaqt.tasodif());
    this.urinish++;
    this.holatniOrnat("kutmoqda");
    const yangiAvlod = ++this.avlod;
    this.qaytaTaymer = this.vaqt.kechiktir(() => {
      this.qaytaTaymer = null;
      void this.ulan(yangiAvlod, false);
    }, kutish);
  }

  /** To'xtab, oqimni yopish (limit / 403 / token yo'q). */
  private yakunla(avlod: number, holat: OqimHolati) {
    if (avlod !== this.avlod) return;
    this.faol = false;
    this.avlod++;
    this.tozala();
    this.holatniOrnat(holat);
  }

  /** Joriy oqim kamida 30 s ishladimi (faqat shunda backoff nolga qaytadi). */
  private barqarorMi() {
    return this.oqimBoshlangan !== null && this.vaqt.hozir() - this.oqimBoshlangan >= BARQAROR_ULANISH_MS;
  }

  private jimlikNazorati(avlod: number) {
    if (this.jimlikTaymer !== null) this.vaqt.bekorQil(this.jimlikTaymer);
    this.jimlikTaymer = this.vaqt.kechiktir(() => {
      this.jimlikTaymer = null;
      if (avlod === this.avlod && this.barqarorMi()) this.urinish = 0;
      this.rejalashtir(avlod);
    }, JIMLIK_CHEGARASI_MS);
  }

  private async tokenniYangilabUlan(avlod: number) {
    const yangi = await this.s.tokenYangila().catch(() => null);
    if (avlod !== this.avlod || !this.faol) return;
    if (!yangi) {
      this.yakunla(avlod, "toxtagan");
      return;
    }
    this.tozala();
    void this.ulan(++this.avlod, true);
  }

  private async ulan(avlod: number, tokenYangilangan: boolean) {
    if (!this.faol || avlod !== this.avlod) return;
    const token = this.s.tokenOl();
    if (!token) {
      this.yakunla(avlod, "toxtagan");
      return;
    }
    this.holatniOrnat("ulanmoqda");
    const boshqaruv = new AbortController();
    this.boshqaruv = boshqaruv;
    this.oqimBoshlangan = null;
    // Javob sarlavhalari kelmasa ham (osilgan ulanish, buferlovchi proksi) 60 s dan keyin uzib qayta ulanadi.
    this.jimlikNazorati(avlod);
    const fetchFn = this.s.fetchFn ?? fetch;

    let javob: Response;
    try {
      javob = await fetchFn(this.s.url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        cache: "no-store",
        credentials: "omit",
        signal: boshqaruv.signal,
      });
    } catch {
      this.rejalashtir(avlod);
      return;
    }
    if (avlod !== this.avlod) {
      boshqaruv.abort();
      return;
    }

    if (javob.status === 401) {
      void javob.body?.cancel().catch(() => undefined);
      if (tokenYangilangan) {
        this.yakunla(avlod, "toxtagan");
        return;
      }
      await this.tokenniYangilabUlan(avlod);
      return;
    }
    if (javob.status === 403) {
      void javob.body?.cancel().catch(() => undefined);
      this.yakunla(avlod, "taqiqlangan");
      return;
    }
    if (!javob.ok || !javob.body) {
      void javob.body?.cancel().catch(() => undefined);
      this.rejalashtir(avlod);
      return;
    }

    this.oqimBoshlangan = this.vaqt.hozir();
    const oquvchi = javob.body.getReader();
    const dekoder = new TextDecoder();
    const ajratgich = new SseAjratgich();
    this.jimlikNazorati(avlod);

    try {
      for (;;) {
        const { value, done } = await oquvchi.read();
        if (avlod !== this.avlod) return;
        if (done) break;
        for (const { nom, data } of ajratgich.qosh(dekoder.decode(value, { stream: true }))) {
          if (avlod !== this.avlod) return;
          this.jimlikNazorati(avlod);
          const malumot = jsonniOqish(data);
          if (nom === "ping") continue;
          if (nom === "open") {
            this.holatniOrnat("ulangan");
            this.s.hammasiniYangila();
            continue;
          }
          if (nom === "resync") {
            this.s.hammasiniYangila();
            continue;
          }
          if (nom === "closed") {
            const sabab = typeof malumot.reason === "string" ? malumot.reason : "";
            if (this.barqarorMi()) this.urinish = 0;
            if (sabab === "limit") {
              this.yakunla(avlod, "limit");
              return;
            }
            if (sabab === "expired") {
              this.tozala();
              await this.tokenniYangilabUlan(avlod);
              return;
            }
            this.rejalashtir(avlod);
            return;
          }
          try {
            this.s.hodisa({ nom, data: malumot });
          } catch {
            // Bitta tinglovchining xatosi oqimni to'xtatmasin.
          }
        }
      }
    } catch {
      if (avlod !== this.avlod) return;
    }
    // Oqim kutilmaganda tugadi yoki uzildi.
    if (this.barqarorMi()) this.urinish = 0;
    this.rejalashtir(avlod);
  }
}
