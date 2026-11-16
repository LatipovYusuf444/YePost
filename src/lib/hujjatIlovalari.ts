// Ombor hujjati ilovalari (POST /inventory/documents/:type/:id/attachments) uchun ruxsat etilgan fayllar —
// InventoryDocumentActivity'dagi "Fayl yuklash" bilan bir xil cheklov (10 MB, rasm/PDF/Word/Excel).
export const HUJJAT_ILOVA_FORMATLARI = ".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx";
export const HUJJAT_ILOVA_TURLARI = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
export const HUJJAT_ILOVA_MAKS_HAJMI = 10 * 1024 * 1024;
