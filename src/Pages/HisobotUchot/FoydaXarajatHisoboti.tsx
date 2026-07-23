import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import MuddatTanlov from "./MuddatTanlov";
import KopTanlovli from "./KopTanlovli";
import { useHisobotRealData } from "./HisobotRealData";
import { incomeExpenseReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { FoydaXarajatYozuvi } from "./types";
import { bugun, bugunMinus, pul } from "./yordamchilar";

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

      <button
        onClick={() => void eksport()}
        disabled={yuklanmoqda}
        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
      >
        <Download size={16} />
        Excel (.xlsx)
      </button>

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      {yuklanmoqda && <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-600">Hisobot backenddan shakllantirilmoqda...</p>}

      {/* Hisobot (statement) */}
      <section className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm">
        <Bolim nom="Daromad" />
        {hisob.daromadlar.length === 0 ? (
          <BoshQator matn="Daromad yozuvlari yo'q" />
        ) : (
          hisob.daromadlar.map((r) => <Satr key={r.kategoriya} nom={r.kategoriya} summa={r.summa} rang="text-emerald-600" />)
        )}
        <Satr nom="Jami daromad" summa={hisob.daromad} rang="text-emerald-600" jami />

        <Bolim nom="Sotilgan tovar tannarxi" />
        {hisob.tannarxlar.map((r) => (
          <Satr key={r.kategoriya} nom={r.kategoriya} summa={-r.summa} rang="text-red-500" />
        ))}

        <Yakun nom="Yalpi foyda" summa={hisob.yalpi} izoh={`Rentabellik ${foiz(hisob.yalpi, hisob.daromad)}`} />

        <Bolim nom="Operatsion xarajatlar" />
        {hisob.xarajatlar.length === 0 ? (
          <BoshQator matn="Xarajat yozuvlari yo'q" />
        ) : (
          hisob.xarajatlar.map((r) => <Satr key={r.kategoriya} nom={r.kategoriya} summa={-r.summa} rang="text-red-500" />)
        )}
        <Satr nom="Jami xarajatlar" summa={-hisob.xarajat} rang="text-red-500" jami />

        <Yakun nom="Sof foyda" summa={hisob.sof} izoh={`Rentabellik ${foiz(hisob.sof, hisob.daromad)}`} asosiy />
      </section>
    </div>
  );
}

function Bolim({ nom }: { nom: string }) {
  return (
    <div className="border-b border-orange-100 bg-orange-50/50 px-6 py-3 text-xs font-black uppercase tracking-wide text-orange-500">
      {nom}
    </div>
  );
}

function Satr({ nom, summa, rang, jami }: { nom: string; summa: number; rang: string; jami?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-orange-50 px-6 py-3 ${
        jami ? "bg-orange-50/30" : ""
      }`}
    >
      <span className={`${jami ? "font-black text-gray-800" : "pl-3 font-semibold text-gray-600"}`}>{nom}</span>
      <span className={`tabular-nums ${jami ? "font-black" : "font-bold"} ${rang}`}>{pul(summa)}</span>
    </div>
  );
}

function Yakun({ nom, summa, izoh, asosiy }: { nom: string; summa: number; izoh?: string; asosiy?: boolean }) {
  const rang = summa >= 0 ? "text-emerald-600" : "text-red-500";
  return (
    <div
      className={`flex items-center justify-between border-b border-orange-100 px-6 ${
        asosiy ? "bg-orange-500/95 py-5" : "bg-orange-50/70 py-4"
      }`}
    >
      <div>
        <p className={`font-black ${asosiy ? "text-lg text-white" : "text-gray-900"}`}>{nom}</p>
        {izoh && <p className={`text-xs font-semibold ${asosiy ? "text-orange-100" : "text-gray-400"}`}>{izoh}</p>}
      </div>
      <span className={`tabular-nums text-xl font-black ${asosiy ? "text-white" : rang}`}>{pul(summa)}</span>
    </div>
  );
}

function BoshQator({ matn }: { matn: string }) {
  return <div className="px-6 py-4 text-sm font-semibold text-gray-400">{matn}</div>;
}
