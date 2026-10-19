import axios from "axios";
import { ogohlantirishniSorash } from "@/lib/ogohlantirishSorovi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { apiTiliniOlish } from "./apiLanguage";
import { OGOHLANTIRISH_KODI, xatoKodi, xatoKodiMatni, xatoMaydoni } from "./xatoKodlari";

/** Tasdiqlash so'rovining tanasi: foydalanuvchi ogohlantirishga "ha" degandan keyin xuddi shu so'rov shu tana bilan qayta yuboriladi. */
export type TasdiqTanasi = { confirmWarnings: true };

/** 409 errors.inventory.before_stock_take — xato emas, "Davom etasizmi?" ogohlantirishi. */
export function ogohlantirishXatosimi(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409 && xatoKodi(error.response.data) === OGOHLANTIRISH_KODI;
}

/**
 * Tasdiqlash/yuborish/qabul qilish so'rovini bajaradi. Backend sanasi tasdiqlangan inventarizatsiyadan oldingi
 * hujjat uchun 409 ogohlantirish qaytarsa, foydalanuvchidan so'raladi va "ha" bo'lsa shu so'rov
 * `{ confirmWarnings: true }` bilan qayta yuboriladi. "Yo'q" bo'lsa asl xato qaytariladi (hujjat tasdiqlanmaydi).
 */
export async function ogohlantirishBilanBajarish<T>(chaqiruv: (tana?: TasdiqTanasi) => Promise<T>): Promise<T> {
  try {
    return await chaqiruv();
  } catch (error) {
    if (!ogohlantirishXatosimi(error) || !axios.isAxiosError(error)) throw error;
    const tafsilot = error.response?.data;
    const matn = xatoKodiMatni(OGOHLANTIRISH_KODI, error.config?.url, apiTiliniOlish(), tafsilot) ?? "";
    const raqam = String(xatoMaydoni(tafsilot, "stockTakeNumber") ?? "");
    const kun = kunMatni(String(xatoMaydoni(tafsilot, "stockTakeDate") ?? ""));
    const rozi = await ogohlantirishniSorash(matn, [raqam, kun].filter(Boolean).join(" · "));
    if (!rozi) throw error;
    return chaqiruv({ confirmWarnings: true });
  }
}
