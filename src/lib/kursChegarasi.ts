// Backend (2026-11-03): dollar kursi (1 $ necha so'm) 1 000 dan kam bo'lishi mumkin emas. Kunlik kurs (PUT /settings/exchange-rates/:date),
// to'lovlardagi, qarz to'lovi va kassa amaliyotidagi hamda taqsimot ko'rinishidagi (allocation-preview) `rate` shunda
// 400 validatsiya xatosini qaytaradi (errors[].field = "rate"). Formalar so'rov yubormasdan oldin shu chegarani tekshiradi.
export const ENG_KAM_KURS = 1000;

/** Kiritilgan kurs musbat, lekin chegaradan past (0 / bo'sh — kiritilmagan, bu yerda tekshirilmaydi). */
export function kursJudaKichik(kurs: number | null | undefined) {
  return typeof kurs === "number" && Number.isFinite(kurs) && kurs > 0 && kurs < ENG_KAM_KURS;
}
