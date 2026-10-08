import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Boxes,
  Building2,
  CalendarDays,
  Coins,
  Download,
  Eraser,
  Info,
  Layers,
  ListFilter,
  LoaderCircle,
  Package,
  PackageCheck,
  PackageOpen,
  Search,
  SlidersHorizontal,
  Tags,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlov from "@/Pages/Ombor/KopTanlov";
import AppSelect from "@/Components/ui/AppSelect";
import KorsatkichKartasi, { KartaChiziqlari, KartaOlchagich } from "@/Components/common/KorsatkichKartasi";
import { FiltrChipi, FiltrGuruhi } from "@/Components/common/FiltrBolimlari";
import type { Tanlov } from "./types";
import { stockBalanceExport, stockBalanceReport, type StockBalanceResponse } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useHisobotRealData } from "./HisobotRealData";
import { pul, son } from "./yordamchilar";

import YuklanmoqdaHolati from "./YuklanmoqdaHolati";
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

// Tanlov maydonlari (Narx turi, Qoldiqlar) ko'p tanlovli maydonlar bilan bir xil ko'rinishda.
const SELECT_KLASS =
  "h-12 w-full rounded-xl !p-0 text-sm font-semibold text-gray-700 [&>button]:!border-slate-200 [&>button]:!bg-slate-50/60 [&>button]:!px-3.5 [&>button:hover]:!bg-white";

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

  // Narx va summa ustunlari qaysi narx turi bo'yicha hisoblanganini sarlavhada aniq ko'rsatadi (tan, sotuv yoki ulgurji).
  const narxNomi = narxVariantlari.find((item) => item.value === narxTuri)?.nomi ?? "Narx";

  const ustunlar: Ustun<Qator>[] = useMemo(() => {
    const ust: Ustun<Qator>[] = [
      {
        id: "nomi",
        nom: "Mahsulot",
        kenglik: 280,
        katak: (q) => (
          <span className="flex items-center gap-3">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-100">
              <Package size={16} />
            </span>
            <span className="min-w-0 font-black leading-snug text-gray-950">{q.nomi}</span>
          </span>
        ),
        jami: () => `Jami: ${jami.mahsulot} mahsulot`,
      },
    ];
    if (shtrixKod) {
      ust.push({ id: "barkod", nom: "Shtrix kod", kenglik: 160, katak: (q) => q.barkod });
    }
    ust.push(
      { id: "kategoriya", nom: "Kategoriya", kenglik: 160, katak: (q) => (q.kategoriya === "—" ? <span className="text-gray-400">—</span> : <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">{q.kategoriya}</span>) },
      { id: "birlik", nom: "Birlik", kenglik: 100, katak: (q) => <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{q.birlik || "—"}</span> },
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
      { id: "narx", nom: narxNomi, kenglik: 150, hizalash: "right", katak: (q) => pul(q.narx) },
      {
        id: "summa",
        nom: `Summa (${narxNomi})`,
        kenglik: 230,
        hizalash: "right",
        katak: (q) => <span className="font-bold text-gray-800">{pul(q.summa)}</span>,
        jami: () => <span className="font-black text-orange-600">{pul(jami.summa)}</span>,
      }
    );
    return ust;
  }, [jami, narxNomi, shtrixKod]);

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

  const faolFiltrlar =
    omborlar.length + filiallar.length + kategoriyalar.length + mahsulotlar.length + variatsiyalar.length + xarakteristikalar.length + (qoldiqTuri !== "hammasi" ? 1 : 0);
  const kartaYuklanmoqda = yuklanmoqda && !report;
  const yigindi = {
    bosh: Number(report?.summary.availableQuantity ?? 0),
    rezerv: Number(report?.summary.reservedQuantity ?? 0),
  };
  const ulush = (qism: number) => (jami.qoldiq > 0 ? Math.round((qism / jami.qoldiq) * 100) : 0);
  const oxirgiQatorlar = qatorlar.slice(0, 7);

  // Ro'yxat filtrlarini tozalaydi; hisobot parametrlar o'zgargani uchun o'zi qayta yuklanadi.
  function filtrlarniTozalash() {
    setOmborlar([]);
    setFiliallar([]);
    setKategoriyalar([]);
    setMahsulotlar([]);
    setVariatsiyalar([]);
    setXarakteristikalar([]);
    setQoldiqTuri("hammasi");
  }

  const tanlovVariantlari = (royxat: Tanlov[]) => royxat.map((item) => ({ id: item.id, label: item.nomi }));

  return (
    <div className="space-y-5">
      <section aria-label="Qoldiqlar xulosasi" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KorsatkichKartasi
          icon={Boxes}
          nom="Jami qoldiq"
          qiymat={son(jami.qoldiq)}
          rang="blue"
          belgi={{ matn: `${son(jami.mahsulot)} ta pozitsiya` }}
          ornament={<KartaChiziqlari qiymatlar={oxirgiQatorlar.map((item) => item.qoldiq)} klass="bg-blue-400" />}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni="Qoldiqlar yuklanmoqda..."
        />
        <KorsatkichKartasi
          icon={PackageCheck}
          nom="Bo'sh qoldiq"
          qiymat={son(yigindi.bosh)}
          rang="emerald"
          belgi={{ matn: `${ulush(yigindi.bosh)}%` }}
          ornament={<KartaOlchagich faol={yigindi.bosh} jami={jami.qoldiq} klass="bg-emerald-400" />}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni="Qoldiqlar yuklanmoqda..."
        />
        <KorsatkichKartasi
          icon={Bookmark}
          nom="Rezervdagi qoldiq"
          qiymat={son(yigindi.rezerv)}
          rang="amber"
          belgi={{ matn: `${ulush(yigindi.rezerv)}%` }}
          ornament={<KartaOlchagich faol={yigindi.rezerv} jami={jami.qoldiq} klass="bg-amber-400" />}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni="Qoldiqlar yuklanmoqda..."
        />
        <KorsatkichKartasi
          icon={Coins}
          nom={`Umumiy qiymat (${narxNomi})`}
          qiymat={pul(jami.summa)}
          rang="violet"
          ornament={<KartaChiziqlari qiymatlar={oxirgiQatorlar.map((item) => item.summa)} klass="bg-violet-400" />}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni="Qoldiqlar yuklanmoqda..."
        />
      </section>

      {/* Filter paneli — backend "Ombor qoldig'i" hujjat filtriga mos */}
      <section className="rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)]">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-[26px] border-b border-slate-100 bg-linear-to-r from-orange-50/70 via-white to-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-400 text-white shadow-md shadow-orange-200/60">
              <SlidersHorizontal size={19} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-gray-900">Filtrlar</h2>
                {faolFiltrlar > 0 && (
                  <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold tabular-nums text-white">{faolFiltrlar} ta filtr tanlangan</span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-medium text-gray-500">Filtr o‘zgarganda hisobot avtomatik yangilanadi</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {faolFiltrlar > 0 && (
              <button
                type="button"
                onClick={filtrlarniTozalash}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold text-gray-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-gray-800"
              >
                <Eraser size={15} aria-hidden /> Filtrlarni tozalash
              </button>
            )}
            <div className="flex w-full items-center gap-1.5 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200 sm:w-auto">
              <span className="flex shrink-0 items-center gap-1.5 pl-2.5 pr-1 text-xs font-bold text-gray-500">
                <CalendarDays size={14} className="text-orange-500" aria-hidden /> <span className="hidden sm:inline">Sana bo‘yicha</span>
              </span>
              <input
                type="date"
                value={sana}
                onChange={(e) => setSana(e.target.value)}
                aria-label="Sana bo‘yicha"
                className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
              />
              <button
                type="button"
                onClick={() => setSana(bugungiSana)}
                className="h-9 shrink-0 cursor-pointer rounded-xl bg-orange-500 px-3.5 text-xs font-black text-white transition hover:bg-orange-600"
              >
                Bugun
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <FiltrGuruhi nom="Joylashuv va hisoblash" rang="bg-indigo-400" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KopTanlov ikonka={Warehouse} sarlavha="Ombor" variantlar={tanlovVariantlari(omborTanlovlari)} tanlangan={omborlar} onOzgarish={setOmborlar} />
              <KopTanlov ikonka={Building2} sarlavha="Filial" variantlar={tanlovVariantlari(filialTanlovlari)} tanlangan={filiallar} onOzgarish={setFiliallar} />
              <div className="min-w-0">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500"><Coins size={13} aria-hidden className="shrink-0 text-gray-400" />Narx turi</p>
                <AppSelect value={narxTuri} onChange={(e) => setNarxTuri(e.target.value as NarxTuri)} className={SELECT_KLASS}>
                  {narxVariantlari.map((item) => <option key={item.value} value={item.value}>{item.nomi}</option>)}
                </AppSelect>
              </div>
              <div className="min-w-0">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500"><Package size={13} aria-hidden className="shrink-0 text-gray-400" />Qoldiqlar</p>
                <AppSelect value={qoldiqTuri} onChange={(e) => setQoldiqTuri(e.target.value as QoldiqTuri)} className={SELECT_KLASS}>
                  {qoldiqVariantlari.map((item) => <option key={item.value} value={item.value}>{item.nomi}</option>)}
                </AppSelect>
              </div>
            </div>
          </div>

          <div>
            <FiltrGuruhi nom="Mahsulot bo‘yicha" rang="bg-emerald-400" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KopTanlov ikonka={Tags} sarlavha="Mahsulot kategoriyasi" variantlar={tanlovVariantlari(kategoriyaTanlovlari)} tanlangan={kategoriyalar} onOzgarish={setKategoriyalar} />
              <KopTanlov ikonka={Package} sarlavha="Mahsulot" variantlar={tanlovVariantlari(maxsulotTanlovlari)} tanlangan={mahsulotlar} onOzgarish={setMahsulotlar} />
              <KopTanlov ikonka={Layers} sarlavha="Variatsiyalar" variantlar={tanlovVariantlari(variatsiyaTanlovlari)} tanlangan={variatsiyalar} onOzgarish={setVariatsiyalar} />
              <KopTanlov ikonka={ListFilter} sarlavha="Xarakteristika" variantlar={tanlovVariantlari(xarakteristikaTanlovlari)} tanlangan={xarakteristikalar} onOzgarish={setXarakteristikalar} />
            </div>
          </div>

          <div>
            <FiltrGuruhi nom="Jadval ko‘rinishi" rang="bg-amber-400" />
            <div className="flex flex-wrap gap-2.5">
              <FiltrChipi nom="Rezervni ko‘rsatish" ikonka={Bookmark} belgilangan={rezervni} onOzgarish={setRezervni} />
              <FiltrChipi nom="Omborlar bo‘yicha ajratish" ikonka={Warehouse} belgilangan={omborBoyicha} onOzgarish={setOmborBoyicha} />
              <FiltrChipi nom="Shtrix kodni ko‘rsatish" ikonka={Package} belgilangan={shtrixKod} onOzgarish={setShtrixKod} />
              <FiltrChipi nom="Variatsiyalarni ko‘rsatish" ikonka={Boxes} belgilangan={variatsiyaKor} onOzgarish={setVariatsiyaKor} />
            </div>
          </div>
        </div>
      </section>

      {/* Amal qatori */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={eksport}
          disabled={exportYuklanmoqda}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportYuklanmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}
          {exportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx)"}
        </button>
        <label className="relative w-full min-w-0 sm:ml-auto sm:max-w-sm sm:flex-1">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={qidiruv}
            onChange={(e) => setQidiruv(e.target.value)}
            placeholder="Mahsulot, kategoriya, artikul..."
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
          />
        </label>
      </div>

      {xato && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          <TriangleAlert size={17} aria-hidden /> {xato}
        </p>
      )}

      {/* Natija jadvali */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)]">
        {yuklanmoqda ? (
          <YuklanmoqdaHolati />
        ) : qatorlar.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><PackageOpen size={26} /></span>
            <p className="font-semibold text-gray-500">Tanlangan filtrlar bo'yicha qoldiq topilmadi.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
              <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Summa <b className="font-extrabold">«{narxNomi}»</b> bo‘yicha hisoblangan (qoldiq × {narxNomi.toLowerCase()}). Boshqa narx turidagi qiymatni
                ko‘rish uchun yuqoridagi «Narx turi» ni o‘zgartiring — jami summa ham shunga qarab o‘zgaradi.
              </span>
            </p>
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
