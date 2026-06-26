import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Download,
  FileClock,
  LoaderCircle,
  RefreshCw,
  Search,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useReportsStore } from "@/store/reportsStore";
import type {
  AuditFilter,
  AuditLog,
  CounterpartyBalanceFilter,
  HisobotJavobi,
  IncomeExpenseFilter,
  ProductProfitFilter,
  StockMovementFilter,
  Tanlov,
} from "@/types/reports";

type Tab = "stock" | "counterparty" | "profit" | "income" | "audit";

const tablar: Array<{ id: Tab; nom: string; icon: typeof BarChart3 }> = [
  { id: "stock", nom: "Tovar harakati", icon: Activity },
  { id: "counterparty", nom: "Kontragent balansi", icon: UsersRound },
  { id: "profit", nom: "Mahsulot foydasi", icon: TrendingUp },
  { id: "income", nom: "Kirim-chiqim", icon: WalletCards },
  { id: "audit", nom: "Audit loglari", icon: FileClock },
];

function bugunMinus(kun: number) {
  const date = new Date();
  date.setDate(date.getDate() - kun);
  return date.toISOString().slice(0, 10);
}

function pul(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return String(value ?? "—");
  return `${number.toLocaleString("uz-UZ")} so'm`;
}

function nom(item?: Tanlov) {
  if (!item) return "";
  return item.name ?? item.fullName ?? item.username ?? item.id;
}

function formatKey(key: string) {
  const map: Record<string, string> = {
    total: "Jami",
    paid: "To'langan",
    debt: "Qarz",
    saleRevenue: "Sotuv tushumi",
    saleProfit: "Sotuv foydasi",
    expenseTotal: "Xarajatlar",
    cashinTotal: "Kassa kirimi",
    netIncome: "Sof daromad",
  };
  return map[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function valuesFromResponse(data: HisobotJavobi | null): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data && "value" in data) {
    const value = (data as { value?: unknown }).value;
    return Array.isArray(value) ? value : [];
  }
  return [];
}

export default function Hisobotlar() {
  const store = useReportsStore();
  const tanlovlarniYuklash = store.tanlovlarniYuklash;
  const [tab, setTab] = useState<Tab>("income");
  const [dateFrom, setDateFrom] = useState(bugunMinus(30));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [modificationId, setModificationId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditResource, setAuditResource] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  useEffect(() => {
    void tanlovlarniYuklash();
  }, [tanlovlarniYuklash]);

  const stockParams: StockMovementFilter = useMemo(
    () => ({ modificationId, warehouseId, dateFrom, dateTo }),
    [dateFrom, dateTo, modificationId, warehouseId]
  );
  const counterpartyParams: CounterpartyBalanceFilter = useMemo(
    () => ({ customerId, supplierId }),
    [customerId, supplierId]
  );
  const profitParams: ProductProfitFilter = useMemo(
    () => ({ categoryId, dateFrom, dateTo }),
    [categoryId, dateFrom, dateTo]
  );
  const incomeParams: IncomeExpenseFilter = useMemo(
    () => ({ branchId, dateFrom, dateTo }),
    [branchId, dateFrom, dateTo]
  );
  const auditParams: AuditFilter = useMemo(
    () => ({
      action: auditAction,
      resource: auditResource,
      dateFrom,
      dateTo,
      page: auditPage,
      pageSize: 20,
    }),
    [auditAction, auditPage, auditResource, dateFrom, dateTo]
  );

  async function yuklash() {
    if (tab === "stock") await store.stockMovementYuklash(stockParams);
    else if (tab === "counterparty") await store.counterpartyBalanceYuklash(counterpartyParams);
    else if (tab === "profit") await store.productProfitYuklash(profitParams);
    else if (tab === "income") await store.incomeExpenseYuklash(incomeParams);
    else await store.auditYuklash(auditParams);
  }

  useEffect(() => {
    void yuklash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, auditPage]);

  const joriyHisobot =
    tab === "stock"
      ? store.stockMovement
      : tab === "counterparty"
        ? store.counterpartyBalance
        : tab === "profit"
          ? store.productProfit
          : tab === "income"
            ? store.incomeExpense
            : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">
            Hisobot va audit
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">
            Real backend hisobotlari
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Tovar harakati, kontragent balansi, foyda, kirim-chiqim va tizim loglari.
          </p>
        </div>
        <button
          onClick={() => void yuklash()}
          disabled={store.amalBajarilmoqda}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={17} className={store.amalBajarilmoqda ? "animate-spin" : ""} />
          Yangilash
        </button>
      </header>

      {store.xatolik && (
        <div className="flex justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button onClick={store.xatolikniTozalash}>Yopish</button>
        </div>
      )}

      <nav className="grid gap-3 xl:grid-cols-5 md:grid-cols-2">
        {tablar.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setAuditPage(1);
              }}
              className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 ${
                active
                  ? "border-orange-200 bg-orange-500 text-white shadow-lg shadow-orange-200"
                  : "border-orange-100 bg-white text-gray-700 hover:bg-orange-50"
              }`}
            >
              <Icon size={22} className={active ? "text-white" : "text-orange-500"} />
              <p className="mt-3 font-black">{item.nom}</p>
            </button>
          );
        })}
      </nav>

      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        <HisobotFilterlar
          tab={tab}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          modificationId={modificationId}
          setModificationId={setModificationId}
          warehouseId={warehouseId}
          setWarehouseId={setWarehouseId}
          customerId={customerId}
          setCustomerId={setCustomerId}
          supplierId={supplierId}
          setSupplierId={setSupplierId}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          branchId={branchId}
          setBranchId={setBranchId}
          auditAction={auditAction}
          setAuditAction={setAuditAction}
          auditResource={auditResource}
          setAuditResource={setAuditResource}
          onApply={() => void yuklash()}
        />
      </section>

      {tab !== "audit" && (
        <div className="flex flex-wrap justify-end gap-2">
          <ExportButton
            label="Excel"
            onClick={() =>
              void store.hisobotExport(
                tab,
                tab === "stock"
                  ? stockParams
                  : tab === "counterparty"
                    ? counterpartyParams
                    : tab === "profit"
                      ? profitParams
                      : incomeParams,
                "excel"
              )
            }
          />
          <ExportButton
            label="PDF"
            onClick={() =>
              void store.hisobotExport(
                tab,
                tab === "stock"
                  ? stockParams
                  : tab === "counterparty"
                    ? counterpartyParams
                    : tab === "profit"
                      ? profitParams
                      : incomeParams,
                "pdf"
              )
            }
          />
        </div>
      )}

      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        {store.amalBajarilmoqda ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={34} />
          </div>
        ) : tab === "audit" ? (
          <AuditTable
            logs={store.auditLogs?.items ?? []}
            page={store.auditLogs?.page ?? auditPage}
            totalPages={store.auditLogs?.totalPages ?? 1}
            total={store.auditLogs?.total ?? 0}
            onPage={setAuditPage}
          />
        ) : (
          <HisobotNatija data={joriyHisobot} />
        )}
      </section>
    </div>
  );
}

function HisobotFilterlar(props: {
  tab: Tab;
  dateFrom: string;
  dateTo: string;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  modificationId: string;
  setModificationId: (value: string) => void;
  warehouseId: string;
  setWarehouseId: (value: string) => void;
  customerId: string;
  setCustomerId: (value: string) => void;
  supplierId: string;
  setSupplierId: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  branchId: string;
  setBranchId: (value: string) => void;
  auditAction: string;
  setAuditAction: (value: string) => void;
  auditResource: string;
  setAuditResource: (value: string) => void;
  onApply: () => void;
}) {
  const tanlovlar = useReportsStore((state) => state.tanlovlar);
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {props.tab !== "counterparty" && (
        <>
          <Input label="Boshlanish sanasi" type="date" value={props.dateFrom} onChange={props.setDateFrom} />
          <Input label="Tugash sanasi" type="date" value={props.dateTo} onChange={props.setDateTo} />
        </>
      )}

      {props.tab === "stock" && (
        <>
          <Select label="Mahsulot varianti *" value={props.modificationId} onChange={props.setModificationId}>
            <option value="">Variant tanlang</option>
            {tanlovlar.modifications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product?.name ? `${item.product.name} — ` : ""}
                {nom(item)}
                {item.barcode ? ` (${item.barcode})` : ""}
              </option>
            ))}
          </Select>
          <Select label="Ombor" value={props.warehouseId} onChange={props.setWarehouseId}>
            <option value="">Barcha omborlar</option>
            {tanlovlar.warehouses.map((item) => (
              <option key={item.id} value={item.id}>
                {nom(item)}
              </option>
            ))}
          </Select>
        </>
      )}

      {props.tab === "counterparty" && (
        <>
          <Select label="Mijoz" value={props.customerId} onChange={props.setCustomerId}>
            <option value="">Mijoz tanlanmagan</option>
            {tanlovlar.customers.map((item) => (
              <option key={item.id} value={item.id}>
                {nom(item)}
              </option>
            ))}
          </Select>
          <Select label="Yetkazib beruvchi" value={props.supplierId} onChange={props.setSupplierId}>
            <option value="">Yetkazib beruvchi tanlanmagan</option>
            {tanlovlar.suppliers.map((item) => (
              <option key={item.id} value={item.id}>
                {nom(item)}
              </option>
            ))}
          </Select>
        </>
      )}

      {props.tab === "profit" && (
        <Select label="Kategoriya" value={props.categoryId} onChange={props.setCategoryId}>
          <option value="">Barcha kategoriyalar</option>
          {tanlovlar.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {nom(item)}
            </option>
          ))}
        </Select>
      )}

      {props.tab === "income" && (
        <Select label="Filial" value={props.branchId} onChange={props.setBranchId}>
          <option value="">Barcha filiallar</option>
          {tanlovlar.branches.map((item) => (
            <option key={item.id} value={item.id}>
              {nom(item)}
            </option>
          ))}
        </Select>
      )}

      {props.tab === "audit" && (
        <>
          <Select label="Amal turi" value={props.auditAction} onChange={props.setAuditAction}>
            <option value="">Barchasi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </Select>
          <Input
            label="Resurs"
            value={props.auditResource}
            onChange={props.setAuditResource}
            placeholder="Masalan: Product"
          />
        </>
      )}

      <div className="flex items-end">
        <button
          onClick={props.onApply}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white"
        >
          <Search size={17} />
          Ko'rish
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-bold text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 outline-none focus:border-orange-400"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-bold text-gray-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 outline-none focus:border-orange-400"
      >
        {children}
      </select>
    </label>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm"
    >
      <Download size={16} />
      {label} yuklash
    </button>
  );
}

function HisobotNatija({ data }: { data: HisobotJavobi | null }) {
  const rows = valuesFromResponse(data);

  if (!data) {
    return <Empty text="Hisobotni ko'rish uchun filterlarni tanlang." />;
  }

  if (!Array.isArray(data) && typeof data === "object" && data && rows.length === 0) {
    const entries = Object.entries(data as Record<string, unknown>).filter(
      ([key]) => key !== "value" && key !== "Count"
    );
    if (entries.length > 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {entries.map(([key, value]) => (
            <article key={key} className="rounded-2xl bg-orange-50 p-5">
              <p className="text-sm font-bold text-orange-600">{formatKey(key)}</p>
              <h3 className="mt-2 text-2xl font-black text-gray-950">
                {typeof value === "number" ? pul(value) : String(value ?? "—")}
              </h3>
            </article>
          ))}
        </div>
      );
    }
  }

  if (rows.length === 0) return <Empty text="Hisobot bo'yicha ma'lumot topilmadi." />;

  const objectRows = rows.filter((item) => typeof item === "object" && item) as Record<
    string,
    unknown
  >[];
  const columns = Array.from(new Set(objectRows.flatMap((item) => Object.keys(item)))).slice(0, 8);

  return (
    <div className="overflow-x-auto rounded-2xl border border-orange-100">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-5 py-4">
                {formatKey(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100/70">
          {objectRows.map((row, index) => (
            <tr key={index} className="hover:bg-orange-50/50">
              {columns.map((column) => (
                <td key={column} className="px-5 py-4">
                  {renderValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({
  logs,
  page,
  totalPages,
  total,
  onPage,
}: {
  logs: AuditLog[];
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-500">Jami loglar: {total}</p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="h-9 rounded-xl bg-gray-100 px-3 text-sm font-bold disabled:opacity-40"
          >
            Oldingi
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className="h-9 rounded-xl bg-orange-500 px-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Keyingi
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <Empty text="Audit loglari mavjud emas." />
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => (
            <article
              key={log.id ?? index}
              className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <p className="font-black text-gray-950">
                    {String(log.action ?? "ACTION")} — {String(log.resource ?? "Resource")}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Foydalanuvchi: {log.user?.fullName ?? log.user?.username ?? String(log.userId ?? "—")}
                  </p>
                </div>
                <p className="text-sm font-bold text-orange-600">
                  {new Date(String(log.createdAt ?? log.timestamp ?? Date.now())).toLocaleString("uz-UZ")}
                </p>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-bold text-gray-500">
                  Batafsil JSON
                </summary>
                <pre className="scrollbar-hidden mt-3 max-h-64 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-white">
                  {JSON.stringify(log, null, 2)}
                </pre>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 text-center">
      <div>
        <BarChart3 className="mx-auto text-orange-300" size={42} />
        <p className="mt-3 font-bold text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("uz-UZ") : "—";
  if (typeof value === "object") {
    const obj = value as { name?: string; fullName?: string; id?: string };
    return obj.name ?? obj.fullName ?? obj.id ?? JSON.stringify(value);
  }
  return String(value);
}
