import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type { QollabQuvvatlashJavobi, QollabQuvvatlashXabari } from "@/types/support";

// Backendda hali mavjud emas — quyidagi endpointlar backendchi tomonidan
// qo'shilishi kerak (to'liq spetsifikatsiya chatda yozilgan):
//   GET    /support/messages?cursor=&limit=
//   POST   /support/messages           { text, attachmentIds? }
//   PATCH  /support/messages/read
//   GET    /support/unread-count
export const supportApi = {
  xabarlar: async (params?: { cursor?: string; limit?: number }) =>
    apiList(
      (
        await apiClient.get<QollabQuvvatlashJavobi | ApiListEnvelope<QollabQuvvatlashXabari>>("/support/messages", {
          params,
        })
      ).data
    ),

  xabarYuborish: async (text: string, attachmentIds?: string[]) =>
    apiData(
      (
        await apiClient.post<QollabQuvvatlashXabari | ApiEnvelope<QollabQuvvatlashXabari>>("/support/messages", {
          text,
          attachmentIds,
        })
      ).data
    ),

  oqilganDebBelgilash: async () => apiClient.patch("/support/messages/read"),

  oqilmaganSoni: async () =>
    apiData((await apiClient.get<{ count: number } | ApiEnvelope<{ count: number }>>("/support/unread-count")).data),
};
