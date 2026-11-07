import apiClient from "./axios";
import { apiData, apiList, ruxsatsizBulsaBosh, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  AccountFoydalanuvchi,
  AccountVakolati,
  FoydalanuvchiYangilashMalumoti,
  FoydalanuvchiYaratishMalumoti,
  VakolatYangilashMalumoti,
  VakolatYaratishMalumoti,
} from "@/types/account";
import type { Filial } from "@/types/ombor";
import { malumotnomaniOlish, ozgartirishdanKeyinTozalash } from "@/lib/malumotnomaKeshi";

// Hodimlar/index.tsx: Swagger accounts/users bo'limining to'liq CRUD amallari.
export const foydalanuvchilarApi = {
  // KASSIR/OMBORCHI uchun /accounts/users 403 qaytaradi — bo'sh ro'yxat
  // sifatida qabul qilinadi, sahifa yiqilib qolmasligi uchun.
  royxat: () => malumotnomaniOlish("foydalanuvchilar", "royxat", () => ruxsatsizBulsaBosh(async () => {
    const response = await apiClient.get<AccountFoydalanuvchi[] | ApiListEnvelope<AccountFoydalanuvchi>>(
      "/accounts/users"
    );

    return apiList(response.data);
  })),
  olish: async (id: string) => {
    const response = await apiClient.get<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      `/accounts/users/${id}`
    );

    return apiData(response.data);
  },
  yaratish: (data: FoydalanuvchiYaratishMalumoti) => ozgartirishdanKeyinTozalash("foydalanuvchilar", async () => {
    const response = await apiClient.post<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      "/accounts/users",
      data
    );

    return apiData(response.data);
  }),
  yangilash: (id: string, data: FoydalanuvchiYangilashMalumoti) => ozgartirishdanKeyinTozalash("foydalanuvchilar", async () => {
    const response = await apiClient.patch<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      `/accounts/users/${id}`,
      data
    );

    return apiData(response.data);
  }),
  ochirish: (id: string) => ozgartirishdanKeyinTozalash("foydalanuvchilar", async () => {
    const response = await apiClient.delete<AccountFoydalanuvchi | ApiEnvelope<AccountFoydalanuvchi>>(
      `/accounts/users/${id}`
    );

    return apiData(response.data);
  }),
};

// Hodimlar/Ruxsatlar.tsx: Swagger accounts/grants bo'limining to'liq CRUD amallari.
export const vakolatlarApi = {
  // Foydalanuvchining faol vakolatlari to'liq ro'yxatini bitta so'rovda o'rnatadi. Backend shu foydalanuvchining
  // yangilangan grant'larini qaytaradi, shuning uchun keyin butun /accounts/grants ro'yxati qayta olinmaydi.
  foydalanuvchiKodlariniSaqlash: async (userId: string, codes: string[]): Promise<AccountVakolati[]> => {
    const response = await apiClient.put<AccountVakolati[] | ApiListEnvelope<AccountVakolati>>(
      `/accounts/grants/users/${userId}`,
      { codes: [...new Set(codes)] }
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
