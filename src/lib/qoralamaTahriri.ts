// Qoralama sotuv qatorlarini tahrirlash: miqdorni o'zgartirish, mahsulotni almashtirish, chegirma, qator qo'shish va o'chirish.
// UI'siz va `@/` importlarisiz yozilgan (faqat tur importlari va boshqa toza kutubxonalar) — testlarda to'g'ridan-to'g'ri ishlaydi.
// Backend: PATCH /sales/:id (faqat qoralama) `items` ro'yxatini TO'LIQ almashtiradi, shuning uchun o'zgarmagan qatorlar ham qayta yuboriladi.
import type { QoldiqTanlovi, SotuvMahsuloti, SotuvNarxTuri } from "../types/savdo.ts";
import { asosiyMiqdor, birlikdagiMiqdor, birlikTopish, miqdorYaroqlimi, qatorBirligida } from "./kopBirlik.ts";
import {
  narxSotuvValyutasida,
  qatorNarxTuri,
  turNarxi,
  yuboriladiganQator,
  type NarxValyutasi,
  type YuboriladiganQator,
} from "./savdoNarxlari.ts";

export type TahrirQatori = {
  /** Barqaror kalit (mavjud qatorda — backend id, yangisida — vaqtinchalik). */
  kalit: string;
  /** Backendda saqlangan qator; yangi qo'shilgan qatorda `null`. */
  asl: SotuvMahsuloti | null;
  /** Tanlangan mahsulot ("" — hali tanlanmagan yangi qator). */
  modificationId: string;
  /** Almashtirilgan yoki yangi qatorda tanlangan mahsulot nomi (mavjud qatorda nom `asl` dan olinadi). */
  nom: string;
  /** Almashtirilgan yoki yangi qatorda tanlangan qoldiq; mavjud qatorda qoldiq ro'yxatdan qidiriladi. */
  qoldiq: QoldiqTanlovi | null;
  /** Narx va chegirma ko'rsatiladigan valyuta: mavjud qatorda — qator valyutasi, yangi/almashtirilganda — sotuv valyutasi. */
  valyuta: NarxValyutasi;
  /** Qo'shimcha birlik (pochka) nomi; asosiy birlikda bo'sh. */
  birlikNomi: string;
  /** Mavjud qatorning qo'shimcha birligi (`unitId`); almashtirilgan/yangi qatorda doim `null` (asosiy birlik). */
  birlikId: string | null;
  miqdor: string;
  narx: string;
  /** Chegirma summasi (matn). */
  chegirma: string;
  /** Chegirma foizda berilgan bo'lsa — foiz: miqdor o'zgarganda summa shu foizdan qayta hisoblanadi. */
  chegirmaFoiz: number | null;
  /**
   * Almashtirilgan/yangi qatorda mahsulotning katalogdagi narxi (qator valyutasida; "" — katalogda narx yo'q yoki valyuta o'zgargan).
   * Narx va valyuta erkin tahrirlanadi: narx shu qiymatga teng bo'lsa "Sotuv yaratish" qoidasi, boshqacha bo'lsa qo'lda narx yuboriladi.
   */
  katalogNarxi: string;
  /** Mavjud qatorning saqlangan valyutasi (yangi qatorda `null`): valyuta almashtirilsa, qaytib kelganda aniq qiymatlar tiklanadi. */
  aslValyuta: NarxValyutasi | null;
  tur: SotuvNarxTuri | null;
  ochirildi: boolean;
};

export type TahrirKonteksti = {
  sotuvVal: NarxValyutasi;
  /** Bugungi kurs (1 USD = necha so'm); kurs kiritilmagan bo'lsa 0. */
  kurs: number;
  /** Narx turi sozlamada yoqilganmi (o'chirilgan tur bilan sotuv yuborilmaydi). */
  turRuxsati: (tur: SotuvNarxTuri) => boolean;
};

const EPS = 1e-9;
const yaxlit2 = (son: number) => Math.round(son * 100) / 100;

function musbat(qiymat: unknown) {
  const son = Number(qiymat);
  return Number.isFinite(son) && son > 0 ? son : 0;
}

function manfiyEmas(qiymat: unknown) {
  const son = Number(qiymat ?? 0);
  return Number.isFinite(son) && son > 0 ? son : 0;
}

// ── Matn ↔ son ────────────────────────────────────────────────────────────────────────────────────

/** Kiritilgan matnni songa aylantiradi ("1 500,5" → 1500.5); bo'sh yoki noto'g'ri bo'lsa `null`. */
export function sonniOqish(matn: string | number | null | undefined): number | null {
  if (matn === null || matn === undefined) return null;
  if (typeof matn === "number") return Number.isFinite(matn) ? matn : null;
  const toza = matn.replace(/\s/g, "").replace(",", ".");
  if (!toza || !/^\d*\.?\d*$/.test(toza) || toza === ".") return null;
  const son = Number(toza);
  return Number.isFinite(son) ? son : null;
}

/** Sonni kiritish maydoni matniga o'giradi (ortiqcha nollarsiz, 6 xonagacha). */
export function raqamMatni(son: number): string {
  if (!Number.isFinite(son)) return "";
  return String(Math.round(son * 1e6) / 1e6);
}

/** Kiritish maydoni uchun: raqam va bitta kasr belgisi qoladi (vergul nuqtaga o'giriladi); kasr xonalari `kasr` bilan cheklanadi. */
export function kiritishniTozalash(matn: string, kasr = 3): string {
  const tuzatilgan = matn.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const nuqta = tuzatilgan.indexOf(".");
  if (nuqta === -1) return tuzatilgan;
  const butun = tuzatilgan.slice(0, nuqta);
  const kasrQismi = tuzatilgan.slice(nuqta + 1).replace(/\./g, "").slice(0, Math.max(kasr, 0));
  return kasr > 0 ? `${butun}.${kasrQismi}` : butun;
}

// ── Qoldiq ────────────────────────────────────────────────────────────────────────────────────────

function qoldiqOmbori(qoldiq: QoldiqTanlovi) {
  return qoldiq.warehouseId ?? qoldiq.warehouse?.id;
}

/**
 * Mahsulotning sotuv omboridagi qoldig'i. Shu ombor qatori bo'lsa — shu; bo'lmasa omborsiz (katalog) yozuv; boshqa omborning
 * qoldig'i hisobga olinmaydi (u sotuvga yaramaydi).
 */
export function qoldiqTopish(
  qoldiqlar: readonly QoldiqTanlovi[],
  modificationId: string,
  omborId: string | undefined
): QoldiqTanlovi | undefined {
  let umumiy: QoldiqTanlovi | undefined;
  for (const qoldiq of qoldiqlar) {
    if (qoldiq.modificationId !== modificationId) continue;
    const ombor = qoldiqOmbori(qoldiq);
    if (!ombor) {
      umumiy ??= qoldiq;
      continue;
    }
    if (!omborId || ombor === omborId) return qoldiq;
  }
  return umumiy;
}

/** Tanlash ro'yxati: har bir mahsulot bir marta (shu ombor yozuvi, bo'lmasa katalog yozuvi), boshqa ombor yozuvlari chiqmaydi. */
export function tanlanadiganQoldiqlar(qoldiqlar: readonly QoldiqTanlovi[], omborId: string | undefined): QoldiqTanlovi[] {
  const tanlangan = new Map<string, QoldiqTanlovi>();
  for (const qoldiq of qoldiqlar) {
    if (!qoldiq.modificationId) continue;
    const ombor = qoldiqOmbori(qoldiq);
    if (ombor && omborId && ombor !== omborId) continue;
    const oldingi = tanlangan.get(qoldiq.modificationId);
    // Omborli (haqiqiy qoldiq) yozuv omborsiz katalog yozuvidan ustun.
    if (!oldingi || (ombor && !qoldiqOmbori(oldingi))) tanlangan.set(qoldiq.modificationId, qoldiq);
  }
  return Array.from(tanlangan.values());
}

/** Qoldiq (asosiy birlikda). */
export function qoldiqMiqdori(qoldiq: QoldiqTanlovi | null | undefined) {
  const son = Number(qoldiq?.quantity ?? qoldiq?.balance ?? 0);
  return Number.isFinite(son) ? son : 0;
}

// ── Qatorlarni yig'ish ────────────────────────────────────────────────────────────────────────────

/** Saqlangan qatorlarning o'zgarishini aniqlash imzosi: shu o'zgarsa tahrirlagich saqlangan holatdan qayta boshlanadi. */
export function qatorlarImzosi(items: readonly SotuvMahsuloti[] | undefined): string {
  return (items ?? [])
    .map((item) =>
      [
        item.id ?? "",
        item.modificationId,
        item.quantity,
        item.price,
        item.discount ?? "",
        item.currency ?? "",
        item.priceType ?? "",
        item.discountPercent ?? "",
        item.unitId ?? "",
        item.unitQuantity ?? "",
        item.unitPrice ?? "",
      ].join("|")
    )
    .join(";");
}

/** Mavjud (backendda saqlangan) qatordan tahrir qatori. `nom` va `qatorValyutasi` chaqiruvchidan keladi. */
export function qatorniBoshlash(
  item: SotuvMahsuloti,
  indeks: number,
  p: { nom: string; qatorValyutasi: NarxValyutasi }
): TahrirQatori {
  const birlik = qatorBirligida(item);
  const foiz = musbat(item.discountPercent);
  const chegirma = manfiyEmas(item.discount);
  return {
    kalit: item.id ?? `${item.modificationId}-${indeks}`,
    asl: item,
    modificationId: item.modificationId,
    nom: p.nom,
    qoldiq: null,
    valyuta: p.qatorValyutasi,
    birlikNomi: birlik.birlik ?? "",
    birlikId: birlik.unitId,
    miqdor: raqamMatni(birlik.miqdor),
    narx: raqamMatni(birlik.narx),
    chegirma: chegirma > 0 ? raqamMatni(chegirma) : "",
    chegirmaFoiz: foiz > 0 ? foiz : null,
    katalogNarxi: "",
    aslValyuta: p.qatorValyutasi,
    tur: item.priceType ?? null,
    ochirildi: false,
  };
}

/** Bo'sh yangi qator (mahsulot keyin tanlanadi). */
export function yangiQatorYaratish(kalit: string, sotuvVal: NarxValyutasi): TahrirQatori {
  return {
    kalit,
    asl: null,
    modificationId: "",
    nom: "",
    qoldiq: null,
    valyuta: sotuvVal,
    birlikNomi: "",
    birlikId: null,
    miqdor: "1",
    narx: "",
    chegirma: "",
    chegirmaFoiz: null,
    katalogNarxi: "",
    aslValyuta: null,
    tur: null,
    ochirildi: false,
  };
}

/** Qator hali dastlabki (saqlangan) mahsulotdami (almashtirilmagan). */
export function mavjudMahsulotmi(q: TahrirQatori): boolean {
  return q.asl !== null && q.asl.modificationId === q.modificationId;
}

/** Boshqa faol qatorlar band qilgan mahsulotlar (bir mahsulot bir qatorda turishi uchun). */
export function bandMahsulotlar(qatorlar: readonly TahrirQatori[], istisnoKalit?: string): Set<string> {
  const natija = new Set<string>();
  for (const q of qatorlar) {
    if (q.ochirildi || q.kalit === istisnoKalit || !q.modificationId) continue;
    natija.add(q.modificationId);
  }
  return natija;
}

// ── Hisob-kitob ───────────────────────────────────────────────────────────────────────────────────

export function qatorRaqamlari(q: TahrirQatori) {
  return {
    miqdor: sonniOqish(q.miqdor),
    narx: sonniOqish(q.narx),
    chegirma: sonniOqish(q.chegirma) ?? 0,
  };
}

/** Qator summasi (qator valyutasida): miqdor × narx − chegirma; miqdor/narx noto'g'ri bo'lsa 0. */
export function qatorSummasi(q: TahrirQatori): number {
  const { miqdor, narx, chegirma } = qatorRaqamlari(q);
  if (miqdor === null || narx === null) return 0;
  return miqdor * narx - chegirma;
}

/** Chegirma foizda berilgan bo'lsa: summa qator jamining foizi (qator jamidan oshmaydi). */
function foizdanChegirma(q: TahrirQatori, miqdor: number | null, narx: number | null) {
  if (!q.chegirmaFoiz || miqdor === null || narx === null) return q.chegirma;
  const jami = Math.max(miqdor, 0) * Math.max(narx, 0);
  return raqamMatni(yaxlit2(Math.min((jami * q.chegirmaFoiz) / 100, jami)));
}

export function miqdorniOzgartirish(q: TahrirQatori, matn: string): TahrirQatori {
  const yangi = { ...q, miqdor: matn };
  return { ...yangi, chegirma: foizdanChegirma(yangi, sonniOqish(matn), sonniOqish(q.narx)) };
}

export function narxniOzgartirish(q: TahrirQatori, matn: string): TahrirQatori {
  const yangi = { ...q, narx: matn };
  return { ...yangi, chegirma: foizdanChegirma(yangi, sonniOqish(q.miqdor), sonniOqish(matn)) };
}

/** Chegirma summasi qo'lda o'zgartirilsa foiz rejimi o'chadi (summa saqlanadi). */
export function chegirmaniOzgartirish(q: TahrirQatori, matn: string): TahrirQatori {
  return { ...q, chegirma: matn, chegirmaFoiz: null };
}

/**
 * Qator valyutasini almashtiradi (so'm ↔ dollar): narx va chegirma kurs bilan o'giriladi (dollar 2 xonagacha, so'm butun songacha).
 * Mavjud qator dastlabki valyutasiga qaytsa, saqlangan aniq narx va chegirma tiklanadi (yaxlitlash xatosi yig'ilmasin).
 * Kurs yo'q bo'lsa (va dastlabki valyutaga qaytilmasa) qator o'zgarmaydi.
 */
export function valyutaniOzgartirish(q: TahrirQatori, nishon: NarxValyutasi, kurs: number): TahrirQatori {
  if (nishon === q.valyuta) return q;
  if (q.asl && mavjudMahsulotmi(q) && nishon === q.aslValyuta) {
    const chegirma = manfiyEmas(q.asl.discount);
    return { ...q, valyuta: nishon, narx: raqamMatni(qatorBirligida(q.asl).narx), chegirma: chegirma > 0 ? raqamMatni(chegirma) : "" };
  }
  if (!(kurs > 0)) return q;
  const ogirish = (matn: string) => {
    const son = sonniOqish(matn);
    if (son === null) return matn;
    return raqamMatni(nishon === "USD" ? yaxlit2(son / kurs) : Math.round(son * kurs));
  };
  const yangi = { ...q, valyuta: nishon, narx: ogirish(q.narx), chegirma: ogirish(q.chegirma), katalogNarxi: "" };
  return { ...yangi, chegirma: foizdanChegirma(yangi, sonniOqish(yangi.miqdor), sonniOqish(yangi.narx)) };
}

/**
 * Qatordagi mahsulotni almashtiradi (yangi qatorda — tanlaydi): narx tanlangan narx turining katalog narxi (sotuv valyutasida),
 * chegirma nolga qaytadi, birlik asosiy birlikka o'tadi. Miqdor saqlanadi (bo'sh, noto'g'ri yoki qo'shimcha birlikdagi bo'lsa 1).
 * Qaytadan asl mahsulot tanlansa — qator dastlabki holatiga qaytadi (`aslHolati`).
 */
export function mahsulotniAlmashtirish(
  q: TahrirQatori,
  qoldiq: QoldiqTanlovi,
  p: { nom: string; standartTur: SotuvNarxTuri; ctx: TahrirKonteksti; aslHolati?: TahrirQatori }
): TahrirQatori {
  if (q.asl && qoldiq.modificationId === q.asl.modificationId && p.aslHolati) {
    return { ...p.aslHolati, kalit: q.kalit, ochirildi: false };
  }
  const tur = qatorNarxTuri(qoldiq, p.standartTur, p.ctx.turRuxsati, p.ctx.kurs) ?? p.standartTur;
  const katalogNarxi = turNarxi(qoldiq, tur, p.ctx.kurs);
  const narx = narxSotuvValyutasida(katalogNarxi, p.ctx.sotuvVal, p.ctx.kurs);
  const oldingiMiqdor = sonniOqish(q.miqdor);
  return {
    ...q,
    modificationId: qoldiq.modificationId,
    nom: p.nom,
    qoldiq,
    valyuta: p.ctx.sotuvVal,
    birlikNomi: "",
    birlikId: null,
    miqdor: q.birlikId === null && oldingiMiqdor !== null && oldingiMiqdor > 0 ? q.miqdor : "1",
    // Katalog narxi oldindan yoziladi (kurs bo'lmasa o'girib bo'lmaydi — narx bo'sh qoladi); uni erkin o'zgartirish mumkin.
    narx: narx > 0 ? raqamMatni(narx) : "",
    katalogNarxi: narx > 0 ? raqamMatni(narx) : "",
    chegirma: "",
    chegirmaFoiz: null,
    tur,
    ochirildi: false,
  };
}

// ── O'zgarish aniqlash ────────────────────────────────────────────────────────────────────────────

function teng(a: number | null, b: number) {
  return a !== null && Math.abs(a - b) < EPS;
}

/** Qator dastlabki holatidan farq qiladimi (yangi, almashtirilgan, miqdor/narx/chegirma/valyuta o'zgargan). O'chirilgan qator alohida hisoblanadi. */
export function qatorOzgarganmi(q: TahrirQatori): boolean {
  if (!q.asl || !mavjudMahsulotmi(q)) return true;
  if (q.aslValyuta !== null && q.valyuta !== q.aslValyuta) return true;
  const birlik = qatorBirligida(q.asl);
  const { miqdor, narx, chegirma } = qatorRaqamlari(q);
  return !teng(miqdor, birlik.miqdor) || !teng(narx, birlik.narx) || Math.abs(chegirma - manfiyEmas(q.asl.discount)) > EPS;
}

/** Miqdori o'zgarganmi (ombor qoldig'i tekshiruvi shunda majburiy). */
function miqdorOzgarganmi(q: TahrirQatori): boolean {
  if (!q.asl || !mavjudMahsulotmi(q)) return true;
  return !teng(sonniOqish(q.miqdor), qatorBirligida(q.asl).miqdor);
}

/** Saqlanmagan o'zgarishlar soni (o'zgargan, almashtirilgan, yangi yoki o'chirilgan qatorlar). */
export function ozgarishlarSoni(qatorlar: readonly TahrirQatori[]): number {
  return qatorlar.filter((q) => (q.asl ? q.ochirildi || qatorOzgarganmi(q) : !q.ochirildi)).length;
}

// ── Tekshiruv ─────────────────────────────────────────────────────────────────────────────────────

export type QatorXatolari = {
  mahsulot?: true;
  miqdor?: { kod: "nol" } | { kod: "butunEmas" } | { kod: "qoldiq"; mavjud: number };
  /** Narx yozilmagan yoki 0 (o'zgartirilgan qatorda narx musbat bo'lishi kerak). */
  narx?: "kerak";
  chegirma?: true;
};

export function xatoBormi(xatolar: QatorXatolari) {
  return Boolean(xatolar.mahsulot || xatolar.miqdor || xatolar.narx || xatolar.chegirma);
}

/**
 * Qator xatolari. Faqat o'zgargan (yoki yangi) qatorlar tekshiriladi: o'zgarmagan qator avvalgidek qayta yuboriladi.
 * `qoldiq` — qatorning mahsulot qoldig'i; noma'lum bo'lsa ombor qoldig'i tekshirilmaydi (tasdiqlashda backend tekshiradi).
 * Qoralamadagi mavjud qator o'z miqdorini allaqachon band qilgan (rezerv), shuning uchun ko'paytirishda shu miqdor ham ruxsat etiladi.
 */
export function qatorXatolari(q: TahrirQatori, qoldiq: QoldiqTanlovi | null | undefined, rezervMavjud = true): QatorXatolari {
  if (q.ochirildi) return {};
  if (!q.modificationId) return { mahsulot: true };
  if (rezervMavjud && !qatorOzgarganmi(q)) return {};

  const xatolar: QatorXatolari = {};
  const { miqdor, narx, chegirma } = qatorRaqamlari(q);
  const birlik = birlikTopish(qoldiq?.birliklar, q.birlikId);

  if (miqdor === null || !(miqdor > 0)) {
    xatolar.miqdor = { kod: "nol" };
  } else if (!miqdorYaroqlimi(birlik, miqdor)) {
    xatolar.miqdor = { kod: "butunEmas" };
  } else if ((!rezervMavjud || qoldiq) && (!rezervMavjud || miqdorOzgarganmi(q))) {
    const band = rezervMavjud && mavjudMahsulotmi(q) && q.asl ? manfiyEmas(q.asl.quantity) : 0;
    const ruxsat = qoldiqMiqdori(qoldiq) + band;
    if (asosiyMiqdor(birlik, miqdor) > ruxsat + EPS) {
      // Ruxsat etilgan eng ko'p miqdor shu birlikda; kasr bo'lmaydigan birlikda (pochka, korobka) butun songa tushiriladi.
      const engKopi = birlikdagiMiqdor(birlik, ruxsat);
      const butunBirlik = birlik && !birlik.asosiy && !birlik.kasr;
      xatolar.miqdor = { kod: "qoldiq", mavjud: butunBirlik ? Math.floor(engKopi + EPS) : Math.floor(engKopi * 1000) / 1000 };
    }
  }

  // Narx erkin tahrirlanadi: yozilmagan bo'lsa yoki (o'zgartirilgan) 0 bo'lsa xato. Saqlangan qatorning o'zgarmagan narxi (0 bo'lsa ham) avvalgidek yuboriladi.
  const aslNarx = q.asl && mavjudMahsulotmi(q) && q.valyuta === q.aslValyuta ? qatorBirligida(q.asl).narx : null;
  if (narx === null || (!(narx > 0) && !(aslNarx !== null && teng(narx, aslNarx)))) xatolar.narx = "kerak";
  if (narx !== null && miqdor !== null && chegirma > miqdor * narx + EPS) xatolar.chegirma = true;
  return xatolar;
}

// ── Backendga yuboriladigan qatorlar ──────────────────────────────────────────────────────────────

export type TahrirQatoriTanasi =
  | YuboriladiganQator
  | {
      modificationId: string;
      quantity: number;
      price: number;
      discount: number;
      unitId?: string;
      currency?: NarxValyutasi;
      priceType?: SotuvNarxTuri;
      discountPercent?: number;
    };

/**
 * Qatorlarni PATCH /sales/:id `items` tanasiga aylantiradi (o'chirilgan qatorlar tushmaydi, tartib saqlanadi).
 * Mavjud qator (mahsuloti almashtirilmagan) o'z birligi, valyutasi va narx turi bilan qayta yuboriladi — faqat miqdor/chegirma
 * o'zgaradi; yangi va almashtirilgan qator katalog narxida qolsa "Sotuv yaratish" bilan bir xil qoida (`yuboriladiganQator`),
 * narxi yoki valyutasi o'zgartirilgan bo'lsa foydalanuvchi yozgan narx o'z valyutasida (qo'lda narx) yuboriladi.
 */
export function tahrirItemlari(qatorlar: readonly TahrirQatori[], ctx: TahrirKonteksti): TahrirQatoriTanasi[] {
  const natija: TahrirQatoriTanasi[] = [];
  for (const q of qatorlar) {
    if (q.ochirildi) continue;
    const { miqdor, narx, chegirma } = qatorRaqamlari(q);
    if (miqdor === null) continue;

    if (q.asl && mavjudMahsulotmi(q)) {
      const birlik = qatorBirligida(q.asl);
      const tur = q.asl.priceType ?? null;
      natija.push({
        modificationId: q.modificationId,
        quantity: miqdor,
        price: narx ?? birlik.narx,
        discount: chegirma,
        ...(birlik.unitId ? { unitId: birlik.unitId } : {}),
        ...(q.valyuta !== ctx.sotuvVal ? { currency: q.valyuta } : {}),
        ...(tur && ctx.turRuxsati(tur) ? { priceType: tur } : {}),
        ...(q.chegirmaFoiz && chegirma > 0 ? { discountPercent: Math.min(q.chegirmaFoiz, 100) } : {}),
      });
      continue;
    }

    const tur = q.tur ?? "RETAIL";
    // Narx katalogdagidek qolgan va valyuta o'zgarmagan bo'lsa — "Sotuv yaratish" qoidasi (mahsulot o'z valyutasida);
    // aks holda foydalanuvchi yozgan narx o'z valyutasida (qo'lda narx) yuboriladi.
    const katalogdagidek = narx !== null && q.katalogNarxi !== "" && q.valyuta === ctx.sotuvVal && Math.abs(narx - Number(q.katalogNarxi)) < EPS;
    if (katalogdagidek) {
      natija.push(
        yuboriladiganQator({
          modificationId: q.modificationId,
          miqdor,
          tur,
          qoldiq: q.qoldiq ?? undefined,
          sotuvVal: ctx.sotuvVal,
          kurs: ctx.kurs,
          narx,
          chegirma,
          chegirmaTuri: q.chegirmaFoiz ? "foiz" : "sum",
          foiz: q.chegirmaFoiz ?? 0,
        })
      );
      continue;
    }
    natija.push({
      modificationId: q.modificationId,
      quantity: miqdor,
      price: narx ?? 0,
      discount: chegirma,
      ...(q.valyuta !== ctx.sotuvVal ? { currency: q.valyuta } : {}),
      ...(ctx.turRuxsati(tur) ? { priceType: tur } : {}),
      ...(q.chegirmaFoiz && chegirma > 0 ? { discountPercent: Math.min(q.chegirmaFoiz, 100) } : {}),
    });
  }
  return natija;
}

// ── Jami ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * Faol (o'chirilmagan) qatorlar bo'yicha jami, chegirma va chegirmasiz summa — sotuv valyutasida.
 * `ogirish` summani qator valyutasidan sotuv valyutasiga o'giradi; kurs noma'lum bo'lsa `null` (qator hisobga olinmaydi, `aniq: false`).
 */
export function qatorlarJami(
  qatorlar: readonly TahrirQatori[],
  ogirish: (summa: number, valyuta: NarxValyutasi) => number | null
) {
  let jami = 0;
  let chegirma = 0;
  let aniq = true;
  for (const q of qatorlar) {
    if (q.ochirildi) continue;
    const summa = ogirish(qatorSummasi(q), q.valyuta);
    const qatorChegirmasi = ogirish(Math.max(qatorRaqamlari(q).chegirma, 0), q.valyuta);
    if (summa === null || qatorChegirmasi === null) {
      aniq = false;
      continue;
    }
    jami += summa;
    chegirma += qatorChegirmasi;
  }
  return { jami, chegirma, chegirmasiz: jami + chegirma, aniq };
}
