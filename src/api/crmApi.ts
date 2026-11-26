import apiClient from "./axios";
import { apiData, apiList, sahifaJavobi, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  Activity,
  ActivityFilter,
  ActivitySaqlash,
  ActivityYangilash,
  Attachment,
  Bildirishnoma,
  ChatMessage,
  ChatThread,
  Comment,
  CommentSaqlash,
  CursorJavobi,
  CustomField,
  CustomFieldSaqlash,
  Lid,
  LidIzohi,
  LidKartochkasi,
  LidStatistikasi,
  MijozDublikatFilter,
  MijozKartasi,
  RoyxatJavobi,
  TimelineFilter,
  TimelineItem,
} from "@/types/crm";

function tozaParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null)
  );
}

export function royxatniAjratish<T>(data: RoyxatJavobi<T> | CursorJavobi<T>): T[] {
  return apiList(data as T[] | ApiListEnvelope<T>);
}

export const crmApi = {
  partnerTimeline: async (partnerId: string, params?: TimelineFilter) =>
    apiData(
      (
        await apiClient.get<CursorJavobi<TimelineItem> | ApiEnvelope<CursorJavobi<TimelineItem>>>(
          `/crm/partners/${partnerId}/timeline`,
          { params: tozaParams(params) }
        )
      ).data
    ),

  bildirishnomalar: async (unread?: boolean) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<Bildirishnoma> | ApiListEnvelope<Bildirishnoma>>("/crm/notifications", {
          params: unread === undefined ? undefined : { unread },
        })
      ).data
    ),
  bildirishnomaOqildi: async (id: string) =>
    apiData((await apiClient.post<Bildirishnoma | ApiEnvelope<Bildirishnoma>>(`/crm/notifications/${id}/read`)).data),
  barchaBildirishnomalarOqildi: async () =>
    apiData((await apiClient.post<Bildirishnoma[] | ApiEnvelope<Bildirishnoma[]>>("/crm/notifications/read-all")).data),

  customFields: async (entityType?: string) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<CustomField> | ApiListEnvelope<CustomField>>("/crm/custom-fields", {
          params: tozaParams({ entityType }),
        })
      ).data
    ),
  customFieldYaratish: async (data: CustomFieldSaqlash) =>
    apiData((await apiClient.post<CustomField | ApiEnvelope<CustomField>>("/crm/custom-fields", data)).data),
  customFieldYangilash: async (id: string, data: CustomFieldSaqlash) =>
    apiData((await apiClient.patch<CustomField | ApiEnvelope<CustomField>>(`/crm/custom-fields/${id}`, data)).data),
  customFieldOchirish: async (id: string) =>
    apiData((await apiClient.delete<CustomField | ApiEnvelope<CustomField>>(`/crm/custom-fields/${id}`)).data),

  dublikatlar: async (params: MijozDublikatFilter) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<unknown> | ApiListEnvelope<unknown>>("/crm/customers/duplicates", {
          params: tozaParams(params),
        })
      ).data
    ),
  mijozKartasi: async (customerId: string) =>
    apiData((await apiClient.get<MijozKartasi | ApiEnvelope<MijozKartasi>>(`/crm/customers/${customerId}/card`)).data),

  activities: async (params?: ActivityFilter) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<Activity> | ApiListEnvelope<Activity>>("/crm/activities", {
          params: tozaParams(params),
        })
      ).data
    ),
  activityYaratish: async (data: ActivitySaqlash) =>
    apiData((await apiClient.post<Activity | ApiEnvelope<Activity>>("/crm/activities", data)).data),
  myDay: async () =>
    royxatniAjratish(
      (await apiClient.get<RoyxatJavobi<Activity> | ApiListEnvelope<Activity>>("/crm/activities/my-day")).data
    ),
  activityOlish: async (id: string) =>
    apiData((await apiClient.get<Activity | ApiEnvelope<Activity>>(`/crm/activities/${id}`)).data),
  activityYangilash: async (id: string, data: ActivityYangilash) =>
    apiData((await apiClient.patch<Activity | ApiEnvelope<Activity>>(`/crm/activities/${id}`, data)).data),
  activityOchirish: async (id: string) =>
    apiData((await apiClient.delete<Activity | ApiEnvelope<Activity>>(`/crm/activities/${id}`)).data),
  activityYakunlash: async (id: string, result?: string) =>
    apiData((await apiClient.post<Activity | ApiEnvelope<Activity>>(`/crm/activities/${id}/complete`, { result })).data),

  partnerComments: async (partnerId: string, params?: { cursor?: string; limit?: number }) =>
    apiData(
      (
        await apiClient.get<CursorJavobi<Comment> | ApiEnvelope<CursorJavobi<Comment>>>(
          `/crm/partners/${partnerId}/comments`,
          { params: tozaParams(params) }
        )
      ).data
    ),
  partnerCommentYaratish: async (partnerId: string, data: CommentSaqlash) =>
    apiData((await apiClient.post<Comment | ApiEnvelope<Comment>>(`/crm/partners/${partnerId}/comments`, data)).data),
  commentYangilash: async (id: string, text: string) =>
    apiData((await apiClient.patch<Comment | ApiEnvelope<Comment>>(`/crm/comments/${id}`, { text })).data),
  commentOchirish: async (id: string) =>
    apiData((await apiClient.delete<Comment | ApiEnvelope<Comment>>(`/crm/comments/${id}`)).data),
  commentPin: async (id: string) =>
    apiData((await apiClient.post<Comment | ApiEnvelope<Comment>>(`/crm/comments/${id}/pin`)).data),
  commentUnpin: async (id: string) =>
    apiData((await apiClient.post<Comment | ApiEnvelope<Comment>>(`/crm/comments/${id}/unpin`)).data),

  faylYuklash: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiData(
      (
        await apiClient.post<Attachment | ApiEnvelope<Attachment>>("/crm/attachments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        })
      ).data
    );
  },
  faylYuklabOlish: async (id: string) =>
    (await apiClient.get<Blob>(`/crm/attachments/${id}/download`, { responseType: "blob" }))
      .data,

  partnerChatTarixi: async (partnerId: string, params?: { cursor?: string; limit?: number }) =>
    apiData(
      (
        await apiClient.get<CursorJavobi<ChatMessage> | ApiEnvelope<CursorJavobi<ChatMessage>>>(
          `/crm/partners/${partnerId}/chat/messages`,
          { params: tozaParams(params) }
        )
      ).data
    ),
  partnerChatXabarYuborish: async (partnerId: string, text: string) =>
    apiData((await apiClient.post<ChatMessage | ApiEnvelope<ChatMessage>>(`/crm/partners/${partnerId}/chat/messages`, { text })).data),
  // `fon` — davriy yangilash: xato bo'lsa toast chiqmaydi.
  chatThreadlar: async (unassigned?: boolean, fon = false) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<ChatThread> | ApiListEnvelope<ChatThread>>("/crm/chat/threads", {
          params: unassigned === undefined ? undefined : { unassigned },
          xatoniYashirish: fon,
        })
      ).data
    ),
  chatThreadPartnerBiriktirish: async (id: string, partnerId: string) =>
    apiData((await apiClient.patch<ChatThread | ApiEnvelope<ChatThread>>(`/crm/chat/threads/${id}/assign`, { partnerId })).data),
  // Bitta suhbat tarixi (mijozga biriktirilmagan suhbatniki ham): { items, nextCursor }, eng yangisi birinchi.
  chatThreadXabarlari: async (threadId: string, params?: { cursor?: string; limit?: number }, fon = false) =>
    apiData(
      (
        await apiClient.get<CursorJavobi<ChatMessage> | ApiEnvelope<CursorJavobi<ChatMessage>>>(
          `/crm/chat/threads/${threadId}/messages`,
          { params: tozaParams(params), xatoniYashirish: fon }
        )
      ).data
    ),
  // Suhbatga javob: TELEGRAM_BUSINESS suhbatda javob do'kon akkauntidan boradi.
  // Xato toast bilan emas, yozish maydoni ostida ko'rsatiladi (ruxsat yo'q / 24 soat oynasi tushuntirishi uzun).
  chatThreadXabarYuborish: async (threadId: string, text: string, attachmentIds?: string[]) =>
    apiData(
      (
        await apiClient.post<ChatMessage | ApiEnvelope<ChatMessage>>(
          `/crm/chat/threads/${threadId}/messages`,
          { text, ...(attachmentIds?.length ? { attachmentIds } : {}) },
          { xatoniYashirish: true }
        )
      ).data
    ),
};

// Savdo agenti → Lidlar (backend /leads).
function voronka(qiymat: unknown) {
  const obj = (qiymat && typeof qiymat === "object" ? qiymat : {}) as Record<string, unknown>;
  const son = (k: string) => {
    const n = Number(obj[k]);
    return Number.isFinite(n) ? n : 0;
  };
  return { total: son("total"), interested: son("interested"), ordered: son("ordered"), sold: son("sold"), lost: son("lost") };
}

export function lidStatistikasiniTozalash(xom: unknown): LidStatistikasi {
  const obj = (xom && typeof xom === "object" && !Array.isArray(xom) ? xom : {}) as Record<string, unknown>;
  const manbalar = Array.isArray(obj.bySource) ? obj.bySource : [];
  return {
    total: voronka(obj.total),
    bySource: manbalar
      .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === "object")
      .map((m) => ({ source: String(m.source ?? ""), ...voronka(m) })),
  };
}
export type LidFiltri = { stage?: string; source?: string; ownerId?: string; threadId?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number };

export const lidlarApi = {
  // `fon` — davriy yangilash (suhbatdagi lid belgisi): xato bo'lsa toast chiqmaydi.
  royxat: async (filtr: LidFiltri = {}, fon = false) =>
    sahifaJavobi<Lid>(
      (await apiClient.get<unknown>("/leads", { params: tozaParams(filtr), xatoniYashirish: fon })).data,
      filtr.page ?? 1,
      filtr.pageSize ?? 20
    ),
  // Javob kutilgan shaklda bo'lmasa ham sahifa yiqilmasin: total va bySource doim to'ldiriladi.
  statistika: async (params: { dateFrom?: string; dateTo?: string } = {}): Promise<LidStatistikasi> =>
    lidStatistikasiniTozalash(
      apiData((await apiClient.get<LidStatistikasi | ApiEnvelope<LidStatistikasi>>("/leads/stats", { params: tozaParams(params) })).data)
    ),
  kartochka: async (id: string) =>
    apiData((await apiClient.get<LidKartochkasi | ApiEnvelope<LidKartochkasi>>(`/leads/${id}`)).data),
  // stage (LOST uchun lostReason majburiy), lostReason, ownerId (null — olib tashlash).
  yangilash: async (id: string, data: { stage?: string; lostReason?: string; ownerId?: string | null }) =>
    apiData((await apiClient.patch<Lid | ApiEnvelope<Lid>>(`/leads/${id}`, data)).data),
  izohQoshish: async (id: string, text: string) =>
    apiData((await apiClient.post<LidIzohi | ApiEnvelope<LidIzohi>>(`/leads/${id}/notes`, { text })).data),
};
