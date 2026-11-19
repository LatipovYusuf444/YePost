import { useState } from "react";

let sanagich = 0;
const yangiKalit = () => `qator-${++sanagich}`;

/**
 * Qo'shiladigan/o'chiriladigan qatorlar (masalan, bir nechta telefon) uchun barqaror React kalitlari. Indeks kalit bo'lsa, qator o'chirilganda
 * keyingi qator oldingisining komponentini (ichki holati bilan — masalan, XalqaroTelefon'da tanlangan davlat) meros qilib oladi.
 * Qiymatlar massivi bilan bir xil tartibda `qoshish` / `ochirish` chaqiriladi.
 */
export function useQatorKalitlari(boshlangichSoni: number) {
  const [kalitlar, setKalitlar] = useState<string[]>(() => Array.from({ length: Math.max(1, boshlangichSoni) }, yangiKalit));
  return {
    kalitlar,
    qoshish: () => setKalitlar((joriy) => [...joriy, yangiKalit()]),
    // Oxirgi qator o'chirilsa bo'sh qator qoladi — u ham yangi kalit oladi (ichki holat boshidan).
    ochirish: (index: number) => setKalitlar((joriy) => (joriy.length === 1 ? [yangiKalit()] : joriy.filter((_, i) => i !== index))),
  };
}
