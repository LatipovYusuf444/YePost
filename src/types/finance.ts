export type TolovUsuli = "CASH" | "CARD" | "BANK";
export type XarajatKategoriyasi =
  | "SALARY"
  | "RENT"
  | "UTILITIES"
  | "LOGISTICS"
  | "MARKETING"
  | "OTHER";
export type QarzYonlishi = "INCOMING" | "OUTGOING";
export type KassaKirimManbasi = "OWNER" | "INVESTOR" | "LOAN" | "OTHER";

export type NomliBoglanish = {
  id: string;
  name?: string;
  fullName?: string;
  username?: string;
};

export type Xarajat = {
  id: string;
  branchId?: string | null;
  responsibleId?: string | null;
  date?: string;
  category: XarajatKategoriyasi | string;
  amount: number;
  paymentMethod?: TolovUsuli | string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  branch?: NomliBoglanish | null;
};

export type XarajatSaqlash = {
  branchId?: string;
  date?: string;
  category: XarajatKategoriyasi;
  amount: number;
  paymentMethod?: TolovUsuli;
  note?: string;
};

export type Qarz = {
  id: string;
  date?: string;
  direction: QarzYonlishi | string;
  counterparty: string;
  amount: number;
  paymentMethod?: TolovUsuli | string;
  dueDate?: string | null;
  isReturned?: boolean;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type QarzSaqlash = {
  date?: string;
  direction: QarzYonlishi;
  counterparty: string;
  amount: number;
  paymentMethod?: TolovUsuli;
  dueDate?: string;
  isReturned?: boolean;
  note?: string;
};

export type KassaKirim = {
  id: string;
  branchId?: string | null;
  responsibleId?: string | null;
  date?: string;
  source: KassaKirimManbasi | string;
  amount: number;
  paymentMethod?: TolovUsuli | string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  branch?: NomliBoglanish | null;
};

export type KassaKirimSaqlash = {
  branchId?: string;
  date?: string;
  source: KassaKirimManbasi;
  amount: number;
  paymentMethod?: TolovUsuli;
  note?: string;
};
