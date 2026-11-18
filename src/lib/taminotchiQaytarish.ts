// Yetkazib beruvchiga qaytarish: forma qiymatlarini so'rov tanasiga yig'ish va kirim narxini topish (UI'siz — testlarda ishlaydi).
import type { TaminotchiQaytarishHujjati, TaminotchiQaytarishTanasi } from "../types/taminotchiQaytarish.ts";

export type QaytarishFormaQatori = {
  id: string;
  modificationId: string;
  warehouseId: string;
  quantity: string;
  // Tanlangan kirim (ixtiyoriy): narx shu kirimdan to'ldiriladi, tovar avval shu kirim partiyalaridan chiqadi.
  purchaseId: string;
  price: string;
  // Narx kirimdan avtomatik qo'yilganmi: foydalanuvchi o'zgartirmasa `price` yuborilmaydi (server kirim narxini o'zi qo'yadi).
  narxKirimdan: boolean;
  // Rulonli (seriyali) tovar: partiya (batchId) majburiy.
  seriyali: boolean;
  batchId: string;
  serial: string;
};

export type QaytarishForma = {
  supplierId: string;
  currency: "UZS" | "USD";
  note: string;
  qatorlar: QaytarishFormaQatori[];
};

export type FormaXatolari = Record<string, string>;

const son = (qiymat: string | number | null | undefined) => {
  if (qiymat === null || qiymat === undefined || String(qiymat).trim() === "") return undefined;
  const natija = Number(String(qiymat).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(natija) ? natija : undefined;
};

/** Kirim (tasdiqlangan, shu yetkazib beruvchi) ichidagi shu tovarning o'rtacha narxi (asosiy birlik, kirim valyutasida). */
export function kirimNarxi(kirim: { items?: Array<{ modificationId: string; quantity?: number | string | null; price?: number | string | null }> } | null | undefined, modificationId: string) {
  const qatorlar = (kirim?.items ?? []).filter((item) => item.modificationId === modificationId);
  const miqdor = qatorlar.reduce((jami, item) => jami + (Number(item.quantity) || 0), 0);
  if (!qatorlar.length) return undefined;
  if (miqdor <= 0) return Number(qatorlar[0].price) || 0;
  const summa = qatorlar.reduce((jami, item) => jami + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  return Math.round((summa / miqdor) * 1000) / 1000;
}

/** Qaytarish uchun mos kirimlar: tasdiqlangan, shu yetkazib beruvchiniki va ichida shu tovar bor (yangisi birinchi). */
export function mosKirimlar<T extends { id: string; status?: string | null; supplierId?: string | null; date?: string | null; createdAt?: string | null; items?: Array<{ modificationId: string }> }>(
  kirimlar: readonly T[],
  supplierId: string,
  modificationId: string
): T[] {
  if (!supplierId || !modificationId) return [];
  return kirimlar
    .filter((kirim) => String(kirim.status ?? "").toUpperCase() === "CONFIRMED" && kirim.supplierId === supplierId && (kirim.items ?? []).some((item) => item.modificationId === modificationId))
    .sort((a, b) => String(b.date ?? b.createdAt ?? "").localeCompare(String(a.date ?? a.createdAt ?? "")));
}

/** Hujjat summasi (Σ miqdor × narx) — formada jonli ko'rsatish uchun. */
export function formaJami(qatorlar: readonly Pick<QaytarishFormaQatori, "quantity" | "price">[]) {
  return Math.round(qatorlar.reduce((jami, qator) => jami + (son(qator.quantity) ?? 0) * (son(qator.price) ?? 0), 0) * 100) / 100;
}

/**
 * Forma → so'rov tanasi. Xato bo'lsa `{ xatolar }` (kalit — backend yo'li: `supplierId`, `items.0.quantity`). Qoidalar backend bilan bir xil:
 * yetkazib beruvchi va har qatorda mahsulot, ombor, miqdor > 0 majburiy; kirimsiz qatorda narx majburiy; rulonli tovarda rulon (batchId) majburiy.
 * Kirim tanlangan va narx o'zgartirilmagan bo'lsa narx yuborilmaydi — server kirimdagi narxni o'zi qo'yadi.
 */
export function qaytarishTanasiniYigish(
  forma: QaytarishForma,
  matn: (kalit: string) => string,
  qoshimcha: Pick<TaminotchiQaytarishTanasi, "date" | "responsibleId"> = {}
): { tana: TaminotchiQaytarishTanasi } | { xatolar: FormaXatolari } {
  const xatolar: FormaXatolari = {};
  if (!forma.supplierId) xatolar.supplierId = matn("errors.supplier");
  // Bo'sh qatorlar yuborilmaydi; xato kaliti — formadagi qator raqami (oyna bo'sh qatorlarni oldin olib tashlaydi, shuning uchun
  // u so'rovdagi `items.N` bilan ham bir xil).
  const toliq = forma.qatorlar.map((qator, i) => ({ qator, i })).filter(({ qator }) => qator.modificationId || qator.quantity.trim() || qator.price.trim());
  if (toliq.length === 0) xatolar.items = matn("errors.noLines");
  const items: TaminotchiQaytarishTanasi["items"] = [];
  toliq.forEach(({ qator, i }) => {
    const quantity = son(qator.quantity);
    const price = son(qator.price);
    if (!qator.modificationId) xatolar[`items.${i}.modificationId`] = matn("errors.product");
    if (!qator.warehouseId) xatolar[`items.${i}.warehouseId`] = matn("errors.warehouse");
    if (!(quantity && quantity > 0)) xatolar[`items.${i}.quantity`] = matn("errors.quantity");
    if (price !== undefined && price < 0) xatolar[`items.${i}.price`] = matn("errors.price");
    else if (!qator.purchaseId && price === undefined) xatolar[`items.${i}.price`] = matn("errors.priceRequired");
    if (qator.seriyali && !qator.batchId) xatolar[`items.${i}.batchId`] = matn("errors.rollRequired");
    items.push({
      modificationId: qator.modificationId,
      warehouseId: qator.warehouseId,
      quantity: quantity ?? 0,
      ...(qator.purchaseId ? { purchaseId: qator.purchaseId } : {}),
      ...(qator.batchId ? { batchId: qator.batchId } : {}),
      ...(price !== undefined && !(qator.purchaseId && qator.narxKirimdan) ? { price } : {}),
    });
  });
  if (Object.keys(xatolar).length) return { xatolar };
  return {
    tana: {
      ...(qoshimcha.date ? { date: qoshimcha.date } : {}),
      supplierId: forma.supplierId,
      currency: forma.currency,
      ...(qoshimcha.responsibleId ? { responsibleId: qoshimcha.responsibleId } : {}),
      note: forma.note.trim(),
      items,
    },
  };
}

/** Saqlangan hujjat → forma (tahrirlash). */
export function hujjatdanForma(hujjat: TaminotchiQaytarishHujjati, seriyalimi: (modificationId: string) => boolean): QaytarishForma {
  const matn = (qiymat: unknown) => (qiymat === null || qiymat === undefined ? "" : String(qiymat));
  return {
    supplierId: hujjat.supplierId,
    currency: hujjat.currency === "USD" ? "USD" : "UZS",
    note: hujjat.note ?? "",
    qatorlar: (hujjat.items ?? []).map((item, i) => ({
      id: item.id ?? `q${i}`,
      modificationId: item.modificationId,
      warehouseId: item.warehouseId,
      quantity: matn(item.quantity),
      purchaseId: item.purchaseId ?? "",
      price: matn(item.price),
      // Saqlangan narx — foydalanuvchi qiymati: tahrirda doim yuboriladi.
      narxKirimdan: false,
      seriyali: seriyalimi(item.modificationId),
      batchId: item.batchId ?? "",
      serial: "",
    })),
  };
}

/** Holat: DRAFT → (tasdiqlash) CONFIRMED → (bekor) CANCELLED → (tiklash) DRAFT. */
export function qaytarishHolati(status?: string | null) {
  const holat = String(status ?? "DRAFT").toUpperCase();
  return holat === "CANCELED" ? "CANCELLED" : holat;
}
