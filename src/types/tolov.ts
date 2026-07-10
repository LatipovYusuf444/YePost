import type { KassaKirim, Xarajat } from "./finance";
import type { Qaytarish, Sotuv } from "./savdo";

export type TolovYonalishi = "KIRIM" | "CHIQIM";
export type TolovManbasi = "SALE" | "RETURN" | "CASH_IN" | "EXPENSE";

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
  raw?: Sotuv | Qaytarish | KassaKirim | Xarajat;
};

export type TolovFiltrlari = {
  search: string;
  turi: TolovYonalishi | "BARCHASI";
  tolovTuri: TolovUsuliKeng | "BARCHASI";
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
};

export type TolovMoliyaManbalari = {
  kassaKirimlari: KassaKirim[];
  xarajatlar: Xarajat[];
};
