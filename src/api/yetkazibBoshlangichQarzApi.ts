import apiClient from "./axios";
import type { BoshlangichQarzMalumoti } from "../lib/boshlangichQarz.ts";
import { yetkazibQarzi, yetkazibQarzlari, type YetkazibBoshlangichQarzi } from "../lib/yetkazibBoshlangichQarz.ts";

// Yetkazib beruvchiga boshlang'ich qarz (faqat admin va direktor). Javoblar odatdagi { success, statusCode, data } ichida.
// Xatolar: errors.currency.mode_off, errors.document.date_in_future, 423 yopilgan davr, errors.inventory.confirmed_only_cancelable,
// errors.inventory.cancelled_only_restorable, errors.partners.supplier_opening_debt_not_found — matnlari api/xatoKodlari'da.
const yol = (yetkazibId: string) => `/partners/suppliers/${yetkazibId}`;

function qarzniOqish(raw: unknown): YetkazibBoshlangichQarzi {
  const qarz = yetkazibQarzi(raw);
  if (!qarz) throw new Error("Backend boshlang'ich qarz yozuvini qaytarmadi.");
  return qarz;
}

export const yetkazibBoshlangichQarzApi = {
  // POST /partners/suppliers/:id/opening-debt { amount, currency?, date?, note? } → darhol tasdiqlangan qarz (docNumber YQB-000001).
  yaratish: async (yetkazibId: string, malumot: BoshlangichQarzMalumoti) =>
    qarzniOqish((await apiClient.post<unknown>(`${yol(yetkazibId)}/opening-debt`, malumot)).data),

  // GET /partners/suppliers/:id/opening-debts → yangisi birinchi, bekor qilinganlari ham (status: "CANCELLED").
  royxat: async (yetkazibId: string) => yetkazibQarzlari((await apiClient.get<unknown>(`${yol(yetkazibId)}/opening-debts`)).data),

  // POST /partners/suppliers/:id/opening-debts/:debtId/cancel
  bekorQilish: async (yetkazibId: string, qarzId: string) =>
    yetkazibQarzi((await apiClient.post<unknown>(`${yol(yetkazibId)}/opening-debts/${qarzId}/cancel`)).data),

  // POST /partners/suppliers/:id/opening-debts/:debtId/restore — bekor qilingan qarzni qayta tiklaydi.
  tiklash: async (yetkazibId: string, qarzId: string) =>
    yetkazibQarzi((await apiClient.post<unknown>(`${yol(yetkazibId)}/opening-debts/${qarzId}/restore`)).data),
};
