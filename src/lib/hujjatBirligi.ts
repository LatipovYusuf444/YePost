// Ombor hujjatlarida (ko'chirish, hisobdan chiqarish, yetkazib beruvchiga qaytarish, kirim, inventarizatsiya) birlik bilan ishlash:
// qator birligi (korobka, qop, blok) va hamma qatorga bir yo'la qo'yiladigan "Umumiy birlik". UI'siz va `@/` importlarisiz — testlarda ishlaydi.
// Backend: qatorda ixtiyoriy `unitId`; `quantity` (qaytarishda `price` ham) shu birlikda kiritiladi, ombordan asosiy birlikda
// quantity × koeffitsient chiqadi; javobda `unitId`, `unitQuantity`, `factorSnapshot` (qaytarishda `unitPrice`) qaytadi.
import type { TovarBirligi } from "./kopBirlik.ts";

export type UmumiyBirlikVarianti = { unitId: string; nom: string };

const yaxlit = (son: number, xona: number) => Math.round(son * 10 ** xona) / 10 ** xona;

export function birlikNomi(birlik: Pick<TovarBirligi, "qisqa" | "nomi"> | undefined) {
  return birlik ? birlik.qisqa || birlik.nomi : "";
}

/** Hujjat qatorida tanlash mumkin birliklar (hammasi, asosiy birinchi, keyin koeffitsient bo'yicha); tovarda bitta birlik bo'lsa — bo'sh. */
export function hujjatBirliklari(birliklar: readonly TovarBirligi[] | undefined) {
  const royxat = [...(birliklar ?? [])].sort((a, b) => Number(b.asosiy) - Number(a.asosiy) || a.koeff - b.koeff);
  return royxat.length > 1 ? royxat : [];
}

/** Qatorning tanlangan qo'shimcha birligi (asosiy yoki topilmasa — undefined). `birlikId` "" — asosiy birlik. */
export function qatorBirligi(birliklar: readonly TovarBirligi[] | undefined, birlikId: string | null | undefined) {
  if (!birlikId) return undefined;
  const birlik = birliklar?.find((item) => item.unitId === birlikId);
  return birlik && !birlik.asosiy ? birlik : undefined;
}

/**
 * 1 qator birligida nechta asosiy birlik (asosiy birlikda — 1). Birliklar hali yuklanmagan saqlangan qatorda — saqlangan koeffitsient
 * (`zaxiraKoeff`, `factorSnapshot`): aks holda korobka soni asosiy birlik deb hisoblanardi.
 */
export function qatorKoeffi(birliklar: readonly TovarBirligi[] | undefined, birlikId: string | null | undefined, zaxiraKoeff = 1) {
  if (!birlikId) return 1;
  const birlik = birliklar?.find((item) => item.unitId === birlikId);
  if (birlik) return birlik.asosiy ? 1 : birlik.koeff;
  return zaxiraKoeff > 0 ? zaxiraKoeff : 1;
}

/** Qatordagi miqdor asosiy birlikda (qoldiq bilan solishtirish va summa uchun). */
export function asosiyBirlikdagiMiqdor(miqdor: number, koeff: number) {
  return yaxlit(miqdor * koeff, 6);
}

/** Qo'shimcha birlikda (korobka, qop) faqat butun son; asosiy yoki kasr birlikda — har qanday musbat son. */
export function birlikMiqdoriYaroqli(birlik: TovarBirligi | undefined, miqdor: number) {
  if (!(miqdor > 0)) return false;
  if (!birlik || birlik.asosiy || birlik.kasr) return true;
  return Number.isInteger(yaxlit(miqdor, 6));
}

/** Birlik almashganda narx: eski birlikdagi narx → asosiy → yangi birlikdagi narx (3 xonagacha). */
export function birlikdagiNarx(narx: number, eskiKoeff: number, yangiKoeff: number, xona = 3) {
  if (!Number.isFinite(narx) || !(eskiKoeff > 0) || !(yangiKoeff > 0)) return narx;
  return yaxlit((narx / eskiKoeff) * yangiKoeff, xona);
}

/**
 * "Umumiy birlik" variantlari: qatorlardagi (va kerak bo'lsa ombordagi) tovarlarning qo'shimcha birliklari, unitId bo'yicha bir marta,
 * birinchi uchragan tartibda. `ruxsat` — qaysi birliklar mumkin (kirimda faqat qabul birliklari).
 */
export function umumiyBirlikVariantlari(
  royxatlar: Iterable<readonly TovarBirligi[] | undefined>,
  ruxsat: (birlik: TovarBirligi) => boolean = () => true,
): UmumiyBirlikVarianti[] {
  const xarita = new Map<string, string>();
  for (const birliklar of royxatlar) {
    for (const birlik of birliklar ?? []) {
      if (birlik.asosiy || !ruxsat(birlik) || xarita.has(birlik.unitId)) continue;
      xarita.set(birlik.unitId, birlikNomi(birlik));
    }
  }
  return [...xarita].map(([unitId, nom]) => ({ unitId, nom }));
}

/** Umumiy birlik shu tovarda bormi: bor bo'lsa — o'sha birlik (qo'shimcha), asosiy yoki yo'q bo'lsa — undefined. */
export function umumiyBirlikTovarda(
  birliklar: readonly TovarBirligi[] | undefined,
  unitId: string | null | undefined,
  ruxsat: (birlik: TovarBirligi) => boolean = () => true,
) {
  if (!unitId) return undefined;
  return birliklar?.find((birlik) => !birlik.asosiy && birlik.unitId === unitId && ruxsat(birlik));
}

type SaqlanganBirlikliQator = {
  quantity?: unknown;
  unitId?: string | null;
  unitQuantity?: unknown;
  factorSnapshot?: unknown;
  price?: unknown;
  unitPrice?: unknown;
};

const musbat = (qiymat: unknown) => {
  if (qiymat === null || qiymat === undefined || qiymat === "") return null;
  const son = Number(qiymat);
  return Number.isFinite(son) && son > 0 ? son : null;
};

/**
 * Saqlangan hujjat qatori birlikda: birlikda kiritilgan bo'lsa (`unitId` + `unitQuantity`) — o'sha birlikdagi son va narx
 * (`unitPrice`, bo'lmasa asosiy narx × koeffitsient), aks holda asosiy birlikda.
 */
export function saqlanganQatorBirligida(item: SaqlanganBirlikliQator) {
  const soni = musbat(item.unitQuantity);
  const asosiySoni = Number(item.quantity ?? 0);
  const asosiyNarx = item.price === null || item.price === undefined || item.price === "" ? null : Number(item.price);
  if (item.unitId && soni !== null) {
    const koeff = musbat(item.factorSnapshot) ?? (asosiySoni > 0 ? asosiySoni / soni : 1);
    const birlikNarxi = item.unitPrice === null || item.unitPrice === undefined || item.unitPrice === "" ? null : Number(item.unitPrice);
    const narx = birlikNarxi !== null && Number.isFinite(birlikNarxi)
      ? birlikNarxi
      : asosiyNarx !== null && Number.isFinite(asosiyNarx) ? yaxlit(asosiyNarx * koeff, 3) : null;
    return { miqdor: soni, birlikId: item.unitId, koeff, narx };
  }
  return { miqdor: Number.isFinite(asosiySoni) ? asosiySoni : 0, birlikId: "", koeff: 1, narx: asosiyNarx !== null && Number.isFinite(asosiyNarx) ? asosiyNarx : null };
}

/**
 * So'rov qatori uchun: qo'shimcha birlik tanlangan bo'lsa `{ unitId }`, aks holda `{}` (asosiy birlik yuborilmaydi — backend ham uni
 * `unitId: null` deb saqlaydi). Birliklar hali yuklanmagan bo'lsa ham saqlangan birlik yuboriladi: miqdor o'sha birlikda kiritilgan,
 * `unitId`siz ketsa u asosiy birlik deb o'qilardi. Tovarda asosiy birlik id'si tanlangan bo'lsa (bo'lmasligi kerak) — yuborilmaydi.
 */
export function unitIdQismi(birliklar: readonly TovarBirligi[] | undefined, birlikId: string | null | undefined) {
  if (!birlikId) return {};
  if (birliklar?.some((birlik) => birlik.asosiy && birlik.unitId === birlikId)) return {};
  return { unitId: birlikId };
}
