import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";

export type InventorySettings = { allowNegativeStock: boolean; canSellNegative: boolean };

// Enable only after the backend's historical-date restriction has been deployed.
export const negativeStockEnableReady = import.meta.env.VITE_NEGATIVE_STOCK_ENABLE_READY === "true";

export const inventorySettingsApi = {
  get: async () => apiData((await apiClient.get<InventorySettings | ApiEnvelope<InventorySettings>>("/settings/inventory", { xatoniYashirish: true })).data),
  update: async (allowNegativeStock: boolean) => {
    if (allowNegativeStock && !negativeStockEnableReady) throw new Error("Minusga sotishni yoqish hali ochilmagan.");
    return apiData((await apiClient.patch<InventorySettings | ApiEnvelope<InventorySettings>>("/settings/inventory", { allowNegativeStock })).data);
  },
};
