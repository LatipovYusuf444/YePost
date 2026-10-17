// Mijoz hisobi: mijoz oldindan to'lagan pul (ortiqcha to'lov yoki kassa orqali to'ldirilgan hisob).
// Hisob valyutasi valyuta rejimida USD. UI'siz va tashqi importlarsiz yozilgan — alohida sinash mumkin.

export type HisobValyutasi = "UZS" | "USD";

type HisobManbasi = { balance?: number | string | null; balanceCurrency?: string | null } | null | undefined;

export type MijozHisobi = { miqdor: number; valyuta: HisobValyutasi };

/** Mijozning ishlatsa bo'ladigan hisobi: faqat musbat balans (manfiy yoki yo'q bo'lsa 0). */
export function mijozHisobi(mijoz: HisobManbasi): MijozHisobi {
  const son = Number(mijoz?.balance ?? 0);
  return {
    miqdor: Number.isFinite(son) && son > 0 ? son : 0,
    valyuta: mijoz?.balanceCurrency?.toUpperCase() === "USD" ? "USD" : "UZS",
  };
}
