import { useEffect, useMemo, useState } from "react";
import { Check, Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import Dropdown from "./Dropdown";
import { stockBalanceExport, stockBalanceReport, type StockBalanceResponse } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useHisobotRealData } from "./HisobotRealData";
import { son } from "./yordamchilar";

// Ombor qoldig'i backenddagi /reports/stock-balance natijasidan olinadi.
// Filter paneli backend "Ombor qoldig'i" hujjat filtriga mos: sana, ombor, filial,
// kategoriya, mahsulot, narx turi, variatsiya, xarakteristika, qoldiqlar + belgilar.
type NarxTuri = "tanNarx" | "sotuvNarx" | "ulgurjiNarx";
type QoldiqTuri = "hammasi" | "musbat" | "nol" | "manfiy";

const narxVariantlari: { value: string; nomi: string }[] = [
  { value: "tanNarx", nomi: "Tan narxi" },
  { value: "sotuvNarx", nomi: "Sotuv narxi" },
  { value: "ulgurjiNarx", nomi: "Ulgurji narx" },
];

const qoldiqVariantlari: { value: string; nomi: string }[] = [
  { value: "hammasi", nomi: "Hammasi" },
  { value: "musbat", nomi: "Musbat" },
  { value: "nol", nomi: "Nol" },
  { value: "manfiy", nomi: "Manfiy" },
];

const bugungiSana = new Date().toISOString().slice(0, 10);

type Qator = {
  id: string;
  nomi: string;
  barkod: string;
  kategoriya: string;
  birlik: string;
  qoldiq: number;
  narx: number;
  summa: number;
};

export default function QoldiqHisoboti() {
  const {
    maxsulotlar: katalogMahsulotlar,
    omborlar: omborTanlovlari,
    filiallar: filialTanlovlari,
    kategoriyalar: kategoriyaTanlovlari,
    variatsiyalar: variatsiyaTanlovlari,
    xarakteristikalar: xarakteristikaTanlovlari,
  } = useHisobotRealData();
  const [sana, setSana] = useState(bugungiSana);
  const [omborlar, setOmborlar] = useState<string[]>([]);
  const [filiallar, setFiliallar] = useState<string[]>([]);
  const [kategoriyalar, setKategoriyalar] = useState<string[]>([]);
  const [mahsulotlar, setMahsulotlar] = useState<string[]>([]);
  const [variatsiyalar, setVariatsiyalar] = useState<string[]>([]);
  const [xarakteristikalar, setXarakteristikalar] = useState<string[]>([]);
  const [narxTuri, setNarxTuri] = useState<NarxTuri>("sotuvNarx");
  const [qoldiqTuri, setQoldiqTuri] = useState<QoldiqTuri>("hammasi");
  // Ko'rsatish belgilari (backend filtridagi checkboxlar)
  const [rezervni, setRezervni] = useState(true);
  const [omborBoyicha, setOmborBoyicha] = useState(false);
  const [shtrixKod, setShtrixKod] = useState(false);
  const [variatsiyaKor, setVariatsiyaKor] = useState(false);
  const [qidiruv, setQidiruv] = useState("");
  const [report, setReport] = useState<StockBalanceResponse | null>(null);
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [exportYuklanmoqda, setExportYuklanmoqda] = useState(false);

  const maxsulotTanlovlari = useMemo(
    () => katalogMahsulotlar.map((m) => ({ id: m.id, nomi: m.nomi })),
    [katalogMahsulotlar]
  );

  const params = useMemo(() => ({
    asOf: sana,
    warehouseIds: omborlar.length ? omborlar.join(",") : undefined,
    branchIds: filiallar.length ? filiallar.join(",") : undefined,
    categoryIds: kategoriyalar.length ? kategoriyalar.join(",") : undefined,
    productIds: mahsulotlar.length ? mahsulotlar.join(",") : undefined,
    modificationIds: variatsiyalar.length ? variatsiyalar.join(",") : undefined,
    balanceStatus: ({ hammasi: "ALL", musbat: "POSITIVE", nol: "ZERO", manfiy: "NEGATIVE" } as const)[qoldiqTuri],
    priceType: ({ tanNarx: "COST", sotuvNarx: "RETAIL", ulgurjiNarx: "WHOLESALE" } as const)[narxTuri],
    groupByWarehouse: omborBoyicha,
    includeReserved: rezervni,
    search: qidiruv.trim() || undefined,
    page: 1,
    pageSize: 1000,
  }), [filiallar, kategoriyalar, mahsulotlar, narxTuri, omborBoyicha, omborlar, qidiruv, qoldiqTuri, rezervni, sana, variatsiyalar]);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    stockBalanceReport(params)
      .then((value) => { if (active) setReport(value); })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [params]);

  const qatorlar = useMemo<Qator[]>(() => (report?.items ?? []).map((item) => {
    const product = katalogMahsulotlar.find((entry) => entry.id === item.productId);
    const narx = narxTuri === "tanNarx"
      ? Number(item.costPrice ?? 0)
      : narxTuri === "ulgurjiNarx"
        ? Number(item.wholesalePrice ?? 0)
        : Number(item.retailPrice ?? 0);
    return {
      id: `${item.warehouseId ?? "all"}-${item.modificationId}`,
      nomi: [item.productName, variatsiyaKor ? item.modificationName : ""].filter(Boolean).join(" — "),
      barkod: item.barcode ?? "",
      kategoriya: kategoriyaTanlovlari.find((entry) => entry.id === product?.categoryId)?.nomi ?? "—",
      birlik: item.unitName ?? product?.birlik ?? "",
      qoldiq: Number(item.quantity ?? 0),
      narx,
      summa: Number(item.totalAmount ?? Number(item.quantity ?? 0) * narx),
    };
  }), [katalogMahsulotlar, kategoriyaTanlovlari, narxTuri, report, variatsiyaKor]);

  const jami = useMemo(() => ({
    mahsulot: report?.total ?? qatorlar.length,
    qoldiq: Number(report?.summary.quantity ?? 0),
    summa: Number(report?.summary.totalAmount ?? 0),
  }), [qatorlar.length, report]);

  const ustunlar: Ustun<Qator>[] = useMemo(() => {
    const ust: Ustun<Qator>[] = [
      {
        id: "nomi",
        nom: "Mahsulot",
        kenglik: 240,
        katak: (q) => <span className="font-black text-gray-950">{q.nomi}</span>,
        jami: () => `Jami: ${jami.mahsulot} mahsulot`,
      },
    ];
    if (shtrixKod) {
      ust.push({ id: "barkod", nom: "Shtrix kod", kenglik: 160, katak: (q) => q.barkod });
    }
    ust.push(
      { id: "kategoriya", nom: "Kategoriya", kenglik: 150, katak: (q) => q.kategoriya },
      { id: "birlik", nom: "Birlik", kenglik: 100, katak: (q) => q.birlik },
      {
        id: "qoldiq",
        nom: "Qoldiq",
        kenglik: 120,
        katak: (q) => (
          <span
            className={`font-black ${
              q.qoldiq > 0 ? "text-emerald-600" : q.qoldiq < 0 ? "text-red-500" : "text-gray-400"
            }`}
          >
            {son(q.qoldiq)}
          </span>
        ),
        jami: () => son(jami.qoldiq),
      },
      { id: "narx", nom: "Narx", kenglik: 140, katak: (q) => `${son(q.narx)} so'm` },
      {
        id: "summa",
        nom: "Summa",
        kenglik: 160,
        katak: (q) => <span className="font-bold text-gray-800">{son(q.summa)} so'm</span>,
        jami: () => <span className="font-black text-orange-600">{son(jami.summa)} so'm</span>,
      }
    );
    return ust;
  }, [jami, shtrixKod]);

  async function eksport() {
    if (exportYuklanmoqda) return;
    setExportYuklanmoqda(true);
    setXato("");
    try {
      await stockBalanceExport(params);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setExportYuklanmoqda(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Filter paneli — backend "Ombor qoldig'i" hujjat filtriga mos */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        {/* Sana bo'yicha */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-bold text-gray-700">Sana bo'yicha</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={sana}
              onChange={(e) => setSana(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={() => setSana(bugungiSana)}
              className="h-11 rounded-2xl border border-orange-100 bg-orange-50 px-4 text-sm font-bold text-orange-600 transition hover:bg-orange-100"
            >
              Bugun
            </button>
          </div>
        </div>

        {/* Filtrlar to'ri */}
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <KopTanlovli label="Ombor" options={omborTanlovlari} selected={omborlar} onChange={setOmborlar} />
          <KopTanlovli label="Filial" options={filialTanlovlari} selected={filiallar} onChange={setFiliallar} />
          <KopTanlovli
            label="Mahsulot kategoriyasi"
            options={kategoriyaTanlovlari}
            selected={kategoriyalar}
            onChange={setKategoriyalar}
           
          />
          <KopTanlovli
            label="Mahsulot"
            options={maxsulotTanlovlari}
            selected={mahsulotlar}
            onChange={setMahsulotlar}
           
          />
          <Dropdown
            label="Narx turi"
            value={narxTuri}
            options={narxVariantlari}
            onChange={(v) => setNarxTuri(v as NarxTuri)}
          />
          <KopTanlovli
            label="Variatsiyalar"
            options={variatsiyaTanlovlari}
            selected={variatsiyalar}
            onChange={setVariatsiyalar}
           
          />
          <KopTanlovli
            label="Xarakteristika"
            options={xarakteristikaTanlovlari}
            selected={xarakteristikalar}
            onChange={setXarakteristikalar}
           
          />
          <Dropdown
            label="Qoldiqlar"
            value={qoldiqTuri}
            options={qoldiqVariantlari}
            onChange={(v) => setQoldiqTuri(v as QoldiqTuri)}
          />
        </div>

        {/* Ko'rsatish belgilari */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t border-orange-50 pt-4">
          <Belgi label="Rezervni ko'rsatish" belgili={rezervni} onToggle={() => setRezervni((v) => !v)} />
          <Belgi label="Omborlar bo'yicha ajratish" belgili={omborBoyicha} onToggle={() => setOmborBoyicha((v) => !v)} />
          <Belgi label="Shtrix kodni ko'rsatish" belgili={shtrixKod} onToggle={() => setShtrixKod((v) => !v)} />
          <Belgi label="Variatsiyalarni ko'rsatish" belgili={variatsiyaKor} onToggle={() => setVariatsiyaKor((v) => !v)} />
        </div>
      </section>

      {/* Amal qatori */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {xato && <p className="text-sm font-bold text-red-600">{xato}</p>}
        <button
          onClick={eksport}
          disabled={exportYuklanmoqda}
          className="inline-flex h-12 items-center gap-2 self-start rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
        >
          <Download size={16} />
          {exportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx)"}
        </button>
        <div className="relative md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={qidiruv}
            onChange={(e) => setQidiruv(e.target.value)}
            placeholder="Mahsulot, kategoriya, artikul..."
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {/* Natija jadvali */}
      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        {yuklanmoqda ? (
          <div className="flex h-72 items-center justify-center font-bold text-gray-400">Backenddan yuklanmoqda...</div>
        ) : qatorlar.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 text-center">
            <div>
              <Search className="mx-auto text-orange-300" size={40} />
              <p className="mt-3 font-bold text-gray-500">Tanlangan filtrlar bo'yicha qoldiq topilmadi.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-gray-400">
              Ustun chetini tortib kengaytiring, sarlavhani sudrab joyini almashtiring.
            </p>
            <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={qatorlar} jamiBor />
          </>
        )}
      </section>
    </div>
  );
}

function Belgi({
  label,
  belgili,
  onToggle,
}: {
  label: string;
  belgili: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
          belgili ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check size={14} strokeWidth={3} />
      </span>
      {label}
    </button>
  );
}
