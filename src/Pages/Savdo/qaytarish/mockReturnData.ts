import type { Qaytarish, QaytarishToloviniQaytarishUsuli } from "@/types/savdo";
import { qaytarishHolati, raqamga } from "./qaytarishYordamchilari";

// ─────────────────────────────────────────────────────────────────────────────────────────────
// VAQTINCHALIK (MOCK) MA'LUMOTLAR
//
// Bu faylda backendda HALI MAVJUD BO'LMAGAN ma'lumotlar uchun namunaviy qiymatlar va "taxminiy ko'rsatish"
// funksiyalari saqlanadi. UI faqat shu fayl orqali oladi — backend tayyor bo'lgach faqat shu yerni
// real API javobiga almashtirish kifoya (qarang: docs/qaytarish-backend-talablar.md).
//
// MUHIM: bu yerdagi hisob-kitob faqat KO'RSATISH uchun (tasdiqlashdan oldingi taxminiy ko'rinish).
// Backendga hech qachon yuborilmaydi. Yakuniy refundAmount/debtReduction'ni backend `confirm` da hisoblaydi
// va UI tasdiqlangandan keyin faqat backend qiymatlarini ko'rsatadi.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export type HisobKitobHolati = "qarzYoq" | "qarzdanKichik" | "qarzgaTeng" | "qarzdanKatta";

export type HisobKitob = {
  tovarQiymati: number;
  mavjudQarz: number;
  qarzdanAyriladi: number;
  mijozgaQaytariladi: number;
  qolganQarz: number;
  holat: HisobKitobHolati;
  // "taxminiy" — mock ko'rsatish; "backend" — backend qaytargan real qiymatlar.
  manba: "taxminiy" | "backend";
};

function holatniAniqlash(tovarQiymati: number, mavjudQarz: number): HisobKitobHolati {
  if (mavjudQarz <= 0) return "qarzYoq";
  if (tovarQiymati < mavjudQarz) return "qarzdanKichik";
  if (tovarQiymati === mavjudQarz) return "qarzgaTeng";
  return "qarzdanKatta";
}

// MOCK: tasdiqlashdan oldingi taxminiy ko'rinish (avval qarz yopiladi, ortig'i mijozga qaytariladi).
// TODO(backend): `POST /returns/preview` kelganda shu funksiya o'rniga uning javobi ishlatiladi.
export function taxminiyHisobKitob(
  tovarQiymati: number,
  mavjudQarz: number,
  usul: QaytarishToloviniQaytarishUsuli = "CASH"
): HisobKitob {
  const qarzdanAyriladi = Math.min(tovarQiymati, Math.max(mavjudQarz, 0));
  // "Pul qaytarilmaydi" usulida mijozga pul berilmaydi.
  const mijozgaQaytariladi = usul === "NONE" ? 0 : Math.max(tovarQiymati - qarzdanAyriladi, 0);
  return {
    tovarQiymati,
    mavjudQarz: Math.max(mavjudQarz, 0),
    qarzdanAyriladi,
    mijozgaQaytariladi,
    qolganQarz: Math.max(mavjudQarz - qarzdanAyriladi, 0),
    holat: holatniAniqlash(tovarQiymati, mavjudQarz),
    manba: "taxminiy",
  };
}

// REAL: backend qaytargan refundAmount va debtReduction (satr ko'rinishida kelishi mumkin) asosida.
// `hozirgiQarz` — sotuvning hozirgi (qaytarishdan keyingi) qarzi; mavjud bo'lmasa taxminiy qiymat ishlatiladi.
export function backendHisobKitobi(
  qaytarish: Qaytarish,
  tovarQiymati: number,
  hozirgiQarz: number | null
): HisobKitob | null {
  const refund = raqamga(qaytarish.refundAmount);
  const debtReduction = raqamga(qaytarish.debtReduction);
  if (refund === null && debtReduction === null) return null;

  const qarzdanAyriladi = debtReduction ?? 0;
  const mijozgaQaytariladi = refund ?? 0;
  const qolganQarz = hozirgiQarz ?? 0;
  const mavjudQarz = qolganQarz + qarzdanAyriladi;
  return {
    tovarQiymati,
    mavjudQarz,
    qarzdanAyriladi,
    mijozgaQaytariladi,
    qolganQarz,
    holat: holatniAniqlash(tovarQiymati, mavjudQarz),
    manba: hozirgiQarz === null ? "taxminiy" : "backend",
  };
}

// ── Jarayon tarixi (timeline) ─────────────────────────────────────────────────────────────────

export type VaqtChizigiTuri = "yaratildi" | "mahsulot" | "hisob" | "tasdiqlandi" | "ombor" | "moliya" | "bekorQilindi";

export type VaqtChizigiVoqeasi = {
  id: string;
  turi: VaqtChizigiTuri;
  // Backend sanasi bor bo'lsa shu (real), bo'lmasa bo'sh qoladi.
  sana?: string;
  // true — voqea backendda hali saqlanmaydi, hujjat holatidan taxminan ko'rsatilmoqda.
  namuna: boolean;
};

// MOCK: backendda timeline yo'q. Hujjatning real sanalari (createdAt, confirmedAt, updatedAt) va holatidan tuziladi.
// TODO(backend): `GET /returns/{id}/timeline` (yoki `events[]`) kelganda shu funksiya real voqealarni qaytaradi.
export function mockVaqtChizigi(qaytarish: Qaytarish): VaqtChizigiVoqeasi[] {
  const holat = qaytarishHolati(qaytarish);
  const voqealar: VaqtChizigiVoqeasi[] = [
    { id: "yaratildi", turi: "yaratildi", sana: qaytarish.createdAt, namuna: true },
    { id: "mahsulot", turi: "mahsulot", sana: qaytarish.createdAt, namuna: true },
  ];
  if (holat === "CONFIRMED" || holat === "CANCELLED" || holat === "CANCELED") {
    voqealar.push(
      { id: "hisob", turi: "hisob", sana: qaytarish.confirmedAt ?? qaytarish.updatedAt, namuna: true },
      { id: "tasdiqlandi", turi: "tasdiqlandi", sana: qaytarish.confirmedAt ?? qaytarish.updatedAt, namuna: true },
      { id: "ombor", turi: "ombor", sana: qaytarish.confirmedAt ?? qaytarish.updatedAt, namuna: true },
      { id: "moliya", turi: "moliya", sana: qaytarish.confirmedAt ?? qaytarish.updatedAt, namuna: true }
    );
  }
  if (holat === "CANCELLED" || holat === "CANCELED") {
    voqealar.push({ id: "bekorQilindi", turi: "bekorQilindi", sana: qaytarish.updatedAt, namuna: true });
  }
  return voqealar;
}
