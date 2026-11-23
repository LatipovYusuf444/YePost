import apiClient from "./axios";
import { apiList, type ApiListEnvelope } from "./response.ts";
import { apiTiliniOlish } from "./apiLanguage.ts";
import { malumotnomaKeshiniTozalash, malumotnomaniOlish } from "../lib/malumotnomaKeshi.ts";

// To'liq mahsulot va variantlar ro'yxati (/catalog/products ~300 KB, /catalog/modifications ~800 KB) Mahsulotlar, Ombor qoldig'i,
// Monitoring va Hisobotlarda har ochilishda qayta yuklanardi. Bir daqiqa umumiy kesh: bir vaqtdagi so'rovlar bitta bo'ladi,
// sahifalar orasida o'tishda qayta yuklanmaydi. Narx, mahsulot, ombor hujjati, sozlama yoki ishlab chiqarish o'zgarsa darhol tozalanadi.
export const TOLIQ_KATALOG_GURUHI = "katalog";
const TOLIQ_KATALOG_MUDDATI = 60_000;

function royxatniOlish<T>(yol: string) {
  // Til nomlarga ta'sir qiladi: uz va ru nusxalari aralashmaydi.
  return malumotnomaniOlish(TOLIQ_KATALOG_GURUHI, `${yol}:${apiTiliniOlish()}`, async () =>
    apiList((await apiClient.get<T[] | ApiListEnvelope<T>>(yol)).data), TOLIQ_KATALOG_MUDDATI);
}

/** GET /catalog/modifications — hamma variantlar (narx bilan). 403 chaqiruvchida hal qilinadi, keshda qolmaydi. */
export function toliqModifikatsiyalar<T>() {
  return royxatniOlish<T>("/catalog/modifications");
}

/** Qo'lda "Yangilash": keyingi o'qish serverdan (boshqa qurilmada qilingan o'zgarishlar ham ko'rinadi). */
export function toliqKatalogniTozalash() {
  malumotnomaKeshiniTozalash(TOLIQ_KATALOG_GURUHI);
}

/** GET /catalog/products — hamma mahsulotlar. */
export function toliqMahsulotlar<T>() {
  return royxatniOlish<T>("/catalog/products");
}

const TASIR_QILADIGAN_YOLLAR = ["/catalog/", "/inventory/", "/settings/", "/production/"];

/** O'zgartiruvchi so'rov (muvaffaqiyatli yoki xato — qisman bajarilgan bo'lishi mumkin) katalog ro'yxatlariga ta'sir qiladimi.
 * Interceptor catalogApi.ts da (u ilova qobig'ida doim yuklanadi). */
export function toliqKatalogniEskirtiradimi(config?: { method?: string; url?: string }) {
  const method = config?.method?.toLowerCase();
  const yol = config?.url ?? "";
  return Boolean(method && ["post", "put", "patch", "delete"].includes(method) && TASIR_QILADIGAN_YOLLAR.some((prefix) => yol.startsWith(prefix)));
}
