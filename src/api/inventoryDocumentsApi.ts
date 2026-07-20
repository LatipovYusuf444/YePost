import apiClient from "./axios";
import type { ApiEnvelope } from "./response";
import type { DocumentAttachment, DocumentComment, DocumentHistory, InventoryDocumentType, InventoryHistoryAction, Paginated } from "@/types/inventoryDocuments";

type PageEnvelope<T> = { success?: boolean; statusCode?: number; data?: T[]; total?: number; page?: number; pageSize?: number; totalPages?: number };
const base = (type: InventoryDocumentType, id: string) => `/inventory/documents/${type}/${id}`;
function page<T>(value: PageEnvelope<T>): Paginated<T> { return { items: value.data ?? [], total: value.total ?? 0, page: value.page ?? 1, pageSize: value.pageSize ?? 20, totalPages: value.totalPages ?? 1 }; }

export const inventoryDocumentsApi = {
  comments: async (type: InventoryDocumentType, id: string, params?: { page?: number; pageSize?: number }) => page((await apiClient.get<PageEnvelope<DocumentComment>>(`${base(type,id)}/comments`, { params })).data),
  commentCreate: async (type: InventoryDocumentType, id: string, body: { text: string; attachmentIds?: string[]; mentionUserIds?: string[] }) => (await apiClient.post<ApiEnvelope<DocumentComment>>(`${base(type,id)}/comments`, body)).data.data,
  commentUpdate: async (type: InventoryDocumentType, id: string, commentId: string, text: string) => (await apiClient.patch<ApiEnvelope<DocumentComment>>(`${base(type,id)}/comments/${commentId}`, { text })).data.data,
  commentDelete: async (type: InventoryDocumentType, id: string, commentId: string) => apiClient.delete(`${base(type,id)}/comments/${commentId}`),
  attachments: async (type: InventoryDocumentType, id: string) => {
    const response = await apiClient.get<ApiEnvelope<{ items?: DocumentAttachment[] }>>(`${base(type,id)}/attachments`);
    return response.data.data?.items ?? [];
  },
  upload: async (type: InventoryDocumentType, id: string, file: File, commentId?: string) => { const data = new FormData(); data.append("file", file); if(commentId) data.append("commentId", commentId); return apiClient.post(`${base(type,id)}/attachments`, data, { headers: { "Content-Type": undefined } }); },
  download: async (type: InventoryDocumentType, id: string, attachment: DocumentAttachment) => { const response = await apiClient.get<Blob>(`${base(type,id)}/attachments/${attachment.id}/download`, { responseType: "blob" }); const url=URL.createObjectURL(response.data); const link=document.createElement("a"); link.href=url; link.download=attachment.originalName || attachment.fileName; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); },
  attachmentDelete: async (type: InventoryDocumentType, id: string, attachmentId: string) => apiClient.delete(`${base(type,id)}/attachments/${attachmentId}`),
  history: async (type: InventoryDocumentType, id: string, params?: { page?: number; pageSize?: number; action?: InventoryHistoryAction; dateFrom?: string; dateTo?: string }) => page((await apiClient.get<PageEnvelope<DocumentHistory>>(`${base(type,id)}/history`, { params })).data),
};
