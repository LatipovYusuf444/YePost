import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  Kategoriya,
  KategoriyaMalumoti,
  Mahsulot,
  MahsulotExportFiltrlari,
  MahsulotImportNatijasi,
  MahsulotMalumoti,
  MahsulotModifikatsiyasi,
  ModifikatsiyaMalumoti,
  NarxMalumoti,
  MahsulotNarxi,
  OlchovBirligi,
  OlchovBirligiMalumoti,
  StandardUnit,
} from "@/types/catalog";



// Swagger’da qaytarish uchun alohida POST /sales/{id}/return yo‘qligini avvalgi tekshiruv ham ko‘rsatgan edi




// Ombor/YangiKirimModal.tsx: hujjatga fayl biriktirish uchun real rasm/fayl yuklash.
export const mediaApi = {
  yuklash: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<
      { id: string; imageUrl: string } | ApiEnvelope<{ id: string; imageUrl: string }>
    >("/catalog/media", formData);
    const natija = apiData(response.data);
    // Backend to'liq "/api/v1/..." yo'l qaytaradi, apiClient esa bazaviy manzilida
    // "/api/v1" ni allaqachon o'z ichiga oladi — takrorlanmasligi uchun kesib olinadi.
    return { ...natija, imageUrl: natija.imageUrl.replace(/^\/api\/v1/, "") };
  },
};

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
export async function getStandardUnits() {
  const response = await apiClient.get<StandardUnit[] | ApiListEnvelope<StandardUnit>>(
    "/catalog/units/standard"
  );
  return apiList(response.data);
}

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
  importQilish: async (file: File, dryRun = false) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<
      MahsulotImportNatijasi | ApiEnvelope<MahsulotImportNatijasi>
    >("/catalog/products/import", formData, {
      params: dryRun ? { dryRun: true } : undefined,
      // apiClient bazaviy "Content-Type: application/json" headerini o'zida saqlaydi.
      // Buni shu so'rovda bekor qilmasak, axios FormData'ni multipart o'rniga
      // JSON'ga aylantirib yuboradi (backend "Bad request" bilan javob beradi).
      headers: { "Content-Type": null },
    });
    return apiData(response.data);
  },
  importShabloniniOlish: async () => {
    const response = await apiClient.get<Blob>("/catalog/products/import/template", {
      responseType: "blob",
    });
    return {
      blob: response.data,
      contentDisposition: String(response.headers["content-disposition"] ?? ""),
    };
  },
  exportQilish: async (filters?: MahsulotExportFiltrlari) => {
    const response = await apiClient.get<Blob>("/catalog/products/export", {
      params: filters,
      responseType: "blob",
    });
    return {
      blob: response.data,
      contentDisposition: String(response.headers["content-disposition"] ?? ""),
    };
  },
};

// Mahsulot tafsiloti: modifikatsiyalar CRUD va alohida narx endpointlari.
export const modifikatsiyalarApi = {
  // Barcha mahsulotlar variantlari narx va mahsulot bilan bitta so'rovda —
  // har bir mahsulot uchun alohida royxat() chaqirishning (N+1) o'rniga.
  barchasi: async (productIds?: string[]) => {
    const response = await apiClient.get<
      MahsulotModifikatsiyasi[] | ApiListEnvelope<MahsulotModifikatsiyasi>
    >("/catalog/modifications", {
      params: productIds?.length ? { productIds: productIds.join(",") } : undefined,
    });
    return apiList(response.data);
  },
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
