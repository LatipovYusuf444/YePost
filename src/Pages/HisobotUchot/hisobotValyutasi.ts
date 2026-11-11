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
  // Manfiy dollar "-$1.2" ko'rinishida (ishora belgisi oldida).
  return valyuta === "USD" ? (matn.startsWith("-") ? `-$${matn.slice(1)}` : `$${matn}`) : `${matn} ${uzsBelgi}`;
}

/**
 * Alohida ko'rsatiladigan valyutalar (so'm va dollar kartalari): ikki valyuta rejimida (`yagona` null) ikkalasi; bir valyutali rejimda faqat
 * rejim valyutasi. Rejim almashguncha yaratilgan eski hujjatlardan boshqa valyutada qiymat qolgan bo'lsa (`qiymatBor`), u ham yashirilmaydi.
 */
export function korinadiganValyutalar(
  yagona: HisobotValyutasi | null,
  qiymatBor: (valyuta: HisobotValyutasi) => boolean = () => false,
): HisobotValyutasi[] {
  const ikkalasi: HisobotValyutasi[] = ["UZS", "USD"];
  return yagona ? ikkalasi.filter((valyuta) => valyuta === yagona || qiymatBor(valyuta)) : ikkalasi;
}

/** Summalardan birortasi noldan farq qiladimi (bo'sh yoki son bo'lmagan qiymat — nol). */
export function nolEmasSummaBor(...summalar: unknown[]) {
  return summalar.some((summa) => {
    const son = Number(summa ?? 0);
    return Number.isFinite(son) && son !== 0;
  });
}
