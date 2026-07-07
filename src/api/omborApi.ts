import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  ChiqimHujjati,
  ChiqimYaratishMalumoti,
  Filial,
  FilialYaratishMalumoti,
  InventarizatsiyaHujjati,
  InventarizatsiyaYaratishMalumoti,
  KirimHujjati,
  KirimYaratishMalumoti,
  Kompaniya,
  KompaniyaSaqlashMalumoti,
  KochirishHujjati,
  KochirishYaratishMalumoti,
  MahsulotModifikatsiyasi,
  NomliEntity,
  Ombor,
  OmborQoldigi,
  OmborSaqlashMalumoti,
} from "@/types/ombor";

type RoyxatJavobi<T> = T[] | { value?: T[]; items?: T[]; results?: T[]; data?: T[] };

function royxatniAjratish<T>(data: RoyxatJavobi<T>): T[] {
  return apiList(data as T[] | ApiListEnvelope<T>);
}

// Organization sahifasi: kompaniyaning barcha Swagger CRUD endpointlari.
export const kompaniyalarApi = {
  royxat: async () =>
    apiList((await apiClient.get<Kompaniya[] | ApiListEnvelope<Kompaniya>>("/organization/company")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Kompaniya | ApiEnvelope<Kompaniya>>(`/organization/company/${id}`)).data),
  yaratish: async (data: KompaniyaSaqlashMalumoti) =>
    apiData((await apiClient.post<Kompaniya | ApiEnvelope<Kompaniya>>("/organization/company", data)).data),
  yangilash: async (id: string, data: Partial<KompaniyaSaqlashMalumoti>) =>
    apiData((await apiClient.patch<Kompaniya | ApiEnvelope<Kompaniya>>(`/organization/company/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Kompaniya | ApiEnvelope<Kompaniya>>(`/organization/company/${id}`)).data),
};

// Ombor/index.tsx: branchId maydoniga real UUID tanlash uchun filiallar.
export const filiallarApi = {
  royxat: async () =>
    apiList((await apiClient.get<Filial[] | ApiListEnvelope<Filial>>("/organization/branches")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Filial | ApiEnvelope<Filial>>(`/organization/branches/${id}`)).data),
  yaratish: async (data: FilialYaratishMalumoti) =>
    apiData((await apiClient.post<Filial | ApiEnvelope<Filial>>("/organization/branches", data)).data),
  yangilash: async (id: string, data: Partial<FilialYaratishMalumoti>) =>
    apiData((await apiClient.patch<Filial | ApiEnvelope<Filial>>(`/organization/branches/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Filial | ApiEnvelope<Filial>>(`/organization/branches/${id}`)).data),
};

// Ombor/index.tsx: omborlar ro'yxati va CRUD amallari.
export const omborlarApi = {
  royxat: async () =>
    apiList((await apiClient.get<Ombor[] | ApiListEnvelope<Ombor>>("/organization/warehouses")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Ombor | ApiEnvelope<Ombor>>(`/organization/warehouses/${id}`)).data),
  yaratish: async (data: OmborSaqlashMalumoti) =>
    apiData((await apiClient.post<Ombor | ApiEnvelope<Ombor>>("/organization/warehouses", data)).data),
  yangilash: async (id: string, data: Partial<OmborSaqlashMalumoti>) =>
    apiData((await apiClient.patch<Ombor | ApiEnvelope<Ombor>>(`/organization/warehouses/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Ombor | ApiEnvelope<Ombor>>(`/organization/warehouses/${id}`)).data),
};

// Ombor/Xaridlar.tsx va Kirim.tsx: kirim hujjatlari.
export const kirimApi = {
  royxat: async () => {
    const response = await apiClient.get<RoyxatJavobi<KirimHujjati>>(
      "/inventory/purchases"
    );
    return royxatniAjratish(response.data);
  },
  olish: async (id: string) =>
    apiData(
      (await apiClient.get<KirimHujjati | ApiEnvelope<KirimHujjati>>(`/inventory/purchases/${id}`)).data
    ),
  yaratish: async (data: KirimYaratishMalumoti) =>
    apiData(
      (await apiClient.post<KirimHujjati | ApiEnvelope<KirimHujjati>>("/inventory/purchases", data)).data
    ),
  yangilash: async (id: string, data: Partial<KirimYaratishMalumoti>) =>
    apiData(
      (await apiClient.patch<KirimHujjati | ApiEnvelope<KirimHujjati>>(
        `/inventory/purchases/${id}`,
        data
      )).data
    ),
  tasdiqlash: async (id: string) =>
    apiData(
      (await apiClient.post<KirimHujjati | ApiEnvelope<KirimHujjati>>(
        `/inventory/purchases/${id}/confirm`
      )).data
    ),
  bekorQilish: async (id: string) =>
    apiData(
      (await apiClient.post<KirimHujjati | ApiEnvelope<KirimHujjati>>(
        `/inventory/purchases/${id}/cancel`
      )).data
    ),
};

// Ombor/Chiqim.tsx: ombordan hisobdan chiqarish hujjatlari.
export const chiqimApi = {
  royxat: async () => {
    const response = await apiClient.get<RoyxatJavobi<ChiqimHujjati>>(
      "/inventory/write-offs"
    );
    return royxatniAjratish(response.data);
  },
  olish: async (id: string) =>
    (await apiClient.get<ChiqimHujjati>(`/inventory/write-offs/${id}`)).data,
  yaratish: async (data: ChiqimYaratishMalumoti) =>
    (await apiClient.post<ChiqimHujjati>("/inventory/write-offs", data)).data,
  yangilash: async (id: string, data: Partial<ChiqimYaratishMalumoti>) =>
    (await apiClient.patch<ChiqimHujjati>(`/inventory/write-offs/${id}`, data)).data,
  tasdiqlash: async (id: string) =>
    (await apiClient.post<ChiqimHujjati>(`/inventory/write-offs/${id}/confirm`)).data,
  bekorQilish: async (id: string) =>
    (await apiClient.post<ChiqimHujjati>(`/inventory/write-offs/${id}/cancel`)).data,
};

// Ombor/Kochirish.tsx: omborlar orasida ko'chirish hujjatlari.
export const kochirishApi = {
  royxat: async () => {
    const response = await apiClient.get<RoyxatJavobi<KochirishHujjati>>(
      "/inventory/transfers"
    );
    return royxatniAjratish(response.data);
  },
  olish: async (id: string) =>
    (await apiClient.get<KochirishHujjati>(`/inventory/transfers/${id}`)).data,
  yaratish: async (data: KochirishYaratishMalumoti) =>
    (await apiClient.post<KochirishHujjati>("/inventory/transfers", data)).data,
  yangilash: async (id: string, data: Partial<KochirishYaratishMalumoti>) =>
    (await apiClient.patch<KochirishHujjati>(`/inventory/transfers/${id}`, data)).data,
  jonatish: async (id: string) =>
    (await apiClient.post<KochirishHujjati>(`/inventory/transfers/${id}/send`)).data,
  qabulQilish: async (id: string) =>
    (await apiClient.post<KochirishHujjati>(`/inventory/transfers/${id}/receive`)).data,
  bekorQilish: async (id: string) =>
    (await apiClient.post<KochirishHujjati>(`/inventory/transfers/${id}/cancel`)).data,
};

// Ombor/Inventarizatsiya.tsx: inventarizatsiya hujjatlari.
export const inventarizatsiyaApi = {
  royxat: async () => {
    const response = await apiClient.get<RoyxatJavobi<InventarizatsiyaHujjati>>(
      "/inventory/stock-takes"
    );
    return royxatniAjratish(response.data);
  },
  olish: async (id: string) =>
    (await apiClient.get<InventarizatsiyaHujjati>(`/inventory/stock-takes/${id}`))
      .data,
  yaratish: async (data: InventarizatsiyaYaratishMalumoti) =>
    (await apiClient.post<InventarizatsiyaHujjati>("/inventory/stock-takes", data)).data,
  yangilash: async (
    id: string,
    data: Partial<InventarizatsiyaYaratishMalumoti>
  ) =>
    (
      await apiClient.patch<InventarizatsiyaHujjati>(
        `/inventory/stock-takes/${id}`,
        data
      )
    ).data,
  tasdiqlash: async (id: string) =>
    (await apiClient.post<InventarizatsiyaHujjati>(`/inventory/stock-takes/${id}/confirm`))
      .data,
};

// Ombor/OmborQoldigi.tsx va Mahsulotlar.tsx: real ombor qoldiqlari.
export async function omborQoldiqlari(warehouseId?: string) {
  const response = await apiClient.get<RoyxatJavobi<OmborQoldigi>>("/inventory/stock-balance", {
      params: warehouseId ? { warehouseId } : undefined,
    });

  return royxatniAjratish(response.data);
}

// Ombor hujjatlari formalaridagi yetkazib beruvchi va mas'ul xodim tanlovlari.
export async function yetkazibBeruvchilar() {
  return apiList(
    (await apiClient.get<NomliEntity[] | ApiListEnvelope<NomliEntity>>("/partners/suppliers")).data
  );
}

// Ombor/Xaridlar.tsx: kirim oynasidan yangi yetkazib beruvchi yaratish.
export async function yetkazibBeruvchiYaratish(data: { name: string; phone?: string }) {
  return apiData(
    (await apiClient.post<NomliEntity | ApiEnvelope<NomliEntity>>("/partners/suppliers", data)).data
  );
}

export async function xodimlar() {
  return apiList(
    (await apiClient.get<NomliEntity[] | ApiListEnvelope<NomliEntity>>("/accounts/users")).data
  );
}

// Kirim formasida hali qoldiqda bo'lmagan mahsulotlarni ham tanlash uchun katalog olinadi.
export async function barchaModifikatsiyalar() {
  const mahsulotlar = apiList(
    (
      await apiClient.get<
        Array<{ id: string; name?: string }> | ApiListEnvelope<{ id: string; name?: string }>
      >("/catalog/products")
    ).data
  );

  const royxatlar = await Promise.all(
    mahsulotlar.map(async (mahsulot) => {
      const modifications = apiList(
        (
          await apiClient.get<MahsulotModifikatsiyasi[] | ApiListEnvelope<MahsulotModifikatsiyasi>>(
            `/catalog/products/${mahsulot.id}/modifications`
          )
        ).data
      );

      return modifications.map((modification) => ({
        ...modification,
        productId: modification.productId ?? mahsulot.id,
        product: modification.product ?? mahsulot,
      }));
    })
  );

  return royxatlar.flat();
}
