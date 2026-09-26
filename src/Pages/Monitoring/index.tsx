import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Gauge,
  Package,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import AppSelect from "@/Components/ui/AppSelect";
import { sotuvlarRoyxatiniOlish } from "@/api/savdoApi";
import { chiqimApi, kirimApi, omborlarApi } from "@/api/omborApi";
import {
  counterpartyBalanceReportApi,
  incomeExpenseReportApi,
  productProfitReportApi,
  stockBalanceReportAll,
} from "@/api/reportsApi";
import { barchaFinanceTransactions } from "@/api/tolovApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { sotuvHolati, sotuvSummasi } from "@/Pages/Savdo/savdoYordamchilari";
import type { Sotuv } from "@/types/savdo";
import type { StockBalanceItem } from "@/api/reportsApi";
import type { ChiqimHujjati, KirimHujjati, Ombor } from "@/types/ombor";
import type { FinanceTransaction } from "@/types/tolov";
import MuddatTanlov from "@/Pages/HisobotUchot/MuddatTanlov";
import { bugun, bugunMinus } from "@/Pages/HisobotUchot/yordamchilar";
import DynamicsChart from "./DynamicsChart";

type Davr = "kunlik" | "oylik" | "yillik";
type Tab = "savdo" | "ombor";

type Nuqta = { nom: string; summa: number };
type Bucket = { key: string; nom: string };
type OmborHarakatNuqtasi = { nom: string; kirim: number; chiqim: number };

type ProfitRow = {
  productId?: string;
  productName?: string;
  qtySold?: number | string;
  revenue?: number | string;
  cost?: number | string;
  profit?: number | string;
  marginPct?: number | string;
};

type IncomeExpenseResponse = {
  income?: { saleRevenue?: number | string; otherIncome?: number | string; total?: number | string };
  cost?: { costOfGoods?: number | string };
  expenses?: { items?: Array<{ category?: string; name?: string; amount?: number | string }>; refunds?: number | string; total?: number | string };
  summary?: { revenue?: number | string; cost?: number | string; grossProfit?: number | string; expense?: number | string; netProfit?: number | string };
};

type BalanceItem = {
  counterpartyId: string;
  counterpartyName: string;
  debit: number | string;
  credit: number | string;
  closingBalance: number | string;
};

function son(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pul(value: unknown) {
  return `${Math.round(son(value)).toLocaleString("uz-UZ")} so'm`;
}

function compactSum(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mlrd`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mln`;
  return value.toLocaleString("uz-UZ");
}

function kunKaliti(date: Date) {
  return date.toISOString().slice(0, 10);
}

function oyKaliti(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function sotuvSanasi(sotuv: Sotuv) {
  return sotuv.confirmedAt || sotuv.date || sotuv.createdAt || "";
}

function hujjatSanasi(hujjat: KirimHujjati | ChiqimHujjati) {
  return hujjat.confirmedAt || hujjat.date || hujjat.createdAt || "";
}

function hujjatTasdiqlanganmi(hujjat: KirimHujjati | ChiqimHujjati) {
  return String(hujjat.status ?? "").toUpperCase() === "CONFIRMED";
}

// Ro'yxat (list) endpointlari ko'pincha totalAmount/total maydonini bo'sh qaytaradi —
// bu holatda mahsulotlar (items) bo'yicha qo'lda hisoblanadi. Xuddi shu naqsh
// Xaridlar.tsx (kirimSummasi) va Chiqim.tsx (hujjatSummasi) sahifalarida ham ishlatilgan.
function hujjatSummasi(hujjat: KirimHujjati | ChiqimHujjati) {
  const backend = son(hujjat.totalAmount ?? hujjat.total);
  if (backend > 0) return backend;
  return (hujjat.items ?? []).reduce((jami, item) => {
    const kengItem = item as {
      quantity?: number | string;
      price?: number | string;
      unitPrice?: number | string;
      costPrice?: number | string;
      modification?: { price?: { costPrice?: number | string } };
    };
    const narx = son(
      kengItem.price ?? kengItem.unitPrice ?? kengItem.costPrice ?? kengItem.modification?.price?.costPrice
    );
    return jami + son(kengItem.quantity) * narx;
  }, 0);
}

const OY_QISQA = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

// Tanlangan [dateFrom, dateTo] oralig'ini davr (kunlik/oylik/yillik) bo'yicha bo'laklarga ajratadi.
// Grafiklar shu bo'laklar bo'yicha to'ldiriladi — foydalanuvchi sanani o'zgartirsa, natija ham o'zgaradi.
function davrOraliqlari(dateFrom: string, dateTo: string, davr: Davr): Bucket[] {
  // "Z" bilan aniq UTC sifatida o'qiladi — aks holda mahalliy vaqt zonasi (masalan
  // Toshkent, UTC+5) sabab bo'lakning boshlanishi bir kun oldinga siljib ketadi.
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const natija: Bucket[] = [];
  if (davr === "kunlik") {
    const cur = new Date(start);
    let himoya = 0;
    while (cur <= end && himoya < 400) {
      const key = kunKaliti(cur);
      const [, m, d] = key.split("-");
      natija.push({ key, nom: `${d}.${m}` });
      cur.setUTCDate(cur.getUTCDate() + 1);
      himoya += 1;
    }
  } else if (davr === "oylik") {
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const oxiri = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    let himoya = 0;
    while (cur <= oxiri && himoya < 120) {
      natija.push({ key: oyKaliti(cur), nom: `${OY_QISQA[cur.getUTCMonth()]} ${String(cur.getUTCFullYear()).slice(2)}` });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
      himoya += 1;
    }
  } else {
    for (let yil = start.getUTCFullYear(); yil <= end.getUTCFullYear(); yil++) {
      natija.push({ key: String(yil), nom: String(yil) });
    }
  }
  return natija;
}

function sanadanKalit(date: Date, davr: Davr) {
  if (davr === "kunlik") return kunKaliti(date);
  if (davr === "oylik") return oyKaliti(date);
  return String(date.getUTCFullYear());
}

// Vaqt-qatori emas, balki "joriy yig'indi" ko'rinishidagi grafiklar uchun (to'lov turlari,
// omborlar kirim/chiqim, top/kam sotilgan mahsulotlar) — tanlangan [dateFrom, dateTo]
// oralig'ini davr turiga qarab "oxirgi" pastki oynaga toraytiradi: kunlik = faqat dateTo kuni,
// oylik = dateTo joylashgan taqvim oyi, yillik = dateTo joylashgan yil — lekin tashqi
// tanlangan oraliqdan chetga chiqmaydi (dateFrom dan oldinga siljimaydi).
function anchorOraligi(dateFrom: string, dateTo: string, davr: Davr): { from: string; to: string } {
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  if (Number.isNaN(end.getTime())) return { from: dateFrom, to: dateTo };
  let start: Date;
  if (davr === "kunlik") {
    start = new Date(end);
  } else if (davr === "oylik") {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  } else {
    start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
  }
  const startKey = kunKaliti(start);
  return { from: startKey < dateFrom ? dateFrom : startKey, to: dateTo };
}

// Tanlangan [dateFrom, dateTo] oralig'idan bevosita oldingi, xuddi shu uzunlikdagi
// oraliqni hisoblaydi — KPI kartochkalaridagi "oldingi davrga nisbatan o'zgarish"
// foizini haqiqiy (backend/real ma'lumot asosidagi) taqqoslash uchun ishlatiladi.
function oldingiDavrOraligi(dateFrom: string, dateTo: string): { from: string; to: string } {
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { from: dateFrom, to: dateTo };
  const kunlar = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const oldingiEnd = new Date(start);
  oldingiEnd.setUTCDate(oldingiEnd.getUTCDate() - 1);
  const oldingiStart = new Date(oldingiEnd);
  oldingiStart.setUTCDate(oldingiStart.getUTCDate() - (kunlar - 1));
  return { from: kunKaliti(oldingiStart), to: kunKaliti(oldingiEnd) };
}

type TrendMalumoti = { foiz: number; yangi: boolean };

// Ikkita davr qiymatini solishtirib, foiz o'zgarishini qaytaradi. Ikkalasi ham nol
// bo'lsa (haqiqatan solishtiradigan narsa yo'q) — badge ko'rsatilmasin deb null qaytaradi.
function trendniHisoblash(joriy: number, oldingi: number): TrendMalumoti | null {
  if (joriy === 0 && oldingi === 0) return null;
  if (oldingi === 0) return { foiz: 0, yangi: true };
  return { foiz: ((joriy - oldingi) / Math.abs(oldingi)) * 100, yangi: false };
}

function nuqtalarGaGuruhlash<T>(
  items: T[],
  sanaOlish: (item: T) => string,
  qiymatOlish: (item: T) => number,
  oraliqlar: Bucket[],
  davr: Davr
): Nuqta[] {
  const xarita = new Map(oraliqlar.map((bucket) => [bucket.key, 0]));
  items.forEach((item) => {
    const raw = sanaOlish(item);
    if (!raw) return;
    const sana = new Date(raw);
    if (Number.isNaN(sana.getTime())) return;
    const kalit = sanadanKalit(sana, davr);
    if (xarita.has(kalit)) xarita.set(kalit, (xarita.get(kalit) ?? 0) + qiymatOlish(item));
  });
  return oraliqlar.map((bucket) => ({ nom: bucket.nom, summa: xarita.get(bucket.key) ?? 0 }));
}

function jamiSumma(nuqtalar: Nuqta[]) {
  return nuqtalar.reduce((jami, nuqta) => jami + nuqta.summa, 0);
}

function ProfitRowlarniOlish(value: unknown): ProfitRow[] {
  if (Array.isArray(value)) return value as ProfitRow[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as ProfitRow[];
    if (Array.isArray(record.data)) return record.data as ProfitRow[];
    if (Array.isArray(record.value)) return record.value as ProfitRow[];
  }
  return [];
}

function isoDateFrom(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}
function isoDateTo(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

const TOLOV_RANGLARI = ["#F97316", "#10B981", "#6366F1", "#F59E0B", "#EC4899", "#94A3B8"];

export default function Monitoring() {
  const { t } = useTranslation("monitoring");
  const [tab, setTab] = useState<Tab>("savdo");
  // Har bir vaqt-grafigi o'zining mustaqil Kunlik/Oylik/Yillik holatiga ega —
  // bittasini o'zgartirish boshqalariga ta'sir qilmaydi.
  const [savdoDavr, setSavdoDavr] = useState<Davr>("kunlik");
  const [kirimDavr, setKirimDavr] = useState<Davr>("kunlik");
  const [chiqimDavr, setChiqimDavr] = useState<Davr>("kunlik");
  const [omborKirimDavr, setOmborKirimDavr] = useState<Davr>("kunlik");
  const [omborChiqimDavr, setOmborChiqimDavr] = useState<Davr>("kunlik");
  const [tolovDavr, setTolovDavr] = useState<Davr>("yillik");
  const [omborHarakatDavr, setOmborHarakatDavr] = useState<Davr>("yillik");
  const [topDavr, setTopDavr] = useState<Davr>("yillik");
  const [bottomDavr, setBottomDavr] = useState<Davr>("yillik");
  const [dateFrom, setDateFrom] = useState(bugunMinus(29));
  const [dateTo, setDateTo] = useState(bugun());
  const [tanlanganOmborId, setTanlanganOmborId] = useState("");
  const [yangilanish, setYangilanish] = useState(0);

  const [barchaSotuvlar, setBarchaSotuvlar] = useState<Sotuv[]>([]);
  const [sotuvYuklanmoqda, setSotuvYuklanmoqda] = useState(true);
  const [sotuvXato, setSotuvXato] = useState("");

  const [incomeExpense, setIncomeExpense] = useState<IncomeExpenseResponse | null>(null);
  const [foydaYuklanmoqda, setFoydaYuklanmoqda] = useState(true);
  const [foydaXato, setFoydaXato] = useState("");

  const [topProfitRows, setTopProfitRows] = useState<ProfitRow[]>([]);
  const [topYuklanmoqda, setTopYuklanmoqda] = useState(true);
  const [topXato, setTopXato] = useState("");

  const [bottomProfitRows, setBottomProfitRows] = useState<ProfitRow[]>([]);
  const [bottomYuklanmoqda, setBottomYuklanmoqda] = useState(true);
  const [bottomXato, setBottomXato] = useState("");

  const [financeTx, setFinanceTx] = useState<FinanceTransaction[]>([]);
  const [financeYuklanmoqda, setFinanceYuklanmoqda] = useState(true);
  const [financeXato, setFinanceXato] = useState("");

  const [debtors, setDebtors] = useState<BalanceItem[]>([]);
  const [debtorlarYuklanmoqda, setDebtorlarYuklanmoqda] = useState(true);
  const [debtorlarXato, setDebtorlarXato] = useState("");

  const [omborlar, setOmborlar] = useState<Ombor[]>([]);
  const [stockItems, setStockItems] = useState<StockBalanceItem[]>([]);
  const [omborYuklanmoqda, setOmborYuklanmoqda] = useState(true);
  const [omborXato, setOmborXato] = useState("");

  const [kirimHujjatlari, setKirimHujjatlari] = useState<KirimHujjati[]>([]);
  const [chiqimHujjatlari, setChiqimHujjatlari] = useState<ChiqimHujjati[]>([]);
  const [omborHarakatiYuklanmoqda, setOmborHarakatiYuklanmoqda] = useState(true);
  const [omborHarakatiXato, setOmborHarakatiXato] = useState("");

  // Barcha sotuvlar (savdo dinamikasi grafigi uchun) — bir marta yuklanadi, davr bo'laklariga
  // qarab qayta guruhlanadi (qaytadan so'rov yubormasdan).
  useEffect(() => {
    let active = true;
    setSotuvYuklanmoqda(true);
    setSotuvXato("");
    sotuvlarRoyxatiniOlish()
      .then((data) => { if (active) setBarchaSotuvlar(data); })
      .catch((error) => { if (active) setSotuvXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setSotuvYuklanmoqda(false); });
    return () => { active = false; };
  }, [yangilanish]);

  // Tanlangan davr bo'yicha daromad-xarajat hisoboti (KPI "Sof foyda" kartochkasi uchun).
  useEffect(() => {
    let active = true;
    setFoydaYuklanmoqda(true);
    setFoydaXato("");
    incomeExpenseReportApi
      .olish({ dateFrom: isoDateFrom(dateFrom), dateTo: isoDateTo(dateTo) })
      .then((incomeExp) => { if (active) setIncomeExpense(incomeExp as IncomeExpenseResponse); })
      .catch((error) => { if (active) setFoydaXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setFoydaYuklanmoqda(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo, yangilanish]);

  // KPI kartochkalaridagi "oldingi davrga nisbatan" foiz-belgilar uchun — tanlangan
  // oraliqdan bevosita oldingi, xuddi shu uzunlikdagi oraliqning sof foyda ko'rsatkichi.
  // Ikkilamchi (yordamchi) ko'rsatkich bo'lgani uchun xatolik alohida ko'rsatilmaydi —
  // muvaffaqiyatsiz bo'lsa shunchaki trend-badge chiqmay qoladi.
  const oldingiOraliq = useMemo(() => oldingiDavrOraligi(dateFrom, dateTo), [dateFrom, dateTo]);
  const [oldingiIncomeExpense, setOldingiIncomeExpense] = useState<IncomeExpenseResponse | null>(null);
  useEffect(() => {
    let active = true;
    incomeExpenseReportApi
      .olish({ dateFrom: isoDateFrom(oldingiOraliq.from), dateTo: isoDateTo(oldingiOraliq.to) })
      .then((value) => { if (active) setOldingiIncomeExpense(value as IncomeExpenseResponse); })
      .catch(() => { if (active) setOldingiIncomeExpense(null); });
    return () => { active = false; };
  }, [oldingiOraliq, yangilanish]);

  // "Eng ko'p sotilayotgan mahsulotlar" grafigi o'zining mustaqil davriga (topDavr) ega —
  // tanlangan sana oralig'i ichida shu davr bo'yicha "oxirgi oyna"dan hisoblanadi.
  const topOraliq = useMemo(() => anchorOraligi(dateFrom, dateTo, topDavr), [dateFrom, dateTo, topDavr]);
  useEffect(() => {
    let active = true;
    setTopYuklanmoqda(true);
    setTopXato("");
    productProfitReportApi
      .barchasi({ groupBy: "PRODUCT", dateFrom: isoDateFrom(topOraliq.from), dateTo: isoDateTo(topOraliq.to) })
      .then((profit) => { if (active) setTopProfitRows(ProfitRowlarniOlish(profit)); })
      .catch((error) => { if (active) setTopXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setTopYuklanmoqda(false); });
    return () => { active = false; };
  }, [topOraliq, yangilanish]);

  // "Kam sotilayotgan mahsulotlar" grafigi ham o'z mustaqil davriga (bottomDavr) ega.
  const bottomOraliq = useMemo(() => anchorOraligi(dateFrom, dateTo, bottomDavr), [dateFrom, dateTo, bottomDavr]);
  useEffect(() => {
    let active = true;
    setBottomYuklanmoqda(true);
    setBottomXato("");
    productProfitReportApi
      .barchasi({ groupBy: "PRODUCT", dateFrom: isoDateFrom(bottomOraliq.from), dateTo: isoDateTo(bottomOraliq.to) })
      .then((profit) => { if (active) setBottomProfitRows(ProfitRowlarniOlish(profit)); })
      .catch((error) => { if (active) setBottomXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setBottomYuklanmoqda(false); });
    return () => { active = false; };
  }, [bottomOraliq, yangilanish]);

  // Tanlangan davr bo'yicha moliyaviy tranzaksiyalar — kirim va chiqim grafiklari
  // hamda to'lov turlari taqsimoti shu bitta ro'yxatdan hisoblanadi.
  useEffect(() => {
    let active = true;
    setFinanceYuklanmoqda(true);
    setFinanceXato("");
    // Diqqat: /finance/transactions oddiy "YYYY-MM-DD" sana kutadi (Savdo/Tolovlar.tsx
    // sahifasidagi useTolovlar hook'ida ham xuddi shunday, ISO vaqt-belgisiz yuboriladi) —
    // boshqa hisobot endpoint'laridan farqli, bu yerda isoDateFrom/isoDateTo ishlatilmaydi.
    barchaFinanceTransactions({
      dateFrom,
      dateTo,
      status: "CONFIRMED",
    })
      .then((items) => { if (active) setFinanceTx(items); })
      .catch((error) => { if (active) setFinanceXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setFinanceYuklanmoqda(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo, yangilanish]);

  // Joriy qarzdorlik holati — davrga bog'liq emas, doim "hozirgi" holatni ko'rsatadi.
  useEffect(() => {
    let active = true;
    setDebtorlarYuklanmoqda(true);
    setDebtorlarXato("");
    counterpartyBalanceReportApi
      .barchasi({ counterpartyType: "CUSTOMER", debtStatus: "DEBTOR" })
      .then((value) => {
        if (!active) return;
        const items = (value as { items?: BalanceItem[] }).items ?? [];
        setDebtors([...items].sort((a, b) => son(b.closingBalance) - son(a.closingBalance)));
      })
      .catch((error) => { if (active) setDebtorlarXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setDebtorlarYuklanmoqda(false); });
    return () => { active = false; };
  }, [yangilanish]);

  // Joriy ombor qoldig'i va omborlar ro'yxati — davrga bog'liq emas.
  useEffect(() => {
    let active = true;
    setOmborYuklanmoqda(true);
    setOmborXato("");
    Promise.all([stockBalanceReportAll({ balanceStatus: "POSITIVE" }), omborlarApi.royxat()])
      .then(([items, omborRoyxati]) => {
        if (!active) return;
        setStockItems(items);
        setOmborlar(omborRoyxati);
      })
      .catch((error) => { if (active) setOmborXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setOmborYuklanmoqda(false); });
    return () => { active = false; };
  }, [yangilanish]);

  // Tanlangan davr bo'yicha ombor kirim/chiqim hujjatlari — omborlar aro taqqoslash uchun.
  useEffect(() => {
    let active = true;
    setOmborHarakatiYuklanmoqda(true);
    setOmborHarakatiXato("");
    Promise.all([kirimApi.royxat(), chiqimApi.royxat()])
      .then(([kirimlar, chiqimlar]) => {
        if (!active) return;
        setKirimHujjatlari(kirimlar);
        setChiqimHujjatlari(chiqimlar);
      })
      .catch((error) => { if (active) setOmborHarakatiXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setOmborHarakatiYuklanmoqda(false); });
    return () => { active = false; };
  }, [yangilanish]);

  const savdoOraliqlari = useMemo(() => davrOraliqlari(dateFrom, dateTo, savdoDavr), [dateFrom, dateTo, savdoDavr]);
  const kirimOraliqlari = useMemo(() => davrOraliqlari(dateFrom, dateTo, kirimDavr), [dateFrom, dateTo, kirimDavr]);
  const chiqimOraliqlari = useMemo(() => davrOraliqlari(dateFrom, dateTo, chiqimDavr), [dateFrom, dateTo, chiqimDavr]);

  const sotuvNuqtalar = useMemo(
    () =>
      nuqtalarGaGuruhlash(
        barchaSotuvlar.filter((sotuv) => {
          const sana = sotuvSanasi(sotuv).slice(0, 10);
          return sotuvHolati(sotuv) === "CONFIRMED" && sana >= dateFrom && sana <= dateTo;
        }),
        sotuvSanasi,
        sotuvSummasi,
        savdoOraliqlari,
        savdoDavr
      ),
    [barchaSotuvlar, savdoOraliqlari, savdoDavr, dateFrom, dateTo]
  );

  const kirimNuqtalar = useMemo(
    () =>
      nuqtalarGaGuruhlash(
        financeTx.filter((item) => item.type === "INCOME"),
        (item) => item.date,
        (item) => son(item.amount),
        kirimOraliqlari,
        kirimDavr
      ),
    [financeTx, kirimOraliqlari, kirimDavr]
  );

  // "Chiqim" ikki xil manbadan yig'iladi: (1) Kassa orqali qayd etilgan moliyaviy
  // xarajatlar (/finance/transactions, type=EXPENSE) va (2) Ombor > Chiqim
  // bo'limidagi mahsulot hisobdan chiqarish hujjatlari (/inventory/write-offs) —
  // ikkalasi ham real "chiqim" hisoblanadi, shuning uchun grafikda jamlanadi.
  const chiqimNuqtalar = useMemo(() => {
    const moliyaviy = nuqtalarGaGuruhlash(
      financeTx.filter((item) => item.type === "EXPENSE"),
      (item) => item.date,
      (item) => son(item.amount),
      chiqimOraliqlari,
      chiqimDavr
    );
    const omborChiqimi = nuqtalarGaGuruhlash(
      chiqimHujjatlari.filter((hujjat) => {
        const sana = hujjatSanasi(hujjat).slice(0, 10);
        return hujjatTasdiqlanganmi(hujjat) && sana >= dateFrom && sana <= dateTo;
      }),
      hujjatSanasi,
      hujjatSummasi,
      chiqimOraliqlari,
      chiqimDavr
    );
    return chiqimOraliqlari.map((bucket, index) => ({
      nom: bucket.nom,
      summa: (moliyaviy[index]?.summa ?? 0) + (omborChiqimi[index]?.summa ?? 0),
      kassa: moliyaviy[index]?.summa ?? 0,
      ombor: omborChiqimi[index]?.summa ?? 0,
    }));
  }, [financeTx, chiqimHujjatlari, chiqimOraliqlari, chiqimDavr, dateFrom, dateTo]);

  // To'lov turlari taqsimoti ham o'z mustaqil davriga (tolovDavr) ega — tanlangan sana
  // oralig'i ichida shu davr bo'yicha "oxirgi oyna"dagi kirim tranzaksiyalaridan hisoblanadi.
  const tolovOraliq = useMemo(() => anchorOraligi(dateFrom, dateTo, tolovDavr), [dateFrom, dateTo, tolovDavr]);
  const tolovTurlariBoyicha = useMemo(() => {
    const xarita = new Map<string, number>();
    financeTx
      .filter((item) => {
        if (item.type !== "INCOME") return false;
        const kun = String(item.date).slice(0, 10);
        return kun >= tolovOraliq.from && kun <= tolovOraliq.to;
      })
      .forEach((item) => {
        const turi = item.paymentType || "-";
        xarita.set(turi, (xarita.get(turi) ?? 0) + son(item.amount));
      });
    return Array.from(xarita.entries())
      .map(([nom, summa]) => ({ nom, summa }))
      .sort((a, b) => b.summa - a.summa);
  }, [financeTx, tolovOraliq]);

  const tolovTaqsimoti = useMemo(() => {
    const jami = tolovTurlariBoyicha.reduce((sum, item) => sum + item.summa, 0);
    return tolovTurlariBoyicha.map((item) => ({ ...item, foiz: jami > 0 ? (item.summa / jami) * 100 : 0 }));
  }, [tolovTurlariBoyicha]);

  const davrSavdosi = useMemo(() => {
    const tasdiqlangan = barchaSotuvlar.filter((sotuv) => {
      if (sotuvHolati(sotuv) !== "CONFIRMED") return false;
      const sana = sotuvSanasi(sotuv).slice(0, 10);
      return sana >= dateFrom && sana <= dateTo;
    });
    return {
      summa: tasdiqlangan.reduce((jami, sotuv) => jami + sotuvSummasi(sotuv), 0),
      soni: tasdiqlangan.length,
    };
  }, [barchaSotuvlar, dateFrom, dateTo]);

  // KPI trend-badge'lari uchun oldingi (bevosita avvalgi, xuddi shu uzunlikdagi) davr
  // savdosi — barchaSotuvlar allaqachon to'liq (sana bilan cheklanmagan) yuklangani
  // uchun qo'shimcha so'rovsiz, mavjud ma'lumotdan hisoblanadi.
  const oldingiDavrSavdosi = useMemo(() => {
    const tasdiqlangan = barchaSotuvlar.filter((sotuv) => {
      if (sotuvHolati(sotuv) !== "CONFIRMED") return false;
      const sana = sotuvSanasi(sotuv).slice(0, 10);
      return sana >= oldingiOraliq.from && sana <= oldingiOraliq.to;
    });
    return {
      summa: tasdiqlangan.reduce((jami, sotuv) => jami + sotuvSummasi(sotuv), 0),
      soni: tasdiqlangan.length,
    };
  }, [barchaSotuvlar, oldingiOraliq]);

  const foydaKorsatkichlari = useMemo(() => {
    const daromad = son(incomeExpense?.income?.total ?? incomeExpense?.summary?.revenue);
    const sofFoyda = son(incomeExpense?.summary?.netProfit);
    const rentabellik = daromad ? (sofFoyda / daromad) * 100 : 0;
    return { sofFoyda, rentabellik };
  }, [incomeExpense]);

  const oldingiSofFoyda = useMemo(() => son(oldingiIncomeExpense?.summary?.netProfit), [oldingiIncomeExpense]);

  const savdoTrendi = useMemo(() => trendniHisoblash(davrSavdosi.summa, oldingiDavrSavdosi.summa), [davrSavdosi, oldingiDavrSavdosi]);
  const foydaTrendi = useMemo(() => trendniHisoblash(foydaKorsatkichlari.sofFoyda, oldingiSofFoyda), [foydaKorsatkichlari, oldingiSofFoyda]);
  const sotuvlarSoniTrendi = useMemo(() => trendniHisoblash(davrSavdosi.soni, oldingiDavrSavdosi.soni), [davrSavdosi, oldingiDavrSavdosi]);
  const ortachaChek = davrSavdosi.soni > 0 ? davrSavdosi.summa / davrSavdosi.soni : 0;

  const engKopSotilgan = useMemo(
    () =>
      [...topProfitRows]
        .sort((a, b) => son(b.qtySold) - son(a.qtySold))
        .slice(0, 10)
        .map((row) => ({ nom: row.productName ?? "-", summa: son(row.qtySold) })),
    [topProfitRows]
  );

  const engKamSotilgan = useMemo(
    () =>
      [...bottomProfitRows]
        .filter((row) => son(row.qtySold) > 0)
        .sort((a, b) => son(a.qtySold) - son(b.qtySold))
        .slice(0, 10)
        .map((row) => ({ nom: row.productName ?? "-", summa: son(row.qtySold) })),
    [bottomProfitRows]
  );

  const omborNomXaritasi = useMemo(() => new Map(omborlar.map((ombor) => [ombor.id, ombor.name])), [omborlar]);

  // Har doim BARCHA haqiqiy omborlar (omborlarApi.royxat()) ro'yxatidan quriladi — shu bilan
  // hech qaysi ombor tushib qolmaydi, hatto hozircha qoldig'i bo'lmagan bo'lsa ham (0 bilan ko'rinadi).
  const omborlarBoyicha = useMemo(() => {
    const qiymatlar = new Map<string, number>();
    stockItems.forEach((item) => {
      if (!item.warehouseId) return;
      qiymatlar.set(item.warehouseId, (qiymatlar.get(item.warehouseId) ?? 0) + son(item.totalAmount));
    });
    return omborlar
      .map((ombor) => ({ nom: ombor.name, summa: qiymatlar.get(ombor.id) ?? 0 }))
      .sort((a, b) => b.summa - a.summa);
  }, [stockItems, omborlar]);

  const omborJami = useMemo(() => {
    const qiymat = stockItems.reduce((jami, item) => jami + son(item.totalAmount), 0);
    const kamQolgan = stockItems.filter((item) => son(item.availableQuantity) > 0 && son(item.availableQuantity) < 5).length;
    return { qiymat, omborlarSoni: omborlar.length, kamQolgan };
  }, [stockItems, omborlar]);

  // Omborlar bo'yicha kirim/chiqim grafigi ham o'z mustaqil davriga (omborHarakatDavr) ega.
  const omborHarakatOraliq = useMemo(
    () => anchorOraligi(dateFrom, dateTo, omborHarakatDavr),
    [dateFrom, dateTo, omborHarakatDavr]
  );
  const omborHarakati = useMemo<OmborHarakatNuqtasi[]>(() => {
    const xarita = new Map<string, OmborHarakatNuqtasi>();
    kirimHujjatlari.forEach((hujjat) => {
      if (!hujjatTasdiqlanganmi(hujjat)) return;
      const kun = hujjatSanasi(hujjat).slice(0, 10);
      if (!kun || kun < omborHarakatOraliq.from || kun > omborHarakatOraliq.to) return;
      const nom = hujjat.warehouse?.name ?? omborNomXaritasi.get(hujjat.warehouseId) ?? "-";
      const joriy = xarita.get(hujjat.warehouseId) ?? { nom, kirim: 0, chiqim: 0 };
      joriy.kirim += hujjatSummasi(hujjat);
      xarita.set(hujjat.warehouseId, joriy);
    });
    chiqimHujjatlari.forEach((hujjat) => {
      if (!hujjatTasdiqlanganmi(hujjat)) return;
      const kun = hujjatSanasi(hujjat).slice(0, 10);
      if (!kun || kun < omborHarakatOraliq.from || kun > omborHarakatOraliq.to) return;
      const nom = hujjat.warehouse?.name ?? omborNomXaritasi.get(hujjat.warehouseId) ?? "-";
      const joriy = xarita.get(hujjat.warehouseId) ?? { nom, kirim: 0, chiqim: 0 };
      joriy.chiqim += hujjatSummasi(hujjat);
      xarita.set(hujjat.warehouseId, joriy);
    });
    return Array.from(xarita.values()).sort((a, b) => b.kirim + b.chiqim - (a.kirim + a.chiqim));
  }, [kirimHujjatlari, chiqimHujjatlari, omborHarakatOraliq, omborNomXaritasi]);

  const tanlanganOmborMahsulotlari = useMemo(
    () =>
      stockItems
        .filter((item) => item.warehouseId === tanlanganOmborId)
        .sort((a, b) => son(b.totalAmount) - son(a.totalAmount)),
    [stockItems, tanlanganOmborId]
  );

  // Tanlangan ombor uchun kirim/chiqim dinamikasi — tanlangan sana oralig'i va har
  // bir grafikning o'z davri (kunlik/oylik/yillik) bo'yicha, alohida-alohida.
  const omborKirimOraliqlari = useMemo(
    () => davrOraliqlari(dateFrom, dateTo, omborKirimDavr),
    [dateFrom, dateTo, omborKirimDavr]
  );
  const omborChiqimOraliqlari = useMemo(
    () => davrOraliqlari(dateFrom, dateTo, omborChiqimDavr),
    [dateFrom, dateTo, omborChiqimDavr]
  );

  const tanlanganOmborKirim = useMemo(
    () =>
      tanlanganOmborId
        ? nuqtalarGaGuruhlash(
            kirimHujjatlari.filter((h) => h.warehouseId === tanlanganOmborId && hujjatTasdiqlanganmi(h)),
            hujjatSanasi,
            hujjatSummasi,
            omborKirimOraliqlari,
            omborKirimDavr
          )
        : [],
    [kirimHujjatlari, tanlanganOmborId, omborKirimOraliqlari, omborKirimDavr]
  );

  const tanlanganOmborChiqim = useMemo(
    () =>
      tanlanganOmborId
        ? nuqtalarGaGuruhlash(
            chiqimHujjatlari.filter((h) => h.warehouseId === tanlanganOmborId && hujjatTasdiqlanganmi(h)),
            hujjatSanasi,
            hujjatSummasi,
            omborChiqimOraliqlari,
            omborChiqimDavr
          )
        : [],
    [chiqimHujjatlari, tanlanganOmborId, omborChiqimOraliqlari, omborChiqimDavr]
  );

  function yangilash() {
    setYangilanish((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">{t("eyebrow")}</p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={yangilash}
          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 text-sm font-black text-orange-600 shadow-sm transition hover:bg-orange-50"
        >
          <RefreshCw size={17} />
          {t("refresh")}
        </button>
      </header>

      <nav className="flex flex-wrap items-center gap-3">
        {(["savdo", "ombor"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-2xl border px-5 py-3 text-sm font-black transition ${
              tab === item
                ? "border-orange-200 bg-orange-500 text-white shadow-lg shadow-orange-200"
                : "border-orange-100 bg-white text-gray-600 hover:bg-orange-50"
            }`}
          >
            {t(`tabs.${item}`)}
          </button>
        ))}
        <div className="ml-auto">
          <MuddatTanlov dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        </div>
      </nav>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={ShoppingCart}
          label={t("kpi.periodSales")}
          value={pul(davrSavdosi.summa)}
          sub={t("kpi.periodSalesSub", { count: davrSavdosi.soni })}
          yuklanmoqda={sotuvYuklanmoqda}
          trend={savdoTrendi}
        />
        <KpiCard
          icon={foydaKorsatkichlari.sofFoyda >= 0 ? TrendingUp : TrendingDown}
          label={t("kpi.netProfit")}
          value={pul(foydaKorsatkichlari.sofFoyda)}
          sub={t("kpi.netProfitSub", { percent: foydaKorsatkichlari.rentabellik.toFixed(1) })}
          yuklanmoqda={foydaYuklanmoqda}
          xato={foydaXato}
          rang={foydaKorsatkichlari.sofFoyda >= 0 ? "emerald" : "red"}
          trend={foydaTrendi}
        />
        <KpiCard
          icon={Receipt}
          label={t("kpi.salesCount")}
          value={String(davrSavdosi.soni)}
          sub={t("kpi.salesCountSub", { avg: pul(ortachaChek) })}
          yuklanmoqda={sotuvYuklanmoqda}
          trend={sotuvlarSoniTrendi}
        />
        <KpiCard
          icon={Users}
          label={t("kpi.totalDebt")}
          value={pul(debtors.reduce((jami, item) => jami + son(item.closingBalance), 0))}
          sub={t("kpi.totalDebtSub", { count: debtors.length })}
          yuklanmoqda={debtorlarYuklanmoqda}
          rang="red"
          belgi={t("kpi.trendCurrent")}
        />
        <KpiCard
          icon={Warehouse}
          label={t("kpi.stockValue")}
          value={pul(omborJami.qiymat)}
          sub={t("kpi.stockValueSub", { count: omborJami.omborlarSoni })}
          yuklanmoqda={omborYuklanmoqda}
          belgi={t("kpi.trendCurrent")}
        />
      </section>

      {tab === "savdo" ? (
        <div className="space-y-6">
          <DynamicsChart
            variant="sales"
            data={sotuvNuqtalar}
            period={savdoDavr}
            onPeriodChange={setSavdoDavr}
            error={sotuvXato}
            loading={sotuvYuklanmoqda}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <DynamicsChart
              variant="income"
              data={kirimNuqtalar}
              period={kirimDavr}
              onPeriodChange={setKirimDavr}
              error={financeXato}
              loading={financeYuklanmoqda}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />

            <DynamicsChart
              variant="expense"
              data={chiqimNuqtalar}
              period={chiqimDavr}
              onPeriodChange={setChiqimDavr}
              error={[financeXato, omborHarakatiXato].filter(Boolean).join(" · ")}
              loading={financeYuklanmoqda || omborHarakatiYuklanmoqda}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <ChartCard
              title={t("charts.profitGauge.title")}
              subtitle={t("charts.profitGauge.subtitle")}
              icon={Gauge}
              accent={foydaKorsatkichlari.sofFoyda >= 0 ? "green" : "rose"}
              xato={foydaXato}
              yuklanmoqda={foydaYuklanmoqda}
              height={260}
            >
              <div className="relative h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    barSize={16}
                    data={[{ nom: "rentabellik", qiymat: Math.max(0, Math.min(100, foydaKorsatkichlari.rentabellik)) }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      dataKey="qiymat"
                      cornerRadius={12}
                      background={{ fill: "#F1F5F9" }}
                      fill={foydaKorsatkichlari.sofFoyda >= 0 ? "#10B981" : "#EF4444"}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                  <p className="text-xl font-bold text-slate-900">{pul(foydaKorsatkichlari.sofFoyda)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {t("kpi.netProfitSub", { percent: foydaKorsatkichlari.rentabellik.toFixed(1) })}
                  </p>
                </div>
              </div>
            </ChartCard>

            <ChartCard
              title={t("charts.paymentMethods.title")}
              subtitle={t("charts.paymentMethods.subtitle")}
              icon={Wallet}
              accent="blue"
              headerExtra={<DavrToggle value={tolovDavr} onChange={setTolovDavr} />}
              xato={financeXato}
              yuklanmoqda={financeYuklanmoqda}
              height={260}
              bosh={tolovTurlariBoyicha.length === 0 ? t("noData") : undefined}
            >
              <div className="flex h-full items-center gap-3">
                <div className="h-full w-2/5 min-w-0 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tolovTurlariBoyicha} dataKey="summa" nameKey="nom" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
                        {tolovTurlariBoyicha.map((item, index) => (
                          <Cell key={item.nom} fill={TOLOV_RANGLARI[index % TOLOV_RANGLARI.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [pul(Number(value)), t("charts.paymentMethods.title")]} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5 overflow-y-auto">
                  {tolovTaqsimoti.map((item, index) => (
                    <div key={item.nom} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-600">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TOLOV_RANGLARI[index % TOLOV_RANGLARI.length] }} />
                        <span className="truncate">{item.nom}</span>
                      </span>
                      <span className="shrink-0 font-bold text-slate-900">{item.foiz.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ListCard
              title={t("charts.debtors.title")}
              subtitle={t("charts.debtors.subtitle")}
              icon={Users}
              accent="rose"
              xato={debtorlarXato}
              yuklanmoqda={debtorlarYuklanmoqda}
              bosh={t("charts.debtors.empty")}
              items={debtors.slice(0, 6).map((item) => ({ nom: item.counterpartyName, summa: son(item.closingBalance) }))}
              rang="red"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MiniStat icon={Package} label={t("kpi.stockValue")} value={pul(omborJami.qiymat)} />
            <MiniStat icon={Warehouse} label={t("mini.warehouses")} value={String(omborJami.omborlarSoni)} />
            <MiniStat icon={AlertTriangle} label={t("mini.lowStock")} value={String(omborJami.kamQolgan)} rang="red" />
          </div>

          <TaqsimotCard
            title={t("charts.warehouseStock.title")}
            subtitle={t("charts.warehouseStock.subtitle")}
            icon={Warehouse}
            jamiLabel={t("charts.warehouseStock.total")}
            shareLabel={t("charts.warehouseStock.share")}
            xato={omborXato}
            yuklanmoqda={omborYuklanmoqda}
            bosh={omborlarBoyicha.length === 0 ? t("noData") : undefined}
            items={omborlarBoyicha}
          />

          <ChartCard
            title={t("charts.warehouseFlow.title")}
            subtitle={t("charts.warehouseFlow.subtitle")}
            icon={Warehouse}
            accent="blue"
            headerExtra={<DavrToggle value={omborHarakatDavr} onChange={setOmborHarakatDavr} />}
            xato={omborHarakatiXato}
            yuklanmoqda={omborHarakatiYuklanmoqda}
            bosh={omborHarakati.length === 0 ? t("noData") : undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={omborHarakati} barSize={40} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={compactSum} />
                <Tooltip formatter={(value, key) => [pul(Number(value)), key === "kirim" ? t("charts.warehouseFlow.income") : t("charts.warehouseFlow.expense")]} contentStyle={tooltipStyle} />
                <Legend
                  formatter={(key) => (key === "kirim" ? t("charts.warehouseFlow.income") : t("charts.warehouseFlow.expense"))}
                  wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                />
                <Bar dataKey="kirim" fill="#10B981" radius={[10, 10, 0, 0]} />
                <Bar dataKey="chiqim" fill="#EF4444" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">{t("charts.warehouseDetail.title")}</h2>
                <p className="mt-1 text-sm text-gray-500">{t("charts.warehouseDetail.subtitle")}</p>
              </div>
              <AppSelect
                value={tanlanganOmborId}
                onChange={(event) => setTanlanganOmborId(event.target.value)}
                className="h-11 min-w-[220px] rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold outline-none focus:border-orange-400"
              >
                <option value="">{t("charts.warehouseDetail.all")}</option>
                {omborlar.map((ombor) => (
                  <option key={ombor.id} value={ombor.id}>{ombor.name}</option>
                ))}
              </AppSelect>
            </div>

            {!tanlanganOmborId ? (
              <p className="flex h-32 items-center justify-center text-center text-sm font-bold text-gray-400">
                {t("charts.warehouseDetail.hint")}
              </p>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <ChartCard
                    title={t("charts.warehouseDetail.income")}
                    subtitle={t("charts.warehouseDetail.incomeSubtitle")}
                    icon={ArrowDownLeft}
                    accent="green"
                    headerExtra={<DavrToggle value={omborKirimDavr} onChange={setOmborKirimDavr} />}
                    xato={omborHarakatiXato}
                    yuklanmoqda={omborHarakatiYuklanmoqda}
                    height={220}
                    bosh={jamiSumma(tanlanganOmborKirim) === 0 ? t("noData") : undefined}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tanlanganOmborKirim}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1FAE5" />
                        <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={compactSum} />
                        <Tooltip formatter={(value) => [pul(Number(value)), t("charts.warehouseDetail.income")]} contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="summa" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: "#10B981" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title={t("charts.warehouseDetail.expense")}
                    subtitle={t("charts.warehouseDetail.expenseSubtitle")}
                    icon={ArrowUpRight}
                    accent="rose"
                    headerExtra={<DavrToggle value={omborChiqimDavr} onChange={setOmborChiqimDavr} />}
                    xato={omborHarakatiXato}
                    yuklanmoqda={omborHarakatiYuklanmoqda}
                    height={220}
                    bosh={jamiSumma(tanlanganOmborChiqim) === 0 ? t("noData") : undefined}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tanlanganOmborChiqim}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FEE2E2" />
                        <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={compactSum} />
                        <Tooltip formatter={(value) => [pul(Number(value)), t("charts.warehouseDetail.expense")]} contentStyle={tooltipStyle} />
                        <Bar dataKey="summa" fill="#EF4444" radius={[8, 8, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {omborYuklanmoqda ? (
                  <div className="flex h-32 items-center justify-center font-bold text-gray-400">...</div>
                ) : tanlanganOmborMahsulotlari.length === 0 ? (
                  <p className="flex h-32 items-center justify-center text-center text-sm font-bold text-gray-400">
                    {t("charts.warehouseDetail.empty")}
                  </p>
                ) : (
                  <div className="space-y-6">
                <div style={{ height: Math.max(220, Math.min(tanlanganOmborMahsulotlari.length, 10) * 48) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tanlanganOmborMahsulotlari.slice(0, 10).map((item) => ({
                        nom: item.productName,
                        summa: son(item.quantity),
                      }))}
                      layout="vertical"
                      margin={{ left: 24 }}
                      barSize={26}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={compactSum} />
                      <YAxis type="category" dataKey="nom" axisLine={false} tickLine={false} width={200} tick={{ fill: "#374151", fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString("uz-UZ")} ${t("units")}`, t("charts.warehouseDetail.quantity")]} contentStyle={tooltipStyle} />
                      <Bar dataKey="summa" radius={[0, 10, 10, 0]}>
                        {tanlanganOmborMahsulotlari.slice(0, 10).map((item, index) => (
                          <Cell key={item.modificationId} fill={index === 0 ? "#6366F1" : index < 3 ? "#818CF8" : "#C7D2FE"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-black uppercase tracking-wide text-gray-400">
                        <th className="px-4 py-3">{t("charts.warehouseDetail.table.product")}</th>
                        <th className="px-4 py-3 text-right">{t("charts.warehouseDetail.table.quantity")}</th>
                        <th className="px-4 py-3 text-right">{t("charts.warehouseDetail.table.value")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tanlanganOmborMahsulotlari.map((item) => (
                        <tr key={item.modificationId} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3 font-bold text-gray-800">{item.productName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600">
                            {son(item.quantity).toLocaleString("uz-UZ")} {t("units")}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-900">{pul(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={t("charts.topProducts.title")}
              subtitle={t("charts.topProducts.subtitle")}
              icon={Trophy}
              accent="amber"
              headerExtra={<DavrToggle value={topDavr} onChange={setTopDavr} />}
              xato={topXato}
              yuklanmoqda={topYuklanmoqda}
              height={Math.max(320, engKopSotilgan.length * 40)}
              bosh={engKopSotilgan.length === 0 ? t("noData") : undefined}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engKopSotilgan} layout="vertical" margin={{ left: 24 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={compactSum} />
                  <YAxis type="category" dataKey="nom" axisLine={false} tickLine={false} width={160} tick={{ fill: "#374151", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString("uz-UZ")} ${t("units")}`, t("charts.topProducts.title")]} contentStyle={tooltipStyle} />
                  <Bar dataKey="summa" radius={[0, 10, 10, 0]}>
                    {engKopSotilgan.map((item, index) => (
                      <Cell key={item.nom} fill={index === 0 ? "#F97316" : index < 3 ? "#FB923C" : "#FDBA74"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title={t("charts.bottomProducts.title")}
              subtitle={t("charts.bottomProducts.subtitle")}
              icon={TrendingDown}
              accent="violet"
              headerExtra={<DavrToggle value={bottomDavr} onChange={setBottomDavr} />}
              xato={bottomXato}
              yuklanmoqda={bottomYuklanmoqda}
              height={Math.max(320, engKamSotilgan.length * 40)}
              bosh={engKamSotilgan.length === 0 ? t("noData") : undefined}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engKamSotilgan} layout="vertical" margin={{ left: 24 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={compactSum} />
                  <YAxis type="category" dataKey="nom" axisLine={false} tickLine={false} width={160} tick={{ fill: "#374151", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString("uz-UZ")} ${t("units")}`, t("charts.bottomProducts.title")]} contentStyle={tooltipStyle} />
                  <Bar dataKey="summa" fill="#94A3B8" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: "10px",
  border: "1px solid #E2E8F0",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  yuklanmoqda,
  xato,
  rang = "orange",
  trend,
  belgi,
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  sub: string;
  yuklanmoqda: boolean;
  xato?: string;
  rang?: "orange" | "emerald" | "red";
  trend?: TrendMalumoti | null;
  belgi?: string;
}) {
  const { t } = useTranslation("monitoring");
  const ranglar = {
    orange: "bg-orange-50 text-orange-500",
    emerald: "bg-emerald-50 text-emerald-500",
    red: "bg-red-50 text-red-500",
  } as const;
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ranglar[rang]}`}>
          <Icon size={18} />
        </span>
        {trend ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
              trend.yangi ? "bg-blue-50 text-blue-600" : trend.foiz >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {!trend.yangi && (trend.foiz >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
            {trend.yangi ? t("kpi.trendNew") : `${trend.foiz >= 0 ? "+" : ""}${trend.foiz.toFixed(1)}%`}
          </span>
        ) : belgi ? (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-bold text-slate-400">{belgi}</span>
        ) : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-500">{label}</p>
      {yuklanmoqda ? (
        <div className="mt-2 h-7 w-2/3 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      )}
      {xato ? <p className="mt-1 text-xs font-bold text-red-500">{xato}</p> : <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  rang = "orange",
}: {
  icon: typeof Package;
  label: string;
  value: string;
  rang?: "orange" | "red";
}) {
  const ranglar = { orange: "bg-orange-50 text-orange-500", red: "bg-red-50 text-red-500" } as const;
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ranglar[rang]}`}>
        <Icon size={18} />
      </span>
      <div>
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <p className="text-lg font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// Har bir grafik kartasi o'zining mustaqil Kunlik/Oylik/Yillik almashtirgichiga ega
// bo'lishi uchun ishlatiladigan kichik qayta ishlatiluvchi komponent.
function DavrToggle({ value, onChange }: { value: Davr; onChange: (davr: Davr) => void }) {
  const { t } = useTranslation("monitoring");
  return (
    <div className="flex rounded-xl bg-blue-50 p-1">
      {(["kunlik", "oylik", "yillik"] as Davr[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            value === item ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
          }`}
        >
          {t(`period.${item === "kunlik" ? "daily" : item === "oylik" ? "monthly" : "yearly"}`)}
        </button>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  accent = "blue",
  headerExtra,
  xato,
  yuklanmoqda,
  height = 320,
  bosh,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: typeof TrendingUp;
  accent?: "blue" | "green" | "rose" | "amber" | "violet";
  headerExtra?: ReactNode;
  xato?: string;
  yuklanmoqda?: boolean;
  height?: number;
  bosh?: string;
  children: ReactNode;
}) {
  const iconStyle = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  }[accent];
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}><Icon size={17} strokeWidth={2} /></span>}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {headerExtra}
      </div>
      {xato && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      <div className={`rounded-xl p-1 sm:p-2 ${bosh ? "bg-slate-50/70" : "bg-white"}`} style={{ height: Math.min(height, 300) }}>
        {yuklanmoqda ? (
          <div className="flex h-full items-center justify-center font-bold text-gray-400">...</div>
        ) : bosh ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div className="flex flex-col items-center">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
                <TrendingUp size={17} strokeWidth={1.7} />
              </span>
              <p className="text-sm font-medium text-slate-500">{bosh}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

const OMBOR_RANGLARI = ["#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF"];

// Grafik + "Jami" summasi + har bir element ulushi (%) ro'yxatini birga ko'rsatadigan
// taqsimot kartochkasi (referens dizayndagi "Energiya resurslari sarfi" bo'limi uslubida).
function TaqsimotCard({
  title,
  subtitle,
  jamiLabel,
  shareLabel,
  items,
  bosh,
  xato,
  yuklanmoqda,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  jamiLabel: string;
  shareLabel: string;
  items: Nuqta[];
  bosh?: string;
  xato?: string;
  yuklanmoqda?: boolean;
  icon?: typeof Warehouse;
}) {
  const jami = items.reduce((sum, item) => sum + item.summa, 0);

  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon size={17} strokeWidth={2} /></span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {xato && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {yuklanmoqda ? (
        <div className="flex h-64 items-center justify-center font-bold text-gray-400">...</div>
      ) : bosh ? (
        <div className="flex h-64 items-center justify-center text-center font-bold text-gray-400">{bosh}</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={items} barSize={Math.max(24, Math.min(64, 240 / Math.max(items.length, 1)))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={compactSum} />
                <Tooltip formatter={(value) => [pul(Number(value)), title]} contentStyle={tooltipStyle} />
                <Bar dataKey="summa" radius={[10, 10, 0, 0]}>
                  {items.map((item, index) => (
                    <Cell key={item.nom} fill={OMBOR_RANGLARI[index % OMBOR_RANGLARI.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{jamiLabel}</p>
            <p className="mt-1 text-2xl font-black text-gray-950">{pul(jami)}</p>
            <p className="mb-3 mt-1 text-xs font-semibold text-gray-400">{shareLabel}</p>
            <div className="space-y-3">
              {items.map((item, index) => {
                const foiz = jami > 0 ? (item.summa / jami) * 100 : 0;
                return (
                  <div key={item.nom}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-bold text-gray-700">{item.nom}</span>
                      <span className="shrink-0 text-xs font-black text-gray-500">
                        {pul(item.summa)} · {foiz.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(2, foiz)}%`, backgroundColor: OMBOR_RANGLARI[index % OMBOR_RANGLARI.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  subtitle,
  items,
  bosh,
  xato,
  yuklanmoqda,
  rang = "red",
  icon: Icon,
  accent = "rose",
}: {
  title: string;
  subtitle: string;
  items: Array<{ nom: string; summa: number }>;
  bosh: string;
  xato?: string;
  yuklanmoqda?: boolean;
  rang?: "red" | "emerald";
  icon?: typeof Users;
  accent?: "blue" | "green" | "rose";
}) {
  const jami = items.reduce((sum, item) => sum + item.summa, 0);
  const maxSumma = Math.max(1, ...items.map((item) => item.summa));
  const iconStyle = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  }[accent];
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex items-center gap-3">
        {Icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}><Icon size={17} strokeWidth={2} /></span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {xato && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      <div className="mt-5 space-y-4">
        {yuklanmoqda ? (
          <div className="flex h-40 items-center justify-center font-bold text-gray-400">...</div>
        ) : items.length === 0 ? (
          <p className="flex h-40 items-center justify-center text-center font-bold text-gray-400">{bosh}</p>
        ) : (
          items.map((item) => {
            const foiz = jami > 0 ? (item.summa / jami) * 100 : 0;
            return (
              <div key={item.nom} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                  {item.nom.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-bold text-gray-700">{item.nom}</span>
                    <span className={`shrink-0 font-black ${rang === "red" ? "text-red-500" : "text-emerald-600"}`}>
                      {pul(item.summa)} <span className="text-gray-400">({foiz.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${rang === "red" ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.max(4, (item.summa / maxSumma) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
