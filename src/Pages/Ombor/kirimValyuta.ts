import type { Valyuta } from "@/lib/valyuta";
import type { TovarBirligi } from "../../lib/kopBirlik.ts";

/** Kirimdagi narxni manba valyutasidan o‘giradi; kurssiz summaga boshqa belgi qo‘ymaydi. */
export function kirimNarxiniOgirish(qiymat: number, manba: Valyuta, maqsad: Valyuta, kurs: number | null) {
  if (!Number.isFinite(qiymat) || qiymat < 0) throw new Error("NARX_NOTOGRI");
  if (manba === maqsad) return qiymat;
  if (kurs === null || !Number.isFinite(kurs) || kurs <= 0) throw new Error("KURS_KERAK");
  return manba === "USD" ? qiymat * kurs : qiymat / kurs;
}

/**
 * Kirim hujjati valyutasi (backend `currency` — bitta hujjatga bitta). Hamma qator dollarda bo'lsa — USD: narxlar asl holida ketadi,
 * tannarx va yetkazib beruvchi qarzi brauzer kursiga bog'lanib qolmaydi (K7). Aralash yoki so'mda — UZS (dollar qatorlar kurs bilan o'giriladi).
 */
export function kirimHujjatValyutasi(rows: ReadonlyArray<{ currency: Valyuta }>): Valyuta {
  return rows.length > 0 && rows.every((row) => row.currency === "USD") ? "USD" : "UZS";
}

/**
 * Bir valyutali rejimda (Faqat so'm / Faqat dollar, `yagona`) kirim narxlari shu valyutada yoziladi. Katalogdagi boshqa valyutadagi
 * (rejim almashguncha saqlangan) narx kurs bo'lsa o'giriladi; kurs bo'lmasa soni o'zgarmaydi va `tekshirish` — summani tekshirish kerak
 * (kurs so'ralmaydi). Ikki valyuta rejimida (`yagona` null) narx o'z valyutasida, o'zgarishsiz qoladi.
 */
export function rejimNarxi(qiymat: number, manba: Valyuta, yagona: Valyuta | null, kurs: number | null) {
  if (!yagona || manba === yagona || !(qiymat > 0)) return { qiymat, tekshirish: false };
  if (kurs === null || !Number.isFinite(kurs) || kurs <= 0) return { qiymat, tekshirish: true };
  return { qiymat: Math.round(kirimNarxiniOgirish(qiymat, manba, yagona, kurs) * 100) / 100, tekshirish: false };
}

/** Purchase API narxlari hujjat valyutasida (`maqsad`, standart UZS): har bir mahsulot o‘z valyutasidan bir marta o‘giriladi. */
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
  // Seriyali tovar: har qator = bitta rulon, `quantity` — og'irligi.
  serial?: string;
}, kurs: number | null, maqsad: Valyuta = "UZS") {
  const koeff = row.birlik && !row.birlik.asosiy ? row.birlik.koeff : 1;
  const boshlangich = (row.boshlangichTanNarx ?? 0) * koeff;
  return {
    modificationId: row.modificationId,
    quantity: row.quantity,
    price: Math.round(kirimNarxiniOgirish(row.price === "" ? boshlangich : Number(row.price), row.currency, maqsad, kurs) * 100) / 100,
    ...(row.serial?.trim() ? { serial: row.serial.trim() } : {}),
    ...(row.birlik && !row.birlik.asosiy ? { unitId: row.birlik.unitId } : {}),
    ...(row.sanashBirligi && (row.sanashSoni ?? 0) > 0 ? { checkUnitId: row.sanashBirligi.unitId, checkCount: row.sanashSoni } : {}),
  };
}
