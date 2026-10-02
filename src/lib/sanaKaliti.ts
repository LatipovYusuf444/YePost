// Sana filtrlari (DateRangePicker) foydalanuvchining mahalliy kunlari bilan ishlaydi (YYYY-MM-DD).
// Backend vaqtni UTC'da qaytaradi, shuning uchun hujjat sanasini ham mahalliy kunga o'tkazib solishtirish kerak:
// `toISOString().slice(0, 10)` kechasi (masalan, Toshkentda 00:00–05:00) hujjatni oldingi kunga o'tkazib yuboradi.
export function mahalliySanaKaliti(qiymat?: string | number | Date | null) {
  if (qiymat === undefined || qiymat === null || qiymat === "") return "";
  const sana = qiymat instanceof Date ? qiymat : new Date(qiymat);
  if (Number.isNaN(sana.getTime())) return "";
  const oy = String(sana.getMonth() + 1).padStart(2, "0");
  const kun = String(sana.getDate()).padStart(2, "0");
  return `${sana.getFullYear()}-${oy}-${kun}`;
}

export function bugungiSanaKaliti() {
  return mahalliySanaKaliti(new Date());
}
