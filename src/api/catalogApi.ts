import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
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
  royxat: async () => {
    const response = await apiClient.get<Kategoriya[] | ApiListEnvelope<Kategoriya>>(
      "/catalog/categories"
    );
    return apiList(response.data);
  },
  olish: async (id: string) =>
    apiData((await apiClient.get<Kategoriya | ApiEnvelope<Kategoriya>>(`/catalog/categories/${id}`)).data),
  yaratish: async (data: KategoriyaMalumoti) =>
    apiData((await apiClient.post<Kategoriya | ApiEnvelope<Kategoriya>>("/catalog/categories", data)).data),
  yangilash: async (id: string, data: Partial<KategoriyaMalumoti>) =>
    apiData(
      (await apiClient.patch<Kategoriya | ApiEnvelope<Kategoriya>>(
        `/catalog/categories/${id}`,
        data
      )).data
    ),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Kategoriya | ApiEnvelope<Kategoriya>>(`/catalog/categories/${id}`)).data),
};

// Mahsulotlar sahifasi: Swagger catalog/units to'liq CRUD.
export const birliklarApi = {
  royxat: async () => {
    const response = await apiClient.get<OlchovBirligi[] | ApiListEnvelope<OlchovBirligi>>(
      "/catalog/units"
    );
    return apiList(response.data);
  },
  olish: async (id: string) =>
    apiData((await apiClient.get<OlchovBirligi | ApiEnvelope<OlchovBirligi>>(`/catalog/units/${id}`)).data),
  yaratish: async (data: OlchovBirligiMalumoti) =>
    apiData((await apiClient.post<OlchovBirligi | ApiEnvelope<OlchovBirligi>>("/catalog/units", data)).data),
  yangilash: async (id: string, data: Partial<OlchovBirligiMalumoti>) =>
    apiData(
      (await apiClient.patch<OlchovBirligi | ApiEnvelope<OlchovBirligi>>(
        `/catalog/units/${id}`,
        data
      )).data
    ),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<OlchovBirligi | ApiEnvelope<OlchovBirligi>>(`/catalog/units/${id}`)).data),
};

// Mahsulotlar sahifasi: Swagger catalog/products to'liq CRUD.
export const mahsulotlarApi = {
  royxat: async () => {
    const response = await apiClient.get<Mahsulot[] | ApiListEnvelope<Mahsulot>>(
      "/catalog/products"
    );
    return apiList(response.data);
  },
  olish: async (id: string) =>
    apiData((await apiClient.get<Mahsulot | ApiEnvelope<Mahsulot>>(`/catalog/products/${id}`)).data),
  yaratish: async (data: MahsulotMalumoti) =>
    apiData((await apiClient.post<Mahsulot | ApiEnvelope<Mahsulot>>("/catalog/products", data)).data),
  yangilash: async (id: string, data: Partial<MahsulotMalumoti>) =>
    apiData(
      (await apiClient.patch<Mahsulot | ApiEnvelope<Mahsulot>>(
        `/catalog/products/${id}`,
        data
      )).data
    ),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Mahsulot | ApiEnvelope<Mahsulot>>(`/catalog/products/${id}`)).data),
};

// Mahsulot tafsiloti: modifikatsiyalar CRUD va alohida narx endpointlari.
export const modifikatsiyalarApi = {
  royxat: async (productId: string) => {
    const response = await apiClient.get<
      MahsulotModifikatsiyasi[] | ApiListEnvelope<MahsulotModifikatsiyasi>
    >(
      `/catalog/products/${productId}/modifications`
    );
    return apiList(response.data);
  },
  olish: async (id: string) =>
    apiData(
      (
        await apiClient.get<
          MahsulotModifikatsiyasi | ApiEnvelope<MahsulotModifikatsiyasi>
        >(`/catalog/modifications/${id}`)
      ).data
    ),
  yaratish: async (productId: string, data: ModifikatsiyaMalumoti) =>
    apiData(
      (
        await apiClient.post<
          MahsulotModifikatsiyasi | ApiEnvelope<MahsulotModifikatsiyasi>
        >(
        `/catalog/products/${productId}/modifications`,
        data
      )
      ).data
    ),
  yangilash: async (id: string, data: Partial<ModifikatsiyaMalumoti>) =>
    apiData(
      (
        await apiClient.patch<
          MahsulotModifikatsiyasi | ApiEnvelope<MahsulotModifikatsiyasi>
        >(
        `/catalog/modifications/${id}`,
        data
      )
      ).data
    ),
  ochirish: async (id: string) =>
    apiData(
      (
        await apiClient.delete<
          MahsulotModifikatsiyasi | ApiEnvelope<MahsulotModifikatsiyasi>
        >(`/catalog/modifications/${id}`)
      ).data
    ),
  narxOlish: async (id: string) =>
    apiData(
      (
        await apiClient.get<MahsulotNarxi | ApiEnvelope<MahsulotNarxi>>(
          `/catalog/modifications/${id}/price`
        )
      ).data
    ),
  narxYangilash: async (id: string, data: NarxMalumoti) =>
    apiData(
      (
        await apiClient.patch<MahsulotNarxi | ApiEnvelope<MahsulotNarxi>>(
        `/catalog/modifications/${id}/price`,
        data
      )
      ).data
    ),
};
