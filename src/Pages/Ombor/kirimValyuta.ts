import type { Valyuta } from "@/lib/valyuta";
import type { TovarBirligi } from "../../lib/kopBirlik.ts";

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
  // Qabul birligi (qop, korobka): `quantity` va `price` shu birlikda; qo'shimcha birlikda `unitId` yuboriladi.
  birlik?: TovarBirligi;
  // Koeffitsient tekshiruvi: sanalgan birlik (pochka) va uning soni; backend haqiqiy koeffitsientni kartochka bilan solishtiradi.
  sanashBirligi?: TovarBirligi;
  sanashSoni?: number;
}, kurs: number | null) {
  const koeff = row.birlik && !row.birlik.asosiy ? row.birlik.koeff : 1;
  const boshlangich = (row.boshlangichTanNarx ?? 0) * koeff;
  return {
    modificationId: row.modificationId,
    quantity: row.quantity,
    price: Math.round(kirimNarxiniOgirish(row.price === "" ? boshlangich : Number(row.price), row.currency, "UZS", kurs) * 100) / 100,
    ...(row.birlik && !row.birlik.asosiy ? { unitId: row.birlik.unitId } : {}),
    ...(row.sanashBirligi && (row.sanashSoni ?? 0) > 0 ? { checkUnitId: row.sanashBirligi.unitId, checkCount: row.sanashSoni } : {}),
  };
}
