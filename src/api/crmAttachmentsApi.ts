import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";

export type CrmIlovaJavobi = { id: string; url?: string; name?: string };

function faylniSaqlash(blob: Blob, nomi: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomi;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Qo'llab-quvvatlash chatida xabarga fayl biriktirish uchun.
export const crmIlovalarApi = {
  yuklash: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<CrmIlovaJavobi | ApiEnvelope<CrmIlovaJavobi>>(
      "/crm/attachments",
      formData
    );
    return apiData(response.data);
  },
  // Oddiy <a href> ishlamaydi — endpoint Bearer token talab qiladi, shuning
  // uchun fayl axios orqali (auth headerlar bilan) blob sifatida olinadi.
  yuklabOlish: async (id: string, nomi: string) => {
    const response = await apiClient.get<Blob>(`/crm/attachments/${id}/download`, {
      responseType: "blob",
    });
    faylniSaqlash(response.data, nomi);
  },
};
