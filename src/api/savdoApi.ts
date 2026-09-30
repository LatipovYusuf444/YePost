import apiClient from "./axios";
import axios from "axios";
import { modifikatsiyalarApi } from "./catalogApi";
import { stockBalanceReportAll } from "./reportsApi";
import { apiData, apiList, ruxsatsizBulsaBosh, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  MijozTanlovi,
  OmborTanlovi,
  Qaytarish,
  QaytarishYaratishMalumoti,
  QoldiqTanlovi,
  Sotuv,
  SotuvTolovi,
  SotuvYaratishMalumoti,
  XodimTanlovi,
  YetkazishMalumoti,
  YetkazishPayload,
  SaleAuditLog,
} from "@/types/savdo";
import type { Mahsulot, MahsulotModifikatsiyasi } from "@/types/catalog";

type RoyxatJavobi<T> = T[] | { value?: T[]; items?: T[]; results?: T[]; data?: T[] };

function royxatniAjratish<T>(data: RoyxatJavobi<T>): T[] {
  return apiList(data as T[] | ApiListEnvelope<T>);
}

// Savdo/index.tsx, Savatcha.tsx, Tarix.tsx va BekorQilinganlar.tsx:
// barcha sotuvlarni backenddan oladi.
export async function sotuvlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<Sotuv> | ApiListEnvelope<Sotuv>>("/sales");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: tanlangan sotuvning mahsulotlari va to'lovlarini oladi.
export async function sotuvTafsilotiniOlish(sotuvId: string) {
  const response = await apiClient.get<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${sotuvId}`);
  return apiData(response.data);
}

// Savdo/index.tsx: yangi sotuvni qoralama holatida yaratadi.
export async function sotuvYaratish(malumot: SotuvYaratishMalumoti) {
  const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>("/sales", malumot);
  return apiData(response.data);
}

// Savatcha.tsx: faqat DRAFT holatidagi sotuvni tahrirlaydi.
export async function sotuvniYangilash(
  sotuvId: string,
  malumot: Partial<SotuvYaratishMalumoti>
) {
  const response = await apiClient.patch<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${sotuvId}`, malumot);
  return apiData(response.data);
}

// Savatcha.tsx va Savdo/index.tsx: qoralama sotuvni tasdiqlaydi.
export async function sotuvniTasdiqlash(sotuvId: string) {
  const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${sotuvId}/confirm`);
  return apiData(response.data);
}

// Savdo/index.tsx: sotuvni bekor qiladi va ombor qoldig'ini tiklaydi.
export async function sotuvniBekorQilish(sotuvId: string) {
  const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${sotuvId}/cancel`);
  return apiData(response.data);
}

// Tasdiqlangan sotuvdagi qarzdorlikka yangi to'lov qo'shadi.
// Payment endpoint umumiy ResponseHelper qaytargani uchun, saqlangandan keyin
// sotuvning yangilangan holatini alohida GET orqali qayta olamiz.
export async function sotuvgaTolovQoshish(
  sotuvId: string,
  tolov: Pick<SotuvTolovi, "paymentType" | "amount">
) {
  await apiClient.post(`/sales/${sotuvId}/payments`, tolov);
  return sotuvTafsilotiniOlish(sotuvId);
}

export async function yetkazishniOlish(sotuvId: string) {
  try {
    const response = await apiClient.get<YetkazishMalumoti | ApiEnvelope<YetkazishMalumoti>>(
      `/sales/${sotuvId}/delivery`
    );
    return apiData(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function sotuvTarixiniOlish(sotuvId:string){
  const response=await apiClient.get<{data?:SaleAuditLog[];total?:number}>(`/sales/${sotuvId}/history`);
  return response.data.data??[];
}

export async function yetkazishYaratish(sotuvId: string, payload: YetkazishPayload) {
  const response = await apiClient.post<YetkazishMalumoti | ApiEnvelope<YetkazishMalumoti>>(
    `/sales/${sotuvId}/delivery`, payload
  );
  return apiData(response.data);
}

export async function yetkazishniYangilash(sotuvId: string, payload: YetkazishPayload) {
  const response = await apiClient.patch<YetkazishMalumoti | ApiEnvelope<YetkazishMalumoti>>(
    `/sales/${sotuvId}/delivery`, payload
  );
  return apiData(response.data);
}

export async function yetkazishniJonatish(sotuvId: string) {
  const response = await apiClient.post<YetkazishMalumoti | ApiEnvelope<YetkazishMalumoti>>(
    `/sales/${sotuvId}/delivery/dispatch`
  );
  return apiData(response.data);
}

export async function yetkazishniYakunlash(sotuvId: string) {
  const response = await apiClient.post<YetkazishMalumoti | ApiEnvelope<YetkazishMalumoti>>(
    `/sales/${sotuvId}/delivery/complete`
  );
  return apiData(response.data);
}

export async function yetkazishniBekorQilish(sotuvId: string) {
  const response = await apiClient.post<YetkazishMalumoti | ApiEnvelope<YetkazishMalumoti>>(
    `/sales/${sotuvId}/delivery/cancel`
  );
  return apiData(response.data);
}

// Qaytarish.tsx: barcha qaytarish hujjatlarini oladi.
export async function qaytarishlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<Qaytarish> | ApiListEnvelope<Qaytarish>>("/returns");
  return royxatniAjratish(response.data);
}

// Qaytarish.tsx: tanlangan qaytarishning to'liq tafsilotlarini ID orqali oladi.
export async function qaytarishTafsilotiniOlish(qaytarishId: string) {
  const response = await apiClient.get<Qaytarish | ApiEnvelope<Qaytarish>>(`/returns/${qaytarishId}`);
  return apiData(response.data);
}

// Qaytarish.tsx: yangi qaytarish hujjatini qoralama holatida yaratadi.
export async function qaytarishYaratish(malumot: QaytarishYaratishMalumoti) {
  const response = await apiClient.post<Qaytarish | ApiEnvelope<Qaytarish>>("/returns", malumot);
  return apiData(response.data);
}

// Qaytarish.tsx: faqat DRAFT holatidagi qaytarish hujjatini tahrirlaydi.
export async function qaytarishniYangilash(
  qaytarishId: string,
  malumot: Partial<QaytarishYaratishMalumoti>
) {
  const response = await apiClient.patch<Qaytarish>(
    `/returns/${qaytarishId}`,
    malumot
  );
  return apiData(response.data);
}

// Qaytarish.tsx: qaytarishni tasdiqlaydi va mahsulotni omborga qaytaradi.
export async function qaytarishniTasdiqlash(qaytarishId: string) {
  const response = await apiClient.post<Qaytarish | ApiEnvelope<Qaytarish>>(`/returns/${qaytarishId}/confirm`);
  return apiData(response.data);
}

// Qaytarish.tsx: qaytarish hujjatini bekor qiladi.
export async function qaytarishniBekorQilish(qaytarishId: string) {
  const response = await apiClient.post<Qaytarish | ApiEnvelope<Qaytarish>>(`/returns/${qaytarishId}/cancel`);
  return apiData(response.data);
}

// Savdo/index.tsx: yangi sotuv formasidagi ombor tanlovi uchun.
export async function omborlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<OmborTanlovi> | ApiListEnvelope<OmborTanlovi>>("/organization/warehouses");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: sotuvga biriktiriladigan jismoniy mijozlar uchun.
export async function mijozlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<MijozTanlovi> | ApiListEnvelope<MijozTanlovi>>("/partners/customers");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: sotuvga biriktiriladigan mijoz kompaniyalari uchun.
export async function mijozKompaniyalariRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<MijozTanlovi> | ApiListEnvelope<MijozTanlovi>>("/partners/client-companies");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: sotuv uchun mas'ul xodim tanlovi.
// KASSIR/OMBORCHI uchun /accounts/users 403 qaytaradi — bo'sh ro'yxat
// sifatida qabul qilinadi, sahifa yiqilib qolmasligi uchun.
export async function xodimlarRoyxatiniOlish() {
  return ruxsatsizBulsaBosh(async () => {
    const response = await apiClient.get<RoyxatJavobi<XodimTanlovi> | ApiListEnvelope<XodimTanlovi>>("/accounts/users");
    return royxatniAjratish(response.data);
  });
}

// Savdo/index.tsx: ombordagi mavjud modifikatsiya, qoldiq va narxlarni oladi.
// Backend qatorida variant ID'si turlicha nomlanishi mumkin; hammasi `modificationId` ga keltiriladi.
function qoldiqIdsiniTiklash(qator: QoldiqTanlovi): QoldiqTanlovi {
  const xom = qator as QoldiqTanlovi & { variantId?: string; productVariantId?: string; modification_id?: string };
  const id = xom.modificationId || xom.modification?.id || xom.variantId || xom.productVariantId || xom.modification_id || "";
  if (!id && import.meta.env.DEV) {
    console.warn("Ombor qoldig'i yozuvida variant ID topilmadi:", qator);
  }
  return id ? { ...qator, modificationId: id } : qator;
}

// Hisobot endpointi (`/reports/stock-balance`) har qatorda mahsulot va variant nomi, ombor, shtrix kod,
// mavjud miqdor va narxlarni to'liq beradi, qoldig'i 0 bo'lgan yozuvlarni ham qaytara oladi.
// Sotuv ro'yxatlari shu manbaga tayanadi; ruxsat bo'lmasa (masalan kassir) oddiy qoldiq endpointiga o'tiladi.
async function qoldiqlarniHisobotdanOlish(warehouseId?: string): Promise<QoldiqTanlovi[]> {
  const qatorlar = await stockBalanceReportAll(
    {
      warehouseIds: warehouseId || undefined,
      groupByWarehouse: true,
      balanceStatus: "ALL",
      priceType: "RETAIL",
      includeReserved: true,
    },
    500
  );

  return qatorlar
    .filter((qator) => qator.modificationId)
    .map((qator) => {
      const mavjud = Number(qator.availableQuantity ?? qator.quantity ?? 0);
      const chakana = Number(qator.retailPrice ?? 0);
      const ulgurji = Number(qator.wholesalePrice ?? 0);
      return {
        warehouseId: qator.warehouseId ?? undefined,
        productId: qator.productId,
        modificationId: qator.modificationId,
        quantity: Number.isFinite(mavjud) ? mavjud : 0,
        balance: Number.isFinite(mavjud) ? mavjud : 0,
        sellingPrice: chakana,
        price: chakana,
        warehouse: qator.warehouseId ? { id: qator.warehouseId, name: qator.warehouseName ?? undefined } : undefined,
        modification: {
          id: qator.modificationId,
          name: qator.modificationName ?? undefined,
          barcode: qator.barcode ?? undefined,
          product: { id: qator.productId, name: qator.productName },
          price: { retailPrice: chakana, wholesalePrice: ulgurji, sellingPrice: chakana },
        },
      } as QoldiqTanlovi;
    });
}

export async function omborQoldiqlariniOlish(warehouseId?: string) {
  try {
    return await qoldiqlarniHisobotdanOlish(warehouseId);
  } catch {
    // Hisobotga ruxsat yo'q yoki endpoint ishlamadi — oddiy qoldiq ro'yxatiga qaytiladi.
  }
  const response = await apiClient.get<RoyxatJavobi<QoldiqTanlovi> | ApiListEnvelope<QoldiqTanlovi>>("/inventory/stock-balance", {
    params: warehouseId ? { warehouseId } : undefined,
  });
  return royxatniAjratish(response.data).map(qoldiqIdsiniTiklash);
}

// Modifikatsiya/mahsulot ma'lumotlari sahifalar almashganda qayta-qayta so'ralmasligi uchun
// qisqa muddatga (5 daqiqa) eslab qolinadi; muvaffaqiyatsiz so'rov ham eslanadi.
const KESH_MUDDATI = 5 * 60 * 1000;
type KeshYozuvi<T> = { vaqt: number; qiymat: Promise<T | null> };
const modifikatsiyaKeshi = new Map<string, KeshYozuvi<MahsulotModifikatsiyasi>>();
const mahsulotKeshi = new Map<string, KeshYozuvi<Mahsulot>>();

function keshdanOlish<T>(kesh: Map<string, KeshYozuvi<T>>, kalit: string, yuklash: () => Promise<T | null>) {
  const mavjud = kesh.get(kalit);
  if (mavjud && Date.now() - mavjud.vaqt < KESH_MUDDATI) return mavjud.qiymat;
  const qiymat = yuklash().catch(() => null);
  kesh.set(kalit, { vaqt: Date.now(), qiymat });
  return qiymat;
}

function narxBormi(narx?: { retailPrice?: number | string; wholesalePrice?: number | string; sellingPrice?: number | string } | null) {
  return [narx?.retailPrice, narx?.wholesalePrice, narx?.sellingPrice].some((qiymat) => Number(qiymat) > 0);
}

// Qoldiq javobida faqat modificationId kelgan yozuvlarning katalogdagi haqiqiy
// mahsulot nomini tiklaydi. Shu orqali selectda UUID nom o'rnida ko'rinmaydi.
export async function qoldiqNomlariniBoyitish(qoldiqlar: QoldiqTanlovi[]) {
  function mahsulotniOlish(productId: string) {
    return keshdanOlish(mahsulotKeshi, productId, async () => {
      try {
        return apiData((await apiClient.get<Mahsulot | ApiEnvelope<Mahsulot>>(`/catalog/products/${productId}`)).data);
      } catch {
        return null;
      }
    });
  }

  return Promise.all(
    qoldiqlar.map(async (qoldiq) => {
      if (qoldiq.modification?.product?.name) return qoldiq;

      // ID yo'q bo'lsa so'rov yuborilmaydi (aks holda `/catalog/modifications/undefined` → 400).
      const modificationId = qoldiq.modificationId || qoldiq.modification?.id;
      if (!modificationId) return qoldiq;

      try {
        const modification = await keshdanOlish(modifikatsiyaKeshi, modificationId, async () =>
          apiData(
            (
              await apiClient.get<MahsulotModifikatsiyasi | ApiEnvelope<MahsulotModifikatsiyasi>>(
                `/catalog/modifications/${modificationId}`
              )
            ).data
          )
        );
        if (!modification) return qoldiq;
        const productId = modification.productId ?? qoldiq.productId;
        const product = productId ? await mahsulotniOlish(productId) : null;

        return {
          ...qoldiq,
          productId: productId ?? qoldiq.productId,
          modification: {
            ...qoldiq.modification,
            id: modification.id,
            name: modification.name ?? qoldiq.modification?.name ?? undefined,
            barcode: modification.barcode ?? qoldiq.modification?.barcode,
            article: modification.article ?? qoldiq.modification?.article,
            product: product
              ? { id: product.id, name: product.name }
              : qoldiq.modification?.product,
            price: narxBormi(qoldiq.modification?.price)
              ? qoldiq.modification?.price
              : (modification.price
                ? {
                    costPrice: modification.price.costPrice,
                    retailPrice: modification.price.retailPrice,
                    wholesalePrice: modification.price.wholesalePrice,
                    sellingPrice: modification.price.retailPrice,
                  }
                : undefined),
          },
        } satisfies QoldiqTanlovi;
      } catch {
        return qoldiq;
      }
    })
  );
}

// YangiSotuvModal.tsx: ombor qoldig'ida bo'lmasa ham katalogdagi real mahsulot
// modifikatsiyalarini sotuv tanlovida ko'rsatish uchun ishlatiladi.
// To'liq katalog (/catalog/modifications) KASSIR/OMBORCHI uchun 403 (tannarx
// borligi sababli), shuning uchun ular ham ochiq bo'lgan qidiruv endpointi
// ishlatiladi (qoldiq bilan, tannarxsiz).
export async function katalogModifikatsiyalariniQoldiqTanlovigaOlish(): Promise<QoldiqTanlovi[]> {
  const modifications = await modifikatsiyalarApi.qidiruv();

  return modifications
    .filter((modification) => modification.product?.isActive !== false)
    .filter((modification) => {
      // ID'siz yozuvni sotuvga qo'shib bo'lmaydi va boshqa yozuvlar bilan adashib ketadi.
      const idBor = Boolean(modification.id);
      if (!idBor && import.meta.env.DEV) console.warn("Katalog qidiruvida ID'siz yozuv:", modification);
      return idBor;
    })
    .map((modification) => {
      const productId = modification.productId ?? modification.product?.id;
      return {
        productId,
        modificationId: modification.id,
        quantity: 0,
        balance: 0,
        sellingPrice: Number(
          modification.price?.retailPrice ??
            modification.price?.wholesalePrice ??
            0
        ),
        price: Number(
          modification.price?.retailPrice ??
            modification.price?.wholesalePrice ??
            0
        ),
        modification: {
          id: modification.id,
          name: modification.name ?? "Asosiy variant",
          barcode: modification.barcode,
          article: modification.article,
          product: {
            id: productId ?? "",
            name: modification.product?.name ?? "",
          },
          price: {
            costPrice: Number(modification.price?.costPrice ?? 0),
            retailPrice: Number(modification.price?.retailPrice ?? 0),
            wholesalePrice: Number(modification.price?.wholesalePrice ?? 0),
            sellingPrice: Number(modification.price?.retailPrice ?? 0),
          },
        },
      };
    });
}
