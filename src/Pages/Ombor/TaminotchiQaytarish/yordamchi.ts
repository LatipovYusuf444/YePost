import type { TaminotchiQaytarishHujjati, TaminotchiQaytarishQatori } from "@/types/taminotchiQaytarish";

/** Yetkazib beruvchi nomi: javobdagi `supplier.name`, bo'lmasa ro'yxatdan. */
export function yetkazibBeruvchiNomi(hujjat: Pick<TaminotchiQaytarishHujjati, "supplier" | "supplierId">, royxat: ReadonlyArray<{ id: string; name?: string | null }>) {
  return hujjat.supplier?.name?.trim() || royxat.find((item) => item.id === hujjat.supplierId)?.name?.trim() || "";
}

/** Qator nomi: mahsulot va (asosiydan farqli bo'lsa) variant. */
export function qatorNomi(qator: Pick<TaminotchiQaytarishQatori, "productName" | "modificationName">) {
  const mahsulot = qator.productName?.trim() ?? "";
  const variant = qator.modificationName?.trim() ?? "";
  return [mahsulot, variant && variant !== mahsulot && variant !== "Asosiy variant" ? variant : ""].filter(Boolean).join(" / ");
}

/** Ro'yxatdagi qisqa mazmun: birinchi mahsulot va qolganlar soni. */
export function mahsulotlarMatni(hujjat: Pick<TaminotchiQaytarishHujjati, "items">) {
  const qatorlar = hujjat.items ?? [];
  if (!qatorlar.length) return "";
  const birinchi = qatorNomi(qatorlar[0]);
  return qatorlar.length > 1 ? `${birinchi} +${qatorlar.length - 1}` : birinchi;
}

export const HOLAT_RANGI: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  CANCELLED: "bg-red-50 text-red-500 ring-red-100",
  DRAFT: "bg-amber-50 text-amber-600 ring-amber-100",
};
