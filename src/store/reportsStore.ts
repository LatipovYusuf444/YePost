import { create } from "zustand";
import {
  auditLogsOlish,
  counterpartyBalanceReportApi,
  hisobotTanlovlariniOlish,
  incomeExpenseReportApi,
  productProfitReportApi,
  stockMovementReportApi,
} from "@/api/reportsApi";
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

type Tanlovlar = {
  products: Tanlov[];
  modifications: Tanlov[];
  warehouses: Tanlov[];
  branches: Tanlov[];
  categories: Tanlov[];
  customers: Tanlov[];
  suppliers: Tanlov[];
};

type ReportsStore = {
  tanlovlar: Tanlovlar;
  stockMovement: HisobotJavobi | null;
  counterpartyBalance: HisobotJavobi | null;
  productProfit: HisobotJavobi | null;
  incomeExpense: HisobotJavobi | null;
  auditLogs: AuditLogsJavobi | null;
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string;
  tanlovlarniYuklash: () => Promise<void>;
  stockMovementYuklash: (params: StockMovementFilter) => Promise<void>;
  counterpartyBalanceYuklash: (params: CounterpartyBalanceFilter) => Promise<void>;
  productProfitYuklash: (params: ProductProfitFilter) => Promise<void>;
  incomeExpenseYuklash: (params: IncomeExpenseFilter) => Promise<void>;
  auditYuklash: (params: AuditFilter) => Promise<void>;
  hisobotExport: (
    turi: "stock" | "counterparty" | "profit" | "income",
    params:
      | StockMovementFilter
      | CounterpartyBalanceFilter
      | ProductProfitFilter
      | IncomeExpenseFilter,
    exportTuri: ExportTuri
  ) => Promise<void>;
  xatolikniTozalash: () => void;
};

const boshTanlovlar: Tanlovlar = {
  products: [],
  modifications: [],
  warehouses: [],
  branches: [],
  categories: [],
  customers: [],
  suppliers: [],
};

function xabar(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return "Hisobot ma'lumotlarini olishda xatolik yuz berdi.";
}

function faylYuklash(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nom;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const useReportsStore = create<ReportsStore>((set) => ({
  tanlovlar: boshTanlovlar,
  stockMovement: null,
  counterpartyBalance: null,
  productProfit: null,
  incomeExpense: null,
  auditLogs: null,
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: "",

  xatolikniTozalash: () => set({ xatolik: "" }),

  tanlovlarniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: "" });
    try {
      const tanlovlar = await hisobotTanlovlariniOlish();
      set({ tanlovlar });
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ yuklanmoqda: false });
    }
  },

  stockMovementYuklash: async (params) => {
    if (!params.modificationId) {
      set({ stockMovement: [], xatolik: "" });
      return;
    }
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      set({ stockMovement: await stockMovementReportApi.olish(params) });
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  counterpartyBalanceYuklash: async (params) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      set({ counterpartyBalance: await counterpartyBalanceReportApi.olish(params) });
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  productProfitYuklash: async (params) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      set({ productProfit: await productProfitReportApi.olish(params) });
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  incomeExpenseYuklash: async (params) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      set({ incomeExpense: await incomeExpenseReportApi.olish(params) });
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  auditYuklash: async (params) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      set({ auditLogs: await auditLogsOlish(params) });
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  hisobotExport: async (turi, params, exportTuri) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      const blob =
        turi === "stock"
          ? await stockMovementReportApi.export(params as StockMovementFilter, exportTuri)
          : turi === "counterparty"
            ? await counterpartyBalanceReportApi.export(
                params as CounterpartyBalanceFilter,
                exportTuri
              )
            : turi === "profit"
              ? await productProfitReportApi.export(params as ProductProfitFilter, exportTuri)
              : await incomeExpenseReportApi.export(params as IncomeExpenseFilter, exportTuri);
      faylYuklash(blob, `hisobot-${turi}.${exportTuri === "excel" ? "xlsx" : "pdf"}`);
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },
}));
