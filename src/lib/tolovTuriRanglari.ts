// To'lov turlarining yagona ranglari (TZ 13.11.2026, 5-bag). Savdo tarixi, to'lovlar ro'yxati, savdo ichidagi to'lovlar, kassa,
// kunlik kassa hisoboti va to'lov tugmalari shu konstantani ishlatadi. UI'siz — testlarda to'g'ridan-to'g'ri ishlaydi.
//   Naqd — yashil, Karta (Uzcard/Humo, Click, Payme) — ko'k, Bank o'tkazma — siyohrang, To'lanmagan / qarz — kulrang.
// Qorong'u rejim (`.dark`) uchun to'qroq variantlar `klass` ichida `dark:` bilan berilgan.

export type TolovRangGuruhi = "naqd" | "karta" | "bank" | "tolanmagan";

export type TolovRangi = {
  fon: string;
  matn: string;
  chegara: string;
  fonQorongi: string;
  matnQorongi: string;
  /** Belgi (badge) uchun Tailwind klasslari: fon, matn, halqa va qorong'u variant. */
  klass: string;
};

export const TOLOV_TURI_RANGLARI: Record<TolovRangGuruhi, TolovRangi> = {
  naqd: {
    fon: "#EAF3DE", matn: "#27500A", chegara: "#C9DFB0", fonQorongi: "#1F3511", matnQorongi: "#BFE09A",
    klass: "bg-[#EAF3DE] text-[#27500A] ring-[#C9DFB0] dark:bg-[#1F3511] dark:text-[#BFE09A] dark:ring-[#35561F]",
  },
  karta: {
    fon: "#E6F1FB", matn: "#0C447C", chegara: "#B9D6F1", fonQorongi: "#0E2A45", matnQorongi: "#A9CFF3",
    klass: "bg-[#E6F1FB] text-[#0C447C] ring-[#B9D6F1] dark:bg-[#0E2A45] dark:text-[#A9CFF3] dark:ring-[#1D4A73]",
  },
  bank: {
    fon: "#EEEDFE", matn: "#3C3489", chegara: "#CFCBF6", fonQorongi: "#25214F", matnQorongi: "#C7C2F7",
    klass: "bg-[#EEEDFE] text-[#3C3489] ring-[#CFCBF6] dark:bg-[#25214F] dark:text-[#C7C2F7] dark:ring-[#3F3A7E]",
  },
  tolanmagan: {
    fon: "#F1EFE8", matn: "#444441", chegara: "#DAD7CC", fonQorongi: "#2E2D29", matnQorongi: "#D3D1C7",
    klass: "bg-[#F1EFE8] text-[#444441] ring-[#DAD7CC] dark:bg-[#2E2D29] dark:text-[#D3D1C7] dark:ring-[#4A4843]",
  },
};

/**
 * To'lov turi (backend `paymentType`/`paymentMethod`, kassa kanali yoki UI nomi) qaysi rang guruhiga kiradi.
 * Click va Payme karta orqali to'lanadi — ko'k guruhda. Noma'lum yoki bo'sh tur, qarz va hisobdan — kulrang.
 */
export function tolovRangGuruhi(turi: string | null | undefined): TolovRangGuruhi {
  const kod = String(turi ?? "").trim().toUpperCase();
  if (["CASH", "NAQD"].includes(kod)) return "naqd";
  if (["CARD", "CLICK", "PAYME", "UZCARD", "HUMO", "KARTA", "ILOVA", "TERMINAL"].includes(kod)) return "karta";
  if (["BANK", "TRANSFER", "BANK_TRANSFER"].includes(kod)) return "bank";
  return "tolanmagan";
}

export function tolovRangi(turi: string | null | undefined): TolovRangi {
  return TOLOV_TURI_RANGLARI[tolovRangGuruhi(turi)];
}

/** Bir savdodagi to'lovlar turlari bo'yicha (tartib saqlanadi): [Naqd $50] [Karta $66.16]. Qarz yozuvlari (`DEBT`) kirmaydi. */
export function tolovlarniTurBoyichaYigish<T extends { paymentType?: string | null; amount?: number | string | null }>(tolovlar: readonly T[] | null | undefined) {
  const guruhlar = new Map<string, { turi: string; summa: number }>();
  for (const tolov of tolovlar ?? []) {
    const turi = String(tolov.paymentType ?? "").toUpperCase();
    if (!turi || turi === "DEBT") continue;
    const joriy = guruhlar.get(turi) ?? { turi, summa: 0 };
    joriy.summa += Number(tolov.amount) || 0;
    guruhlar.set(turi, joriy);
  }
  return [...guruhlar.values()];
}
