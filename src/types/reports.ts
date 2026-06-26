export type ExportTuri = "excel" | "pdf";

export type SanaFilter = {
  dateFrom?: string;
  dateTo?: string;
};

export type StockMovementFilter = SanaFilter & {
  modificationId: string;
  warehouseId?: string;
};

export type CounterpartyBalanceFilter = {
  customerId?: string;
  supplierId?: string;
};

export type ProductProfitFilter = SanaFilter & {
  categoryId?: string;
};

export type IncomeExpenseFilter = SanaFilter & {
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
