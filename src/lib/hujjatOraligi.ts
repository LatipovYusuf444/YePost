// Hujjat ro'yxatlari (kirim, chiqim, ko'chirma) uchun sana oralig'i: YYYY-MM-DD, ikkala chet ham kiradi (backend dateFrom/dateTo).
export type HujjatOraligi = { dateFrom?: string; dateTo?: string };

export function hujjatOraligiParametrlari(oraliq?: HujjatOraligi) {
  const params: Record<string, string> = {};
  if (oraliq?.dateFrom) params.dateFrom = oraliq.dateFrom;
  if (oraliq?.dateTo) params.dateTo = oraliq.dateTo;
  return Object.keys(params).length ? { params } : undefined;
}
