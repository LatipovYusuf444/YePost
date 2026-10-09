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
