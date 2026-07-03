import apiClient from "./axios";

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
    (await apiClient.get<TelegramIntegratsiya>("/integrations/telegram")).data,
  telegramYangilash: async (data: TelegramIntegratsiyaSaqlash) =>
    (await apiClient.patch<TelegramIntegratsiya>("/integrations/telegram", data)).data,
  printerOlish: async () =>
    (await apiClient.get<PrinterIntegratsiya>("/integrations/printer")).data,
  printerYangilash: async (data: PrinterIntegratsiyaSaqlash) =>
    (await apiClient.patch<PrinterIntegratsiya>("/integrations/printer", data)).data,
};
