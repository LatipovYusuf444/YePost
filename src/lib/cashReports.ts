import type { CashCurrency, CashDailyDay, CashNumber, CashPaymentType } from "../types/cashReports";

// Kassa pulini hech qanday kurs yoki hisobot valyutasiga o'tkazmaymiz.
export function cashAmount(amount: CashNumber | null | undefined, currency: CashCurrency): string {
  if (amount === null || amount === undefined) return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  const text = value.toLocaleString("uz-UZ", { maximumFractionDigits: currency === "USD" ? 2 : 0 });
  return currency === "USD" ? `$${text}` : `${text} so'm`;
}

export function dailyNet(day: Pick<CashDailyDay, CashCurrency>, currency: CashCurrency, paymentType?: CashPaymentType): number {
  const balance = paymentType ? day[currency].byPaymentType[paymentType] : day[currency];
  return Number(balance?.income ?? 0) - Number(balance?.expense ?? 0);
}

export function dailyRangeError(from: string, to: string): string {
  const valid = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
  if (!valid(from) || !valid(to)) return "Boshlanish va tugash sanalarini kiriting.";
  if (from > to) return "Boshlanish sanasi tugash sanasidan keyin bo'lmasin.";
  if ((Date.parse(to) - Date.parse(from)) / 86400000 + 1 > 400) return "Ko'pi bilan 400 kun tanlang.";
  return "";
}
