import apiClient from "./axios";
import type {
  MijozTanlovi,
  OmborTanlovi,
  Qaytarish,
  QaytarishYaratishMalumoti,
  QoldiqTanlovi,
  Sotuv,
  SotuvYaratishMalumoti,
  XodimTanlovi,
} from "@/types/savdo";
import type { Mahsulot, MahsulotModifikatsiyasi } from "@/types/catalog";

type RoyxatJavobi<T> = T[] | { value?: T[]; items?: T[]; results?: T[]; data?: T[] };

function royxatniAjratish<T>(data: RoyxatJavobi<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.value ?? data.items ?? data.results ?? data.data ?? [];
}

// Savdo/index.tsx, Savatcha.tsx, Tarix.tsx va BekorQilinganlar.tsx:
// barcha sotuvlarni backenddan oladi.
export async function sotuvlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<Sotuv>>("/sales");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: tanlangan sotuvning mahsulotlari va to'lovlarini oladi.
export async function sotuvTafsilotiniOlish(sotuvId: string) {
  const response = await apiClient.get<Sotuv>(`/sales/${sotuvId}`);
  return response.data;
}

// Savdo/index.tsx: yangi sotuvni qoralama holatida yaratadi.
export async function sotuvYaratish(malumot: SotuvYaratishMalumoti) {
  const response = await apiClient.post<Sotuv>("/sales", malumot);
  return response.data;
}

// Savatcha.tsx: faqat DRAFT holatidagi sotuvni tahrirlaydi.
export async function sotuvniYangilash(
  sotuvId: string,
  malumot: Partial<SotuvYaratishMalumoti>
) {
  const response = await apiClient.patch<Sotuv>(`/sales/${sotuvId}`, malumot);
  return response.data;
}

// Savatcha.tsx va Savdo/index.tsx: qoralama sotuvni tasdiqlaydi.
export async function sotuvniTasdiqlash(sotuvId: string) {
  const response = await apiClient.post<Sotuv>(`/sales/${sotuvId}/confirm`);
  return response.data;
}

// Savdo/index.tsx: sotuvni bekor qiladi va ombor qoldig'ini tiklaydi.
export async function sotuvniBekorQilish(sotuvId: string) {
  const response = await apiClient.post<Sotuv>(`/sales/${sotuvId}/cancel`);
  return response.data;
}

// Qaytarish.tsx: barcha qaytarish hujjatlarini oladi.
export async function qaytarishlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<Qaytarish>>("/returns");
  return royxatniAjratish(response.data);
}

// Qaytarish.tsx: tanlangan qaytarishning to'liq tafsilotlarini ID orqali oladi.
export async function qaytarishTafsilotiniOlish(qaytarishId: string) {
  const response = await apiClient.get<Qaytarish>(`/returns/${qaytarishId}`);
  return response.data;
}

// Qaytarish.tsx: yangi qaytarish hujjatini qoralama holatida yaratadi.
export async function qaytarishYaratish(malumot: QaytarishYaratishMalumoti) {
  const response = await apiClient.post<Qaytarish>("/returns", malumot);
  return response.data;
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
  return response.data;
}

// Qaytarish.tsx: qaytarishni tasdiqlaydi va mahsulotni omborga qaytaradi.
export async function qaytarishniTasdiqlash(qaytarishId: string) {
  const response = await apiClient.post<Qaytarish>(`/returns/${qaytarishId}/confirm`);
  return response.data;
}

// Qaytarish.tsx: qaytarish hujjatini bekor qiladi.
export async function qaytarishniBekorQilish(qaytarishId: string) {
  const response = await apiClient.post<Qaytarish>(`/returns/${qaytarishId}/cancel`);
  return response.data;
}

// Savdo/index.tsx: yangi sotuv formasidagi ombor tanlovi uchun.
export async function omborlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<OmborTanlovi>>("/organization/warehouses");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: sotuvga biriktiriladigan jismoniy mijozlar uchun.
export async function mijozlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<MijozTanlovi>>("/partners/customers");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: sotuvga biriktiriladigan mijoz kompaniyalari uchun.
export async function mijozKompaniyalariRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<MijozTanlovi>>("/partners/client-companies");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: sotuv uchun mas'ul xodim tanlovi.
export async function xodimlarRoyxatiniOlish() {
  const response = await apiClient.get<RoyxatJavobi<XodimTanlovi>>("/accounts/users");
  return royxatniAjratish(response.data);
}

// Savdo/index.tsx: ombordagi mavjud modifikatsiya, qoldiq va narxlarni oladi.
export async function omborQoldiqlariniOlish(warehouseId?: string) {
  const response = await apiClient.get<RoyxatJavobi<QoldiqTanlovi>>("/inventory/stock-balance", {
    params: warehouseId ? { warehouseId } : undefined,
  });
  return royxatniAjratish(response.data);
}

// YangiSotuvModal.tsx: ombor qoldig'ida bo'lmasa ham katalogdagi real mahsulot
// modifikatsiyalarini sotuv tanlovida ko'rsatish uchun ishlatiladi.
export async function katalogModifikatsiyalariniQoldiqTanlovigaOlish() {
  const products = royxatniAjratish(
    (await apiClient.get<RoyxatJavobi<Mahsulot>>("/catalog/products")).data
  );
  const faolProducts = products.filter((product) => product.isActive !== false);
  const qoldiqTanlovlari: QoldiqTanlovi[] = [];

  await Promise.all(
    faolProducts.map(async (product) => {
      try {
        const modifications = royxatniAjratish(
          (
          await apiClient.get<RoyxatJavobi<MahsulotModifikatsiyasi>>(
            `/catalog/products/${product.id}/modifications`
          )
          ).data
        );

        qoldiqTanlovlari.push(
          ...modifications.map((modification) => ({
            productId: product.id,
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
                id: product.id,
                name: product.name,
              },
              price: {
                costPrice: Number(modification.price?.costPrice ?? 0),
                retailPrice: Number(modification.price?.retailPrice ?? 0),
                wholesalePrice: Number(modification.price?.wholesalePrice ?? 0),
                sellingPrice: Number(modification.price?.retailPrice ?? 0),
              },
            },
          }))
        );
      } catch {
        // Bitta mahsulot varianti olinmasa, qolgan mahsulotlar sotuvda chiqishda davom etadi.
      }
    })
  );

  return qoldiqTanlovlari;
}
