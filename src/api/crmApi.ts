import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
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
  timeline: async (customerId: string, params?: TimelineFilter) =>
    apiData(
      (
        await apiClient.get<CursorJavobi<TimelineItem> | ApiEnvelope<CursorJavobi<TimelineItem>>>(
          `/crm/customers/${customerId}/timeline`,
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

  comments: async (customerId: string, params?: { cursor?: string; limit?: number }) =>
    apiData(
      (
        await apiClient.get<CursorJavobi<Comment> | ApiEnvelope<CursorJavobi<Comment>>>(
          `/crm/customers/${customerId}/comments`,
          { params: tozaParams(params) }
        )
      ).data
    ),
  commentYaratish: async (customerId: string, data: CommentSaqlash) =>
    apiData((await apiClient.post<Comment | ApiEnvelope<Comment>>(`/crm/customers/${customerId}/comments`, data)).data),
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

  chatTarixi: async (customerId: string, params?: { cursor?: string; limit?: number }) =>
    apiData(
      (
        await apiClient.get<CursorJavobi<ChatMessage> | ApiEnvelope<CursorJavobi<ChatMessage>>>(
          `/crm/customers/${customerId}/chat/messages`,
          { params: tozaParams(params) }
        )
      ).data
    ),
  chatXabarYuborish: async (customerId: string, text: string) =>
    apiData((await apiClient.post<ChatMessage | ApiEnvelope<ChatMessage>>(`/crm/customers/${customerId}/chat/messages`, { text })).data),
  chatThreadlar: async (unassigned?: boolean) =>
    royxatniAjratish(
      (
        await apiClient.get<RoyxatJavobi<ChatThread> | ApiListEnvelope<ChatThread>>("/crm/chat/threads", {
          params: unassigned === undefined ? undefined : { unassigned },
        })
      ).data
    ),
  chatThreadBiriktirish: async (id: string, customerId: string) =>
    apiData((await apiClient.patch<ChatThread | ApiEnvelope<ChatThread>>(`/crm/chat/threads/${id}/assign`, { customerId })).data),
};
