import type { Qaytarish, QaytarishOldindanJavobi, QaytarishToloviniQaytarishUsuli } from "@/types/savdo";
import { qaytarishSummasi } from "../savdoYordamchilari";
import { raqamga } from "./qaytarishYordamchilari";

// Qaytarish hisob-kitobi: BARCHA summalarni backend hisoblaydi (POST /returns/preview va tasdiqlangan hujjat).
// Bu yerda faqat javobni normalizatsiya qilinadi. `null` — "ma'lumot mavjud emas" (0 emas!); 0 — haqiqiy qiymat.

export type HisobKitob = {
  /** Qaytarilgan tovarlar qiymati (goodsValue). */
  tovarQiymati: number | null;
  /** Qaytarishdan oldingi sotuv qarzi (debtBefore). */
  mavjudQarz: number | null;
  /** Qarzdan ayriladigan summa (debtReduction). */
  qarzdanAyriladi: number | null;
  /** Mijozga qaytariladigan pul (refundAmount). */
  mijozgaQaytariladi: number | null;
  /** Qaytarishdan keyingi qarz (debtAfter). */
  qolganQarz: number | null;
};

export type HisobKitobHolati = "qarzYoq" | "qarzdanKichik" | "qarzgaTeng" | "qarzdanKatta" | "pulQaytarilmaydi";

// Oldindan ko'rish javobi: beshta summaning hammasi to'g'ri son bo'lishi shart.
// To'liq bo'lmagan javob qabul qilinmaydi — aks holda noto'g'ri summani tasdiqlab yuborish mumkin edi.
export function oldindanHisobKitob(javob: QaytarishOldindanJavobi | null | undefined): HisobKitob | null {
  if (!javob) return null;
  const hisob: HisobKitob = {
    tovarQiymati: raqamga(javob.goodsValue),
    mavjudQarz: raqamga(javob.debtBefore),
    qarzdanAyriladi: raqamga(javob.debtReduction),
    mijozgaQaytariladi: raqamga(javob.refundAmount),
    qolganQarz: raqamga(javob.debtAfter),
  };
  return Object.values(hisob).every((qiymat) => qiymat !== null) ? hisob : null;
}

// Backend raqamlari o'zaro mos kelishi: qarz = oldingi qarz − ayrilgan qarz, ayrilgan qarz + qaytarilgan pul ≤ tovar qiymati,
// hech biri manfiy emas. Mos kelmasa, noto'g'ri summani tasdiqlab yubormaslik uchun hisob-kitob qabul qilinmaydi.
// (1 so'm — yaxlitlash farqi uchun.)
export function hisobMuvofiqmi(hisob: HisobKitob) {
  const { tovarQiymati, mavjudQarz, qarzdanAyriladi, mijozgaQaytariladi, qolganQarz } = hisob;
  if (tovarQiymati === null || mavjudQarz === null || qarzdanAyriladi === null || mijozgaQaytariladi === null || qolganQarz === null) return false;
  if ([tovarQiymati, mavjudQarz, qarzdanAyriladi, mijozgaQaytariladi, qolganQarz].some((qiymat) => qiymat < 0)) return false;
  if (Math.abs(qolganQarz - (mavjudQarz - qarzdanAyriladi)) > 1) return false;
  return qarzdanAyriladi + mijozgaQaytariladi <= tovarQiymati + 1;
}

// Backend hujjati (GET /returns/{id}): faqat hujjatning o'z maydonlari. Eski hujjatlarda debtBefore/debtAfter null bo'lishi
// mumkin — ular null bo'lib qoladi (sotuvning HOZIRGI qarzi tarixiy qiymat o'rniga ishlatilmaydi).
export function hujjatHisobKitobi(qaytarish: Qaytarish): HisobKitob {
  const tovarQiymati = qaytarishSummasi(qaytarish);
  return {
    tovarQiymati: Number.isFinite(tovarQiymati) ? tovarQiymati : null,
    mavjudQarz: raqamga(qaytarish.debtBefore),
    qarzdanAyriladi: raqamga(qaytarish.debtReduction),
    mijozgaQaytariladi: raqamga(qaytarish.refundAmount),
    qolganQarz: raqamga(qaytarish.debtAfter),
  };
}

// Hisob-kitob kartasidagi izoh matnini tanlash uchun (summa hisoblanmaydi — backend sonlari solishtiriladi).
export function hisobKitobHolati(hisob: HisobKitob, usul: QaytarishToloviniQaytarishUsuli | string = "CASH"): HisobKitobHolati | null {
  const { tovarQiymati, mavjudQarz } = hisob;
  if (tovarQiymati === null || mavjudQarz === null) return null;
  if (mavjudQarz <= 0) return "qarzYoq";
  if (tovarQiymati < mavjudQarz) return "qarzdanKichik";
  if (tovarQiymati === mavjudQarz) return "qarzgaTeng";
  return String(usul).toUpperCase() === "NONE" ? "pulQaytarilmaydi" : "qarzdanKatta";
}
