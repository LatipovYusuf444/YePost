// Kunlik kassa → chiqimlar ro'yxati (backend 18.11): GET /reports/cash-flow?dateFrom&dateTo — har bir kirim va chiqim alohida qator,
// har birida currency; ro'yxat `currency` bo'yicha (so'm va dollar alohida so'raladi). Bu yerda faqat chiqim qatorlari ajratiladi.
// Backend qatori (reports.service cashFlow): id, source (SALE|RETURN|CASH_IN|EXPENSE|CASH_OPERATION), type (INCOME|EXPENSE), paymentType,
// currency, amount (musbat), date, note, refDocNumber, counterpartyName, responsibleName, branchName. Boshqa nomlar — eski/zaxira shakl.
// UI'siz — alohida sinaladi.

export type KassaHarakati = {
  id: string;
  currency?: string;
  date: string;
  documentNumber?: string;
  refDocNumber?: string;
  name?: string;
  counterpartyName?: string | null;
  source?: string;
  note?: string | null;
  paymentMethod?: string;
  paymentType?: string;
  income?: number | string;
  expense?: number | string;
  amount?: number | string;
  type?: "INCOME" | "EXPENSE" | string;
};

export type KassaChiqimi = {
  id: string;
  sana: string;
  hujjat: string;
  nomi: string;
  // Qator manbasi: SALE, RETURN, CASH_IN, EXPENSE, CASH_OPERATION.
  manba: string;
  izoh: string;
  tolovTuri: string;
  summa: number;
  valyuta: "UZS" | "USD";
};

const son = (qiymat: unknown) => {
  const n = Number(qiymat);
  return Number.isFinite(n) ? n : 0;
};

/** Chiqim qatorlari (type EXPENSE yoki expense > 0), vaqt bo'yicha yangisi birinchi. */
export function kassaChiqimlari(qatorlar: readonly KassaHarakati[], valyuta: "UZS" | "USD"): KassaChiqimi[] {
  return qatorlar
    .filter((qator) => String(qator.type ?? "").toUpperCase() === "EXPENSE" || son(qator.expense) > 0)
    .filter((qator) => !qator.currency || qator.currency === valyuta)
    .map((qator) => ({
      id: qator.id,
      sana: qator.date,
      hujjat: qator.documentNumber || qator.refDocNumber || "",
      nomi: (qator.counterpartyName || qator.name || "").trim(),
      manba: String(qator.source ?? "").toUpperCase(),
      izoh: qator.note?.trim() ?? "",
      tolovTuri: String(qator.paymentMethod ?? qator.paymentType ?? "").toUpperCase(),
      summa: Math.abs(son(qator.expense) || son(qator.amount)),
      valyuta,
    }))
    .sort((a, b) => String(b.sana).localeCompare(String(a.sana)));
}

/** Jami chiqim (bir valyutada). */
export function chiqimlarJami(chiqimlar: readonly KassaChiqimi[]) {
  return chiqimlar.reduce((jami, qator) => jami + qator.summa, 0);
}
