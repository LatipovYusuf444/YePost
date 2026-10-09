import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";

// Valyuta (1-bosqich): rejim yoqilgan/o'chirilgan va admin har kuni qo'lda kiritadigan dollar kursi.
// Kurs Markaziy bankdan avtomatik olinmaydi. Kiritilgan kurs shu kundan keyingi kurs kiritilguncha amal qiladi
// va oldingi kunlarga ta'sir qilmaydi. Yaxlitlash butun so'mgacha (backend tomonida).

export type ValyutaRejimi = {
  enabled: boolean;
};

export type KursYozuvi = {
  /** YYYY-MM-DD (kompaniya vaqt mintaqasidagi kun). */
  date: string;
  /** 1 dollar necha so'm. */
  rate: number | string;
  updatedAt?: string | null;
};

export type AmaldagiKurs = {
  /** So'ralgan kun. */
  date: string;
  /** Shu kun yoki undan oldingi oxirgi kurs; kurs kiritilmagan bo'lsa null. */
  rate: number | string | null;
  /** Kurs aslida kiritilgan kun. */
  rateDate?: string | null;
};

export type KursSorovi = {
  dateFrom?: string;
  dateTo?: string;
};

export const valyutaApi = {
  // GET /settings/currency
  rejimniOlish: async () =>
    apiData((await apiClient.get<ValyutaRejimi | ApiEnvelope<ValyutaRejimi>>("/settings/currency")).data),

  // PATCH /settings/currency — faqat ADMIN/DIREKTOR
  rejimniYangilash: async (enabled: boolean) =>
    apiData(
      (await apiClient.patch<ValyutaRejimi | ApiEnvelope<ValyutaRejimi>>("/settings/currency", { enabled })).data
    ),

  // GET /settings/exchange-rates?dateFrom=&dateTo= — yangisi birinchi (hamma rol)
  kurslarRoyxati: async (sorov: KursSorovi = {}) => {
    const response = await apiClient.get<KursYozuvi[] | ApiListEnvelope<KursYozuvi>>("/settings/exchange-rates", {
      params: {
        ...(sorov.dateFrom ? { dateFrom: sorov.dateFrom } : {}),
        ...(sorov.dateTo ? { dateTo: sorov.dateTo } : {}),
      },
    });
    return apiList(response.data);
  },

  // GET /settings/exchange-rates/effective?date= — date berilmasa bugun (hamma rol)
  amaldagiKurs: async (date?: string) =>
    apiData(
      (
        await apiClient.get<AmaldagiKurs | ApiEnvelope<AmaldagiKurs>>("/settings/exchange-rates/effective", {
          params: date ? { date } : undefined,
        })
      ).data
    ),

  // PUT /settings/exchange-rates/:date { rate } — faqat ADMIN/DIREKTOR. Shu kunga qayta kiritilsa almashtiriladi.
  kursniBelgilash: async (date: string, rate: number) =>
    apiData(
      (
        await apiClient.put<KursYozuvi | ApiEnvelope<KursYozuvi>>(`/settings/exchange-rates/${encodeURIComponent(date)}`, {
          rate,
        })
      ).data
    ),
};

/** Backenddan kelgan kursni (son yoki satr) songa aylantiradi; bo'sh yoki noto'g'ri bo'lsa null. */
export function kursniSongaAylantirish(qiymat: number | string | null | undefined) {
  if (qiymat === null || qiymat === undefined || qiymat === "") return null;
  const son = Number(qiymat);
  return Number.isFinite(son) && son > 0 ? son : null;
}
