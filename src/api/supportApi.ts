import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type { QollabQuvvatlashJavobi, QollabQuvvatlashXabari } from "@/types/support";

export const supportApi = {
  // Yangi xabarlar birinchi keladi; eskilarini olish uchun oldingi
  // javobdagi nextCursorni cursor sifatida yuborish kerak.
  xabarlar: async (params?: { cursor?: string; limit?: number }) => {
    const javob = apiData(
      (
        await apiClient.get<QollabQuvvatlashJavobi | ApiEnvelope<QollabQuvvatlashJavobi>>(
          "/support/messages",
          { params }
        )
      ).data
    );
    if (Array.isArray(javob)) return { items: javob, nextCursor: null as string | null };
    return {
      items: javob.items ?? javob.results ?? javob.data ?? javob.value ?? [],
      nextCursor: javob.nextCursor ?? javob.cursor ?? null,
    };
  },

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
