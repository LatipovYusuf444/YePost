export type HisobotValyutasi = "UZS" | "USD";

export function hisobotValyutasiniTekshirish(currency: unknown, kutilgan?: HisobotValyutasi): HisobotValyutasi {
  const valyuta = String(currency ?? "").toUpperCase();
  if (valyuta !== "USD" && valyuta !== "UZS") throw new Error("Backend hisobot valyutasini currency orqali qaytarishi kerak.");
  if (kutilgan && valyuta !== kutilgan) throw new Error("Backend hisobot valyutasi so'ralgan valyutaga mos kelmadi.");
  return valyuta;
}

/** Server tanlangan valyutada hisoblagan summani faqat formatlaydi; kurs ishlatilmaydi. */
export function hisobotPulMatni(summa: number, valyuta: HisobotValyutasi, uzsBelgi = "so'm") {
  const yaxlit = valyuta === "UZS" ? Math.round(summa) : summa;
  const matn = (yaxlit === 0 ? 0 : yaxlit).toLocaleString("uz-UZ", { maximumFractionDigits: valyuta === "USD" ? 2 : 0 });
  return valyuta === "USD" ? `$${matn}` : `${matn} ${uzsBelgi}`;
}
