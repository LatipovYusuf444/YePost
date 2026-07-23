import type { KassaKirim, Xarajat } from "./finance";
import type { Qaytarish, Sotuv } from "./savdo";

export type TolovYonalishi = "KIRIM" | "CHIQIM";
export type TolovManbasi = "SALE" | "RETURN" | "CASH_IN" | "EXPENSE" | "CASH_OPERATION";

export type TolovUsuliKeng =
  | "CASH"
  | "CARD"
  | "CLICK"
  | "PAYME"
  | "BANK"
  | "DEBT"
  | "OTHER"
  | string;

export type TolovYozuvi = {
  id: string;
  sotuvId: string;
  mijoz: string;
  turi: TolovYonalishi;
  tolovTuri: TolovUsuliKeng;
  summa: number;
  sana?: string;
  manba: TolovManbasi;
  sotuv?: Sotuv;
  raw?: Sotuv | Qaytarish | KassaKirim | Xarajat | FinanceTransaction;
};

export type TolovFiltrlari = {
  search: string;
  turi: TolovYonalishi | "BARCHASI";
  tolovTuri: TolovUsuliKeng | "BARCHASI";
  manba: TolovManbasi | "BARCHASI";
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
};

export type FinanceTransaction = {
  id: string; source: TolovManbasi; type: "INCOME" | "EXPENSE"; paymentType: string;
  amount: number | string; date: string; note?: string | null; refId?: string | null; refDocNumber?: string | null;
  status?: "CONFIRMED" | "DRAFT" | "CANCELLED";
  branchId?: string | null; branchName?: string | null;
  responsibleId?: string | null; responsibleName?: string | null;
  counterpartyType?: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | null;
  counterpartyId?: string | null; counterpartyName?: string | null;
};

export type TolovMoliyaManbalari = {
  kassaKirimlari: KassaKirim[];
  xarajatlar: Xarajat[];
};
