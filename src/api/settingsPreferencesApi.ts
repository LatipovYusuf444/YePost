import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";

export type ChekSozlamasi = {
  id?: string;
  workspaceId?: string;
  title: string;
  footerText: string;
  showLogo: boolean;
  showPhone: boolean;
  showAddress: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type BildirishnomaPreference = {
  id?: string;
  workspaceId?: string;
  userId?: string;
  newSale: boolean;
  lowStock: boolean;
  dailyReport: boolean;
  newCustomer: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const sozlamaPreferencelariApi = {
  chekOlish: async () =>
    apiData((await apiClient.get<ChekSozlamasi | ApiEnvelope<ChekSozlamasi>>("/settings/receipt")).data),
  chekYangilash: async (data: Partial<ChekSozlamasi>) =>
    apiData((await apiClient.patch<ChekSozlamasi | ApiEnvelope<ChekSozlamasi>>("/settings/receipt", data)).data),
  bildirishnomaOlish: async () =>
    apiData((await apiClient.get<BildirishnomaPreference | ApiEnvelope<BildirishnomaPreference>>("/settings/notification-preferences")).data),
  bildirishnomaYangilash: async (data: Partial<BildirishnomaPreference>) =>
    apiData((await apiClient.patch<BildirishnomaPreference | ApiEnvelope<BildirishnomaPreference>>("/settings/notification-preferences", data)).data),
};
