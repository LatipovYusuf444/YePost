// Hujjat raqami yoki nomi ko'rsatiladigan joyda UUID bo'lagi chiqmasligi uchun: birinchi to'ldirilgan qiymat, bo'lmasa chiziqcha.

export const RAQAM_YOQ = "—";

/** Berilgan qiymatlardan birinchi bo'sh bo'lmagan matnni qaytaradi; hech biri bo'lmasa "—" (hech qachon ID emas). */
export function hujjatRaqamiMatni(...qiymatlar: Array<string | number | null | undefined>): string {
  for (const qiymat of qiymatlar) {
    const matn = String(qiymat ?? "").trim();
    if (matn) return matn;
  }
  return RAQAM_YOQ;
}
