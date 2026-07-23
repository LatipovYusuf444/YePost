import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
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
  royxat: async () =>
    apiList((await apiClient.get<Workspace[] | ApiListEnvelope<Workspace>>("/tenants/workspaces")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Workspace | ApiEnvelope<Workspace>>(`/tenants/workspaces/${id}`)).data),
  yaratish: async (data: WorkspaceSaqlashMalumoti) =>
    apiData((await apiClient.post<Workspace | ApiEnvelope<Workspace>>("/tenants/workspaces", data)).data),
  yangilash: async (id: string, data: Partial<WorkspaceSaqlashMalumoti>) =>
    apiData((await apiClient.patch<Workspace | ApiEnvelope<Workspace>>(`/tenants/workspaces/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Workspace | ApiEnvelope<Workspace>>(`/tenants/workspaces/${id}`)).data),
};

// Sozlamalar → Tariflar: barcha Swagger CRUD amallari.
export const tarifApi = {
  royxat: async () =>
    apiList((await apiClient.get<Tarif[] | ApiListEnvelope<Tarif>>("/tenants/tariffs")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Tarif | ApiEnvelope<Tarif>>(`/tenants/tariffs/${id}`)).data),
  yaratish: async (data: TarifSaqlashMalumoti) =>
    apiData((await apiClient.post<Tarif | ApiEnvelope<Tarif>>("/tenants/tariffs", data)).data),
  yangilash: async (id: string, data: Partial<TarifSaqlashMalumoti>) =>
    apiData((await apiClient.patch<Tarif | ApiEnvelope<Tarif>>(`/tenants/tariffs/${id}`, data)).data),
  ochirish: async (id: string) =>
    apiData((await apiClient.delete<Tarif | ApiEnvelope<Tarif>>(`/tenants/tariffs/${id}`)).data),
};

// Sozlamalar → Obunalar: backend faqat GET, POST va GET/{id} beradi.
export const obunaApi = {
  royxat: async () =>
    apiList((await apiClient.get<Obuna[] | ApiListEnvelope<Obuna>>("/tenants/subscriptions")).data),
  olish: async (id: string) =>
    apiData((await apiClient.get<Obuna | ApiEnvelope<Obuna>>(`/tenants/subscriptions/${id}`)).data),
  yaratish: async (data: ObunaYaratishMalumoti) =>
    apiData((await apiClient.post<Obuna | ApiEnvelope<Obuna>>("/tenants/subscriptions", data)).data),
};
