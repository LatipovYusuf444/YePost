import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type { ZavodBonusi, ZavodBonusiFiltri, ZavodBonusiPayload } from "@/types/zavodBonusi";

type Sahifa<T> = { data?: T[]; items?: T[]; page?: number; pageSize?: number; total?: number; totalPages?: number };

const YOL = "/finance/supplier-bonuses";
const MAX_SAHIFA_HAJMI = 100;

// Bo'sh qiymatlar so'rovga qo'shilmaydi.
function tozaParametrlar(filtr: ZavodBonusiFiltri) {
  return Object.fromEntries(Object.entries(filtr).filter(([, qiymat]) => qiymat !== undefined && qiymat !== ""));
}

type Bonus = ZavodBonusi | ApiEnvelope<ZavodBonusi>;

// Backend: GET/POST/PATCH/DELETE /finance/supplier-bonuses va /:id/confirm|cancel|restore.
// Ruxsat: DIREKTOR yoki CASH_IN huquqi; o'chirish — DELETE huquqi.
export const zavodBonusiApi = {
  royxat: async (filtr: ZavodBonusiFiltri = {}) => {
    const raw = (await apiClient.get<Sahifa<ZavodBonusi> | ZavodBonusi[]>(YOL, { params: tozaParametrlar(filtr) })).data;
    if (Array.isArray(raw)) return { items: raw, page: 1, pageSize: raw.length, total: raw.length, totalPages: 1 };
    const items = raw.data ?? raw.items ?? [];
    return {
      items,
      page: Number(raw.page ?? 1),
      pageSize: Number(raw.pageSize ?? items.length),
      total: Number(raw.total ?? items.length),
      totalPages: Number(raw.totalPages ?? 1),
    };
  },
  // Barcha sahifalarni yig'adi (sahifa hajmi backend chegarasi — 100).
  barchasi: async (filtr: Omit<ZavodBonusiFiltri, "page" | "pageSize"> = {}) => {
    const birinchi = await zavodBonusiApi.royxat({ ...filtr, page: 1, pageSize: MAX_SAHIFA_HAJMI });
    if (birinchi.totalPages <= 1) return birinchi.items;
    const qolgan = await Promise.all(
      Array.from({ length: birinchi.totalPages - 1 }, (_, index) =>
        zavodBonusiApi.royxat({ ...filtr, page: index + 2, pageSize: MAX_SAHIFA_HAJMI }),
      ),
    );
    return [birinchi.items, ...qolgan.map((sahifa) => sahifa.items)].flat();
  },
  olish: async (id: string) => apiData((await apiClient.get<Bonus>(`${YOL}/${id}`)).data),
  yaratish: async (data: ZavodBonusiPayload) => apiData((await apiClient.post<Bonus>(YOL, data)).data),
  // Faqat qoralamani tahrirlash mumkin.
  yangilash: async (id: string, data: Partial<ZavodBonusiPayload>) => apiData((await apiClient.patch<Bonus>(`${YOL}/${id}`, data)).data),
  tasdiqlash: async (id: string) => apiData((await apiClient.post<Bonus>(`${YOL}/${id}/confirm`)).data),
  bekorQilish: async (id: string) => apiData((await apiClient.post<Bonus>(`${YOL}/${id}/cancel`)).data),
  // Bekor qilingan bonus qoralamaga qaytadi.
  tiklash: async (id: string) => apiData((await apiClient.post<Bonus>(`${YOL}/${id}/restore`)).data),
  // Faqat qoralama yoki bekor qilingan bonus o'chiriladi.
  ochirish: async (id: string) => {
    await apiClient.delete(`${YOL}/${id}`);
  },
};
