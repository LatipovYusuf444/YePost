import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  AccountFoydalanuvchi,
  AccountVakolati,
  FoydalanuvchiYangilashMalumoti,
  FoydalanuvchiYaratishMalumoti,
  VakolatKodi,
  VakolatYangilashMalumoti,
  VakolatYaratishMalumoti,
} from "@/types/account";
import type { Filial } from "@/types/ombor";

// Hodimlar/index.tsx: Swagger accounts/users bo'limining to'liq CRUD amallari.
export const foydalanuvchilarApi = {
  royxat: async () => {
    const response = await apiClient.get<AccountFoydalanuvchi[] | ApiListEnvelope<AccountFoydalanuvchi>>(
      "/accounts/users"
    );

    return apiList(response.data);
  },
  olish: async (id: string) => {
    const response = await apiClient.get<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      `/accounts/users/${id}`
    );

    return apiData(response.data);
  },
  yaratish: async (data: FoydalanuvchiYaratishMalumoti) => {
    const response = await apiClient.post<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      "/accounts/users",
      data
    );

    return apiData(response.data);
  },
  yangilash: async (id: string, data: FoydalanuvchiYangilashMalumoti) => {
    const response = await apiClient.patch<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      `/accounts/users/${id}`,
      data
    );

    return apiData(response.data);
  },
  ochirish: async (id: string) => {
    const response = await apiClient.delete<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      `/accounts/users/${id}`
    );

    return apiData(response.data);
  },
};

// Hodimlar/Ruxsatlar.tsx: Swagger accounts/grants bo'limining to'liq CRUD amallari.
export const vakolatlarApi = {
  // Foydalanuvchining faol vakolatlari to'liq ro'yxatini bitta so'rovda o'rnatadi:
  // yo'qlari yaratiladi, tanlanmaganlari o'chiriladi (har bir kod uchun alohida so'rov o'rniga).
  // `scope` berilsa faqat shu kodlarga tegiladi — UI bilmaydigan kodlar (masalan,
  // EMPLOYEE_SALARY_*) o'chib ketmaydi.
  sinxronlash: async (userId: string, codes: VakolatKodi[], scope?: VakolatKodi[]) => {
    const response = await apiClient.put<AccountVakolati[] | ApiListEnvelope<AccountVakolati>>(
      `/accounts/grants/users/${userId}`,
      { codes, scope }
    );

    return apiList(response.data);
  },
  royxat: async () => {
    const response = await apiClient.get<AccountVakolati[] | ApiListEnvelope<AccountVakolati>>(
      "/accounts/grants"
    );

    return apiList(response.data);
  },
  olish: async (id: string) => {
    const response = await apiClient.get<AccountVakolati | ApiEnvelope<AccountVakolati>>(
      `/accounts/grants/${id}`
    );

    return apiData(response.data);
  },
  yaratish: async (data: VakolatYaratishMalumoti) => {
    const response = await apiClient.post<AccountVakolati | ApiEnvelope<AccountVakolati>>(
      "/accounts/grants",
      data
    );

    return apiData(response.data);
  },
  yangilash: async (id: string, data: VakolatYangilashMalumoti) => {
    const response = await apiClient.patch<AccountVakolati | ApiEnvelope<AccountVakolati>>(
      `/accounts/grants/${id}`,
      data
    );

    return apiData(response.data);
  },
  ochirish: async (id: string) => {
    const response = await apiClient.delete<AccountVakolati | ApiEnvelope<AccountVakolati>>(
      `/accounts/grants/${id}`
    );

    return apiData(response.data);
  },
};

// Foydalanuvchi formasidagi filial tanlovi real organization/branches ro'yxatidan olinadi.
export async function accountFiliallari() {
  const response = await apiClient.get<Filial[] | ApiListEnvelope<Filial>>(
    "/organization/branches"
  );

  return apiList(response.data);
}
