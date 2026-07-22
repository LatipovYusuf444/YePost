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
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";

type RoyxatJavobi<T> = T[] | ApiListEnvelope<T>;

// Kassa sahifasi: GET/POST/PATCH/DELETE /finance/expenses endpointlari.
export const xarajatApi = {
  royxat: async () =>
    apiList((await apiClient.get<RoyxatJavobi<Xarajat>>("/finance/expenses")).data),
  olish: async (id: string) => apiData((await apiClient.get<Xarajat | ApiEnvelope<Xarajat>>(`/finance/expenses/${id}`)).data),
  yaratish: async (data: XarajatSaqlash) =>
    apiData((await apiClient.post<Xarajat | ApiEnvelope<Xarajat>>("/finance/expenses", data)).data),
  yangilash: async (id: string, data: Partial<XarajatSaqlash>) =>
    apiData((await apiClient.patch<Xarajat | ApiEnvelope<Xarajat>>(`/finance/expenses/${id}`, data)).data),
  ochirish: async (id: string) =>
    (await apiClient.delete<Xarajat>(`/finance/expenses/${id}`)).data,
};

// Kassa sahifasi: GET/POST/PATCH/DELETE /finance/loans endpointlari.
export const qarzApi = {
  royxat: async () =>
    apiList((await apiClient.get<RoyxatJavobi<Qarz>>("/finance/loans")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Qarz | ApiEnvelope<Qarz>>(`/finance/loans/${id}`)).data),
  yaratish: async (data: QarzSaqlash) =>
    apiData((await apiClient.post<Qarz | ApiEnvelope<Qarz>>("/finance/loans", data)).data),
  yangilash: async (id: string, data: Partial<QarzSaqlash>) =>
    apiData((await apiClient.patch<Qarz | ApiEnvelope<Qarz>>(`/finance/loans/${id}`, data)).data),
  ochirish: async (id: string) =>
    (await apiClient.delete<Qarz>(`/finance/loans/${id}`)).data,
};

// Kassa sahifasi: GET/POST/PATCH/DELETE /finance/cash-ins endpointlari.
export const kassaKirimApi = {
  royxat: async () =>
    apiList((await apiClient.get<RoyxatJavobi<KassaKirim>>("/finance/cash-ins")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<KassaKirim | ApiEnvelope<KassaKirim>>(`/finance/cash-ins/${id}`)).data),
  yaratish: async (data: KassaKirimSaqlash) =>
    apiData((await apiClient.post<KassaKirim | ApiEnvelope<KassaKirim>>("/finance/cash-ins", data)).data),
  yangilash: async (id: string, data: Partial<KassaKirimSaqlash>) =>
    apiData((await apiClient.patch<KassaKirim | ApiEnvelope<KassaKirim>>(`/finance/cash-ins/${id}`, data)).data),
  ochirish: async (id: string) =>
    (await apiClient.delete<KassaKirim>(`/finance/cash-ins/${id}`)).data,
};

// Kassa formalaridagi filial tanlovi uchun.
export async function filiallarniOlish() {
  return apiList((await apiClient.get<Filial[] | ApiListEnvelope<Filial>>("/organization/branches")).data);
}
