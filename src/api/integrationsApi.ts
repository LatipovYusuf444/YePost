import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";

export type TelegramIntegratsiya = {
  botToken?: string | null;
  chatId?: string | null;
  isActive?: boolean;
  crmBotEnabled?: boolean;
};

export type PrinterIntegratsiya = {
  ipAddress?: string | null;
  port?: number | null;
  isActive?: boolean;
};

export type TelegramIntegratsiyaSaqlash = {
  botToken?: string;
  chatId?: string;
  isActive?: boolean;
  crmBotEnabled?: boolean;
};

export type PrinterIntegratsiyaSaqlash = {
  ipAddress?: string;
  port?: number;
  isActive?: boolean;
};

export const integratsiyalarApi = {
  telegramOlish: async () =>
    apiData((await apiClient.get<TelegramIntegratsiya | ApiEnvelope<TelegramIntegratsiya>>("/integrations/telegram")).data),
  telegramYangilash: async (data: TelegramIntegratsiyaSaqlash) =>
    apiData((await apiClient.patch<TelegramIntegratsiya | ApiEnvelope<TelegramIntegratsiya>>("/integrations/telegram", data)).data),
  printerOlish: async () =>
    apiData((await apiClient.get<PrinterIntegratsiya | ApiEnvelope<PrinterIntegratsiya>>("/integrations/printer")).data),
  printerYangilash: async (data: PrinterIntegratsiyaSaqlash) =>
    apiData((await apiClient.patch<PrinterIntegratsiya | ApiEnvelope<PrinterIntegratsiya>>("/integrations/printer", data)).data),
};
