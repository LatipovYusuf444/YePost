export type CashCurrency = "UZS" | "USD";
export type CashPaymentType = "CASH" | "CARD" | "BANK";
export type CashNumber = number | string;

export type CashFlowBalance = {
  openingBalance: CashNumber;
  income: CashNumber;
  expense: CashNumber;
  closingBalance: CashNumber;
};
export type CashFlowCurrencySummary = CashFlowBalance & {
  byPaymentMethod: Partial<Record<CashPaymentType, CashFlowBalance>>;
};
export type FinanceCurrencySummary = Record<CashCurrency, {
  income: CashNumber;
  expense: CashNumber;
  net: CashNumber;
  count: number;
}>;
export type CashDailyBalance = {
  opening: CashNumber;
  income: CashNumber;
  expense: CashNumber;
  closing: CashNumber;
  byPaymentType: Partial<Record<CashPaymentType, { income: CashNumber; expense: CashNumber }>>;
};
export type CashDailyDay = Record<CashCurrency, CashDailyBalance> & {
  date: string;
  operationsCount: number;
};
export type CashDailyParams = {
  from: string;
  to: string;
  paymentType?: CashPaymentType;
  branchId?: string;
};
export type CashDailyReport = {
  from: string;
  to: string;
  timezone: string;
  days: CashDailyDay[];
  totals: Record<CashCurrency, CashDailyBalance> & { operationsCount: number };
};
