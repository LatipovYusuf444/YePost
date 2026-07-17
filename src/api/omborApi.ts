import axios from "axios";
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

const omborKengaytirilganMaydonlari = [
  "address",
  "latitude",
  "longitude",
  "openingTime",
  "closingTime",
  "responsibleId",
] as const;

function kengaytirilganOmborMaydonlariRadEtildi(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return false;
  const javob = JSON.stringify(error.response.data).toLowerCase();
  return omborKengaytirilganMaydonlari.some((maydon) =>
    javob.includes(`property ${maydon.toLowerCase()} should not exist`)
  );
}

async function omborYaratishToliq(data: OmborSaqlashMalumoti) {
  try {
    const response = await apiClient.post<Ombor | ApiEnvelope<Ombor>>(
      "/organization/warehouses",
      data
    );
    return apiData(response.data);
  } catch (error) {
    if (!kengaytirilganOmborMaydonlariRadEtildi(error)) throw error;
    throw new Error(
      "Backend ombor manzili, GPS, ish vaqti va mas'ul shaxs maydonlarini hali qabul qilmaydi. Warehouse DTO yangilanmaguncha ombor saqlanmadi."
    );
  }
}

async function omborYangilashToliq(
  id: string,
  data: Partial<OmborSaqlashMalumoti>
) {
  try {
    const response = await apiClient.patch<Ombor | ApiEnvelope<Ombor>>(
      `/organization/warehouses/${id}`,
      data
    );
    return apiData(response.data);
  } catch (error) {
    if (!kengaytirilganOmborMaydonlariRadEtildi(error)) throw error;
    throw new Error(
      "Backend ombor manzili, GPS, ish vaqti va mas'ul shaxs maydonlarini hali qabul qilmaydi. Warehouse DTO yangilanmaguncha o'zgarishlar saqlanmadi."
    );
  }
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
  yaratish: omborYaratishToliq,
  yangilash: omborYangilashToliq,
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
    apiData(
      (await apiClient.get<ChiqimHujjati | ApiEnvelope<ChiqimHujjati>>(
        `/inventory/write-offs/${id}`
      )).data
    ),
  yaratish: async (data: ChiqimYaratishMalumoti) =>
    apiData(
      (await apiClient.post<ChiqimHujjati | ApiEnvelope<ChiqimHujjati>>(
        "/inventory/write-offs",
        data
      )).data
    ),
  yangilash: async (id: string, data: Partial<ChiqimYaratishMalumoti>) =>
    apiData(
      (await apiClient.patch<ChiqimHujjati | ApiEnvelope<ChiqimHujjati>>(
        `/inventory/write-offs/${id}`,
        data
      )).data
    ),
  tasdiqlash: async (id: string) =>
    apiData(
      (await apiClient.post<ChiqimHujjati | ApiEnvelope<ChiqimHujjati>>(
        `/inventory/write-offs/${id}/confirm`
      )).data
    ),
  bekorQilish: async (id: string) =>
    apiData(
      (await apiClient.post<ChiqimHujjati | ApiEnvelope<ChiqimHujjati>>(
        `/inventory/write-offs/${id}/cancel`
      )).data
    ),
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
    apiData(
      (await apiClient.get<KochirishHujjati | ApiEnvelope<KochirishHujjati>>(`/inventory/transfers/${id}`)).data
    ),
  yaratish: async (data: KochirishYaratishMalumoti) =>
    apiData(
      (await apiClient.post<KochirishHujjati | ApiEnvelope<KochirishHujjati>>("/inventory/transfers", data)).data
    ),
  yangilash: async (id: string, data: Partial<KochirishYaratishMalumoti>) =>
    apiData(
      (await apiClient.patch<KochirishHujjati | ApiEnvelope<KochirishHujjati>>(`/inventory/transfers/${id}`, data)).data
    ),
  jonatish: async (id: string) =>
    apiData(
      (await apiClient.post<KochirishHujjati | ApiEnvelope<KochirishHujjati>>(`/inventory/transfers/${id}/send`)).data
    ),
  qabulQilish: async (id: string) =>
    apiData(
      (await apiClient.post<KochirishHujjati | ApiEnvelope<KochirishHujjati>>(`/inventory/transfers/${id}/receive`)).data
    ),
  bekorQilish: async (id: string) =>
    apiData(
      (await apiClient.post<KochirishHujjati | ApiEnvelope<KochirishHujjati>>(`/inventory/transfers/${id}/cancel`)).data
    ),
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
    apiData(
      (
        await apiClient.get<InventarizatsiyaHujjati | ApiEnvelope<InventarizatsiyaHujjati>>(
          `/inventory/stock-takes/${id}`
        )
      ).data
    ),
  yaratish: async (data: InventarizatsiyaYaratishMalumoti) =>
    apiData(
      (
        await apiClient.post<InventarizatsiyaHujjati | ApiEnvelope<InventarizatsiyaHujjati>>(
          "/inventory/stock-takes",
          data
        )
      ).data
    ),
  yangilash: async (
    id: string,
    data: Partial<InventarizatsiyaYaratishMalumoti>
  ) =>
    apiData(
      (
      await apiClient.patch<InventarizatsiyaHujjati>(
        `/inventory/stock-takes/${id}`,
        data
      )
      ).data
    ),
  tasdiqlash: async (id: string) =>
    apiData(
      (
        await apiClient.post<InventarizatsiyaHujjati | ApiEnvelope<InventarizatsiyaHujjati>>(
          `/inventory/stock-takes/${id}/confirm`
        )
      ).data
    ),
};

// Ombor/OmborQoldigi.tsx va Mahsulotlar.tsx: real ombor qoldiqlari.
export async function omborQoldiqlari(warehouseId?: string) {
  try {
    const response = await apiClient.get<RoyxatJavobi<OmborQoldigi>>("/inventory/stock-balance", {
      params: warehouseId ? { warehouseId } : undefined,
    });

    return royxatniAjratish(response.data);
  } catch (error) {
    // Endpoint mavjud, lekin backend ayrim bo'sh omborlar uchun [] o'rniga 404 qaytaradi.
    // Ro'yxat so'rovida bu xato emas — omborda hali qoldiq yo'q degani.
    if (axios.isAxiosError(error) && error.response?.status === 404) return [];
    throw error;
  }
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

// Ombor yaratish/tahrirlash formasida faqat omborga mas'ul bo'la oladigan
// xodimlarni chiqarish uchun maxsus backend tanlovi.
export async function omborMasullari() {
  return apiList(
    (
      await apiClient.get<NomliEntity[] | ApiListEnvelope<NomliEntity>>(
        "/organization/warehouses/responsibles"
      )
    ).data
  );
}

export type TeskariGeokodlashJavobi = {
  address: string | null;
  latitude: number;
  longitude: number;
};

// Ombor formasida brauzer GPS koordinatasini foydalanuvchiga tushunarli
// yozma manzilga aylantiradi.
export async function manzilniKoordinatadanAniqlash(
  latitude: number,
  longitude: number
) {
  const response = await apiClient.get<
    TeskariGeokodlashJavobi | ApiEnvelope<TeskariGeokodlashJavobi>
  >("/location/reverse-geocode", {
    params: { latitude, longitude },
  });
  return apiData(response.data);
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
