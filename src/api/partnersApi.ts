import axios from "axios";
import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  Mijoz,
  MijozKompaniyasi,
  MijozKompaniyasiMalumoti,
  MijozMalumoti,
  YetkazibBeruvchi,
  YetkazibBeruvchiMalumoti,
} from "@/types/partner";

function yangiPartnerMaydonlariQollanmaydi(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return false;
  const raw = error.response.data as { message?: string | string[] } | undefined;
  const messages = Array.isArray(raw?.message) ? raw.message : [raw?.message ?? ""];
  return messages.some((message) => message.includes("should not exist"));
}

function yangiCustomFieldsQollanmaydi(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return false;
  const raw = error.response.data as { message?: string | string[] } | undefined;
  const messages = Array.isArray(raw?.message) ? raw.message : [raw?.message ?? ""];
  return messages.some((message) => message.includes("Noma'lum maxsus maydon"));
}

function eskiMijozPayload(data: MijozMalumoti) {
  const payload: Partial<MijozMalumoti> = { ...data };
  delete payload.customFields;
  return payload;
}

function eskiKompaniyaPayload(data: MijozKompaniyasiMalumoti) {
  return { name: data.name, inn: data.inn, phone: data.phone };
}

function eskiSupplierPayload(data: YetkazibBeruvchiMalumoti) {
  return { name: data.name, phone: data.phone };
}

// Mijozlar sahifasi: jismoniy mijozlar to'liq CRUD.
export const mijozlarApi = {
  royxat: async () =>
    apiList((await apiClient.get<Mijoz[] | ApiListEnvelope<Mijoz>>("/partners/customers")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Mijoz | ApiEnvelope<Mijoz>>(`/partners/customers/${id}`)).data),
  yaratish: async (data: MijozMalumoti) => {
    try {
      return apiData((await apiClient.post<Mijoz | ApiEnvelope<Mijoz>>("/partners/customers", data)).data);
    } catch (error) {
      if (!yangiCustomFieldsQollanmaydi(error)) throw error;
      return apiData((await apiClient.post<Mijoz | ApiEnvelope<Mijoz>>("/partners/customers", eskiMijozPayload(data))).data);
    }
  },
  yangilash: async (id: string, data: Partial<MijozMalumoti>) => {
    try {
      return apiData((await apiClient.patch<Mijoz | ApiEnvelope<Mijoz>>(`/partners/customers/${id}`, data)).data);
    } catch (error) {
      if (!yangiCustomFieldsQollanmaydi(error)) throw error;
      return apiData((await apiClient.patch<Mijoz | ApiEnvelope<Mijoz>>(`/partners/customers/${id}`, eskiMijozPayload(data as MijozMalumoti))).data);
    }
  },
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Mijoz | ApiEnvelope<Mijoz>>(`/partners/customers/${id}`)).data),
};

// Mijozlar sahifasi: mijoz kompaniyalari to'liq CRUD.
export const mijozKompaniyalariApi = {
  royxat: async () =>
    apiList(
      (
        await apiClient.get<MijozKompaniyasi[] | ApiListEnvelope<MijozKompaniyasi>>(
          "/partners/client-companies"
        )
      ).data
    ),
  olish: async (id: string) =>
    apiData(
      (
        await apiClient.get<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>(
          `/partners/client-companies/${id}`
        )
      ).data
    ),
  yaratish: async (data: MijozKompaniyasiMalumoti) => {
    try {
      return apiData((await apiClient.post<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>("/partners/client-companies", data)).data);
    } catch (error) {
      if (!yangiPartnerMaydonlariQollanmaydi(error)) throw error;
      return apiData((await apiClient.post<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>("/partners/client-companies", eskiKompaniyaPayload(data))).data);
    }
  },
  yangilash: async (id: string, data: Partial<MijozKompaniyasiMalumoti>) => {
    try {
      return apiData((await apiClient.patch<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>(`/partners/client-companies/${id}`, data)).data);
    } catch (error) {
      if (!yangiPartnerMaydonlariQollanmaydi(error)) throw error;
      return apiData((await apiClient.patch<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>(`/partners/client-companies/${id}`, eskiKompaniyaPayload(data as MijozKompaniyasiMalumoti))).data);
    }
  },
  ochirish: async (id: string) =>
    apiData(
      (
        await apiClient.delete<MijozKompaniyasi | ApiEnvelope<MijozKompaniyasi>>(
          `/partners/client-companies/${id}`
        )
      ).data
    ),
};

// Mijozlar sahifasi: yetkazib beruvchilar to'liq CRUD.
export const yetkazibBeruvchilarApi = {
  royxat: async () =>
    apiList(
      (
        await apiClient.get<YetkazibBeruvchi[] | ApiListEnvelope<YetkazibBeruvchi>>(
          "/partners/suppliers"
        )
      ).data
    ),
  olish: async (id: string) =>
    apiData(
      (await apiClient.get<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>(`/partners/suppliers/${id}`))
        .data
    ),
  yaratish: async (data: YetkazibBeruvchiMalumoti) => {
    try {
      return apiData((await apiClient.post<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>("/partners/suppliers", data)).data);
    } catch (error) {
      if (!yangiPartnerMaydonlariQollanmaydi(error)) throw error;
      return apiData((await apiClient.post<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>("/partners/suppliers", eskiSupplierPayload(data))).data);
    }
  },
  yangilash: async (id: string, data: Partial<YetkazibBeruvchiMalumoti>) => {
    try {
      return apiData((await apiClient.patch<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>(`/partners/suppliers/${id}`, data)).data);
    } catch (error) {
      if (!yangiPartnerMaydonlariQollanmaydi(error)) throw error;
      return apiData((await apiClient.patch<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>(`/partners/suppliers/${id}`, eskiSupplierPayload(data as YetkazibBeruvchiMalumoti))).data);
    }
  },
  ochirish: async (id: string) =>
    apiData(
      (
        await apiClient.delete<YetkazibBeruvchi | ApiEnvelope<YetkazibBeruvchi>>(
          `/partners/suppliers/${id}`
        )
      ).data
    ),
};
