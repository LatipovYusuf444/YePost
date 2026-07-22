/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import apiClient from "@/api/axios";
import {
  auditLogsOlish,
  counterpartyBalanceReportApi,
  hisobotTanlovlariniOlish,
  incomeExpenseReportApi,
  productProfitReportApi,
  stockMovementReportApi,
} from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  AuditYozuvi,
  FoydaXarajatYozuvi,
  HisobKitobHujjati,
  KassaHujjati,
  KirimChiqim,
  Kontragent,
  MahsulotFoydasi,
  Maxsulot,
  Tanlov,
  TovarHarakati,
} from "./types";

type ApiTanlov = {
  id: string;
  productId?: string;
  name?: string;
  fullName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  categoryId?: string;
  branchId?: string | null;
  barcode?: string | null;
  article?: string | null;
  unit?: { name?: string; shortName?: string } | null;
  category?: { id?: string; name?: string } | null;
  product?: { id?: string; name?: string } | null;
  price?: {
    costPrice?: number | string;
    retailPrice?: number | string;
    wholesalePrice?: number | string;
  } | null;
  params?: Record<string, unknown> | null;
};

type MovementRow = {
  date?: string;
  type?: string;
  docNumber?: string;
  refId?: string;
  quantity?: number | string;
  price?: number | string | null;
};

type CounterpartySummary = { total?: number | string; paid?: number | string; debt?: number | string };
type ProfitRow = {
  productId?: string;
  productName?: string;
  qtySold?: number | string;
  revenue?: number | string;
  cost?: number | string;
  profit?: number | string;
};
type IncomeExpenseSummary = {
  saleRevenue?: number | string;
  saleProfit?: number | string;
  expenseTotal?: number | string;
  cashinTotal?: number | string;
  refundTotal?: number | string;
  netIncome?: number | string;
};
type TransactionRow = {
  id: string;
  source?: string;
  type?: "INCOME" | "EXPENSE";
  paymentType?: string;
  amount?: number | string;
  date?: string;
  note?: string;
  refDocNumber?: string;
};

type RealData = {
  yuklanmoqda: boolean;
  xato: string;
  maxsulotlar: Maxsulot[];
  omborlar: Tanlov[];
  filiallar: Tanlov[];
  kategoriyalar: Tanlov[];
  mijozlar: Tanlov[];
  kompaniyalar: Tanlov[];
  yetkazibBeruvchilar: Tanlov[];
  variatsiyalar: Tanlov[];
  xarakteristikalar: Tanlov[];
  tovarHarakati: TovarHarakati[];
  kontragentlar: Kontragent[];
  hisobKitob: HisobKitobHujjati[];
  mahsulotFoydasi: MahsulotFoydasi[];
  foydaXarajat: FoydaXarajatYozuvi[];
  kirimChiqim: KirimChiqim[];
  kassaHujjatlar: KassaHujjati[];
  audit: AuditYozuvi[];
};

const boshData: RealData = {
  yuklanmoqda: true,
  xato: "",
  maxsulotlar: [],
  omborlar: [],
  filiallar: [],
  kategoriyalar: [],
  mijozlar: [],
  kompaniyalar: [],
  yetkazibBeruvchilar: [],
  variatsiyalar: [],
  xarakteristikalar: [],
  tovarHarakati: [],
  kontragentlar: [],
  hisobKitob: [],
  mahsulotFoydasi: [],
  foydaXarajat: [],
  kirimChiqim: [],
  kassaHujjatlar: [],
  audit: [],
};

const HisobotContext = createContext<RealData>(boshData);
const number = (value: unknown) => Number(value ?? 0) || 0;
const tanlov = (item: ApiTanlov): Tanlov => ({
  id: item.id,
  nomi:
    item.name ??
    item.fullName ??
    [item.firstName, item.lastName].filter(Boolean).join(" ") ??
    item.username ??
    item.id,
});

function movementType(type = ""): TovarHarakati["hujjatTuri"] {
  if (["PURCHASE", "RETURN", "TRANSFER_IN"].includes(type)) return "kirim";
  if (type === "STOCK_TAKE") return "inventarizatsiya";
  if (type === "SALE") return "realizatsiya";
  return "chiqim";
}

function list<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.value)) return record.value as T[];
  }
  return value && typeof value === "object" ? [value as T] : [];
}

export function HisobotRealDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RealData>(boshData);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const selections = await hisobotTanlovlariniOlish();
        const products = selections.products as ApiTanlov[];
        const modifications = selections.modifications as ApiTanlov[];
        const warehouses = selections.warehouses as ApiTanlov[];
        const branches = selections.branches as ApiTanlov[];
        const categories = selections.categories as ApiTanlov[];
        const customers = selections.customers as ApiTanlov[];
        const suppliers = selections.suppliers as ApiTanlov[];
        const companies = selections.companies as ApiTanlov[];

        const movementRequests = modifications.flatMap((modification) => {
          const targets = warehouses.length ? warehouses : [null];
          return targets.map(async (warehouse) => ({
            modification,
            warehouse,
            rows: list<MovementRow>(
              await stockMovementReportApi.olish({
                modificationId: modification.id,
                warehouseId: warehouse?.id,
              })
            ),
          }));
        });

        const [movementGroups, balances, profitRaw, incomeRaw, auditRaw, transactionsResponse] =
          await Promise.all([
            Promise.all(movementRequests),
            Promise.all([
              ...customers.map(async (item) => ({
                item,
                turi: "mijoz" as const,
                summary: (await counterpartyBalanceReportApi.olish({ customerId: item.id })) as CounterpartySummary,
              })),
              ...suppliers.map(async (item) => ({
                item,
                turi: "yetkazibBeruvchi" as const,
                summary: (await counterpartyBalanceReportApi.olish({ supplierId: item.id })) as CounterpartySummary,
              })),
            ]),
            productProfitReportApi.olish({}),
            incomeExpenseReportApi.olish({}),
            auditLogsOlish({ page: 1, pageSize: 100 }),
            apiClient.get("/finance/transactions", { params: { page: 1, pageSize: 100 } }),
          ]);

        const maxsulotlar: Maxsulot[] = products.map((product) => {
          const modification = modifications.find((item) => item.product?.id === product.id);
          return {
            id: product.id,
            nomi: product.name ?? product.id,
            categoryId: product.category?.id ?? product.categoryId ?? "",
            boshQoldiq: 0,
            barkod: modification?.barcode ?? product.barcode ?? "",
            artikul: modification?.article ?? product.article ?? "",
            birlik: product.unit?.shortName ?? product.unit?.name ?? "",
            tanNarx: number(modification?.price?.costPrice),
            sotuvNarx: number(modification?.price?.retailPrice),
            ulgurjiNarx: number(modification?.price?.wholesalePrice),
          };
        });

        const tovarHarakati: TovarHarakati[] = movementGroups.flatMap(
          ({ modification, warehouse, rows }) =>
            rows.map((row, index) => ({
              id: `${modification.id}-${warehouse?.id ?? "all"}-${row.refId ?? index}-${row.date ?? index}-${row.type ?? ""}`,
              sana: row.date ?? "",
              hujjatTuri: movementType(row.type),
              hujjatRaqam: row.docNumber ?? row.refId ?? "",
              productId: modification.product?.id ?? "",
              xarakteristikaId: modification.id,
              categoryId:
                products.find((product) => product.id === modification.product?.id)?.category?.id ?? "",
              warehouseId: warehouse?.id ?? "",
              filialId: warehouse?.branchId ?? "",
              miqdor: Math.abs(number(row.quantity)),
              customerId: "",
              supplierId: "",
            }))
        );

        const kontragentlar: Kontragent[] = balances.map(({ item, turi }) => ({
          refId: item.id,
          turi,
        }));
        const hisobKitob: HisobKitobHujjati[] = balances.map(({ item, turi, summary }) => ({
          id: `balance-${item.id}`,
          refId: item.id,
          sana: new Date().toISOString(),
          hujjat: turi === "mijoz" ? "Backend mijoz balansi" : "Backend ta'minotchi balansi",
          turi: turi === "mijoz" ? "realizatsiya" : "xarid",
          prixod: number(summary.paid),
          rasxod: number(summary.total),
        }));

        const mahsulotFoydasi: MahsulotFoydasi[] = list<ProfitRow>(profitRaw).map((row, index) => ({
          id: row.productId ?? `profit-${index}`,
          mahsulot: row.productName ?? "Mahsulot",
          categoryId: products.find((item) => item.id === row.productId)?.category?.id ?? "",
          sotilgan: number(row.qtySold),
          tushum: number(row.revenue),
          tannarx: number(row.cost),
          foyda: number(row.profit),
        }));

        const income = incomeRaw as IncomeExpenseSummary;
        const today = new Date().toISOString();
        const foydaXarajat: FoydaXarajatYozuvi[] = [
          { id: "saleRevenue", sana: today, filialId: "", tur: "daromad", kategoriya: "Savdo tushumi", summa: number(income.saleRevenue) },
          { id: "saleCost", sana: today, filialId: "", tur: "tannarx", kategoriya: "Sotilgan tovar tannarxi", summa: number(income.saleRevenue) - number(income.saleProfit) },
          { id: "expenseTotal", sana: today, filialId: "", tur: "xarajat", kategoriya: "Xarajatlar", summa: number(income.expenseTotal) + number(income.refundTotal) },
        ];

        const transactionEnvelope = transactionsResponse.data as { data?: TransactionRow[] } | TransactionRow[];
        const transactionRows = Array.isArray(transactionEnvelope)
          ? transactionEnvelope
          : transactionEnvelope.data ?? [];
        const kirimChiqim: KirimChiqim[] = transactionRows.map((row) => ({
          id: row.id,
          sana: row.date ?? "",
          branchId: "",
          kassaId: row.paymentType ?? "",
          turi: row.type === "EXPENSE" ? "chiqim" : "kirim",
          kategoriya: row.source ?? "",
          summa: number(row.amount),
        }));
        const kassaHujjatlar: KassaHujjati[] = transactionRows.map((row) => ({
          id: row.id,
          sana: row.date ?? "",
          raqam: row.refDocNumber ?? row.id,
          nomi: row.source ?? "Moliyaviy amaliyot",
          branchId: "",
          kassaId: row.paymentType ?? "",
          tolovTuri: row.paymentType ?? "",
          turi: row.type === "EXPENSE" ? "chiqim" : "kirim",
          summa: number(row.amount),
        }));

        const audit: AuditYozuvi[] = auditRaw.items.map((row, index) => ({
          id: row.id ?? `audit-${index}`,
          sana: row.createdAt ?? row.timestamp ?? "",
          foydalanuvchi: row.user?.fullName ?? row.user?.username ?? "Tizim",
          action: row.action === "UPDATE" || row.action === "DELETE" ? row.action : "CREATE",
          resurs: row.resource ?? "",
          tafsilot: JSON.stringify(row.meta ?? row.after ?? row.before ?? {}),
        }));

        const params = modifications.flatMap((item) =>
          Object.entries(item.params ?? {}).map(([key, value]) => ({ id: `${key}:${String(value)}`, nomi: `${key}: ${String(value)}` }))
        );

        if (!active) return;
        setData({
          yuklanmoqda: false,
          xato: "",
          maxsulotlar,
          omborlar: warehouses.map(tanlov),
          filiallar: branches.map(tanlov),
          kategoriyalar: categories.map(tanlov),
          mijozlar: customers.map(tanlov),
          kompaniyalar: companies.map(tanlov),
          yetkazibBeruvchilar: suppliers.map(tanlov),
          variatsiyalar: modifications.map((item) => ({ id: item.id, nomi: item.name ?? item.id })),
          xarakteristikalar: Array.from(new Map(params.map((item) => [item.id, item])).values()),
          tovarHarakati,
          kontragentlar,
          hisobKitob,
          mahsulotFoydasi,
          foydaXarajat,
          kirimChiqim,
          kassaHujjatlar,
          audit,
        });
      } catch (error) {
        if (active) setData((current) => ({ ...current, yuklanmoqda: false, xato: getApiErrorMessage(error) }));
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => data, [data]);
  return <HisobotContext.Provider value={value}>{children}</HisobotContext.Provider>;
}

export function useHisobotRealData() {
  return useContext(HisobotContext);
}
