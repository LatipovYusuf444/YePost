// Mijoz kartasidagi hisob valyutasi (backend: POST/PATCH /partners/customers `currency`: "UZS" | "USD" | null; javobda ham keladi).
// Dollar rejimida valyutasi tanlanmagan (null) mijozning hisobi dollarda yuritiladi. Valyuta faqat mijoz hisobi bo'sh bo'lganda o'zgaradi:
// hisobda pul bo'lsa o'zgarish keyingi bo'sh paytgacha kutadi. UI'siz va tashqi importlarsiz yozilgan — alohida sinash mumkin.

export type MijozValyutasi = "UZS" | "USD" | null;

type HisobHolati = { miqdor: number; valyuta: "UZS" | "USD" };

/** Backenddan kelgan qiymatni ("USD" | "uzs" | null | boshqa) tanlovga aylantiradi: noma'lum yoki bo'sh — `null` (belgilanmagan). */
export function mijozValyutasi(qiymat: unknown): MijozValyutasi {
  const kod = typeof qiymat === "string" ? qiymat.trim().toUpperCase() : "";
  return kod === "UZS" || kod === "USD" ? kod : null;
}

/** POST uchun: belgilanmagan valyuta yuborilmaydi (backend uni o'zi `null` deb oladi). */
export function yaratishValyutasi(tanlangan: MijozValyutasi | undefined): { currency?: "UZS" | "USD" } {
  return tanlangan ? { currency: tanlangan } : {};
}

/** PATCH uchun: faqat o'zgargan bo'lsa yuboriladi (`null` — tanlovni olib tashlash), aks holda maydon umuman yuborilmaydi. */
export function tahrirValyutasi(
  boshlangich: MijozValyutasi | undefined,
  tanlangan: MijozValyutasi | undefined
): { currency?: MijozValyutasi } {
  const yangi = tanlangan ?? null;
  return yangi === (boshlangich ?? null) ? {} : { currency: yangi };
}

/**
 * Tanlangan valyuta hisobning hozirgi valyutasidan farq qiladigan va hisobda pul bor bo'lsa — o'zgarish hali kuchga kirmagan
 * (hisob bo'shaguncha kutadi). Belgilanmagan valyuta dollar rejimida dollar hisoblanadi.
 */
export function valyutaKutmoqda(tanlangan: MijozValyutasi | undefined, hisob: HisobHolati): boolean {
  return hisob.miqdor > 0 && (tanlangan ?? "USD") !== hisob.valyuta;
}
