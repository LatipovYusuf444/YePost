import apiClient from "./axios";
import { sahifaJavobi } from "./response";
import { hujjatHarakatlari, type HujjatHarakati } from "../lib/hujjatHarakatlari.ts";

const SAHIFA_HAJMI = 200;
const ENG_KO_P_SAHIFA = 10;

// Server `totalPages`ni aniq yozgandagina keyingi sahifalar olinadi (oddiy massiv javobda sahifalash bor deb taxmin qilinmaydi).
function aniqSahifalarSoni(raw: unknown) {
  const asosiy = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ichki = asosiy.data && typeof asosiy.data === "object" ? (asosiy.data as Record<string, unknown>) : {};
  const son = Number(asosiy.totalPages ?? ichki.totalPages);
  return Number.isFinite(son) && son > 1 ? Math.min(Math.floor(son), ENG_KO_P_SAHIFA) : 1;
}

// Sotuv kartasidagi bir nechta joy (jarayon qadami, kartadagi havola, oyna) bir paytda so'rasa, bitta so'rov yuboriladi.
const jarayondagilar = new Map<string, Promise<HujjatHarakati[]>>();

// GET /reports/stock-movement?documentIds=<id>: shu hujjat (sotuv, kirim, chiqim, ko'chirma, qaytarish) bilan bo'lgan ombor harakatlari,
// qatorda refId = hujjat id. Fon rejimi: xato toasti chiqmaydi (chaqiruvchi xatoni o'zi ko'rsatadi). Sana oralig'i yuborilmaydi.
export function hujjatHarakatlariniOlish(hujjatId: string): Promise<HujjatHarakati[]> {
  const mavjud = jarayondagilar.get(hujjatId);
  if (mavjud) return mavjud;
  const olish = async (page: number) =>
    (await apiClient.get<unknown>("/reports/stock-movement", {
      params: { documentIds: hujjatId, page, pageSize: SAHIFA_HAJMI },
      xatoniYashirish: true,
    })).data;
  const sorov = (async () => {
    const birinchi = await olish(1);
    const qatorlar = [...sahifaJavobi<unknown>(birinchi, 1, SAHIFA_HAJMI).items];
    // Hujjatda tovar qatorlari kam; baribir server ko'p sahifa bersa, ular ketma-ket olinadi.
    for (let page = 2; page <= aniqSahifalarSoni(birinchi); page += 1) {
      qatorlar.push(...sahifaJavobi<unknown>(await olish(page), page, SAHIFA_HAJMI).items);
    }
    return hujjatHarakatlari(qatorlar, hujjatId);
  })().finally(() => {
    jarayondagilar.delete(hujjatId);
  });
  jarayondagilar.set(hujjatId, sorov);
  return sorov;
}
