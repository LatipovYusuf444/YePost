import type { QarzTaqsimoti, QarzTaqsimotQatori } from "./qarzTaqsimoti";

export type CashOperationType =
  | "CUSTOMER_PAYMENT"
  | "EMPLOYEE_RETURN"
  | "SUPPLIER_RETURN"
  | "OTHER_INCOME"
  | "RETAIL_SALE"
  | "SUPPLIER_PAYMENT"
  | "CUSTOMER_REFUND"
  | "SALARY_PAYMENT"
  | "OTHER_EXPENSE";

export type CashOperationStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type CashPaymentMethod = "CASH" | "CARD" | "BANK";

export type CashOperation = {
  id: string;
  docNumber: string;
  type: CashOperationType;
  direction: "INCOME" | "EXPENSE";
  status: CashOperationStatus;
  paymentMethod: CashPaymentMethod;
  amount: string | number;
  // Pul harakatlangan valyuta; berilmasa — so'm.
  currency?: "UZS" | "USD" | null;
  // Hisob (mijoz/yetkazib beruvchi balansi) valyutasi va shu valyutadagi qiymat (tasdiqlanganda backend hisoblaydi).
  settleCurrency?: "UZS" | "USD" | null;
  settledAmount?: string | number | null;
  rate?: string | number | null;
  // Mijoz to'lovi (CUSTOMER_PAYMENT) tasdiqlanganda ochiq qarzlar eng eskisidan yopiladi: hisobga tushgan qism va taqsimot
  // (`allocation` — tasdiqlash javobida, `allocations` — GET /:id tafsilotida).
  accountAmount?: string | number | null;
  allocation?: QarzTaqsimoti | null;
  allocations?: QarzTaqsimotQatori[] | null;
  date: string;
  name?: string | null;
  note?: string | null;
  branchId?: string | null;
  branch?: { id: string; name?: string | null } | null;
  responsibleId?: string | null;
  responsible?: { id: string; fullName?: string | null } | null;
  customerId?: string | null;
  supplierId?: string | null;
  employeeId?: string | null;
  saleId?: string | null;
  purchaseId?: string | null;
  counterpartyType?: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | null;
  counterpartyId?: string | null;
  counterparty?: { id: string; name?: string | null; fullName?: string | null; phone?: string | null } | null;
  customer?: { id: string; firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
  supplier?: { id: string; name?: string | null; phone?: string | null } | null;
  employee?: { id: string; fullName?: string | null; username?: string | null } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CashOperationPayload = {
  type: CashOperationType;
  paymentMethod?: CashPaymentMethod;
  amount: number;
  // So'mda berilgan pul hisob valyutasiga (USD) `rate` bilan o'giriladi; `rate` berilmasa kunlik kurs olinadi. $ uchun valyuta rejimi kerak.
  currency?: "UZS" | "USD";
  settleCurrency?: "UZS" | "USD";
  rate?: number;
  date?: string;
  name?: string;
  note?: string;
  branchId?: string;
  responsibleId?: string;
  customerId?: string;
  supplierId?: string;
  employeeId?: string;
  // Mijoz to'lovida `saleId` — shu savdo birinchi yopiladi (qolgani eng eskisidan); savdo shu mijozniki va tasdiqlangan bo'lishi kerak.
  saleId?: string;
  purchaseId?: string;
  // "Summa juda kichik. Valyuta to'g'rimi?" (400 suspicious_currency) tasdiqlangach xuddi shu so'rov `force: true` bilan qayta yuboriladi.
  force?: boolean;
};

export type CashOperationFilter = {
  branchId?: string;
  responsibleId?: string;
  counterpartyType?: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE";
  counterpartyId?: string;
  status?: CashOperationStatus;
  paymentMethod?: CashPaymentMethod;
  type?: CashOperationType;
  search?: string;
  page?: number;
  pageSize?: number;
};
