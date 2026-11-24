// 3D sex — DEMO ma'lumot manbai (sinov ma'lumotlari). Haqiqiy stanok, backend yoki maxfiy kalit kerak emas.
// Ssenariy soniyalar bo'yicha (tik = 1 s) yuradi; Pauza/Davom ettirish/Qayta boshlash bilan boshqariladi.
// Sahna faqat `SexManbasi` interfeysini biladi — keyinchalik shu joyga Ye-Post API manbai qo'yiladi.
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.
import type { SexHodisasi, SexHolati, SexManbasi, StanokHolati, StanokTavsifi, Topshiriq } from "./sexModeli.ts";

/** Sex rejasi (metr). Oqim: material ombori → kesish → CNC → qirra → burg'ilash → qadoqlash → tayyor mahsulot. */
export const DEMO_STANOKLAR: StanokTavsifi[] = [
  { id: "kesish-01", nom: "Kesish-01", tur: "kesish", joy: [-6.5, -4], burilish: 0 },
  { id: "cnc-01", nom: "CNC-01", tur: "cnc", joy: [0, -4], burilish: 0 },
  { id: "qirra-01", nom: "Qirra-01", tur: "qirra", joy: [6.8, -4], burilish: 0 },
  { id: "burgilash-01", nom: "Burg'ilash-01", tur: "burgilash", joy: [6.8, 4.2], burilish: Math.PI },
  { id: "qadoqlash-01", nom: "Qadoqlash-01", tur: "qadoqlash", joy: [0, 4.2], burilish: Math.PI },
];

const t = (id: string, buyurtma: string, detal: string, operatsiya: string, bajarildi: number, jami: number, birlik = "dona"): Topshiriq =>
  ({ id, buyurtma, detal, operatsiya, bajarildi, jami, birlik });

/** Ssenariy boshidagi holat (yangilangan / aloqa — boshlashda qo'yiladi). */
function boshlangichHolat(): Record<string, Omit<StanokHolati, "yangilangan" | "aloqa">> {
  return {
    "kesish-01": {
      stanokId: "kesish-01", holat: "ishlayapti",
      joriy: t("T-174-1", "№174", "Yon panel", "Kesish", 32, 80),
      navbat: [t("T-174-2", "№174", "Orqa panel", "Kesish", 0, 40), t("T-178-1", "№178", "Tokcha", "Kesish", 0, 60)],
    },
    "cnc-01": {
      stanokId: "cnc-01", holat: "bosh", joriy: null,
      navbat: [t("T-181-1", "№181", "Eshik fasadi", "Frezalash", 0, 24), t("T-174-3", "№174", "Yon panel", "Teshik ochish", 0, 80)],
    },
    "qirra-01": {
      stanokId: "qirra-01", holat: "ishlayapti",
      joriy: t("T-172-2", "№172", "Qopqoq", "Qirra yopishtirish", 18, 50),
      navbat: [t("T-174-4", "№174", "Yon panel", "Qirra yopishtirish", 0, 80)],
    },
    "burgilash-01": {
      stanokId: "burgilash-01", holat: "ishlayapti",
      joriy: t("T-172-3", "№172", "Tokcha", "Burg'ilash", 14, 30),
      navbat: [t("T-172-4", "№172", "Qopqoq", "Burg'ilash", 0, 50)],
    },
    "qadoqlash-01": {
      stanokId: "qadoqlash-01", holat: "ishlayapti",
      joriy: t("T-170-9", "№170", "Shkaf \"Lux\"", "Qadoqlash", 6, 12, "komplekt"),
      navbat: [t("T-172-9", "№172", "Komod", "Qadoqlash", 0, 8, "komplekt")],
    },
  };
}

/** Ishlayotgan stanokda miqdor qancha soniyada nechtaga oshadi (demo tezligi). */
const TEZLIK: Record<string, { har: number; qadam: number }> = {
  "kesish-01": { har: 2, qadam: 4 },
  "cnc-01": { har: 3, qadam: 1 },
  "qirra-01": { har: 2, qadam: 2 },
  "burgilash-01": { har: 2, qadam: 1 },
  "qadoqlash-01": { har: 5, qadam: 1 },
};

/** Ssenariy voqealari (soniya → amal). Natija: ikki xil buyurtma yangilanadi, pauza, aloqa uzilishi va tiklanishi. */
export const SSENARIY = {
  cncBoshlanadi: 5,
  qirraPauza: 9,
  aloqaUziladi: 13,
  qirraDavom: 19,
  aloqaTiklanadi: 23,
  /** Tugagan topshiriqdan keyin navbatdagisi necha soniyada (alohida hodisa) boshlanadi. */
  keyingiKutish: 2,
} as const;

/** Navbat tugasa demo davom etishi uchun yangi topshiriqlar (aylanib). */
const ZAXIRA: Array<[string, string, string, number, string?]> = [
  ["№183", "Yon panel", "Kesish", 40],
  ["№183", "Eshik", "Frezalash", 12],
  ["№185", "Polka", "Qirra yopishtirish", 36],
  ["№185", "Yashik devori", "Burg'ilash", 24],
  ["№181", "Oshxona to'plami", "Qadoqlash", 4, "komplekt"],
];

type Ichki = StanokHolati & { kutish?: number };

export class DemoSexManbasi implements SexManbasi {
  private ichki: Record<string, Ichki> = {};
  /** Foydalanuvchiga ko'rsatiladigan holat: aloqa uzilgan stanokda — oxirgi ma'lum nusxa (eskirgan). */
  private korsatilgan: SexHolati = {};
  private tinglovchilar = new Set<(holat: SexHolati, hodisa?: SexHodisasi) => void>();
  private taymer: ReturnType<typeof setInterval> | null = null;
  private zaxiraIndeks = 0;
  /** Ssenariy soniyasi. */
  soniya = 0;
  hodisalar: SexHodisasi[] = [];
  private vaqt: () => number;

  constructor(vaqt: () => number = Date.now) {
    this.vaqt = vaqt;
    this.qaytaBoshlash(false);
  }

  holat() {
    return this.korsatilgan;
  }

  obuna(tinglovchi: (holat: SexHolati, hodisa?: SexHodisasi) => void) {
    this.tinglovchilar.add(tinglovchi);
    return () => { this.tinglovchilar.delete(tinglovchi); };
  }

  get ishlayapti() {
    return this.taymer !== null;
  }

  /** Taymerni yoqadi (har `oraliq` ms da bitta soniya). */
  boshlash(oraliq = 1000) {
    if (this.taymer) return;
    this.taymer = setInterval(() => this.tik(), oraliq);
    this.xabar();
  }

  pauza() {
    if (!this.taymer) return;
    clearInterval(this.taymer);
    this.taymer = null;
    this.xabar();
  }

  /** Ssenariyni boshidan boshlaydi (taymer holati saqlanadi). */
  qaytaBoshlash(xabarBerilsin = true) {
    const hozir = this.vaqt();
    this.soniya = 0;
    this.zaxiraIndeks = 0;
    this.hodisalar = [];
    this.ichki = Object.fromEntries(Object.entries(boshlangichHolat()).map(([id, h]) => [id, { ...h, yangilangan: hozir, aloqa: true }]));
    this.nashr();
    if (xabarBerilsin) this.xabar();
  }

  /** Bitta soniya oldinga (taymer chaqiradi; testlar ham bevosita). */
  tik() {
    this.soniya += 1;
    const s = this.soniya;
    const hozir = this.vaqt();
    const hodisalar: SexHodisasi[] = [];
    const hodisa = (stanokId: string, tur: SexHodisasi["tur"], matn: string) => hodisalar.push({ vaqt: hozir, stanokId, tur, matn });

    // Ssenariy voqealari.
    if (s === SSENARIY.cncBoshlanadi) this.keyinginiBoshlash("cnc-01", hodisa);
    if (s === SSENARIY.qirraPauza) {
      Object.assign(this.ichki["qirra-01"], { holat: "pauza", sabab: "Lenta almashtirilmoqda" });
      hodisa("qirra-01", "pauza", "Qirra-01 pauzada — lenta almashtirilmoqda");
    }
    if (s === SSENARIY.qirraDavom) {
      Object.assign(this.ichki["qirra-01"], { holat: "ishlayapti", sabab: undefined });
      hodisa("qirra-01", "davom", "Qirra-01 ishni davom ettirdi");
    }
    if (s === SSENARIY.aloqaUziladi) {
      this.ichki["burgilash-01"].aloqa = false;
      hodisa("burgilash-01", "aloqa_uzildi", "Burg'ilash-01 bilan aloqa uzildi");
    }
    if (s === SSENARIY.aloqaTiklanadi) {
      this.ichki["burgilash-01"].aloqa = true;
      hodisa("burgilash-01", "aloqa_tiklandi", "Burg'ilash-01 bilan aloqa tiklandi");
    }

    // Ish jarayoni: ishlayotgan stanoklarda miqdor oshadi (aloqa uzilgan stanok ham ishlayveradi — faqat biz ko'rmaymiz).
    for (const [id, st] of Object.entries(this.ichki)) {
      if (st.kutish !== undefined) {
        st.kutish -= 1;
        if (st.kutish <= 0) {
          st.kutish = undefined;
          this.keyinginiBoshlash(id, hodisa);
        }
      } else if (st.holat === "ishlayapti" && st.joriy) {
        const tezlik = TEZLIK[id];
        if (tezlik && s % tezlik.har === 0) {
          st.joriy = { ...st.joriy, bajarildi: Math.min(st.joriy.jami, st.joriy.bajarildi + tezlik.qadam) };
          if (st.joriy.bajarildi >= st.joriy.jami) {
            hodisa(id, "tugadi", `${this.nomi(id)}: ${st.joriy.buyurtma} · ${st.joriy.detal} tugadi (${st.joriy.jami} ${st.joriy.birlik})`);
            st.holat = "bosh";
            st.kutish = SSENARIY.keyingiKutish;
          }
        }
      }
      if (st.aloqa) st.yangilangan = hozir;
    }

    this.nashr();
    this.hodisalar = [...hodisalar.reverse(), ...this.hodisalar].slice(0, 30);
    if (hodisalar.length) for (const h of hodisalar) this.xabar(h);
    else this.xabar();
  }

  /** Navbatdagi topshiriq alohida hodisa sifatida boshlanadi (tugagani yopilgandan keyin). */
  private keyinginiBoshlash(id: string, hodisa: (stanokId: string, tur: SexHodisasi["tur"], matn: string) => void) {
    const st = this.ichki[id];
    const navbat = [...st.navbat];
    let keyingi = navbat.shift();
    if (!keyingi) {
      const [buyurtma, detal, operatsiya, jami, birlik] = ZAXIRA[this.zaxiraIndeks++ % ZAXIRA.length];
      keyingi = t(`Z-${this.zaxiraIndeks}`, buyurtma, detal, operatsiya, 0, jami, birlik);
    }
    if (navbat.length === 0) {
      const [buyurtma, detal, operatsiya, jami, birlik] = ZAXIRA[this.zaxiraIndeks++ % ZAXIRA.length];
      navbat.push(t(`Z-${this.zaxiraIndeks}`, buyurtma, detal, operatsiya, 0, jami, birlik));
    }
    Object.assign(st, { holat: "ishlayapti", sabab: undefined, joriy: { ...keyingi, bajarildi: 0 }, navbat });
    hodisa(id, "boshlandi", `${this.nomi(id)}: ${keyingi.buyurtma} · ${keyingi.detal} boshlandi (0/${keyingi.jami} ${keyingi.birlik})`);
  }

  private nomi(id: string) {
    return DEMO_STANOKLAR.find((stanok) => stanok.id === id)?.nom ?? id;
  }

  /** Ichki holatdan ko'rsatiladiganini yangilaydi: aloqa yo'q stanokda oxirgi ma'lum nusxa qoladi (faqat aloqa bayrog'i). */
  private nashr() {
    const keyingi: SexHolati = {};
    for (const [id, st] of Object.entries(this.ichki)) {
      const { kutish: _kutish, ...ochiq } = st;
      void _kutish;
      const oldingi = this.korsatilgan[id];
      keyingi[id] = st.aloqa || !oldingi ? { ...ochiq, navbat: [...ochiq.navbat] } : { ...oldingi, aloqa: false };
    }
    this.korsatilgan = keyingi;
  }

  private xabar(hodisa?: SexHodisasi) {
    for (const tinglovchi of [...this.tinglovchilar]) tinglovchi(this.korsatilgan, hodisa);
  }
}
