import axios from "axios";
import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import {
  mijozJavoblari,
  nakladnoyFaylNomi,
  telegramHavolasi,
  xabarnomaYozuvlari,
  type MijozJavobi,
  type TelegramHavola,
  type XabarnomaYozuvi,
} from "@/lib/telegramXabarnoma";

// Telegram nakladnoy (TZ 701): mijozni botga ulash, sotuv xabarnomalari va nakladnoy PDF.
export type XabarnomaSorovi = {
  saleId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

function toza<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, qiymat]) => qiymat !== undefined && qiymat !== ""));
}

// Xato javobi Blob bo'lib keladi (responseType: "blob"): backend xato kodi o'qilishi uchun JSON'ga o'giriladi.
async function blobXatosiniOchish(error: unknown) {
  if (axios.isAxiosError(error) && typeof Blob !== "undefined" && error.response?.data instanceof Blob) {
    try {
      const javob = error.response as { data: unknown };
      javob.data = JSON.parse(await (error.response.data as Blob).text());
    } catch {
      // JSON bo'lmasa avvalgi javob qoladi.
    }
  }
  return error;
}

function faylniYuklab(blob: Blob, nomi: string) {
  const url = URL.createObjectURL(blob);
  const havola = document.createElement("a");
  havola.href = url;
  havola.download = nomi;
  document.body.appendChild(havola);
  havola.click();
  havola.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const telegramApi = {
  // POST /partners/customers/:id/telegram-link → { url, expiresAt }: bir martalik havola, 7 kun amal qiladi.
  // Bot yoqilmagan bo'lsa 400 errors.integrations.invalid_bot_token.
  mijozHavolasi: async (mijozId: string): Promise<TelegramHavola> => {
    const javob = (await apiClient.post<unknown>(`/partners/customers/${mijozId}/telegram-link`)).data;
    const havola = telegramHavolasi(javob);
    if (!havola) throw new Error("Backend Telegram havolasini qaytarmadi.");
    return havola;
  },

  // DELETE /partners/customers/:id/telegram-link → { ok: true }: mijozni botdan uzadi.
  mijozniUzish: async (mijozId: string) => {
    await apiClient.delete(`/partners/customers/${mijozId}/telegram-link`);
  },

  // GET /notification-logs?saleId=&customerId=&status=&page=&pageSize= — sotuv kartasida fon rejimida o'qiladi
  // (rolga ruxsat bo'lmasa yoki endpoint yo'q bo'lsa qizil toast chiqmaydi, karta o'zi buni ko'rsatadi).
  xabarnomalar: async (sorov: XabarnomaSorovi): Promise<XabarnomaYozuvi[]> =>
    xabarnomaYozuvlari(
      (await apiClient.get<unknown>("/notification-logs", { params: toza(sorov), xatoniYashirish: true })).data
    ),

  // GET /sales/:id/customer-responses — mijozning botdagi javobi ("✅ To'g'ri keldi" / "❌ Xato bor"), yangisi birinchi.
  // Fon rejimida o'qiladi: rolga ruxsat bo'lmasa qizil toast chiqmaydi, karta o'zi buni ko'rsatadi.
  mijozJavoblari: async (sotuvId: string): Promise<MijozJavobi[]> =>
    mijozJavoblari((await apiClient.get<unknown>(`/sales/${sotuvId}/customer-responses`, { xatoniYashirish: true })).data),

  // POST /sales/:id/notify → 201, NotificationLog (status QUEUED). Qoralama — 400 only_confirmed_sale_payable,
  // mijozsiz — 400 sale_has_no_customer, topilmadi — 404 sale_not_found.
  sotuvniQaytaYuborish: async (sotuvId: string) =>
    apiData((await apiClient.post<unknown | ApiEnvelope<unknown>>(`/sales/${sotuvId}/notify`)).data),

  // GET /sales/:id/nakladnoy.pdf → application/pdf (Nakladnoy_<docNumber>.pdf); faqat tasdiqlangan sotuv uchun.
  // Xato toasti chaqiruvchida ko'rsatiladi (blob xatosi o'qilgach).
  nakladnoyYuklash: async (sotuvId: string, hujjatRaqami: string) => {
    try {
      const javob = await apiClient.get<Blob>(`/sales/${sotuvId}/nakladnoy.pdf`, { responseType: "blob", xatoniYashirish: true });
      const nomi = nakladnoyFaylNomi(String(javob.headers["content-disposition"] ?? ""), hujjatRaqami);
      faylniYuklab(javob.data, nomi);
      return nomi;
    } catch (error) {
      throw await blobXatosiniOchish(error);
    }
  },
};
