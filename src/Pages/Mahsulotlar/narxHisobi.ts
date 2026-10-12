// Mahsulot narxi va "Ustama" (%) hisob-kitobi. Ustama SOTUV narxidan hisoblanadi (marja):
//   ustama % = (sotuv − kelish) ÷ sotuv × 100        misol: kelish 0.18, sotuv 0.2 → 10%
//   sotuv    = kelish ÷ (1 − ustama / 100)            misol: kelish 0.18, ustama 10% → 0.2
// UI yo'q — alohida sinash mumkin.

/** Kelish va sotuv narxidan ustama (%); narxlardan biri musbat bo'lmasa null. */
export function ustamaFoizi(kelish: number, sotuv: number): number | null {
  if (!(kelish > 0) || !(sotuv > 0)) return null;
  return ((sotuv - kelish) / sotuv) * 100;
}

/** Kelish narxi va ustama (%) dan sotuv narxi; ustama 100% va undan katta bo'lsa (yoki kelish narxi yo'q bo'lsa) null. */
export function sotuvNarxiUstamadan(kelish: number, foiz: number): number | null {
  if (!(kelish > 0) || !Number.isFinite(foiz) || foiz >= 100) return null;
  return kelish / (1 - foiz / 100);
}
