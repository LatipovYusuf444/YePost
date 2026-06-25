import apiClient from "./axios";
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

// Organization sahifasi: kompaniyaning barcha Swagger CRUD endpointlari.
export const kompaniyalarApi = {
  royxat: async () =>
    (await apiClient.get<Kompaniya[]>("/organization/company")).data,
  olish: async (id: string) =>
    (await apiClient.get<Kompaniya>(`/organization/company/${id}`)).data,
  yaratish: async (data: KompaniyaSaqlashMalumoti) =>
    (await apiClient.post<Kompaniya>("/organization/company", data)).data,
  yangilash: async (id: string, data: Partial<KompaniyaSaqlashMalumoti>) =>
    (await apiClient.patch<Kompaniya>(`/organization/company/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Kompaniya>(`/organization/company/${id}`)).data,
};

// Ombor/index.tsx: branchId maydoniga real UUID tanlash uchun filiallar.
export const filiallarApi = {
  royxat: async () =>
    (await apiClient.get<Filial[]>("/organization/branches")).data,
  olish: async (id: string) =>
    (await apiClient.get<Filial>(`/organization/branches/${id}`)).data,
  yaratish: async (data: FilialYaratishMalumoti) =>
    (await apiClient.post<Filial>("/organization/branches", data)).data,
  yangilash: async (id: string, data: Partial<FilialYaratishMalumoti>) =>
    (await apiClient.patch<Filial>(`/organization/branches/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Filial>(`/organization/branches/${id}`)).data,
};

// Ombor/index.tsx: omborlar ro'yxati va CRUD amallari.
export const omborlarApi = {
  royxat: async () => (await apiClient.get<Ombor[]>("/organization/warehouses")).data,
  olish: async (id: string) =>
    (await apiClient.get<Ombor>(`/organization/warehouses/${id}`)).data,
  yaratish: async (data: OmborSaqlashMalumoti) =>
    (await apiClient.post<Ombor>("/organization/warehouses", data)).data,
  yangilash: async (id: string, data: Partial<OmborSaqlashMalumoti>) =>
    (await apiClient.patch<Ombor>(`/organization/warehouses/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Ombor>(`/organization/warehouses/${id}`)).data,
};

// Ombor/Xaridlar.tsx va Kirim.tsx: kirim hujjatlari.
export const kirimApi = {
  royxat: async () => (await apiClient.get<KirimHujjati[]>("/inventory/purchases")).data,
  olish: async (id: string) =>
    (await apiClient.get<KirimHujjati>(`/inventory/purchases/${id}`)).data,
  yaratish: async (data: KirimYaratishMalumoti) =>
    (await apiClient.post<KirimHujjati>("/inventory/purchases", data)).data,
  yangilash: async (id: string, data: Partial<KirimYaratishMalumoti>) =>
    (await apiClient.patch<KirimHujjati>(`/inventory/purchases/${id}`, data)).data,
  tasdiqlash: async (id: string) =>
    (await apiClient.post<KirimHujjati>(`/inventory/purchases/${id}/confirm`)).data,
  bekorQilish: async (id: string) =>
    (await apiClient.post<KirimHujjati>(`/inventory/purchases/${id}/cancel`)).data,
};

// Ombor/Chiqim.tsx: ombordan hisobdan chiqarish hujjatlari.
export const chiqimApi = {
  royxat: async () =>
    (await apiClient.get<ChiqimHujjati[]>("/inventory/write-offs")).data,
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
  royxat: async () =>
    (await apiClient.get<KochirishHujjati[]>("/inventory/transfers")).data,
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
  royxat: async () =>
    (await apiClient.get<InventarizatsiyaHujjati[]>("/inventory/stock-takes")).data,
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
  return (
    await apiClient.get<OmborQoldigi[]>("/inventory/stock-balance", {
      params: warehouseId ? { warehouseId } : undefined,
    })
  ).data;
}

// Ombor hujjatlari formalaridagi yetkazib beruvchi va mas'ul xodim tanlovlari.
export async function yetkazibBeruvchilar() {
  return (await apiClient.get<NomliEntity[]>("/partners/suppliers")).data;
}

// Ombor/Xaridlar.tsx: kirim oynasidan yangi yetkazib beruvchi yaratish.
export async function yetkazibBeruvchiYaratish(data: { name: string; phone?: string }) {
  return (await apiClient.post<NomliEntity>("/partners/suppliers", data)).data;
}

export async function xodimlar() {
  return (await apiClient.get<NomliEntity[]>("/accounts/users")).data;
}

// Kirim formasida hali qoldiqda bo'lmagan mahsulotlarni ham tanlash uchun katalog olinadi.
export async function barchaModifikatsiyalar() {
  const mahsulotlar = (
    await apiClient.get<Array<{ id: string; name?: string }>>("/catalog/products")
  ).data;

  const royxatlar = await Promise.all(
    mahsulotlar.map(async (mahsulot) => {
      const modifications = (
        await apiClient.get<MahsulotModifikatsiyasi[]>(
          `/catalog/products/${mahsulot.id}/modifications`
        )
      ).data;

      return modifications.map((modification) => ({
        ...modification,
        productId: modification.productId ?? mahsulot.id,
        product: modification.product ?? mahsulot,
      }));
    })
  );

  return royxatlar.flat();
}
