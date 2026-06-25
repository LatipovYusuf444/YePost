import apiClient from "./axios";
import type {
  AccountFoydalanuvchi,
  AccountVakolati,
  FoydalanuvchiYangilashMalumoti,
  FoydalanuvchiYaratishMalumoti,
  VakolatYangilashMalumoti,
  VakolatYaratishMalumoti,
} from "@/types/account";
import type { Filial } from "@/types/ombor";

// Hodimlar/index.tsx: Swagger accounts/users bo'limining to'liq CRUD amallari.
export const foydalanuvchilarApi = {
  royxat: async () =>
    (await apiClient.get<AccountFoydalanuvchi[]>("/accounts/users")).data,
  olish: async (id: string) =>
    (await apiClient.get<AccountFoydalanuvchi>(`/accounts/users/${id}`)).data,
  yaratish: async (data: FoydalanuvchiYaratishMalumoti) =>
    (await apiClient.post<AccountFoydalanuvchi>("/accounts/users", data)).data,
  yangilash: async (id: string, data: FoydalanuvchiYangilashMalumoti) =>
    (await apiClient.patch<AccountFoydalanuvchi>(`/accounts/users/${id}`, data))
      .data,
  ochirish: async (id: string) =>
    (await apiClient.delete<AccountFoydalanuvchi>(`/accounts/users/${id}`)).data,
};

// Hodimlar/Ruxsatlar.tsx: Swagger accounts/grants bo'limining to'liq CRUD amallari.
export const vakolatlarApi = {
  royxat: async () =>
    (await apiClient.get<AccountVakolati[]>("/accounts/grants")).data,
  olish: async (id: string) =>
    (await apiClient.get<AccountVakolati>(`/accounts/grants/${id}`)).data,
  yaratish: async (data: VakolatYaratishMalumoti) =>
    (await apiClient.post<AccountVakolati>("/accounts/grants", data)).data,
  yangilash: async (id: string, data: VakolatYangilashMalumoti) =>
    (await apiClient.patch<AccountVakolati>(`/accounts/grants/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<AccountVakolati>(`/accounts/grants/${id}`)).data,
};

// Foydalanuvchi formasidagi filial tanlovi real organization/branches ro'yxatidan olinadi.
export async function accountFiliallari() {
  return (await apiClient.get<Filial[]>("/organization/branches")).data;
}
