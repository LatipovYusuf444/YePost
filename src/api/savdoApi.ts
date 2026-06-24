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

// Savdo/index.tsx, Savatcha.tsx, Tarix.tsx va BekorQilinganlar.tsx:
// barcha sotuvlarni backenddan oladi.
export async function sotuvlarRoyxatiniOlish() {
  const response = await apiClient.get<Sotuv[]>("/sales");
  return response.data;
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
  const response = await apiClient.get<Qaytarish[]>("/returns");
  return response.data;
}

// Qaytarish.tsx: yangi qaytarish hujjatini qoralama holatida yaratadi.
export async function qaytarishYaratish(malumot: QaytarishYaratishMalumoti) {
  const response = await apiClient.post<Qaytarish>("/returns", malumot);
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
  const response = await apiClient.get<OmborTanlovi[]>("/organization/warehouses");
  return response.data;
}

// Savdo/index.tsx: sotuvga biriktiriladigan jismoniy mijozlar uchun.
export async function mijozlarRoyxatiniOlish() {
  const response = await apiClient.get<MijozTanlovi[]>("/partners/customers");
  return response.data;
}

// Savdo/index.tsx: sotuvga biriktiriladigan mijoz kompaniyalari uchun.
export async function mijozKompaniyalariRoyxatiniOlish() {
  const response = await apiClient.get<MijozTanlovi[]>("/partners/client-companies");
  return response.data;
}

// Savdo/index.tsx: sotuv uchun mas'ul xodim tanlovi.
export async function xodimlarRoyxatiniOlish() {
  const response = await apiClient.get<XodimTanlovi[]>("/accounts/users");
  return response.data;
}

// Savdo/index.tsx: ombordagi mavjud modifikatsiya, qoldiq va narxlarni oladi.
export async function omborQoldiqlariniOlish(warehouseId?: string) {
  const response = await apiClient.get<QoldiqTanlovi[]>("/inventory/stock-balance", {
    params: warehouseId ? { warehouseId } : undefined,
  });
  return response.data;
}
