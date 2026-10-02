import axios from "axios";
import apiClient from "./axios";
import { apiData, sahifaJavobi, sonlarJavobi, type ApiEnvelope } from "./response";
import type {
  PlatformDashboard,
  PlatformFoydalanuvchi,
  PlatformFoydalanuvchiFiltri,
  PlatformKompaniya,
  PlatformKompaniyaYangilash,
  PlatformKompaniyaYaratish,
  PlatformObuna,
  PlatformObunaYangilash,
  PlatformObunaYaratish,
  PlatformTarif,
  PlatformTarifSaqlash,
} from "@/types/platform";

// Super admin (isStaff: true) uchun /platform/* endpointlari. Eski /tenants/* endpointlari olib tashlangan.

type Obyekt = Record<string, unknown>;

function obyektmi(value: unknown): value is Obyekt {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function son(value: unknown) {
  const raqam = Number(value);
  return Number.isFinite(raqam) ? raqam : 0;
}

// Birinchi sahifani oladi; backend ro'yxatni sahifalab qaytarsa, qolgan sahifalarni ham yuklaydi.
async function barchasiniOlish<T>(yol: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const birinchi = sahifaJavobi<T>((await apiClient.get<unknown>(yol, { params })).data, 1, 100);
  if (birinchi.totalPages <= 1) return birinchi.items;
  const qolganlar = await Promise.all(
    Array.from({ length: birinchi.totalPages - 1 }, async (_, index) =>
      sahifaJavobi<T>((await apiClient.get<unknown>(yol, { params: { ...params, page: index + 2, pageSize: birinchi.pageSize } })).data).items
    )
  );
  return [birinchi.items, ...qolganlar].flat();
}

function dashboardniMoslash(raw: unknown): PlatformDashboard {
  const asosiy = apiData(raw as Obyekt | ApiEnvelope<Obyekt>) as Obyekt;
  const ws = obyektmi(asosiy?.workspaces) ? asosiy.workspaces : {};
  const users = obyektmi(asosiy?.users) ? asosiy.users : {};
  const obunalarTuguni = asosiy?.subscriptions;
  const obunalar = obyektmi(obunalarTuguni) && obyektmi(obunalarTuguni.byStatus) ? obunalarTuguni.byStatus : obunalarTuguni;
  return {
    workspaces: {
      total: son(ws.total),
      active: son(ws.active),
      inactive: son(ws.inactive),
      createdLast30Days: son(ws.createdLast30Days),
    },
    users: { total: son(users.total), active: son(users.active), inactive: son(users.inactive) },
    subscriptions: sonlarJavobi(obunalar),
  };
}

export const platformApi = {
  dashboard: async () => dashboardniMoslash((await apiClient.get<unknown>("/platform/dashboard")).data),

  kompaniyalar: {
    royxat: () => barchasiniOlish<PlatformKompaniya>("/platform/workspaces"),
    yaratish: async (data: PlatformKompaniyaYaratish) =>
      apiData((await apiClient.post<PlatformKompaniya | ApiEnvelope<PlatformKompaniya>>("/platform/workspaces", data)).data),
    yangilash: async (id: string, data: PlatformKompaniyaYangilash) =>
      apiData((await apiClient.patch<PlatformKompaniya | ApiEnvelope<PlatformKompaniya>>(`/platform/workspaces/${id}`, data)).data),
    // Kompaniyani vaqtincha o'chirish/yoqish — oddiy PATCH emas, alohida /status endpointi.
    holat: async (id: string, isActive: boolean) =>
      apiData((await apiClient.patch<PlatformKompaniya | ApiEnvelope<PlatformKompaniya>>(`/platform/workspaces/${id}/status`, { isActive })).data),
    ochirish: async (id: string) => {
      await apiClient.delete(`/platform/workspaces/${id}`);
    },
  },

  tariflar: {
    royxat: () => barchasiniOlish<PlatformTarif>("/platform/tariffs"),
    yaratish: async (data: PlatformTarifSaqlash) =>
      apiData((await apiClient.post<PlatformTarif | ApiEnvelope<PlatformTarif>>("/platform/tariffs", data)).data),
    yangilash: async (id: string, data: PlatformTarifSaqlash) =>
      apiData((await apiClient.patch<PlatformTarif | ApiEnvelope<PlatformTarif>>(`/platform/tariffs/${id}`, data)).data),
    ochirish: async (id: string) => {
      await apiClient.delete(`/platform/tariffs/${id}`);
    },
  },

  obunalar: {
    royxat: () => barchasiniOlish<PlatformObuna>("/platform/subscriptions"),
    yaratish: async (data: PlatformObunaYaratish) =>
      apiData((await apiClient.post<PlatformObuna | ApiEnvelope<PlatformObuna>>("/platform/subscriptions", data)).data),
    // Uzaytirish (endDate), bekor qilish (status), tarif/davrni almashtirish. workspaceId o'zgarmaydi.
    yangilash: async (id: string, data: PlatformObunaYangilash) =>
      apiData((await apiClient.patch<PlatformObuna | ApiEnvelope<PlatformObuna>>(`/platform/subscriptions/${id}`, data)).data),
  },

  foydalanuvchilar: {
    royxat: async (filtr: PlatformFoydalanuvchiFiltri = {}) => {
      const params: Record<string, unknown> = {};
      if (filtr.workspaceId) params.workspaceId = filtr.workspaceId;
      if (filtr.search) params.search = filtr.search;
      if (filtr.role) params.role = filtr.role;
      try {
        return await barchasiniOlish<PlatformFoydalanuvchi>("/platform/users", { ...params, page: 1, pageSize: 100 });
      } catch (error) {
        // Sahifalash parametrlari qabul qilinmasa (400), ularsiz qayta urinamiz.
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          return barchasiniOlish<PlatformFoydalanuvchi>("/platform/users", params);
        }
        throw error;
      }
    },
    // Bloklash / blokdan chiqarish.
    holat: async (id: string, isActive: boolean) =>
      apiData((await apiClient.patch<PlatformFoydalanuvchi | ApiEnvelope<PlatformFoydalanuvchi>>(`/platform/users/${id}/status`, { isActive })).data),
    // Parolni tiklash: eski sessiyalar darhol yopiladi. O'z parolini va boshqa super admin parolini o'zgartirib bo'lmaydi (403).
    parolniTiklash: async (id: string, password: string) => {
      await apiClient.patch(`/platform/users/${id}/password`, { password });
    },
  },
};
