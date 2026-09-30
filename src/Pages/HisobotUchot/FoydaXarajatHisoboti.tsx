import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download, PackageMinus, Percent, Receipt, TrendingDown, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import MuddatTanlov from "./MuddatTanlov";
import KopTanlovli from "./KopTanlovli";
import { useHisobotRealData } from "./HisobotRealData";
import { incomeExpenseReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { FoydaXarajatYozuvi } from "./types";
import { bugun, bugunMinus, pul } from "./yordamchilar";
import YuklanmoqdaHolati from "./YuklanmoqdaHolati";

// Foyda va xarajat (P&L) hisoboti — Daromad − Tannarx = Yalpi foyda − Xarajat = Sof foyda.
// Muddat/Filial bo'yicha real hisobot ma'lumotlari filtrlanadi.
type SatrModeli = { kategoriya: string; summa: number };
type IncomeExpenseResponse = {
  income?: {
    saleRevenue?: number | string;
    otherIncome?: number | string;
    total?: number | string;
  };
  cost?: { costOfGoods?: number | string };
  expenses?: {
    items?: Array<{ category?: string; name?: string; amount?: number | string }>;
    refunds?: number | string;
    total?: number | string;
  };
  summary?: {
    revenue?: number | string;
    cost?: number | string;
    grossProfit?: number | string;
    expense?: number | string;
    netProfit?: number | string;
  };
};

function guruhla(rows: FoydaXarajatYozuvi[], tur: "daromad" | "tannarx" | "xarajat"): SatrModeli[] {
  const map = new Map<string, number>();
  rows.filter((r) => r.tur === tur).forEach((r) => map.set(r.kategoriya, (map.get(r.kategoriya) ?? 0) + r.summa));
  return [...map.entries()].map(([kategoriya, summa]) => ({ kategoriya, summa })).sort((a, b) => b.summa - a.summa);
}

// Backenddan kelgan xarajat kategoriyalarini tushunarli o‘zbekcha nomga o‘giradi.
const KATEGORIYA_NOMLARI: Record<string, string> = {
  SALARY: "Ish haqi",
  RENT: "Ijara",
  UTILITIES: "Kommunal xizmatlar",
  ELECTRICITY: "Elektr energiyasi",
  WATER: "Suv",
  GAS: "Gaz",
  INTERNET: "Internet va aloqa",
  MARKETING: "Marketing va reklama",
  ADVERTISING: "Marketing va reklama",
  TRANSPORT: "Transport xarajatlari",
  DELIVERY: "Yetkazib berish",
  TAX: "Soliqlar",
  TAXES: "Soliqlar",
  SUPPLIES: "Xo‘jalik buyumlari",
  MAINTENANCE: "Ta’mirlash va xizmat",
  REPAIR: "Ta’mirlash",
  BONUS: "Mukofotlar",
  OTHER: "Boshqa xarajatlar",
  EXPENSE: "Xarajat",
};

function kategoriyaNomi(nom: string) {
  const kalit = nom.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (KATEGORIYA_NOMLARI[kalit]) return KATEGORIYA_NOMLARI[kalit];
  return /^[A-Z_]+$/.test(nom) ? nom.charAt(0) + nom.slice(1).toLowerCase().replace(/_/g, " ") : nom;
}

function foiz(qism: number, butun: number) {
  return butun ? `${((qism / butun) * 100).toFixed(1)}%` : "—";
}

export default function FoydaXarajatHisoboti() {
  const { filiallar: filialTanlovlari } = useHisobotRealData();
  const [dateFrom, setDateFrom] = useState(bugunMinus(30));
  const [dateTo, setDateTo] = useState(bugun());
  const [filiallar, setFiliallar] = useState<string[]>([]);
  const [foydaXarajat, setFoydaXarajat] = useState<FoydaXarajatYozuvi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    incomeExpenseReportApi
      .olish({
        dateFrom: new Date(`${dateFrom}T00:00:00.000Z`).toISOString(),
        dateTo: new Date(`${dateTo}T23:59:59.999Z`).toISOString(),
        branchIds: filiallar.length ? filiallar.join(",") : undefined,
      })
      .then((response) => {
        if (!active) return;
        const value = response as IncomeExpenseResponse;
        const sana = `${dateTo}T23:59:59.000Z`;
        const rows: FoydaXarajatYozuvi[] = [
          {
            id: "saleRevenue",
            sana,
            filialId: "",
            tur: "daromad",
            kategoriya: "Savdo tushumi",
            summa: Number(value.income?.saleRevenue ?? value.summary?.revenue ?? 0),
          },
          {
            id: "otherIncome",
            sana,
            filialId: "",
            tur: "daromad",
            kategoriya: "Boshqa daromad",
            summa: Number(value.income?.otherIncome ?? 0),
          },
          {
            id: "saleCost",
            sana,
            filialId: "",
            tur: "tannarx",
            kategoriya: "Sotilgan tovar tannarxi",
            summa: Number(value.cost?.costOfGoods ?? value.summary?.cost ?? 0),
          },
          ...(value.expenses?.items ?? []).map((item, index) => ({
            id: `expense-${item.category ?? index}`,
            sana,
            filialId: "",
            tur: "xarajat" as const,
            kategoriya: item.name || item.category || "Xarajat",
            summa: Number(item.amount ?? 0),
          })),
        ];
        const refunds = Number(value.expenses?.refunds ?? 0);
        if (refunds) {
          rows.push({
            id: "refunds",
            sana,
            filialId: "",
            tur: "xarajat",
            kategoriya: "Qaytarishlar",
            summa: refunds,
          });
        }
        setFoydaXarajat(rows.filter((item) => item.summa !== 0));
      })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo, filiallar]);

  const hisob = useMemo(() => {
    const rows = foydaXarajat;
    const daromadlar = guruhla(rows, "daromad");
    const tannarxlar = guruhla(rows, "tannarx");
    const xarajatlar = guruhla(rows, "xarajat");
    const jam = (s: SatrModeli[]) => s.reduce((a, b) => a + b.summa, 0);
    const daromad = jam(daromadlar);
    const tannarx = jam(tannarxlar);
    const xarajat = jam(xarajatlar);
    const yalpi = daromad - tannarx;
    const sof = yalpi - xarajat;
    return { daromadlar, tannarxlar, xarajatlar, daromad, tannarx, xarajat, yalpi, sof };
  }, [foydaXarajat]);

  async function eksport() {
    setXato("");
    try {
      await incomeExpenseReportApi.export({
        dateFrom: new Date(`${dateFrom}T00:00:00.000Z`).toISOString(),
        dateTo: new Date(`${dateTo}T23:59:59.999Z`).toISOString(),
        branchIds: filiallar.length ? filiallar.join(",") : undefined,
      }, "excel");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    }
  }

  const foydali = hisob.sof >= 0;

  return (
    <div className="space-y-5">
      {/* Filter paneli */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <MuddatTanlov
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />
          <KopTanlovli label="Filial" options={filialTanlovlari} selected={filiallar} onChange={setFiliallar} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => void eksport()}
          disabled={yuklanmoqda}
          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50 disabled:opacity-60"
        >
          <Download size={16} />
          Excel (.xlsx)
        </button>
        <p className="text-sm font-semibold text-slate-400">
          {dateFrom.split("-").reverse().join(".")} – {dateTo.split("-").reverse().join(".")}
        </p>
      </div>

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {yuklanmoqda ? (
        <section className="rounded-[28px] border border-orange-100 bg-white shadow-sm">
          <YuklanmoqdaHolati />
        </section>
      ) : (
        <>
          {/* Asosiy ko'rsatkichlar */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Korsatkich icon={TrendingUp} nom="Daromad" summa={hisob.daromad} izoh="Savdo va boshqa tushumlar" tone="emerald" />
            <Korsatkich icon={PackageMinus} nom="Tovar tannarxi" summa={-hisob.tannarx} izoh="Sotilgan tovarlar bo‘yicha" tone="amber" />
            <Korsatkich icon={Wallet} nom="Yalpi foyda" summa={hisob.yalpi} izoh={`Rentabellik ${foiz(hisob.yalpi, hisob.daromad)}`} tone="blue" />
            <Korsatkich icon={TrendingDown} nom="Xarajatlar" summa={-hisob.xarajat} izoh="Operatsion xarajatlar" tone="red" />
          </section>

          {/* Hisobot (statement) */}
          <section className="grid gap-5 xl:grid-cols-2">
            <Karta icon={TrendingUp} nom="Daromad" tone="emerald">
              {hisob.daromadlar.length === 0 ? (
                <BoshQator matn="Daromad yozuvlari yo‘q" />
              ) : (
                hisob.daromadlar.map((r) => (
                  <Satr key={r.kategoriya} nom={kategoriyaNomi(r.kategoriya)} summa={r.summa} jami={hisob.daromad} tone="emerald" />
                ))
              )}
              <Jami nom="Jami daromad" summa={hisob.daromad} tone="emerald" />
            </Karta>

            <Karta icon={Receipt} nom="Operatsion xarajatlar" tone="red">
              {hisob.xarajatlar.length === 0 ? (
                <BoshQator matn="Xarajat yozuvlari yo‘q" />
              ) : (
                hisob.xarajatlar.map((r) => (
                  <Satr key={r.kategoriya} nom={kategoriyaNomi(r.kategoriya)} summa={-r.summa} jami={hisob.xarajat} tone="red" />
                ))
              )}
              <Jami nom="Jami xarajatlar" summa={-hisob.xarajat} tone="red" />
            </Karta>

            <Karta icon={PackageMinus} nom="Sotilgan tovar tannarxi" tone="amber">
              {hisob.tannarxlar.length === 0 ? (
                <BoshQator matn="Tannarx yozuvlari yo‘q" />
              ) : (
                hisob.tannarxlar.map((r) => (
                  <Satr key={r.kategoriya} nom={kategoriyaNomi(r.kategoriya)} summa={-r.summa} jami={hisob.tannarx} tone="amber" />
                ))
              )}
              <Jami nom="Jami tannarx" summa={-hisob.tannarx} tone="amber" />
            </Karta>

            <Karta icon={Percent} nom="Natija" tone="blue">
              <Hisoblash nom="Daromad" summa={hisob.daromad} />
              <Hisoblash nom="Sotilgan tovar tannarxi" summa={-hisob.tannarx} />
              <Hisoblash nom="Yalpi foyda" summa={hisob.yalpi} izoh={`Rentabellik ${foiz(hisob.yalpi, hisob.daromad)}`} kuchli />
              <Hisoblash nom="Operatsion xarajatlar" summa={-hisob.xarajat} />
            </Karta>
          </section>

          {/* Sof foyda */}
          <section
            className={`relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[26px] border bg-white px-6 py-5 shadow-sm sm:px-8 ${
              foydali ? "border-emerald-100" : "border-red-100"
            }`}
          >
            <span className={`absolute inset-y-0 left-0 w-1.5 ${foydali ? "bg-emerald-500" : "bg-red-500"}`} />
            <div className="flex items-center gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  foydali ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                }`}
              >
                {foydali ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
              </span>
              <div>
                <p className="text-base font-black text-slate-800">{foydali ? "Sof foyda" : "Sof zarar"}</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    foydali ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  Rentabellik {foiz(hisob.sof, hisob.daromad)}
                </span>
              </div>
            </div>
            <span className={`tabular-nums text-2xl font-black sm:text-3xl ${foydali ? "text-emerald-600" : "text-red-500"}`}>
              {pul(hisob.sof)}
            </span>
          </section>
        </>
      )}
    </div>
  );
}

const TONLAR = {
  emerald: { matn: "text-emerald-600", fon: "bg-emerald-50", bar: "bg-emerald-400", halqa: "ring-emerald-100" },
  red: { matn: "text-red-500", fon: "bg-red-50", bar: "bg-red-400", halqa: "ring-red-100" },
  amber: { matn: "text-amber-600", fon: "bg-amber-50", bar: "bg-amber-400", halqa: "ring-amber-100" },
  blue: { matn: "text-blue-600", fon: "bg-blue-50", bar: "bg-blue-400", halqa: "ring-blue-100" },
} as const;
type Ton = keyof typeof TONLAR;

function Korsatkich({ icon: Icon, nom, summa, izoh, tone }: { icon: LucideIcon; nom: string; summa: number; izoh: string; tone: Ton }) {
  const t = TONLAR[tone];
  return (
    <div className={`rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ${t.halqa}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${t.fon} ${t.matn}`}><Icon size={20} /></span>
        <p className="text-sm font-bold text-slate-500">{nom}</p>
      </div>
      <p className={`mt-4 tabular-nums text-2xl font-black ${summa < 0 ? "text-red-500" : "text-slate-900"}`}>{pul(summa)}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{izoh}</p>
    </div>
  );
}

function Karta({ icon: Icon, nom, tone, children }: { icon: LucideIcon; nom: string; tone: Ton; children: ReactNode }) {
  const t = TONLAR[tone];
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.fon} ${t.matn}`}><Icon size={17} /></span>
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">{nom}</h3>
      </header>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Satr({ nom, summa, jami, tone }: { nom: string; summa: number; jami: number; tone: Ton }) {
  const t = TONLAR[tone];
  const ulush = jami ? Math.min(100, Math.abs(summa / jami) * 100) : 0;
  return (
    <div className="px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold text-slate-700">{nom}</span>
        <span className={`tabular-nums font-bold ${t.matn}`}>{pul(summa)}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${ulush}%` }} />
        </div>
        <span className="w-12 text-right text-xs font-bold text-slate-400">{ulush.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function Jami({ nom, summa, tone }: { nom: string; summa: number; tone: Ton }) {
  const t = TONLAR[tone];
  return (
    <div className={`flex items-center justify-between px-6 py-4 ${t.fon}`}>
      <span className="font-black text-slate-800">{nom}</span>
      <span className={`tabular-nums text-lg font-black ${t.matn}`}>{pul(summa)}</span>
    </div>
  );
}

function Hisoblash({ nom, summa, izoh, kuchli }: { nom: string; summa: number; izoh?: string; kuchli?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-6 ${kuchli ? "bg-blue-50 py-4" : "py-3.5"}`}>
      <div>
        <p className={kuchli ? "font-black text-slate-900" : "font-semibold text-slate-700"}>{nom}</p>
        {izoh && <p className="text-xs font-semibold text-slate-400">{izoh}</p>}
      </div>
      <span className={`tabular-nums ${kuchli ? "text-lg font-black" : "font-bold"} ${summa < 0 ? "text-red-500" : kuchli ? "text-blue-600" : "text-slate-800"}`}>{pul(summa)}</span>
    </div>
  );
}

function BoshQator({ matn }: { matn: string }) {
  return <div className="px-6 py-6 text-center text-sm font-semibold text-slate-400">{matn}</div>;
}
