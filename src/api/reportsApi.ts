import apiClient from "./axios";
import { getApiErrorMessage } from "./sozlamalarApi";
import type {
  AuditFilter,
  AuditLog,
  AuditLogsJavobi,
  CounterpartyBalanceFilter,
  ExportTuri,
  HisobotJavobi,
  IncomeExpenseFilter,
  ProductProfitFilter,
  StockMovementFilter,
  Tanlov,
} from "@/types/reports";

type RoyxatJavobi<T> = T[] | { value?: T[]; items?: T[]; results?: T[]; data?: T[] };

function tozaParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null)
  );
}

function royxatniAjratish<T>(data: RoyxatJavobi<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.value ?? data.items ?? data.results ?? data.data ?? [];
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
  const response = await apiClient.get<AuditLogsJavobi | RoyxatJavobi<AuditLog>>("/audit/logs", {
      params: tozaParams(params),
    });
  const data = response.data;

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? data.length,
      totalPages: 1,
    };
  }

  if ("items" in data || "results" in data || "data" in data || "value" in data) {
    const items = royxatniAjratish(data as RoyxatJavobi<AuditLog>);
    const meta = data as Record<string, unknown>;
    const pageSize = Number(meta.pageSize ?? meta.limit ?? params.pageSize ?? items.length);
    const total = Number(meta.total ?? meta.count ?? items.length);

    return {
      items,
      total,
      page: Number(meta.page ?? params.page ?? 1),
      pageSize,
      totalPages: Number(meta.totalPages ?? Math.max(1, Math.ceil(total / (pageSize || 1)))),
    };
  }

  return {
    items: [],
    total: 0,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    totalPages: 1,
  };
}

// Hisobot filter tanlovlari.
export async function hisobotTanlovlariniOlish() {
  const [products, warehouses, branches, categories, customers, suppliers] = await Promise.all([
    apiClient.get<RoyxatJavobi<Tanlov>>("/catalog/products"),
    apiClient.get<RoyxatJavobi<Tanlov>>("/organization/warehouses"),
    apiClient.get<RoyxatJavobi<Tanlov>>("/organization/branches"),
    apiClient.get<RoyxatJavobi<Tanlov>>("/catalog/categories"),
    apiClient.get<RoyxatJavobi<Tanlov>>("/partners/customers"),
    apiClient.get<RoyxatJavobi<Tanlov>>("/partners/suppliers"),
  ]);

  const productRows = royxatniAjratish(products.data);
  const modifications: Tanlov[] = [];
  await Promise.all(
    productRows.map(async (product) => {
      try {
        const response = await apiClient.get<RoyxatJavobi<Tanlov>>(
          `/catalog/products/${product.id}/modifications`
        );
        const rows = royxatniAjratish(response.data);
        modifications.push(
          ...rows.map((item) => ({
            ...item,
            product: item.product ?? { id: product.id, name: product.name },
          }))
        );
      } catch (error) {
        console.warn(getApiErrorMessage(error));
        // Bitta mahsulot varianti olinmasa ham boshqa tanlovlarni ko'rsatamiz.
      }
    })
  );

  return {
    products: productRows,
    modifications,
    warehouses: royxatniAjratish(warehouses.data),
    branches: royxatniAjratish(branches.data),
    categories: royxatniAjratish(categories.data),
    customers: royxatniAjratish(customers.data),
    suppliers: royxatniAjratish(suppliers.data),
  };
}
