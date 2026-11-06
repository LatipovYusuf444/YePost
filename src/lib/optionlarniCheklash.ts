// Qidiruvli ro'yxatda (masalan, sotuvdagi mahsulot tanlovi) minglab variant bir vaqtda chizilmasligi uchun faqat dastlabki qismi ko'rsatiladi.
// Cheklash qidiruv filtridan KEYIN qo'llanadi: yozilgan so'zga mos hamma variant qidiruv orqali topiladi, ro'yxat esa qisqa qoladi.
export const OPTION_CHEGARASI = 100;

export function optionlarniCheklash<T>(royxat: readonly T[], chegara = OPTION_CHEGARASI): T[] {
  return royxat.length > chegara ? royxat.slice(0, chegara) : [...royxat];
}
