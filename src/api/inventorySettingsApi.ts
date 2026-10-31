import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";

export type InventorySettings = { allowNegativeStock: boolean; canSellNegative: boolean };

export const inventorySettingsApi = {
  get: async () => apiData((await apiClient.get<InventorySettings | ApiEnvelope<InventorySettings>>("/settings/inventory", { xatoniYashirish: true })).data),
  // PATCH only for DIRECTOR/ADMIN (others get 403); the response has the same shape as GET.
  update: async (allowNegativeStock: boolean) => apiData((await apiClient.patch<InventorySettings | ApiEnvelope<InventorySettings>>("/settings/inventory", { allowNegativeStock })).data),
};
