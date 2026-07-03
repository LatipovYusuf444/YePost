import apiClient from "./axios";
import type {
  Activity,
  ActivityFilter,
  ActivitySaqlash,
  ActivityYangilash,
  Bildirishnoma,
  ChatMessage,
  ChatThread,
  Comment,
  CommentSaqlash,
  CursorJavobi,
  CustomField,
  CustomFieldSaqlash,
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
  if (Array.isArray(data)) return data;
  return data.items ?? data.results ?? data.data ?? data.value ?? [];
}

export const crmApi = {
  timeline: async (customerId: string, params?: TimelineFilter) =>
    (
      await apiClient.get<CursorJavobi<TimelineItem>>(
        `/crm/customers/${customerId}/timeline`,
        { params: tozaParams(params) }
      )
    ).data,

  bildirishnomalar: async (unread?: boolean) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<Bildirishnoma>>("/crm/notifications", {
          params: unread === undefined ? undefined : { unread },
        })
      ).data
    ),
  bildirishnomaOqildi: async (id: string) =>
    (await apiClient.post<Bildirishnoma>(`/crm/notifications/${id}/read`)).data,
  barchaBildirishnomalarOqildi: async () =>
    (await apiClient.post<Bildirishnoma[]>("/crm/notifications/read-all")).data,

  customFields: async (entityType?: string) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<CustomField>>("/crm/custom-fields", {
          params: tozaParams({ entityType }),
        })
      ).data
    ),
  customFieldYaratish: async (data: CustomFieldSaqlash) =>
    (await apiClient.post<CustomField>("/crm/custom-fields", data)).data,
  customFieldYangilash: async (id: string, data: CustomFieldSaqlash) =>
    (await apiClient.patch<CustomField>(`/crm/custom-fields/${id}`, data)).data,
  customFieldOchirish: async (id: string) =>
    (await apiClient.delete<CustomField>(`/crm/custom-fields/${id}`)).data,

  dublikatlar: async (params: MijozDublikatFilter) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<unknown>>("/crm/customers/duplicates", {
          params: tozaParams(params),
        })
      ).data
    ),
  mijozKartasi: async (customerId: string) =>
    (await apiClient.get<MijozKartasi>(`/crm/customers/${customerId}/card`)).data,

  activities: async (params?: ActivityFilter) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<Activity>>("/crm/activities", {
          params: tozaParams(params),
        })
      ).data
    ),
  activityYaratish: async (data: ActivitySaqlash) =>
    (await apiClient.post<Activity>("/crm/activities", data)).data,
  myDay: async () =>
    royxatniAjratish(
      (await apiClient.get<RoyxatJavobi<Activity>>("/crm/activities/my-day")).data
    ),
  activityOlish: async (id: string) =>
    (await apiClient.get<Activity>(`/crm/activities/${id}`)).data,
  activityYangilash: async (id: string, data: ActivityYangilash) =>
    (await apiClient.patch<Activity>(`/crm/activities/${id}`, data)).data,
  activityOchirish: async (id: string) =>
    (await apiClient.delete<Activity>(`/crm/activities/${id}`)).data,
  activityYakunlash: async (id: string, result?: string) =>
    (await apiClient.post<Activity>(`/crm/activities/${id}/complete`, { result })).data,

  comments: async (customerId: string, params?: { cursor?: string; limit?: number }) =>
    (
      await apiClient.get<CursorJavobi<Comment>>(`/crm/customers/${customerId}/comments`, {
        params: tozaParams(params),
      })
    ).data,
  commentYaratish: async (customerId: string, data: CommentSaqlash) =>
    (await apiClient.post<Comment>(`/crm/customers/${customerId}/comments`, data)).data,
  commentYangilash: async (id: string, text: string) =>
    (await apiClient.patch<Comment>(`/crm/comments/${id}`, { text })).data,
  commentOchirish: async (id: string) =>
    (await apiClient.delete<Comment>(`/crm/comments/${id}`)).data,
  commentPin: async (id: string) =>
    (await apiClient.post<Comment>(`/crm/comments/${id}/pin`)).data,
  commentUnpin: async (id: string) =>
    (await apiClient.post<Comment>(`/crm/comments/${id}/unpin`)).data,

  faylYuklash: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return (
      await apiClient.post("/crm/attachments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
  faylYuklabOlish: async (id: string) =>
    (await apiClient.get<Blob>(`/crm/attachments/${id}/download`, { responseType: "blob" }))
      .data,

  chatTarixi: async (customerId: string, params?: { cursor?: string; limit?: number }) =>
    (
      await apiClient.get<CursorJavobi<ChatMessage>>(
        `/crm/customers/${customerId}/chat/messages`,
        { params: tozaParams(params) }
      )
    ).data,
  chatXabarYuborish: async (customerId: string, text: string) =>
    (await apiClient.post<ChatMessage>(`/crm/customers/${customerId}/chat/messages`, { text }))
      .data,
  chatThreadlar: async (unassigned?: boolean) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<ChatThread>>("/crm/chat/threads", {
          params: unassigned === undefined ? undefined : { unassigned },
        })
      ).data
    ),
  chatThreadBiriktirish: async (id: string, customerId: string) =>
    (await apiClient.patch<ChatThread>(`/crm/chat/threads/${id}/assign`, { customerId }))
      .data,
};
