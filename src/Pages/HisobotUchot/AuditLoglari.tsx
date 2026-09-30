import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileClock,
  Info,
  LogIn,
  LogOut,
  PencilLine,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { auditLogsOlish } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { AuditLog } from "@/types/reports";
import YuklanmoqdaHolati from "./YuklanmoqdaHolati";
import { bugun, bugunMinus, vaqtFormat } from "./yordamchilar";

// Audit loglari: tizimda kim, qachon, nima qilganini ko'rsatadigan nazorat jurnali.
const PAGE_SIZE = 20;

type Amal = { nom: string; fel: string; icon: LucideIcon; ton: string; nuqta: string };

const AMALLAR: Record<string, Amal> = {
  CREATE: { nom: "Yaratildi", fel: "yaratildi", icon: FilePlus2, ton: "bg-emerald-50 text-emerald-600", nuqta: "bg-emerald-500" },
  UPDATE: { nom: "O‘zgartirildi", fel: "o‘zgartirildi", icon: PencilLine, ton: "bg-amber-50 text-amber-600", nuqta: "bg-amber-500" },
  DELETE: { nom: "O‘chirildi", fel: "o‘chirildi", icon: Trash2, ton: "bg-red-50 text-red-500", nuqta: "bg-red-500" },
  LOGIN: { nom: "Tizimga kirdi", fel: "tizimga kirdi", icon: LogIn, ton: "bg-blue-50 text-blue-600", nuqta: "bg-blue-500" },
  LOGOUT: { nom: "Tizimdan chiqdi", fel: "tizimdan chiqdi", icon: LogOut, ton: "bg-slate-100 text-slate-500", nuqta: "bg-slate-400" },
};
const NOMA_LUM_AMAL: Amal = { nom: "Amal", fel: "amal bajarildi", icon: Info, ton: "bg-slate-100 text-slate-500", nuqta: "bg-slate-400" };

const RESURSLAR: Record<string, string> = {
  CashOperation: "Kassa amaliyoti",
  Sale: "Sotuv",
  SaleItem: "Sotuv tovari",
  SaleReturn: "Sotuv qaytarish",
  Product: "Mahsulot",
  ProductVariant: "Mahsulot varianti",
  Category: "Kategoriya",
  Customer: "Xaridor",
  Supplier: "Yetkazib beruvchi",
  Partner: "Hamkor",
  Company: "Kompaniya",
  User: "Foydalanuvchi",
  Employee: "Xodim",
  Warehouse: "Ombor",
  Branch: "Filial",
  Stock: "Ombor qoldig‘i",
  StockMovement: "Tovar harakati",
  Inventory: "Inventarizatsiya",
  InventoryCount: "Inventarizatsiya",
  Receipt: "Kirim",
  Purchase: "Xarid",
  Payment: "To‘lov",
  Expense: "Xarajat",
  Discount: "Chegirma",
  Order: "Buyurtma",
  Workspace: "Ish maydoni",
  Auth: "Autentifikatsiya",
};

const MAYDONLAR: Record<string, string> = {
  id: "ID",
  name: "Nomi",
  title: "Sarlavha",
  type: "Turi",
  status: "Holati",
  amount: "Summa",
  total: "Jami",
  price: "Narx",
  quantity: "Miqdor",
  qty: "Miqdor",
  channel: "To‘lov kanali",
  method: "Usul",
  note: "Izoh",
  comment: "Izoh",
  phone: "Telefon",
  email: "Email",
  username: "Login",
  fullName: "F.I.SH.",
  role: "Rol",
  category: "Kategoriya",
  currency: "Valyuta",
  date: "Sana",
  warehouseId: "Ombor",
  branchId: "Filial",
  customerId: "Xaridor",
  supplierId: "Yetkazib beruvchi",
  userId: "Foydalanuvchi",
};

function resursNomi(resurs: string) {
  if (!resurs) return "Noma’lum obyekt";
  return RESURSLAR[resurs] ?? resurs.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function maydonNomi(kalit: string) {
  return MAYDONLAR[kalit] ?? kalit.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

function qiymatMatni(kalit: string, qiymat: unknown): string {
  if (qiymat === null || qiymat === undefined || qiymat === "") return "—";
  if (typeof qiymat === "boolean") return qiymat ? "Ha" : "Yo‘q";
  if (typeof qiymat === "number") return /amount|total|price|sum/i.test(kalit) ? `${qiymat.toLocaleString("uz-UZ")} so‘m` : qiymat.toLocaleString("uz-UZ");
  if (typeof qiymat === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(qiymat)) return vaqtFormat(qiymat);
    return qiymat;
  }
  return JSON.stringify(qiymat);
}

function oddiyObyekt(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

type Ozgarish = { kalit: string; oldin?: unknown; keyin?: unknown };

// Yozuvdagi o'zgarishlarni ko'rsatish uchun: UPDATE — oldin/keyin farqi, qolganlari — mavjud qiymatlar.
function ozgarishlar(log: AuditLog): Ozgarish[] {
  const oldin = oddiyObyekt(log.before);
  const keyin = oddiyObyekt(log.after) ?? oddiyObyekt(log.meta);
  const chiqar: Ozgarish[] = [];

  if (oldin && keyin) {
    for (const kalit of Object.keys({ ...oldin, ...keyin })) {
      if (JSON.stringify(oldin[kalit]) !== JSON.stringify(keyin[kalit])) chiqar.push({ kalit, oldin: oldin[kalit], keyin: keyin[kalit] });
    }
    return chiqar;
  }

  const manba = keyin ?? oldin;
  if (!manba) return [];
  return Object.entries(manba)
    .filter(([, value]) => value !== null && typeof value !== "object")
    .map(([kalit, value]) => ({ kalit, keyin: value }));
}

function nisbiVaqt(sana: string) {
  const vaqt = new Date(sana).getTime();
  if (Number.isNaN(vaqt)) return "";
  const daqiqa = Math.round((Date.now() - vaqt) / 60000);
  if (daqiqa < 1) return "hozirgina";
  if (daqiqa < 60) return `${daqiqa} daqiqa oldin`;
  const soat = Math.round(daqiqa / 60);
  if (soat < 24) return `${soat} soat oldin`;
  const kun = Math.round(soat / 24);
  return kun < 31 ? `${kun} kun oldin` : "";
}

type Filter = { dateFrom: string; dateTo: string; action: string; resource: string };
const BOSH_FILTER: Filter = { dateFrom: bugunMinus(30), dateTo: bugun(), action: "", resource: "" };

const AMAL_FILTRLARI = [
  { qiymat: "", nom: "Barchasi" },
  { qiymat: "CREATE", nom: "Yaratildi" },
  { qiymat: "UPDATE", nom: "O‘zgartirildi" },
  { qiymat: "DELETE", nom: "O‘chirildi" },
];

export default function AuditLoglari() {
  const [filter, setFilter] = useState<Filter>(BOSH_FILTER);
  const [resursMatni, setResursMatni] = useState("");
  const [page, setPage] = useState(1);
  const [loglar, setLoglar] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [ochiq, setOchiq] = useState<string | null>(null);

  // Resurs qidiruvi yozib bo'lingandan keyin qo'llanadi.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((old) => (old.resource === resursMatni.trim() ? old : { ...old, resource: resursMatni.trim() }));
      setPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [resursMatni]);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    auditLogsOlish({
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      action: filter.action || undefined,
      resource: filter.resource || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;
        // Eng oxirgi o'zgarishlar tepada chiqadi.
        setLoglar([...result.items].sort((a, b) => Date.parse(b.createdAt ?? b.timestamp ?? "") - Date.parse(a.createdAt ?? a.timestamp ?? "") || 0));
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages));
      })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [filter, page]);

  function ozgartir<K extends keyof Filter>(kalit: K, qiymat: Filter[K]) {
    setFilter((old) => ({ ...old, [kalit]: qiymat }));
    setPage(1);
  }

  function tozalash() {
    setFilter(BOSH_FILTER);
    setResursMatni("");
    setPage(1);
  }

  const filtrOzgargan = useMemo(
    () => filter.action !== "" || filter.resource !== "" || filter.dateFrom !== BOSH_FILTER.dateFrom || filter.dateTo !== BOSH_FILTER.dateTo,
    [filter]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
          <p className="font-medium leading-6">
            Bu yerda tizimdagi barcha muhim amallar yozib boriladi: kim, qachon, nimani yaratdi, o‘zgartirdi yoki o‘chirdi.
            Kassa, sotuv va boshqa bo‘limlardagi harakatlarni tekshirish uchun foydalaning.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Maydon nom="Boshlanish sanasi">
            <input
              type="date"
              value={filter.dateFrom}
              max={filter.dateTo}
              onChange={(event) => ozgartir("dateFrom", event.target.value)}
              className={maydonKlass}
            />
          </Maydon>
          <Maydon nom="Tugash sanasi">
            <input
              type="date"
              value={filter.dateTo}
              min={filter.dateFrom}
              onChange={(event) => ozgartir("dateTo", event.target.value)}
              className={maydonKlass}
            />
          </Maydon>
          <Maydon nom="Obyekt (resurs)" className="sm:col-span-2">
            <input
              list="audit-resurslar"
              value={resursMatni}
              onChange={(event) => setResursMatni(event.target.value)}
              placeholder="Masalan: Product, Sale, CashOperation"
              className={maydonKlass}
            />
            <datalist id="audit-resurslar">
              {Object.entries(RESURSLAR).map(([kalit, nom]) => (
                <option key={kalit} value={kalit}>{nom}</option>
              ))}
            </datalist>
          </Maydon>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Amal turi">
            {AMAL_FILTRLARI.map((item) => (
              <button
                key={item.qiymat || "all"}
                type="button"
                onClick={() => ozgartir("action", item.qiymat)}
                aria-pressed={filter.action === item.qiymat}
                className={`h-10 rounded-full px-4 text-sm font-bold transition ${
                  filter.action === item.qiymat
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.nom}
              </button>
            ))}
          </div>
          {filtrOzgargan && (
            <button
              type="button"
              onClick={tozalash}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
            >
              <RotateCcw size={14} />
              Tozalash
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-orange-100 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileClock size={19} /></span>
            <div>
              <h3 className="font-black text-slate-800">Amallar tarixi</h3>
              <p className="text-xs font-semibold text-slate-400">Jami yozuvlar: {total.toLocaleString("uz-UZ")}</p>
            </div>
          </div>
        </header>

        {xato && <p className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

        {yuklanmoqda ? (
          <YuklanmoqdaHolati />
        ) : loglar.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FileClock size={26} /></span>
            <p className="font-bold text-slate-500">Tanlangan davrda amallar topilmadi</p>
            <p className="text-sm text-slate-400">Sana oralig‘ini yoki filtrlarni o‘zgartirib ko‘ring.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="w-16 pl-5 text-center font-black text-slate-500">№</TableHead>
                <TableHead className="font-black text-slate-500">Amal</TableHead>
                <TableHead className="font-black text-slate-500">Obyekt</TableHead>
                <TableHead className="font-black text-slate-500">Foydalanuvchi</TableHead>
                <TableHead className="font-black text-slate-500">Sana va vaqt</TableHead>
                <TableHead className="w-36 pr-5 text-right font-black text-slate-500">Tafsilot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loglar.map((log, index) => {
                const id = log.id ?? `audit-${page}-${index}`;
                const amal = AMALLAR[String(log.action ?? "").toUpperCase()] ?? NOMA_LUM_AMAL;
                const Ikonka = amal.icon;
                const foydalanuvchi = log.user?.fullName || log.user?.username || "Tizim";
                const sana = log.createdAt ?? log.timestamp ?? "";
                const ozgarishRoyxati = ozgarishlar(log);
                const ochiqmi = ochiq === id;
                const tartib = (page - 1) * PAGE_SIZE + index + 1;

                return (
                  <Fragment key={id}>
                    <TableRow className="hover:bg-blue-50/40">
                      <TableCell className="pl-5 text-center text-sm font-black text-slate-400">{tartib}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${amal.ton}`}>
                          <Ikonka size={14} />
                          {amal.nom}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">{resursNomi(String(log.resource ?? ""))}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-600">
                            {foydalanuvchi.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-700">{foydalanuvchi}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-slate-700">{vaqtFormat(sana)}</p>
                        {nisbiVaqt(sana) && <p className="text-xs font-semibold text-slate-400">{nisbiVaqt(sana)}</p>}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        {ozgarishRoyxati.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setOchiq(ochiqmi ? null : id)}
                            aria-expanded={ochiqmi}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                          >
                            {ochiqmi ? "Yashirish" : `Ko‘rish (${ozgarishRoyxati.length})`}
                            <ChevronDown size={15} className={`transition ${ochiqmi ? "rotate-180" : ""}`} />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-300">Ma’lumot yo‘q</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {ochiqmi && (
                      <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                        <TableCell />
                        <TableCell colSpan={5} className="py-4 pr-5">
                          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {ozgarishRoyxati.map((item) => (
                              <div key={item.kalit} className="min-w-0 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                                <dt className="text-xs font-bold text-slate-400">{maydonNomi(item.kalit)}</dt>
                                <dd className="mt-0.5 whitespace-normal break-words text-sm font-semibold text-slate-700">
                                  {item.oldin !== undefined && (
                                    <>
                                      <span className="text-slate-400 line-through">{qiymatMatni(item.kalit, item.oldin)}</span>
                                      <span className="mx-1.5 text-slate-300">→</span>
                                    </>
                                  )}
                                  {qiymatMatni(item.kalit, item.keyin)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}

        {!yuklanmoqda && loglar.length > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-400">
              {page}-sahifa, jami {totalPages} ta
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Oldingi
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                Keyingi <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}

const maydonKlass =
  "mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

function Maydon({ nom, children, className = "" }: { nom: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-bold text-slate-600 ${className}`}>
      {nom}
      {children}
    </label>
  );
}
