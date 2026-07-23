import { kassaKirimApi, xarajatApi } from "./financeApi";
import type { TolovMoliyaManbalari } from "@/types/tolov";
import apiClient from "./axios";
import type { FinanceTransaction, TolovManbasi } from "@/types/tolov";

export async function financeTransactions(params: {
  search?: string;
  type?: "INCOME" | "EXPENSE";
  branchId?: string;
  responsibleId?: string;
  counterpartyType?: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE";
  counterpartyId?: string;
  status?: "CONFIRMED" | "DRAFT" | "CANCELLED";
  paymentType?: string;
  source?: TolovManbasi;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const response=await apiClient.get<{data?:FinanceTransaction[];total?:number;page?:number;pageSize?:number;totalPages?:number}>("/finance/transactions",{params});
  return {items:response.data.data??[],total:response.data.total??0,page:response.data.page??1,pageSize:response.data.pageSize??10,totalPages:response.data.totalPages??1};
}

export async function barchaFinanceTransactions(
  params: Omit<Parameters<typeof financeTransactions>[0], "page" | "pageSize"> = {}
) {
  const first = await financeTransactions({ ...params, page: 1, pageSize: 100 });
  if (first.totalPages <= 1) return first.items;

  const pages = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      financeTransactions({ ...params, page: index + 2, pageSize: 100 })
    )
  );
  return [first.items, ...pages.map((page) => page.items)].flat();
}

// Swagger bo'yicha mavjud real moliya endpointlari:
// GET /finance/cash-ins va GET /finance/expenses.
export async function moliyaTolovManbalariniOlish(): Promise<TolovMoliyaManbalari> {
  const [kassaKirimlari, xarajatlar] = await Promise.all([
    kassaKirimApi.royxat(),
    xarajatApi.royxat(),
  ]);

  return { kassaKirimlari, xarajatlar };
}
