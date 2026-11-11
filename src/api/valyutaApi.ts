import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";

// Valyuta: rejim (ikki valyuta / faqat so'm / faqat dollar) va admin har kuni qo'lda kiritadigan dollar kursi.
// Kurs Markaziy bankdan avtomatik olinmaydi. Kiritilgan kurs shu kundan keyingi kurs kiritilguncha amal qiladi
// va oldingi kunlarga ta'sir qilmaydi. Yaxlitlash butun so'mgacha (backend tomonida).

/**
 * Do'kon valyuta rejimi (backend 11.11.2026): DUAL — ikki valyuta (so'm va $), UZS_ONLY — faqat so'm, USD_ONLY — faqat dollar.
 * Sozlamasi yo'q va yangi do'kon — UZS_ONLY. Bir valyutali rejimda backend boshqa valyutadagi yozuvni `errors.currency.not_allowed` bilan rad etadi.
 */
export type ValyutaRejimKodi = "DUAL" | "UZS_ONLY" | "USD_ONLY";

export type ValyutaRejimi = {
  mode?: ValyutaRejimKodi | string | null;
  /** Eski forma uchun: enabled = (mode == DUAL). */
  enabled?: boolean;
  /** Hisobotlardagi jami summalar valyutasi (UZS/USD); bir valyutali rejimda doim shu valyuta. */
  reportCurrency?: string | null;
  /** Valyuta yuborilmagan yozuvlarga backend qo'yadigan valyuta; bir valyutali rejimda doim shu valyuta. */
  defaultCurrency?: string | null;
};

const REJIM_KODLARI: readonly ValyutaRejimKodi[] = ["DUAL", "UZS_ONLY", "USD_ONLY"];

/** Backend javobidan rejim: `mode` bo'lmasa (eski backend) `enabled` bo'yicha (true → DUAL, aks holda UZS_ONLY). */
export function rejimKodiniOlish(rejim: Pick<ValyutaRejimi, "mode" | "enabled"> | null | undefined): ValyutaRejimKodi {
  const kod = typeof rejim?.mode === "string" ? rejim.mode.trim().toUpperCase() : "";
  if ((REJIM_KODLARI as readonly string[]).includes(kod)) return kod as ValyutaRejimKodi;
  return rejim?.enabled ? "DUAL" : "UZS_ONLY";
}

/** Bir valyutali rejimning valyutasi (UZS_ONLY → UZS, USD_ONLY → USD); DUAL da `null`. */
export function rejimValyutasi(rejim: ValyutaRejimKodi): "UZS" | "USD" | null {
  return rejim === "UZS_ONLY" ? "UZS" : rejim === "USD_ONLY" ? "USD" : null;
}

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

  // PATCH /settings/currency — faqat ADMIN/DIREKTOR. Yangi forma faqat `mode` yuboradi (`enabled` yuborilmaydi).
  // `reportCurrency` faqat ikki valyuta rejimida va o'zgartirilganda yuboriladi (bir valyutali rejimda boshqa valyuta → not_allowed).
  // Xatolar: errors.currency.rate_missing — bir valyutali rejimga (yoki hisobot valyutasi $ bo'lgan DUAL ga) kurs kiritilmasdan o'tishda.
  rejimniYangilash: async (mode: ValyutaRejimKodi, reportCurrency?: "UZS" | "USD") =>
    apiData(
      (
        await apiClient.patch<ValyutaRejimi | ApiEnvelope<ValyutaRejimi>>("/settings/currency", {
          mode,
          ...(mode === "DUAL" && reportCurrency ? { reportCurrency } : {}),
        })
      ).data
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
