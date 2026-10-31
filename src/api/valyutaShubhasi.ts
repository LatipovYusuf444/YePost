import axios from "axios";
import { ogohlantirishniSorash } from "@/lib/ogohlantirishSorovi";
import { apiTiliniOlish } from "./apiLanguage";
import { xatoKodi } from "./xatoKodlari";

export const SHUBHALI_VALYUTA_KODI = "errors.finance.suspicious_currency";

/** Kassir valyutani tasdiqlagach xuddi shu so'rov shu bayroq bilan qayta yuboriladi. */
export type MajburlashTanasi = { force: true };

const MATNLAR = {
  uz: { matn: "Summa juda kichik. Valyuta to'g'rimi?", sarlavha: "Valyuta to'g'rimi?", savol: "Shu valyutada davom etasizmi?", ha: "Ha, shu valyutada", yoq: "Yo'q, o'zgartiraman" },
  ru: { matn: "Сумма слишком мала. Валюта указана верно?", sarlavha: "Валюта верна?", savol: "Продолжить в этой валюте?", ha: "Да, в этой валюте", yoq: "Нет, изменить" },
} as const;

/** 400 errors.finance.suspicious_currency — dollar savdoga 1 000 so'mdan kam so'm to'lanmoqda ("200.53 so'm"): xato emas, "Valyuta to'g'rimi?" so'rovi. */
export function shubhaliValyutaXatosimi(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 400 && xatoKodi(error.response.data)?.endsWith("suspicious_currency") === true;
}

// Backend xabari summalar bilan keladi ("Summa juda kichik. Valyuta to'g'rimi? 200.53 so'm = $0.02"); kod bo'lsa standart matn olinadi.
function backendXabari(data: unknown) {
  const xabar = (data as { message?: unknown } | null | undefined)?.message;
  const matn = (Array.isArray(xabar) ? xabar.join(" ") : typeof xabar === "string" ? xabar : "").trim();
  return matn && !matn.startsWith("errors.") ? matn : "";
}

/**
 * To'lov so'rovini bajaradi. Backend valyutaga shubha qilib 400 qaytarsa, kassirdan "Valyuta to'g'rimi?" deb so'raladi va
 * "ha" bo'lsa shu so'rov `{ force: true }` bilan qayta yuboriladi. "Yo'q" bo'lsa asl xato qaytariladi (to'lov saqlanmaydi).
 * `nom` — oynada ko'rinadigan hujjat belgisi (masalan, kassa hujjati raqami).
 */
export async function shubhaliValyutaBilanBajarish<T>(chaqiruv: (tana?: MajburlashTanasi) => Promise<T>, nom = ""): Promise<T> {
  try {
    return await chaqiruv();
  } catch (error) {
    if (!shubhaliValyutaXatosimi(error) || !axios.isAxiosError(error)) throw error;
    const matnlar = MATNLAR[apiTiliniOlish() === "ru" ? "ru" : "uz"];
    const rozi = await ogohlantirishniSorash(backendXabari(error.response?.data) || matnlar.matn, nom, {
      sarlavha: matnlar.sarlavha,
      savol: matnlar.savol,
      ha: matnlar.ha,
      yoq: matnlar.yoq,
    });
    if (!rozi) throw error;
    return chaqiruv({ force: true });
  }
}
