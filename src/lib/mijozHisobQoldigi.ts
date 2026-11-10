export type MijozHisobQoldigi = { UZS: number; USD: number };
export type MijozHisoblari = Record<string, MijozHisobQoldigi>;
export type MijozHisobHolati = "yuklanmoqda" | "xato" | "tayyor";

/** Hisobotning yakuniy qoldig'i: musbat — qarz, manfiy — avans. Valyutalar qo'shilmaydi. */
export function mijozHisoblariniMoslash(uzs: unknown, usd: unknown): MijozHisoblari {
  const hisoblar: MijozHisoblari = {};
  for (const [currency, raw] of [["UZS", uzs], ["USD", usd]] as const) {
    if (!raw || typeof raw !== "object" || !("items" in raw) || !Array.isArray(raw.items)) throw new Error("Invalid balance report");
    if ("currency" in raw && raw.currency && raw.currency !== currency) throw new Error("Unexpected balance currency");
    for (const row of raw.items) {
      if (!row || typeof row !== "object" || typeof row.counterpartyId !== "string" ||
          (typeof row.closingBalance !== "number" && typeof row.closingBalance !== "string") ||
          String(row.closingBalance).trim() === "" || !Number.isFinite(Number(row.closingBalance))) throw new Error("Invalid customer balance");
      if (row.currency && row.currency !== currency) throw new Error("Unexpected customer balance currency");
      const hisob = hisoblar[row.counterpartyId] ?? { UZS: 0, USD: 0 };
      hisob[currency] = Number(row.closingBalance);
      hisoblar[row.counterpartyId] = hisob;
    }
  }
  return hisoblar;
}

export function mijozQarzdormi(hisob: MijozHisobQoldigi | undefined): boolean {
  return Boolean(hisob && (hisob.UZS > 0 || hisob.USD > 0));
}
