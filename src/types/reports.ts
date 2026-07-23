export type ExportTuri = "excel" | "pdf";

export type SanaFilter = {
  dateFrom?: string;
  dateTo?: string;
};

export type StockMovementFilter = SanaFilter & {
  warehouseIds?: string;
  branchIds?: string;
  categoryIds?: string;
  productIds?: string;
  modificationIds?: string;
  customerIds?: string;
  supplierIds?: string;
  documentTypes?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  /** Eski UI bilan moslik; API qatlamida CSV maydoniga o'tkaziladi. */
  modificationId?: string;
  warehouseId?: string;
};

export type CounterpartyBalanceFilter = {
  counterpartyType?: "CUSTOMER" | "SUPPLIER";
  debtStatus?: "ALL" | "DEBTOR" | "CREDITOR" | "ZERO";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  customerIds?: string;
  supplierIds?: string;
  productIds?: string;
  customerId?: string;
  supplierId?: string;
};

export type ProductProfitFilter = SanaFilter & {
  groupBy?: "PRODUCT" | "CUSTOMER" | "MONTH" | "BRANCH" | "WAREHOUSE";
  branchIds?: string;
  warehouseIds?: string;
  customerIds?: string;
  companyIds?: string;
  productIds?: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
};

export type IncomeExpenseFilter = SanaFilter & {
  branchIds?: string;
  branchId?: string;
};

export type AuditFilter = SanaFilter & {
  action?: string;
  resource?: string;
  page?: number;
  pageSize?: number;
};

export type HisobotJavobi = unknown;

export type AuditLog = {
  id?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  userId?: string;
  user?: {
    id?: string;
    username?: string;
    fullName?: string;
  };
  before?: unknown;
  after?: unknown;
  meta?: unknown;
  createdAt?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type AuditLogsJavobi = {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type Tanlov = {
  id: string;
  name?: string;
  fullName?: string;
  username?: string;
  barcode?: string;
  product?: {
    id?: string;
    name?: string;
  };
};
