import apiClient from "./axios";
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
  royxat: async () => (await apiClient.get<Mijoz[]>("/partners/customers")).data,
  olish: async (id: string) =>
    (await apiClient.get<Mijoz>(`/partners/customers/${id}`)).data,
  yaratish: async (data: MijozMalumoti) =>
    (await apiClient.post<Mijoz>("/partners/customers", data)).data,
  yangilash: async (id: string, data: Partial<MijozMalumoti>) =>
    (await apiClient.patch<Mijoz>(`/partners/customers/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Mijoz>(`/partners/customers/${id}`)).data,
};

// Mijozlar sahifasi: mijoz kompaniyalari to'liq CRUD.
export const mijozKompaniyalariApi = {
  royxat: async () =>
    (await apiClient.get<MijozKompaniyasi[]>("/partners/client-companies")).data,
  olish: async (id: string) =>
    (await apiClient.get<MijozKompaniyasi>(`/partners/client-companies/${id}`))
      .data,
  yaratish: async (data: MijozKompaniyasiMalumoti) =>
    (await apiClient.post<MijozKompaniyasi>("/partners/client-companies", data))
      .data,
  yangilash: async (id: string, data: Partial<MijozKompaniyasiMalumoti>) =>
    (
      await apiClient.patch<MijozKompaniyasi>(
        `/partners/client-companies/${id}`,
        data
      )
    ).data,
  ochirish: async (id: string) =>
    (
      await apiClient.delete<MijozKompaniyasi>(
        `/partners/client-companies/${id}`
      )
    ).data,
};

// Mijozlar sahifasi: yetkazib beruvchilar to'liq CRUD.
export const yetkazibBeruvchilarApi = {
  royxat: async () =>
    (await apiClient.get<YetkazibBeruvchi[]>("/partners/suppliers")).data,
  olish: async (id: string) =>
    (await apiClient.get<YetkazibBeruvchi>(`/partners/suppliers/${id}`)).data,
  yaratish: async (data: YetkazibBeruvchiMalumoti) =>
    (await apiClient.post<YetkazibBeruvchi>("/partners/suppliers", data)).data,
  yangilash: async (id: string, data: Partial<YetkazibBeruvchiMalumoti>) =>
    (await apiClient.patch<YetkazibBeruvchi>(`/partners/suppliers/${id}`, data))
      .data,
  ochirish: async (id: string) =>
    (await apiClient.delete<YetkazibBeruvchi>(`/partners/suppliers/${id}`)).data,
};
