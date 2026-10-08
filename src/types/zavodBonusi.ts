// Yetkazib beruvchi (zavod) bonusi — backend: /finance/supplier-bonuses.
export type ZavodBonusiHolati = "DRAFT" | "CONFIRMED" | "CANCELLED";

type NomliYozuv = { id: string; name?: string | null };

export type ZavodBonusi = {
  id: string;
  docNumber?: string | null;
  date?: string | null;
  supplierId: string;
  supplier?: NomliYozuv | null;
  amount: number | string;
  note?: string | null;
  status: ZavodBonusiHolati;
  branchId?: string | null;
  branch?: NomliYozuv | null;
  createdBy?: { id: string; fullName?: string | null } | null;
  createdAt?: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
};

export type ZavodBonusiFiltri = {
  supplierId?: string;
  branchId?: string;
  status?: ZavodBonusiHolati;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ZavodBonusiPayload = {
  supplierId: string;
  amount: number;
  date?: string;
  branchId?: string;
  note?: string;
};
