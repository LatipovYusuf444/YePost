import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Link } from "react-router-dom";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import Dropdown from "./Dropdown";
import MuddatTanlov from "./MuddatTanlov";
import { useHisobotRealData } from "./HisobotRealData";
import { productProfitReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { bugun, bugunMinus, son } from "./yordamchilar";
import { korsatiladiganValyuta, useValyuta, type Valyuta } from "@/lib/valyuta";
import { foydaHisobotiniMoslash, type FoydaQatori as Qator } from "./foydaHisobotiModeli";
import { hisobotPulMatni } from "./hisobotValyutasi";

import YuklanmoqdaHolati from "./YuklanmoqdaHolati";

// Sotuv qatori narx turi bo'yicha filtr (GET /reports/product-profit?priceType=...).
const NARX_TURI_VARIANTLARI = [
  { value: "", nomi: "Barchasi" },
  { value: "RETAIL", nomi: "Chakana" },
  { value: "WHOLESALE", nomi: "Ulgurji" },
  { value: "COST", nomi: "Tannarx" },
  { value: "UNKNOWN", nomi: "Noma’lum" },
];
type NarxTuriFiltri = "" | "RETAIL" | "WHOLESALE" | "COST" | "UNKNOWN";

export default function FoydaHisoboti() {
  useValyuta();
  const tanlanganValyuta = korsatiladiganValyuta();
  const { kategoriyalar } = useHisobotRealData();
  const [dateFrom, setDateFrom] = useState(bugunMinus(30));
  const [dateTo, setDateTo] = useState(bugun());
  const [categoryId, setCategoryId] = useState("");
  const [narxTuri, setNarxTuri] = useState<NarxTuriFiltri>("");
  const [qidiruv, setQidiruv] = useState("");
  const [qatorlar, setQatorlar] = useState<Qator[]>([]);
  const [hisobotValyutasi, setHisobotValyutasi] = useState<Valyuta>(tanlanganValyuta);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
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
      priceType: narxTuri || undefined,
      currency: tanlanganValyuta,
    })
      .then((value) => {
        if (!active) return;
        const model = foydaHisobotiniMoslash(value, tanlanganValyuta);
        setHisobotValyutasi(model.valyuta);
        setQatorlar(model.qatorlar);
      })
      .catch((error) => { if (active) { setQatorlar([]); setXato(getApiErrorMessage(error)); } })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [categoryId, dateFrom, dateTo, narxTuri, tanlanganValyuta]);

  const pul = (summa: number) => hisobotPulMatni(summa, hisobotValyutasi);

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
    { id: "foyda", nom: "Yalpi foyda", kenglik: 180, hizalash: "right", katak: (item) => <span className={item.foyda >= 0 ? "font-black text-emerald-600" : "font-black text-red-500"}>{pul(item.foyda)}</span>, jami: () => <span className={jami.foyda >= 0 ? "text-emerald-600" : "text-red-500"}>{pul(jami.foyda)}</span> },
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
        priceType: narxTuri || undefined,
        currency: tanlanganValyuta,
      }, "excel");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setExportYuklanmoqda(false);
    }
  }

  return <div className="space-y-5">
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <MuddatTanlov dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <Dropdown label="Mahsulot kategoriyasi" value={categoryId} options={[{ value: "", nomi: "Barchasi" }, ...kategoriyalar.map((item) => ({ value: item.id, nomi: item.nomi }))]} onChange={setCategoryId} />
        <Dropdown label="Narx turi" value={narxTuri} options={NARX_TURI_VARIANTLARI} onChange={(value) => setNarxTuri(value as NarxTuriFiltri)} />
      </div>
    </section>
    <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
      Yalpi foyda = tushum − tannarx (qaytarilgan tovarlar ayirilgan, operatsion xarajatlarsiz). Sof foyda — xarajatlar ayirilgan natija — <Link to="/hisobotlar/foyda-xarajat" className="font-black underline underline-offset-2">«Foyda va xarajat»</Link> sahifasida.
    </p>
    {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" disabled={exportYuklanmoqda || yuklanmoqda || !korinadigan.length} onClick={() => void eksport()} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm disabled:opacity-50"><Download size={16}/>{exportYuklanmoqda ? "Yuklanmoqda..." : `Excel (.xlsx) · ${hisobotValyutasi}`}</button>
      <label className="relative sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder="Mahsulot bo‘yicha qidiruv" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"/></label>
    </div>
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
      {yuklanmoqda ? <YuklanmoqdaHolati /> : korinadigan.length ? <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={korinadigan} jamiBor /> : <div className="flex h-72 items-center justify-center font-bold text-slate-400">Tanlangan filtr bo‘yicha ma’lumot topilmadi.</div>}
    </section>
  </div>;
}
