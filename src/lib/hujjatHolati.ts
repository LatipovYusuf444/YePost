// Qoralama va bekor qilingan hujjatlarni o'chirish mumkin; tasdiqlanganini faqat bekor qilish mumkin.
export function hujjatOchiriladimi(status?: string | null) {
  return ["DRAFT", "CANCELLED", "CANCELED"].includes(String(status ?? "").toUpperCase());
}
