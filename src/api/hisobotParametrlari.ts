// Hisobot so'rovlari parametrlarini backend nomlariga moslash (backend noma'lum parametrni 400 bilan rad etadi).
// Bu fayl faqat turlarni import qiladi (testlarda to'g'ridan-to'g'ri ishlaydi).
import type { DiscountReportFilter } from "../types/reports.ts";

/** GET /reports/discounts: kassir filtri backendda `cashierId`; UI `responsibleId` bilan ham chaqirishi mumkin. */
export function chegirmaParametrlari(params: DiscountReportFilter) {
  const { responsibleId, ...qolgan } = params;
  return { groupBy: "DAY", ...qolgan, cashierId: qolgan.cashierId ?? responsibleId };
}
