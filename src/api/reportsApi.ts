import apiClient from "./axios";
import type {
  AuditFilter,
  AuditLogsJavobi,
  CounterpartyBalanceFilter,
  ExportTuri,
  HisobotJavobi,
  IncomeExpenseFilter,
  ProductProfitFilter,
  StockMovementFilter,
  Tanlov,
} from "@/types/reports";

function tozaParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null)
  );
}

async function getReport(path: string, params: Record<string, unknown>) {
  return (await apiClient.get<HisobotJavobi>(path, { params: tozaParams(params) })).data;
}

async function exportReport(path: string, params: Record<string, unknown>) {
  return (
    await apiClient.get<Blob>(path, {
      params: tozaParams(params),
      responseType: "blob",
    })
  ).data;
}

// Hisobotlar sahifasi: GET /reports/stock-movement
export const stockMovementReportApi = {
  olish: (params: StockMovementFilter) => getReport("/reports/stock-movement", params),
  export: (params: StockMovementFilter, exportTuri: ExportTuri) =>
    exportReport("/reports/stock-movement", { ...params, export: exportTuri }),
};

// Hisobotlar sahifasi: GET /reports/counterparty-balance
export const counterpartyBalanceReportApi = {
  olish: (params: CounterpartyBalanceFilter) =>
    getReport("/reports/counterparty-balance", params),
  export: (params: CounterpartyBalanceFilter, exportTuri: ExportTuri) =>
    exportReport("/reports/counterparty-balance", { ...params, export: exportTuri }),
};

// Hisobotlar sahifasi: GET /reports/product-profit
export const productProfitReportApi = {
  olish: (params: ProductProfitFilter) => getReport("/reports/product-profit", params),
  export: (params: ProductProfitFilter, exportTuri: ExportTuri) =>
    exportReport("/reports/product-profit", { ...params, export: exportTuri }),
};

// Hisobotlar sahifasi: GET /reports/income-expense
export const incomeExpenseReportApi = {
  olish: (params: IncomeExpenseFilter) => getReport("/reports/income-expense", params),
  export: (params: IncomeExpenseFilter, exportTuri: ExportTuri) =>
    exportReport("/reports/income-expense", { ...params, export: exportTuri }),
};

// Audit sahifasi: GET /audit/logs
export async function auditLogsOlish(params: AuditFilter) {
  return (
    await apiClient.get<AuditLogsJavobi>("/audit/logs", {
      params: tozaParams(params),
    })
  ).data;
}

// Hisobot filter tanlovlari.
export async function hisobotTanlovlariniOlish() {
  const [products, warehouses, branches, categories, customers, suppliers] = await Promise.all([
    apiClient.get<Tanlov[]>("/catalog/products"),
    apiClient.get<Tanlov[]>("/organization/warehouses"),
    apiClient.get<Tanlov[]>("/organization/branches"),
    apiClient.get<Tanlov[]>("/catalog/categories"),
    apiClient.get<Tanlov[]>("/partners/customers"),
    apiClient.get<Tanlov[]>("/partners/suppliers"),
  ]);

  const modifications: Tanlov[] = [];
  await Promise.all(
    products.data.map(async (product) => {
      try {
        const response = await apiClient.get<Tanlov[]>(
          `/catalog/products/${product.id}/modifications`
        );
        modifications.push(
          ...response.data.map((item) => ({
            ...item,
            product: item.product ?? { id: product.id, name: product.name },
          }))
        );
      } catch {
        // Bitta mahsulot varianti olinmasa ham boshqa tanlovlarni ko'rsatamiz.
      }
    })
  );

  return {
    products: products.data,
    modifications,
    warehouses: warehouses.data,
    branches: branches.data,
    categories: categories.data,
    customers: customers.data,
    suppliers: suppliers.data,
  };
}
