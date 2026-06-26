import apiClient from "./axios";
import type {
  KassaKirim,
  KassaKirimSaqlash,
  Qarz,
  QarzSaqlash,
  Xarajat,
  XarajatSaqlash,
} from "@/types/finance";
import type { Filial } from "@/types/ombor";

// Kassa sahifasi: GET/POST/PATCH/DELETE /finance/expenses endpointlari.
export const xarajatApi = {
  royxat: async () => (await apiClient.get<Xarajat[]>("/finance/expenses")).data,
  olish: async (id: string) => (await apiClient.get<Xarajat>(`/finance/expenses/${id}`)).data,
  yaratish: async (data: XarajatSaqlash) =>
    (await apiClient.post<Xarajat>("/finance/expenses", data)).data,
  yangilash: async (id: string, data: Partial<XarajatSaqlash>) =>
    (await apiClient.patch<Xarajat>(`/finance/expenses/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Xarajat>(`/finance/expenses/${id}`)).data,
};

// Kassa sahifasi: GET/POST/PATCH/DELETE /finance/loans endpointlari.
export const qarzApi = {
  royxat: async () => (await apiClient.get<Qarz[]>("/finance/loans")).data,
  olish: async (id: string) => (await apiClient.get<Qarz>(`/finance/loans/${id}`)).data,
  yaratish: async (data: QarzSaqlash) =>
    (await apiClient.post<Qarz>("/finance/loans", data)).data,
  yangilash: async (id: string, data: Partial<QarzSaqlash>) =>
    (await apiClient.patch<Qarz>(`/finance/loans/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Qarz>(`/finance/loans/${id}`)).data,
};

// Kassa sahifasi: GET/POST/PATCH/DELETE /finance/cash-ins endpointlari.
export const kassaKirimApi = {
  royxat: async () => (await apiClient.get<KassaKirim[]>("/finance/cash-ins")).data,
  olish: async (id: string) =>
    (await apiClient.get<KassaKirim>(`/finance/cash-ins/${id}`)).data,
  yaratish: async (data: KassaKirimSaqlash) =>
    (await apiClient.post<KassaKirim>("/finance/cash-ins", data)).data,
  yangilash: async (id: string, data: Partial<KassaKirimSaqlash>) =>
    (await apiClient.patch<KassaKirim>(`/finance/cash-ins/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<KassaKirim>(`/finance/cash-ins/${id}`)).data,
};

// Kassa formalaridagi filial tanlovi uchun.
export async function filiallarniOlish() {
  return (await apiClient.get<Filial[]>("/organization/branches")).data;
}
