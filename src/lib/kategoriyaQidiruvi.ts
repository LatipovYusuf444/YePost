// Kategoriya ro'yxatidagi qidiruv (UI'siz, importlarsiz — testlarda to'g'ridan-to'g'ri ishlaydi).
// Katta-kichik harf farq qilmaydi, so'z o'rtasidan ham topadi ("gipo" → "GIPOARK MOLLARI kuchada"),
// kirill va lotin yozuvi bir xil topiladi ("пена" ↔ "pena", "изоляция" ↔ "izolyatsiya").

const KIRILL_LOTIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "",
  ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h", і: "i", ї: "i", є: "e",
};

/**
 * Taqqoslash uchun yagona ko'rinish: kichik harf, kirill → lotin, tutuq belgilari (o', g', ʻ, ’) olib tashlanadi,
 * talaffuzi bir xil lotin variantlari tenglashtiriladi (x/h, zh/j, ts/c), bo'shliqlar bittaga qisqaradi.
 */
export function qidiruvKorinishi(matn: string): string {
  const kichik = matn.toLocaleLowerCase("ru").normalize("NFC");
  let lotin = "";
  for (const harf of kichik) lotin += KIRILL_LOTIN[harf] ?? harf;
  return lotin
    .replace(/['`ʻʼ’‘´]/g, "")
    .replace(/zh/g, "j")
    .replace(/x/g, "h")
    .replace(/ts/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nom qidiruv so'ziga mosmi (bo'sh so'z — hammasi mos). */
export function kategoriyaMosmi(nom: string, soz: string): boolean {
  const q = qidiruvKorinishi(soz);
  if (!q) return true;
  return qidiruvKorinishi(nom).includes(q);
}

/** Ro'yxatni so'z bo'yicha filtrlaydi; tartib o'zgarmaydi. */
export function kategoriyalarniFiltrlash<T extends { name: string }>(royxat: readonly T[], soz: string): T[] {
  const q = qidiruvKorinishi(soz);
  if (!q) return [...royxat];
  return royxat.filter((item) => qidiruvKorinishi(item.name).includes(q));
}
