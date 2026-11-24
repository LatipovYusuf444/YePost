// 3D sex — ma'lumot modeli (sahnadan alohida). Keyinchalik shu turlar Ye-Post'dan (ishlab chiqarish moduli) to'ldiriladi:
// stanokning barqaror ID'si, texnik holati, joriy topshirig'i va oxirgi yangilanish vaqti aniq ajratilgan.
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.

/** Stanok turi — 3D modeli shunga qarab tanlanadi. */
export type StanokTuri = "kesish" | "cnc" | "qirra" | "burgilash" | "qadoqlash";

/** O'zgarmas ma'lumot: sexdagi joyi va turi (sahna shu bo'yicha quriladi). */
export type StanokTavsifi = {
  /** Barqaror ID (Ye-Post'dagi ish markazi / stanok ID'si bilan bog'lanadi). */
  id: string;
  nom: string;
  tur: StanokTuri;
  /** Sexdagi joyi (metr): x — chapdan o'ngga, z — oldindan orqaga. */
  joy: [number, number];
  /** Y o'qi atrofida burilish (radian). */
  burilish: number;
};

/** Texnik holat (rang + matn bilan ko'rsatiladi). */
export type TexnikHolat = "ishlayapti" | "pauza" | "bosh" | "nosoz";

/** Ishlab chiqarish topshirig'i: qaysi buyurtmaning qaysi detali, qaysi operatsiya. */
export type Topshiriq = {
  id: string;
  buyurtma: string;
  detal: string;
  operatsiya: string;
  bajarildi: number;
  jami: number;
  birlik: string;
};

/** Stanokning jonli holati (manbadan keladi). */
export type StanokHolati = {
  stanokId: string;
  holat: TexnikHolat;
  /** Pauza/nosozlik sababi (ixtiyoriy). */
  sabab?: string;
  joriy: Topshiriq | null;
  /** Navbatdagi topshiriqlar (birinchisi — "Keyingi ish"). */
  navbat: Topshiriq[];
  /** Ma'lumot oxirgi marta qachon kelgan (ms, epoch). */
  yangilangan: number;
  /** Aloqa bormi: yo'q bo'lsa ma'lumot eskirgan (oxirgi ma'lum holat ko'rsatiladi). */
  aloqa: boolean;
};

export type SexHolati = Record<string, StanokHolati>;

/** Holatlar manbai: demo (taymer) yoki keyinchalik Ye-Post API. Sahna faqat shu interfeysni biladi. */
export interface SexManbasi {
  /** Joriy holat (darhol). */
  holat(): SexHolati;
  /** O'zgarishlarga obuna; qaytgan funksiya obunani bekor qiladi. */
  obuna(tinglovchi: (holat: SexHolati, hodisa?: SexHodisasi) => void): () => void;
}

/** Foydalanuvchiga ko'rsatiladigan hodisa (lenta / bildirishnoma uchun). */
export type SexHodisasi = { vaqt: number; stanokId: string; tur: "boshlandi" | "tugadi" | "pauza" | "davom" | "aloqa_uzildi" | "aloqa_tiklandi"; matn: string };

/** Bajarilish ulushi 0..1. */
export function bajarilishUlushi(topshiriq: Topshiriq | null | undefined) {
  if (!topshiriq || !(topshiriq.jami > 0)) return 0;
  return Math.min(1, Math.max(0, topshiriq.bajarildi / topshiriq.jami));
}

/** "32/80 dona" */
export function miqdorMatni(topshiriq: Topshiriq | null | undefined) {
  return topshiriq ? `${topshiriq.bajarildi}/${topshiriq.jami} ${topshiriq.birlik}` : "—";
}

/**
 * Qisqa yorliq: "Kesish-01 · Ishlayapti · №174 · Yon panel · 32/80 dona". Aloqa yo'q bo'lsa holat o'rnida "Ma'lumot eskirgan".
 * `holatNomi` — tarjima qilingan holat nomi.
 */
export function stanokYorligi(nom: string, holat: StanokHolati | undefined, holatNomi: (h: TexnikHolat) => string, eskirgan: string) {
  if (!holat) return nom;
  const qismlar = [nom, holat.aloqa ? holatNomi(holat.holat) : eskirgan];
  if (holat.joriy) qismlar.push(holat.joriy.buyurtma, holat.joriy.detal, miqdorMatni(holat.joriy));
  return qismlar.join(" · ");
}

/** Holat rangi (status chip, chiroq, halqa). Rang yagona belgi emas — matn ham doim yoniga yoziladi. */
export const HOLAT_RANGI: Record<TexnikHolat | "eskirgan", string> = {
  ishlayapti: "#22c55e",
  pauza: "#f59e0b",
  bosh: "#94a3b8",
  nosoz: "#ef4444",
  eskirgan: "#a855f7",
};

export function korinadiganHolat(holat: StanokHolati | undefined): TexnikHolat | "eskirgan" {
  if (!holat) return "bosh";
  return holat.aloqa ? holat.holat : "eskirgan";
}
