// Savdo narx turlari (GET/PATCH /settings/sales → { priceTypes: ["RETAIL","WHOLESALE"] }). Bo'sh ro'yxat bo'lmaydi;
// ro'yxat tartibi muhim: BIRINCHISI standart tur (sotuv qatorida priceType berilmasa shu olinadi).
// Bu fayl faqat tur nomlarini import qiladi (testlarda to'g'ridan-to'g'ri ishlaydi).
import type { SotuvNarxTuri } from "../types/savdo.ts";

export const BARCHA_NARX_TURLARI: SotuvNarxTuri[] = ["COST", "RETAIL", "WHOLESALE"];

/** Backend javobidagi `priceTypes` ni tozalaydi (tartibi saqlanadi: birinchisi standart); noto'g'ri yoki bo'sh bo'lsa null (sozlama noma'lum). */
export function narxTurlariniTozalash(xom: unknown): SotuvNarxTuri[] | null {
  const royxat = xom && typeof xom === "object" && "priceTypes" in xom ? (xom as { priceTypes?: unknown }).priceTypes : null;
  if (!Array.isArray(royxat)) return null;
  const turlar: SotuvNarxTuri[] = [];
  for (const tur of royxat) {
    if (BARCHA_NARX_TURLARI.includes(tur as SotuvNarxTuri) && !turlar.includes(tur as SotuvNarxTuri)) turlar.push(tur as SotuvNarxTuri);
  }
  return turlar.length > 0 ? turlar : null;
}

export type KassaNarxTurlari = { chakana: boolean; ulgurji: boolean };

/**
 * Kassada chakana/ulgurji tanlash imkoniyati. Sozlama noma'lum bo'lsa (yuklanmagan yoki o'qib bo'lmadi) ikkalasi ham ochiq,
 * shuningdek faqat tannarx yoqilgan bo'lsa ham kassa ishlashda davom etadi (o'chirilgan turni backend o'zi rad etadi).
 */
export function kassaNarxTurlari(yoqilgan: readonly SotuvNarxTuri[] | null | undefined): KassaNarxTurlari {
  if (!yoqilgan) return { chakana: true, ulgurji: true };
  const chakana = yoqilgan.includes("RETAIL");
  const ulgurji = yoqilgan.includes("WHOLESALE");
  return chakana || ulgurji ? { chakana, ulgurji } : { chakana: true, ulgurji: true };
}

/** Kassada boshlang'ich tanlanadigan tur: yoqilganlarning birinchisi (tannarx kassada tanlanmaydi); mos tur bo'lmasa null. */
export function standartKassaNarxTuri(yoqilgan: readonly SotuvNarxTuri[] | null | undefined): "chakana" | "ulgurji" | null {
  const birinchi = yoqilgan?.find((tur) => tur === "RETAIL" || tur === "WHOLESALE");
  return birinchi === "RETAIL" ? "chakana" : birinchi === "WHOLESALE" ? "ulgurji" : null;
}

/** Joriy tanlangan tur o'chirilgan bo'lsa, ruxsat etilgan turga o'tkazadi. */
export function ruxsatEtilganNarxTuri(joriy: "chakana" | "ulgurji", ruxsat: KassaNarxTurlari): "chakana" | "ulgurji" {
  if (joriy === "chakana" && !ruxsat.chakana) return "ulgurji";
  if (joriy === "ulgurji" && !ruxsat.ulgurji) return "chakana";
  return joriy;
}
