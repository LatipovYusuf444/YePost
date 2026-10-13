import type { Valyuta } from "@/lib/valyuta";

/** Kirimdagi narxni manba valyutasidan o‘giradi; kurssiz summaga boshqa belgi qo‘ymaydi. */
export function kirimNarxiniOgirish(qiymat: number, manba: Valyuta, maqsad: Valyuta, kurs: number | null) {
  if (!Number.isFinite(qiymat) || qiymat < 0) throw new Error("NARX_NOTOGRI");
  if (manba === maqsad) return qiymat;
  if (kurs === null || !Number.isFinite(kurs) || kurs <= 0) throw new Error("KURS_KERAK");
  return manba === "USD" ? qiymat * kurs : qiymat / kurs;
}

/** Mavjud purchase API narxlari UZS: har bir mahsulot o‘z valyutasidan bir marta o‘giriladi. */
export function kirimElementiniYigish(row: {
  modificationId: string;
  quantity: number;
  price: string;
  currency: Valyuta;
  boshlangichTanNarx?: number;
}, kurs: number | null) {
  return {
    modificationId: row.modificationId,
    quantity: row.quantity,
    price: Math.round(kirimNarxiniOgirish(row.price === "" ? (row.boshlangichTanNarx ?? 0) : Number(row.price), row.currency, "UZS", kurs) * 100) / 100,
  };
}
