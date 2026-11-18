import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import { ogohlantirishBilanBajarish } from "./hujjatOgohlantirishi";
import { hujjatOraligiParametrlari, type HujjatOraligi } from "@/lib/hujjatOraligi";
import type { TaminotchiQaytarishHujjati, TaminotchiQaytarishTanasi } from "@/types/taminotchiQaytarish";

// Yetkazib beruvchiga qaytarish. Yaratish/tahrirlash/o'chirish/tasdiqlash — OMBORCHI, ADMIN, DIRECTOR; bekor qilish va tiklash — ADMIN, DIRECTOR.
const YOL = "/inventory/supplier-returns";
type Javob = TaminotchiQaytarishHujjati | ApiEnvelope<TaminotchiQaytarishHujjati>;

/** Javob ichidagi `warnings` (NEGATIVE_STOCK) hujjatga qo'shiladi (konvert ichida yoki tashqarisida kelishi mumkin). */
function hujjatJavobi(raw: unknown): TaminotchiQaytarishHujjati {
  const hujjat = apiData(raw as Javob);
  const tashqi = raw && typeof raw === "object" ? (raw as { warnings?: unknown }).warnings : undefined;
  return Array.isArray(tashqi) && !hujjat.warnings ? { ...hujjat, warnings: tashqi } : hujjat;
}

export const taminotchiQaytarishApi = {
  // page/pageSize berilmasa server hammasini bitta sahifada qaytaradi.
  royxat: async (oraliq?: HujjatOraligi & { supplierId?: string; warehouseId?: string; status?: string }) => {
    const parametrlar = hujjatOraligiParametrlari(oraliq);
    const params = { ...(parametrlar?.params ?? {}), ...(oraliq?.supplierId ? { supplierId: oraliq.supplierId } : {}), ...(oraliq?.warehouseId ? { warehouseId: oraliq.warehouseId } : {}), ...(oraliq?.status ? { status: oraliq.status } : {}) };
    return apiList((await apiClient.get<TaminotchiQaytarishHujjati[] | ApiListEnvelope<TaminotchiQaytarishHujjati>>(YOL, { params })).data);
  },
  olish: async (id: string) => hujjatJavobi((await apiClient.get<Javob>(`${YOL}/${id}`)).data),
  yaratish: async (tana: TaminotchiQaytarishTanasi) => hujjatJavobi((await apiClient.post<Javob>(YOL, tana)).data),
  // Faqat DRAFT. items yuborilsa qatorlar butunlay almashadi.
  yangilash: async (id: string, tana: Partial<TaminotchiQaytarishTanasi>) => hujjatJavobi((await apiClient.patch<Javob>(`${YOL}/${id}`, tana)).data),
  // before_stock_take savoliga rozilik bo'lsa { confirmWarnings: true } bilan qayta yuboriladi.
  tasdiqlash: async (id: string) => hujjatJavobi((await ogohlantirishBilanBajarish((tana) => apiClient.post<Javob>(`${YOL}/${id}/confirm`, tana))).data),
  bekorQilish: async (id: string) => hujjatJavobi((await apiClient.post<Javob>(`${YOL}/${id}/cancel`)).data),
  tiklash: async (id: string) => hujjatJavobi((await apiClient.post<Javob>(`${YOL}/${id}/restore`)).data),
  // DRAFT yoki CANCELLED.
  ochirish: async (id: string) => {
    await apiClient.delete(`${YOL}/${id}`);
  },
};
