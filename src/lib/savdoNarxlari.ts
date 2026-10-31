// "Sotuv yaratish" jadvali uchun narx turi (tannarx / chakana / ulgurji) va chegirma (summa yoki foiz) hisob-kitobi.
// UI'siz yozilgan (faqat tur importlari) — testlarda to'g'ridan-to'g'ri ishlaydi.
import type { QoldiqTanlovi, SotuvNarxTuri } from "../types/savdo.ts";
import { asosiyMiqdor, birlikNarxi, type TovarBirligi } from "./kopBirlik.ts";

export type NarxValyutasi = "UZS" | "USD";
export type ChegirmaTuri = "sum" | "foiz";

/** Bitta narx turining narxi: o'z valyutasi, shu valyutadagi qiymat va so'mdagi qiymat (dollar narx kurs bilan o'girilgan). */
export type TurNarxi = { valyuta: NarxValyutasi; asl: number; som: number };

export const NARX_TURLARI_TARTIBI: readonly SotuvNarxTuri[] = ["COST", "RETAIL", "WHOLESALE"];

const yaxlit2 = (son: number) => Math.round(son * 100) / 100;

function musbat(qiymat: unknown) {
  const son = Number(qiymat);
  return Number.isFinite(son) && son > 0 ? son : 0;
}

/** Katalogdagi so'mdagi chakana narx (sotuv qatoridagi eng oddiy narx). */
export function chakanaSomNarxi(qoldiq?: QoldiqTanlovi) {
  return Number(
    qoldiq?.sellingPrice ??
      qoldiq?.price ??
      qoldiq?.modification?.price?.sellingPrice ??
      qoldiq?.modification?.price?.retailPrice ??
      0
  );
}

/**
 * Tanlangan narx turining narxi; narx yo'q (yoki ko'rinmaydi: tannarx faqat admin/direktorga keladi) bo'lsa `null`.
 * Har bir narxning valyutasi alohida: masalan chakana so'mda, ulgurji dollarda bo'lishi mumkin.
 */
export function turNarxi(qoldiq: QoldiqTanlovi | undefined, tur: SotuvNarxTuri, kurs: number): TurNarxi | null {
  if (!qoldiq) return null;
  if (tur === "RETAIL") {
    const som = Number(chakanaSomNarxi(qoldiq)) || 0;
    const dollar = qoldiq.valyuta;
    if (dollar?.currency === "USD" && dollar.asl > 0) return { valyuta: "USD", asl: dollar.asl, som };
    return som > 0 ? { valyuta: "UZS", asl: som, som } : null;
  }
  if (tur === "WHOLESALE") {
    const dollar = qoldiq.valyuta;
    if (dollar?.ulgurjiCurrency === "USD" && (dollar.ulgurjiAsl ?? 0) > 0) {
      return { valyuta: "USD", asl: dollar.ulgurjiAsl ?? 0, som: dollar.ulgurjiUzs ?? 0 };
    }
    const som = musbat(qoldiq.modification?.price?.wholesalePrice);
    return som > 0 ? { valyuta: "UZS", asl: som, som } : null;
  }
  const asl = musbat(qoldiq.modification?.price?.costPrice);
  if (asl <= 0) return null;
  if (qoldiq.modification?.price?.costCurrency?.toUpperCase() === "USD") {
    return { valyuta: "USD", asl, som: kurs > 0 ? Math.round(asl * kurs) : 0 };
  }
  return { valyuta: "UZS", asl, som: asl };
}

/** Narx turining narxi sotuv valyutasida; kurs yo'q bo'lsa va o'girish kerak bo'lsa 0 (qatorni sotib bo'lmaydi). */
export function narxSotuvValyutasida(narx: TurNarxi | null, sotuvVal: NarxValyutasi, kurs: number) {
  if (!narx) return 0;
  if (narx.valyuta === sotuvVal) return narx.asl;
  if (sotuvVal === "UZS") return narx.som;
  return kurs > 0 ? yaxlit2(narx.asl / kurs) : 0;
}

/**
 * Sotuv qatori uchun narx turi tanlanadi: so'ralgan tur narxi bor va ruxsat etilgan bo'lsa shu, aks holda
 * chakana → ulgurji → tannarx tartibida birinchi mosi; hech biri bo'lmasa `null`.
 */
export function qatorNarxTuri(
  qoldiq: QoldiqTanlovi | undefined,
  soralgan: SotuvNarxTuri,
  ruxsat: (tur: SotuvNarxTuri) => boolean,
  kurs: number
): SotuvNarxTuri | null {
  const mos = (tur: SotuvNarxTuri) => ruxsat(tur) && turNarxi(qoldiq, tur, kurs) !== null;
  if (mos(soralgan)) return soralgan;
  return (["RETAIL", "WHOLESALE", "COST"] as const).find(mos) ?? null;
}

/** Chegirma summasi (sotuv valyutasida): foizda — qator jamining foizi; qator jamidan oshmaydi, 2 xonagacha yaxlitlanadi. */
export function chegirmaSummasi(qator: { miqdor: number; narx: number; tur: ChegirmaTuri; summa: number; foiz: number }) {
  const jami = Math.max(qator.miqdor, 0) * Math.max(qator.narx, 0);
  if (!(jami > 0)) return 0;
  const xom = qator.tur === "foiz" ? (jami * Math.min(Math.max(qator.foiz, 0), 100)) / 100 : Math.max(qator.summa, 0);
  return yaxlit2(Math.min(xom, jami));
}

/** Chegirma summasining qator jamiga nisbatan foizi (2 xonagacha); jami 0 bo'lsa 0. */
export function chegirmaFoizi(miqdor: number, narx: number, summa: number) {
  const jami = Math.max(miqdor, 0) * Math.max(narx, 0);
  return jami > 0 ? yaxlit2((Math.min(Math.max(summa, 0), jami) / jami) * 100) : 0;
}

/**
 * Sotuvchi "Sotuv narxi" maydoniga yozgan narx katalog narxiga nisbatan: pastroq bo'lsa — chegirma (har bir dona uchun farq × miqdor),
 * baland bo'lsa — ustama (har bir donaga qo'shimcha). Bo'sh, noto'g'ri yoki katalog narxiga teng qiymat ikkalasini ham 0 qiladi.
 */
export function kiritilganNarx(p: { katalog: number; kiritilgan: number; miqdor: number }) {
  if (!(p.katalog > 0) || !(p.kiritilgan > 0)) return { ustama: 0, chegirma: 0 };
  if (p.kiritilgan > p.katalog) return { ustama: yaxlit2(p.kiritilgan - p.katalog), chegirma: 0 };
  if (p.kiritilgan < p.katalog) return { ustama: 0, chegirma: yaxlit2((p.katalog - p.kiritilgan) * Math.max(p.miqdor, 0)) };
  return { ustama: 0, chegirma: 0 };
}

/** Bir dona narxi: katalog narxi + ustama (sotuvchi katalogdan baland narx yozgan bo'lsa). */
export function ustamaliNarx(katalog: number, ustama: number) {
  return yaxlit2(Math.max(katalog, 0) + Math.max(ustama, 0));
}

export type YuboriladiganQator = {
  modificationId: string;
  quantity: number;
  price: number;
  discount: number;
  priceType: SotuvNarxTuri;
  // Chegirma foizda kiritilgan bo'lsa — foiz (backendda hisobot uchun); summa `discount`da.
  discountPercent?: number;
  currency?: NarxValyutasi;
  // Qo'shimcha birlikda sotilsa (pochka): miqdor va narx shu birlikda. Asosiy birlikda yuborilmaydi.
  unitId?: string;
};

/**
 * Backendga ketadigan qator. So'mdagi sotuvda narx so'mda (valyuta yuborilmaydi — sotuv valyutasi). Dollarli sotuvda mahsulot
 * o'z valyutasida (dollarda yoki so'mda) yuboriladi: backend tasdiqlash kunidagi kurs bilan o'giradi, bizda yaxlitlash xatosi bo'lmaydi.
 */
export function yuboriladiganQator(p: {
  modificationId: string;
  miqdor: number;
  tur: SotuvNarxTuri;
  qoldiq: QoldiqTanlovi | undefined;
  sotuvVal: NarxValyutasi;
  kurs: number;
  /** Qatorda ko'rinib turgan narx (sotuv valyutasida). */
  narx: number;
  /** Chegirma summasi (sotuv valyutasida). */
  chegirma: number;
  chegirmaTuri: ChegirmaTuri;
  foiz: number;
  /** Bir dona uchun ustama (sotuv valyutasida): sotuv narxi katalogdan baland bo'lsa, qo'lda narx sifatida yuboriladi. */
  ustama?: number;
  /** Tanlangan birlik: miqdor, narx va chegirma shu birlikda (qo'shimcha birlikda `unitId` yuboriladi). */
  birlik?: TovarBirligi;
  /** UI katalogdagi asosiy birlik narxidan hisoblaydi; `narx` va `ustama` allaqachon sotuv birligida. */
  donalikNarx?: boolean;
}): YuboriladiganQator {
  const ustama = Math.max(p.ustama ?? 0, 0);
  const asos = {
    modificationId: p.modificationId,
    quantity: p.miqdor,
    priceType: p.tur,
    ...(p.chegirmaTuri === "foiz" && p.foiz > 0 && p.chegirma > 0 ? { discountPercent: Math.min(p.foiz, 100) } : {}),
    ...(p.birlik && !p.birlik.asosiy ? { unitId: p.birlik.unitId } : {}),
  };
  if (p.sotuvVal === "UZS") return { ...asos, price: ustamaliNarx(p.narx, ustama), discount: p.chegirma };
  const katalog = turNarxi(p.qoldiq, p.tur, p.kurs);
  const narx = p.donalikNarx && katalog
    ? { ...katalog, asl: asosiyMiqdor(p.birlik, katalog.asl) }
    : birlikNarxi(katalog, p.birlik, p.tur);
  if (narx && narx.valyuta === "UZS") {
    return { ...asos, price: narx.asl + Math.round(ustama * p.kurs), discount: yaxlit2(p.chegirma * p.kurs), currency: "UZS" };
  }
  return { ...asos, price: ustamaliNarx(p.narx, ustama), discount: p.chegirma, currency: "USD" };
}
