import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  Mijoz,
  MijozKompaniyasi,
  MijozKompaniyasiMalumoti,
  MijozMalumoti,
  YetkazibBeruvchi,
  YetkazibBeruvchiMalumoti,
} from "@/types/partner";

// Mijozlar sahifasi: jismoniy mijozlar to'liq CRUD.
export const mijozlarApi = {
  royxat: async () =>
    apiList((await apiClient.get<Mijoz[] | ApiListEnvelope<Mijoz>>("/partners/customers")).data),
  // `fon` — yordamchi so'rov (nomlarni to'ldirish, hisobni o'qish): mijoz topilmasa (404) xato toasti chiqmaydi, chaqiruvchi xatoni o'zi hal qiladi.
  olish: async (id: string, fon = false) =>
    apiData(
      (await apiClient.get<Mijoz | ApiEnvelope<Mijoz>>(`/partners/customers/${id}`, fon ? { xatoniYashirish: true } : undefined)).data
    ),
  yaratish: async (data: MijozMalumoti) =>
    apiData((await apiClient.post<Mijoz | ApiEnvelope<Mijoz>>("/partners/customers", data)).data),
  yangilash: async (id: string, data: Partial<MijozMalumoti>) =>
    apiData((await apiClient.patch<Mijoz | ApiEnvelope<Mijoz>>(`/partners/customers/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Mijoz | ApiEnvelope<Mijoz>>(`/partners/customers/${id}`)).data),
};

// Mijozlar sahifasi: mijoz kompaniyalari to'liq CRUD.
export const mijozKompaniyalariApi = {
  royxat: async () =>
    apiList(
      (
        await apiClient.get<MijozKompaniyasi[] | ApiListEnvelope<MijozKompaniyasi>>(
          "/partners/client-companies"
        )
      ).data
    ),
  // `fon` — yordamchi so'rov: kompaniya topilmasa (404) xato toasti chiqmaydi, chaqiruvchi xatoni o'zi hal qiladi.
  olish: async (id: string, fon = false) =>
    apiData(
      (
        await apiClient.get<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>(
          `/partners/client-companies/${id}`,
          fon ? { xatoniYashirish: true } : undefined
        )
      ).data
    ),
  yaratish: async (data: MijozKompaniyasiMalumoti) =>
    apiData((await apiClient.post<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>("/partners/client-companies", data)).data),
  yangilash: async (id: string, data: Partial<MijozKompaniyasiMalumoti>) =>
    apiData((await apiClient.patch<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>(`/partners/client-companies/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData(
      (
        await apiClient.delete<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>(
          `/partners/client-companies/${id}`
        )
      ).data
    ),
};

// Mijozlar sahifasi: yetkazib beruvchilar to'liq CRUD.
export const yetkazibBeruvchilarApi = {
  royxat: async () =>
    apiList(
      (
        await apiClient.get<YetkazibBeruvchi[] | ApiListEnvelope<YetkazibBeruvchi>>(
          "/partners/suppliers"
        )
      ).data
    ),
  olish: async (id: string) =>
    apiData(
      (await apiClient.get<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>(`/partners/suppliers/${id}`))
        .data
    ),
  yaratish: async (data: YetkazibBeruvchiMalumoti) =>
    apiData((await apiClient.post<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>("/partners/suppliers", data)).data),
  yangilash: async (id: string, data: Partial<YetkazibBeruvchiMalumoti>) =>
    apiData((await apiClient.patch<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>(`/partners/suppliers/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData(
      (
        await apiClient.delete<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>(
          `/partners/suppliers/${id}`
        )
      ).data
    ),
};
