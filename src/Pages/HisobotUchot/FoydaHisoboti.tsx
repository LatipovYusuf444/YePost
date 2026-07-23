import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import Dropdown from "./Dropdown";
import MuddatTanlov from "./MuddatTanlov";
import { useHisobotRealData } from "./HisobotRealData";
import { productProfitReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { bugun, bugunMinus, pul, son } from "./yordamchilar";

type ProfitRow = {
  productId?: string;
  productName?: string;
  qtySold?: number | string;
  revenue?: number | string;
  cost?: number | string;
  profit?: number | string;
  marginPct?: number | string;
};

type Qator = {
  id: string;
  nomi: string;
  sotilgan: number;
  tushum: number;
  tannarx: number;
  foyda: number;
  rentabellik: number;
};

function rows(value: unknown): ProfitRow[] {
  if (Array.isArray(value)) return value as ProfitRow[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as ProfitRow[];
    if (Array.isArray(record.items)) return record.items as ProfitRow[];
    if (Array.isArray(record.value)) return record.value as ProfitRow[];
    return [record as ProfitRow];
  }
  return [];
}

export default function FoydaHisoboti() {
  const { kategoriyalar } = useHisobotRealData();
  const [dateFrom, setDateFrom] = useState(bugunMinus(30));
  const [dateTo, setDateTo] = useState(bugun());
  const [categoryId, setCategoryId] = useState("");
  const [qidiruv, setQidiruv] = useState("");
  const [qatorlar, setQatorlar] = useState<Qator[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [exportYuklanmoqda, setExportYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    productProfitReportApi.barchasi({
      groupBy: "PRODUCT",
      dateFrom: new Date(`${dateFrom}T00:00:00.000Z`).toISOString(),
      dateTo: new Date(`${dateTo}T23:59:59.999Z`).toISOString(),
      categoryId: categoryId || undefined,
    })
      .then((value) => {
        if (!active) return;
        setQatorlar(rows(value).map((item, index) => {
          const tushum = Number(item.revenue ?? 0);
          const foyda = Number(item.profit ?? 0);
          return {
            id: item.productId ?? `profit-${index}`,
            nomi: item.productName ?? "Mahsulot",
            sotilgan: Number(item.qtySold ?? 0),
            tushum,
            tannarx: Number(item.cost ?? 0),
            foyda,
            rentabellik: Number(item.marginPct ?? (tushum ? (foyda / tushum) * 100 : 0)),
          };
        }));
      })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [categoryId, dateFrom, dateTo]);

  const korinadigan = useMemo(() => {
    const key = qidiruv.trim().toLowerCase();
    return key ? qatorlar.filter((item) => item.nomi.toLowerCase().includes(key)) : qatorlar;
  }, [qatorlar, qidiruv]);

  const jami = useMemo(() => {
    const tushum = korinadigan.reduce((sum, item) => sum + item.tushum, 0);
    const foyda = korinadigan.reduce((sum, item) => sum + item.foyda, 0);
    return {
      sotilgan: korinadigan.reduce((sum, item) => sum + item.sotilgan, 0),
      tushum,
      tannarx: korinadigan.reduce((sum, item) => sum + item.tannarx, 0),
      foyda,
      rentabellik: tushum ? (foyda / tushum) * 100 : 0,
    };
  }, [korinadigan]);

  const ustunlar: Ustun<Qator>[] = [
    { id: "nomi", nom: "Mahsulot", kenglik: 240, katak: (item) => <span className="font-black text-slate-900">{item.nomi}</span>, jami: () => `Jami: ${korinadigan.length} mahsulot` },
    { id: "sotilgan", nom: "Sotilgan miqdor", kenglik: 160, hizalash: "right", katak: (item) => son(item.sotilgan), jami: () => son(jami.sotilgan) },
    { id: "tushum", nom: "Tushum", kenglik: 180, hizalash: "right", katak: (item) => pul(item.tushum), jami: () => pul(jami.tushum) },
    { id: "tannarx", nom: "Tannarx", kenglik: 180, hizalash: "right", katak: (item) => pul(item.tannarx), jami: () => pul(jami.tannarx) },
    { id: "foyda", nom: "Foyda", kenglik: 180, hizalash: "right", katak: (item) => <span className={item.foyda >= 0 ? "font-black text-emerald-600" : "font-black text-red-500"}>{pul(item.foyda)}</span>, jami: () => <span className={jami.foyda >= 0 ? "text-emerald-600" : "text-red-500"}>{pul(jami.foyda)}</span> },
    { id: "rentabellik", nom: "Rentabellik", kenglik: 150, hizalash: "right", katak: (item) => `${item.rentabellik.toFixed(2)}%`, jami: () => `${jami.rentabellik.toFixed(2)}%` },
  ];

  async function eksport() {
    if (exportYuklanmoqda) return;
    setExportYuklanmoqda(true);
    setXato("");
    try {
      await productProfitReportApi.export({
        groupBy: "PRODUCT",
        dateFrom: new Date(`${dateFrom}T00:00:00.000Z`).toISOString(),
        dateTo: new Date(`${dateTo}T23:59:59.999Z`).toISOString(),
        categoryId: categoryId || undefined,
      }, "excel");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setExportYuklanmoqda(false);
    }
  }

  return <div className="space-y-5">
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        <MuddatTanlov dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <Dropdown label="Mahsulot kategoriyasi" value={categoryId} options={[{ value: "", nomi: "Barchasi" }, ...kategoriyalar.map((item) => ({ value: item.id, nomi: item.nomi }))]} onChange={setCategoryId} />
      </div>
    </section>
    {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" disabled={exportYuklanmoqda} onClick={() => void eksport()} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm disabled:opacity-50"><Download size={16}/>{exportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx)"}</button>
      <label className="relative sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder="Mahsulot bo‘yicha qidiruv" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"/></label>
    </div>
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
      {yuklanmoqda ? <div className="flex h-72 items-center justify-center font-bold text-slate-400">Backenddan yuklanmoqda...</div> : korinadigan.length ? <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={korinadigan} jamiBor /> : <div className="flex h-72 items-center justify-center font-bold text-slate-400">Tanlangan filtr bo‘yicha ma’lumot topilmadi.</div>}
    </section>
  </div>;
}
