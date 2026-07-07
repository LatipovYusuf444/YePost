import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type {
  JoriyFoydalanuvchi,
  Obuna,
  ObunaYaratishMalumoti,
  Tarif,
  TarifSaqlashMalumoti,
  Workspace,
  WorkspaceSaqlashMalumoti,
} from "@/types/tenant";

// Sozlamalar/index.tsx: direktor rolini va joriy workspaceId ni tekshiradi.
export async function joriyFoydalanuvchiniOlish() {
  const response = await apiClient.get<JoriyFoydalanuvchi | ApiEnvelope<JoriyFoydalanuvchi>>(
    "/auth/me"
  );

  return apiData(response.data);
}

// Sozlamalar → Workspace: barcha Swagger CRUD amallari.
export const workspaceApi = {
  royxat: async () => (await apiClient.get<Workspace[]>("/tenants/workspaces")).data,
  olish: async (id: string) =>
    (await apiClient.get<Workspace>(`/tenants/workspaces/${id}`)).data,
  yaratish: async (data: WorkspaceSaqlashMalumoti) =>
    (await apiClient.post<Workspace>("/tenants/workspaces", data)).data,
  yangilash: async (id: string, data: Partial<WorkspaceSaqlashMalumoti>) =>
    (await apiClient.patch<Workspace>(`/tenants/workspaces/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Workspace>(`/tenants/workspaces/${id}`)).data,
};

// Sozlamalar → Tariflar: barcha Swagger CRUD amallari.
export const tarifApi = {
  royxat: async () => (await apiClient.get<Tarif[]>("/tenants/tariffs")).data,
  olish: async (id: string) =>
    (await apiClient.get<Tarif>(`/tenants/tariffs/${id}`)).data,
  yaratish: async (data: TarifSaqlashMalumoti) =>
    (await apiClient.post<Tarif>("/tenants/tariffs", data)).data,
  yangilash: async (id: string, data: Partial<TarifSaqlashMalumoti>) =>
    (await apiClient.patch<Tarif>(`/tenants/tariffs/${id}`, data)).data,
  ochirish: async (id: string) =>
    (await apiClient.delete<Tarif>(`/tenants/tariffs/${id}`)).data,
};

// Sozlamalar → Obunalar: backend faqat GET, POST va GET/{id} beradi.
export const obunaApi = {
  royxat: async () => (await apiClient.get<Obuna[]>("/tenants/subscriptions")).data,
  olish: async (id: string) =>
    (await apiClient.get<Obuna>(`/tenants/subscriptions/${id}`)).data,
  yaratish: async (data: ObunaYaratishMalumoti) =>
    (await apiClient.post<Obuna>("/tenants/subscriptions", data)).data,
};
