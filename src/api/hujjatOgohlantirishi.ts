import axios from "axios";
import { ogohlantirishniSorash } from "@/lib/ogohlantirishSorovi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { apiTiliniOlish } from "./apiLanguage";
import { KEYINGI_HARAKAT_KODI, OGOHLANTIRISH_KODI, xatoKodi, xatoKodiMatni, xatoMaydoni } from "./xatoKodlari";

/** Tasdiqlash so'rovining tanasi: foydalanuvchi ogohlantirishga "ha" degandan keyin xuddi shu so'rov shu tana bilan qayta yuboriladi. */
export type TasdiqTanasi = { confirmWarnings: true };

// Xato emas, "Davom etasizmi?" ogohlantirishlari (409): "ha" bo'lsa xuddi shu so'rov `{ confirmWarnings: true }` bilan qayta yuboriladi.
//  - errors.inventory.before_stock_take — hujjat sanasi tasdiqlangan inventarizatsiyadan oldin;
//  - errors.inventory.movements_after_stock_take — o'tgan sanadagi inventarizatsiya (tasdiq va tahrir), tovar keyin harakat qilgan.
// errors.inventory.later_stock_take bu ro'yxatda YO'Q: u xato, qayta yuborilmaydi.
const OGOHLANTIRISH_KODLARI = [OGOHLANTIRISH_KODI, KEYINGI_HARAKAT_KODI];

export function ogohlantirishXatosimi(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409 && OGOHLANTIRISH_KODLARI.includes(xatoKodi(error.response.data) ?? "");
}

/** Oyna uchun: belgi (hujjat raqami/sanasi yoki harakatlar soni) va savol ostidagi izoh. */
function oynaTafsiloti(kod: string, tafsilot: unknown, til: string): { nom: string; savol?: string } {
  if (kod === KEYINGI_HARAKAT_KODI) {
    const harakatlar = xatoMaydoni(tafsilot, "movements");
    const soni = Array.isArray(harakatlar) ? harakatlar.length : 0;
    return til === "ru"
      ? { nom: soni ? `Движений после даты: ${soni}` : "", savol: "«Да» — разница запишется на дату инвентаризации, последующие движения не меняются." }
      : { nom: soni ? `Keyingi harakatlar: ${soni} ta` : "", savol: "«Ha» — farq inventarizatsiya sanasiga yoziladi, keyingi harakatlar o'zgarmaydi." };
  }
  const raqam = String(xatoMaydoni(tafsilot, "stockTakeNumber") ?? "");
  const kun = kunMatni(String(xatoMaydoni(tafsilot, "stockTakeDate") ?? ""));
  return { nom: [raqam, kun].filter(Boolean).join(" · ") };
}

/**
 * Tasdiqlash/yuborish/qabul qilish so'rovini bajaradi. Backend 409 ogohlantirish (yuqoridagi ro'yxat) qaytarsa, foydalanuvchidan so'raladi va "ha" bo'lsa shu so'rov
 * `{ confirmWarnings: true }` bilan qayta yuboriladi. "Yo'q" bo'lsa asl xato qaytariladi (hujjat tasdiqlanmaydi).
 */
export async function ogohlantirishBilanBajarish<T>(chaqiruv: (tana?: TasdiqTanasi) => Promise<T>): Promise<T> {
  try {
    return await chaqiruv();
  } catch (error) {
    if (!ogohlantirishXatosimi(error) || !axios.isAxiosError(error)) throw error;
    const tafsilot = error.response?.data;
    const kod = xatoKodi(tafsilot) ?? OGOHLANTIRISH_KODI;
    const til = apiTiliniOlish();
    const matn = xatoKodiMatni(kod, error.config?.url, til, tafsilot) ?? "";
    const { nom, savol } = oynaTafsiloti(kod, tafsilot, til);
    const rozi = await ogohlantirishniSorash(matn, nom, savol ? { savol } : undefined);
    if (!rozi) throw error;
    return chaqiruv({ confirmWarnings: true });
  }
}
