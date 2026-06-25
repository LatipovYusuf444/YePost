import apiClient from "./axios";
import type {
  Kategoriya,
  KategoriyaMalumoti,
  Mahsulot,
  MahsulotMalumoti,
  MahsulotModifikatsiyasi,
  ModifikatsiyaMalumoti,
  NarxMalumoti,
  MahsulotNarxi,
  OlchovBirligi,
  OlchovBirligiMalumoti,
} from "@/types/catalog";

// Mahsulotlar sahifasi: Swagger catalog/categories to'liq CRUD.
export const kategoriyalarApi = {
  royxat: async () => (await apiClient.get<Kategoriya[]>("/catalog/categories")).data,
  olish: async (id: string) =>
    (await apiClient.get<Kategoriya>(`/catalog/categories/${id}`)).data,
  yaratish: async (data: KategoriyaMalumoti) =>
    (await apiClient.post<Kategoriya>("/catalog/categories", data)).data,
  yangilash: async (id: string, data: Partial<KategoriyaMalumoti>) =>
    (await apiClient.patch<Kategoriya>(`/catalog/categories/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Kategoriya>(`/catalog/categories/${id}`)).data,
};

// Mahsulotlar sahifasi: Swagger catalog/units to'liq CRUD.
export const birliklarApi = {
  royxat: async () => (await apiClient.get<OlchovBirligi[]>("/catalog/units")).data,
  olish: async (id: string) =>
    (await apiClient.get<OlchovBirligi>(`/catalog/units/${id}`)).data,
  yaratish: async (data: OlchovBirligiMalumoti) =>
    (await apiClient.post<OlchovBirligi>("/catalog/units", data)).data,
  yangilash: async (id: string, data: Partial<OlchovBirligiMalumoti>) =>
    (await apiClient.patch<OlchovBirligi>(`/catalog/units/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<OlchovBirligi>(`/catalog/units/${id}`)).data,
};

// Mahsulotlar sahifasi: Swagger catalog/products to'liq CRUD.
export const mahsulotlarApi = {
  royxat: async () => (await apiClient.get<Mahsulot[]>("/catalog/products")).data,
  olish: async (id: string) =>
    (await apiClient.get<Mahsulot>(`/catalog/products/${id}`)).data,
  yaratish: async (data: MahsulotMalumoti) =>
    (await apiClient.post<Mahsulot>("/catalog/products", data)).data,
  yangilash: async (id: string, data: Partial<MahsulotMalumoti>) =>
    (await apiClient.patch<Mahsulot>(`/catalog/products/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Mahsulot>(`/catalog/products/${id}`)).data,
};

// Mahsulot tafsiloti: modifikatsiyalar CRUD va alohida narx endpointlari.
export const modifikatsiyalarApi = {
  royxat: async (productId: string) =>
    (
      await apiClient.get<MahsulotModifikatsiyasi[]>(
        `/catalog/products/${productId}/modifications`
      )
    ).data,
  olish: async (id: string) =>
    (await apiClient.get<MahsulotModifikatsiyasi>(`/catalog/modifications/${id}`))
      .data,
  yaratish: async (productId: string, data: ModifikatsiyaMalumoti) =>
    (
      await apiClient.post<MahsulotModifikatsiyasi>(
        `/catalog/products/${productId}/modifications`,
        data
      )
    ).data,
  yangilash: async (id: string, data: Partial<ModifikatsiyaMalumoti>) =>
    (
      await apiClient.patch<MahsulotModifikatsiyasi>(
        `/catalog/modifications/${id}`,
        data
      )
    ).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<MahsulotModifikatsiyasi>(`/catalog/modifications/${id}`))
      .data,
  narxOlish: async (id: string) =>
    (await apiClient.get<MahsulotNarxi>(`/catalog/modifications/${id}/price`)).data,
  narxYangilash: async (id: string, data: NarxMalumoti) =>
    (
      await apiClient.patch<MahsulotNarxi>(
        `/catalog/modifications/${id}/price`,
        data
      )
    ).data,
};
