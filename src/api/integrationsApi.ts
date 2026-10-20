import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";

// Telegram bot (TZ 701): javobda botToken va webhookSecret ENDI YO'Q — tokenning oxirgi 4 belgisi (`botTokenLast4`) va bot nomi (`botUsername`) keladi.
// Mijozga xabar yuborish tugmalari (`sendOn*`, `attachPdf`) standart holatda yoqilgan.
export type TelegramIntegratsiya = {
  botTokenLast4?: string | null;
  botUsername?: string | null;
  chatId?: string | null;
  isActive?: boolean;
  crmBotEnabled?: boolean;
  sendOnSale?: boolean;
  sendOnPayment?: boolean;
  sendOnCancel?: boolean;
  attachPdf?: boolean;
};
export type PrinterIntegratsiya = { ipAddress?: string | null; port?: number | null; isActive?: boolean };
// `botToken` faqat YANGI token kiritilganda yuboriladi: yuborilmasa eski token saqlanadi, bo'sh matn esa 400 beradi.
// Noto'g'ri token Telegram'da tekshiriladi: 400 errors.integrations.invalid_bot_token.
export type TelegramIntegratsiyaSaqlash = {
  botToken?: string;
  chatId?: string;
  isActive?: boolean;
  crmBotEnabled?: boolean;
  sendOnSale?: boolean;
  sendOnPayment?: boolean;
  sendOnCancel?: boolean;
  attachPdf?: boolean;
};
export type PrinterIntegratsiyaSaqlash = { ipAddress?: string; port?: number; isActive?: boolean };

export type TolovProvayderi = "PAYME" | "CLICK" | "UZUM";
export type TolovIntegratsiyasi = {
  provider: TolovProvayderi;
  merchantId?: string | null;
  serviceId?: string | null;
  isActive?: boolean;
  hasSecretKey?: boolean;
  updatedAt?: string | null;
};
export type TolovIntegratsiyasiSaqlash = {
  merchantId?: string;
  serviceId?: string;
  secretKey?: string;
  isActive?: boolean;
};

// Hali sozlanmagan korxona uchun backend `{ data: null }` (yoki bo'sh javob) qaytarishi mumkin: bo'sh obyektga aylantiriladi.
function sozlamaObyekti<T extends object>(javob: T | null | undefined): T {
  return javob && typeof javob === "object" ? javob : ({} as T);
}

export const integratsiyalarApi = {
  telegramOlish: async () => sozlamaObyekti(apiData((await apiClient.get<TelegramIntegratsiya | ApiEnvelope<TelegramIntegratsiya>>("/integrations/telegram")).data)),
  telegramYangilash: async (data: TelegramIntegratsiyaSaqlash) => sozlamaObyekti(apiData((await apiClient.patch<TelegramIntegratsiya | ApiEnvelope<TelegramIntegratsiya>>("/integrations/telegram", data)).data)),
  printerOlish: async () => sozlamaObyekti(apiData((await apiClient.get<PrinterIntegratsiya | ApiEnvelope<PrinterIntegratsiya>>("/integrations/printer")).data)),
  printerYangilash: async (data: PrinterIntegratsiyaSaqlash) => sozlamaObyekti(apiData((await apiClient.patch<PrinterIntegratsiya | ApiEnvelope<PrinterIntegratsiya>>("/integrations/printer", data)).data)),
  tolovOlish: async (provider: TolovProvayderi) => apiData((await apiClient.get<TolovIntegratsiyasi | ApiEnvelope<TolovIntegratsiyasi>>(`/integrations/payments/${provider}`)).data),
  tolovYangilash: async (provider: TolovProvayderi, data: TolovIntegratsiyasiSaqlash) => apiData((await apiClient.patch<TolovIntegratsiyasi | ApiEnvelope<TolovIntegratsiyasi>>(`/integrations/payments/${provider}`, data)).data),
};
