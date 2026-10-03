import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type {
  QollabQuvvatlashJavobi,
  QollabQuvvatlashXabari,
  PlatformSupportTicket,
  SupportTicket,
  SupportTicketHolati,
} from "@/types/support";

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

  // ---- Murojaatlar (tickets): docs/support-backend-spec.md ----
  tickets: async (params?: { status?: SupportTicketHolati; search?: string; limit?: number }) => {
    const javob = apiData(
      (await apiClient.get<SupportTicket[] | ApiEnvelope<SupportTicket[]> | { items?: SupportTicket[] }>("/support/tickets", { params }))
        .data
    );
    if (Array.isArray(javob)) return javob;
    return (javob as { items?: SupportTicket[] }).items ?? [];
  },

  ticketYaratish: async (data: { subject: string; text?: string; attachmentIds?: string[] }) =>
    apiData((await apiClient.post<SupportTicket | ApiEnvelope<SupportTicket>>("/support/tickets", data)).data),

  ticketXabarlari: async (id: string, params?: { cursor?: string; limit?: number }) => {
    const javob = apiData(
      (
        await apiClient.get<QollabQuvvatlashJavobi | ApiEnvelope<QollabQuvvatlashJavobi>>(
          `/support/tickets/${id}/messages`,
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

  ticketXabarYuborish: async (id: string, text: string, attachmentIds?: string[]) =>
    apiData(
      (
        await apiClient.post<QollabQuvvatlashXabari | ApiEnvelope<QollabQuvvatlashXabari>>(
          `/support/tickets/${id}/messages`,
          { text, attachmentIds }
        )
      ).data
    ),

  ticketOqilgan: async (id: string) => apiClient.patch(`/support/tickets/${id}/read`),

  ticketHolati: async (id: string, status: SupportTicketHolati) =>
    apiData((await apiClient.patch<SupportTicket | ApiEnvelope<SupportTicket>>(`/support/tickets/${id}/status`, { status })).data),
};

// Super admin (YePost xodimi) tomoni: barcha kompaniyalar murojaatlari. Xodim javobi direction: "IN" bilan keladi.
export const platformSupportApi = {
  tickets: async (params?: { status?: SupportTicketHolati; search?: string; workspaceId?: string; assigneeId?: string; limit?: number }) => {
    const javob = apiData(
      (await apiClient.get<PlatformSupportTicket[] | ApiEnvelope<PlatformSupportTicket[]> | { items?: PlatformSupportTicket[] }>("/platform/support/tickets", { params })).data
    );
    if (Array.isArray(javob)) return javob;
    return (javob as { items?: PlatformSupportTicket[] }).items ?? [];
  },

  xabarlar: async (id: string, params?: { cursor?: string; limit?: number }) => {
    const javob = apiData(
      (
        await apiClient.get<QollabQuvvatlashJavobi | ApiEnvelope<QollabQuvvatlashJavobi>>(
          `/platform/support/tickets/${id}/messages`,
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

  javob: async (id: string, text: string) =>
    apiData(
      (await apiClient.post<QollabQuvvatlashXabari | ApiEnvelope<QollabQuvvatlashXabari>>(`/platform/support/tickets/${id}/messages`, { text })).data
    ),

  oqilgan: async (id: string) => apiClient.patch(`/platform/support/tickets/${id}/read`),

  // O'ziga biriktirish: mas'ul = shu xodim, holat = IN_PROGRESS (yakunlanganiga 409).
  biriktirish: async (id: string) =>
    apiData((await apiClient.post<PlatformSupportTicket | ApiEnvelope<PlatformSupportTicket>>(`/platform/support/tickets/${id}/assign`)).data),

  holat: async (id: string, status: SupportTicketHolati) =>
    apiData(
      (await apiClient.patch<PlatformSupportTicket | ApiEnvelope<PlatformSupportTicket>>(`/platform/support/tickets/${id}/status`, { status })).data
    ),
};
