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

type RoyxatJavobi<T> = T[] | { value?: T[]; items?: T[]; results?: T[]; data?: T[] };

function royxatniAjratish<T>(data: RoyxatJavobi<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.value ?? data.items ?? data.results ?? data.data ?? [];
}

// Mahsulotlar sahifasi: Swagger catalog/categories to'liq CRUD.
export const kategoriyalarApi = {
  royxat: async () => {
    const response = await apiClient.get<RoyxatJavobi<Kategoriya>>("/catalog/categories");
    return royxatniAjratish(response.data);
  },
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
  royxat: async () => {
    const response = await apiClient.get<RoyxatJavobi<OlchovBirligi>>("/catalog/units");
    return royxatniAjratish(response.data);
  },
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
  royxat: async () => {
    const response = await apiClient.get<RoyxatJavobi<Mahsulot>>("/catalog/products");
    return royxatniAjratish(response.data);
  },
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
  royxat: async (productId: string) => {
    const response = await apiClient.get<RoyxatJavobi<MahsulotModifikatsiyasi>>(
        `/catalog/products/${productId}/modifications`
    );
    return royxatniAjratish(response.data);
  },
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
