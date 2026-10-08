import { pulMatni } from "@/lib/valyuta";
import AppSelect from "@/Components/ui/AppSelect";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bookmark,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  Coins,
  Eraser,
  Layers,
  ListFilter,
  Tags,
  FileDown,
  LoaderCircle,
  Package,
  PackageCheck,
  PackageOpen,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import {
  kategoriyalarApi,
  mahsulotlarApi,
} from "@/api/catalogApi";
import {
  barchaModifikatsiyalar,
  filiallarApi,
  omborlarApi,
} from "@/api/omborApi";
import { stockBalanceExport, stockBalanceReport, type StockBalanceParams, type StockBalanceResponse } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import KopTanlov from "./KopTanlov";
import { FiltrGuruhi } from "@/Components/common/FiltrBolimlari";
import OmborJadval from "./OmborJadval";
import TablePagination from "@/Components/common/TablePagination";
import KorsatkichKartasi, { KartaChiziqlari, KartaOlchagich } from "@/Components/common/KorsatkichKartasi";
import LoadingState from "@/Components/common/LoadingState";
import type {
  Kategoriya,
  Mahsulot,
} from "@/types/catalog";
import type {
  Filial,
  MahsulotModifikatsiyasi,
  Ombor,
} from "@/types/ombor";

type NarxTuri = "costPrice" | "retailPrice" | "wholesalePrice";
type QoldiqFiltri = "hammasi" | "musbat" | "nol" | "manfiy";

type Filtr = {
  sana: string;
  omborlar: string[];
  filiallar: string[];
  kategoriyalar: string[];
  mahsulotlar: string[];
  narxTuri: NarxTuri;
  variatsiyalar: string[];
  xarakteristikalar: string[];
  qoldiqTuri: QoldiqFiltri;
  omborlarBoyichaAjratish: boolean;
  shtrixKodniKorsatish: boolean;
  variatsiyalarniKorsatish: boolean;
};

type Satr = {
  kalit: string;
  mahsulotNomi: string;
  birlik: string;
  shtrixKod: string;
  variatsiya: string;
  omborNomi: string;
  jami: number;
  rezerv: number;
  bosh: number;
  birlikNarx: number;
  umumiy: number;
};


const bugun = () => new Date().toISOString().slice(0, 10);

const BOSHLANGICH_FILTR: Filtr = {
  sana: bugun(),
  omborlar: [],
  filiallar: [],
  kategoriyalar: [],
  mahsulotlar: [],
  narxTuri: "costPrice",
  variatsiyalar: [],
  xarakteristikalar: [],
  qoldiqTuri: "hammasi",
  omborlarBoyichaAjratish: false,
  shtrixKodniKorsatish: false,
  variatsiyalarniKorsatish: false,
};

const narxTurlari: Array<{ kalit: NarxTuri }> = [
  { kalit: "costPrice" },
  { kalit: "retailPrice" },
  { kalit: "wholesalePrice" },
];

function raqam(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function pul(value: number) {
  return pulMatni(value);
}

// Miqdor: kasr bo'lishi mumkin (kg, litr), minglik ajratgich bilan.
function son(value: number) {
  return value.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
}

// Kartalar uchun yaxlitlangan summa.
function pulYaxlit(value: number) {
  return pulMatni(value, "UZS", true);
}

function sana(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

function mahsulotNomi(product: Mahsulot | undefined, modification: MahsulotModifikatsiyasi, nomalumMahsulotMatni: string) {
  return product?.name ?? modification.product?.name ?? modification.name ?? nomalumMahsulotMatni;
}

function variantNomi(modification: MahsulotModifikatsiyasi, asosiyVariantMatni: string) {
  const params = Object.entries(modification.params ?? {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
  return modification.name?.trim() || params || asosiyVariantMatni;
}

function reportParams(value:Filtr,search="",page=1,pageSize=10):StockBalanceParams{return {asOf:value.sana||undefined,warehouseIds:value.omborlar.length?value.omborlar.join(","):undefined,branchIds:value.filiallar.length?value.filiallar.join(","):undefined,categoryIds:value.kategoriyalar.length?value.kategoriyalar.join(","):undefined,productIds:value.mahsulotlar.length?value.mahsulotlar.join(","):undefined,modificationIds:value.variatsiyalar.length?value.variatsiyalar.join(","):undefined,balanceStatus:value.qoldiqTuri==="musbat"?"POSITIVE":value.qoldiqTuri==="nol"?"ZERO":value.qoldiqTuri==="manfiy"?"NEGATIVE":"ALL",priceType:value.narxTuri==="retailPrice"?"RETAIL":value.narxTuri==="wholesalePrice"?"WHOLESALE":"COST",groupByWarehouse:value.omborlarBoyichaAjratish,search:search.trim()||undefined,page,pageSize}}

export default function OmborQoldigi() {
  const { t } = useTranslation("ombor_royxat");
  const [omborlar, setOmborlar] = useState<Ombor[]>([]);
  const [filiallar, setFiliallar] = useState<Filial[]>([]);
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>([]);
  const [mahsulotlar, setMahsulotlar] = useState<Mahsulot[]>([]);
  const [modifikatsiyalar, setModifikatsiyalar] = useState<MahsulotModifikatsiyasi[]>([]);
  const [report,setReport]=useState<StockBalanceResponse>({items:[],total:0,page:1,pageSize:10,totalPages:1,summary:{quantity:0,reservedQuantity:0,availableQuantity:0,totalAmount:0}});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportYuklanmoqda,setExportYuklanmoqda]=useState(false);
  const [filtr, setFiltr] = useState<Filtr>(BOSHLANGICH_FILTR);
  const [qollangan, setQollangan] = useState<Filtr>(BOSHLANGICH_FILTR);
  const [shakllantirilgan, setShakllantirilgan] = useState(bugun());
  const [jadvalQidiruvi, setJadvalQidiruvi] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState<string | null>(null);
  // Hisobot faqat "Hisobotni shakllantirish" bosilganda olinadi: bundan oldin kartalarda "0" emas, "—" ko'rsatiladi.
  const [shakllantirildi, setShakllantirildi] = useState(false);

  const malumotlarniYuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik(null);
    try {
      const [
        warehouses,
        branches,
        categories,
        products,
        modifications,
      ] = await Promise.all([
        omborlarApi.royxat(),
        filiallarApi.royxat(),
        kategoriyalarApi.royxat(),
        mahsulotlarApi.royxat(),
        barchaModifikatsiyalar(),
      ]);
      setOmborlar(warehouses);
      setFiliallar(branches);
      setKategoriyalar(categories);
      setMahsulotlar(products);
      setModifikatsiyalar(modifications);
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  function ozgartirish<K extends keyof Filtr>(kalit: K, qiymat: Filtr[K]) {
    setFiltr((old) => ({ ...old, [kalit]: qiymat }));
  }

  // Faqat shakldagi ro'yxat filtrlarini tozalaydi (sana, narx turi va ko'rinish sozlamalari qoladi); hisobot qayta so'ralmaydi.
  function filtrlarniTozalash() {
    setFiltr((old) => ({
      ...old,
      omborlar: [],
      filiallar: [],
      kategoriyalar: [],
      mahsulotlar: [],
      variatsiyalar: [],
      xarakteristikalar: [],
      qoldiqTuri: "hammasi",
    }));
  }

  async function hisobotniShakllantirish() {
    setYuklanmoqda(true);setXatolik(null);
    try{const applied={...filtr};setPage(1);setReport(await stockBalanceReport(reportParams(applied,jadvalQidiruvi,1,pageSize)));setQollangan(applied);setShakllantirildi(true)}catch(error){setXatolik(getApiErrorMessage(error))}finally{setYuklanmoqda(false)}
    setShakllantirilgan(bugun());
  }

  async function sahifaniOlish(nextPage:number,nextSize=pageSize) {
    setPage(nextPage);setPageSize(nextSize);setYuklanmoqda(true);
    try { setReport(await stockBalanceReport(reportParams(qollangan,jadvalQidiruvi,nextPage,nextSize))); }
    catch(error) { setXatolik(getApiErrorMessage(error)); }
    finally { setYuklanmoqda(false); }
  }

  const productMap = useMemo(
    () => new Map(mahsulotlar.map((item) => [item.id, item])),
    [mahsulotlar]
  );

  const variatsiyaVariantlari = useMemo(
    () =>
      modifikatsiyalar.map((item) => ({
        id: item.id,
        label: `${mahsulotNomi(productMap.get(item.productId ?? item.product?.id ?? ""), item, t("omborQoldigi.unknownProduct"))} — ${variantNomi(item, t("omborQoldigi.baseVariant"))}`,
      })),
    [modifikatsiyalar, productMap, t]
  );

  const xarakteristikaVariantlari = useMemo(() => {
    const variants = new Map<string, string>();
    for (const modification of modifikatsiyalar) {
      for (const [key, value] of Object.entries(modification.params ?? {})) {
        if (value === null || value === undefined || !String(value).trim()) continue;
        const id = `${key}:${String(value)}`;
        variants.set(id, `${key}: ${String(value)}`);
      }
    }
    return Array.from(variants, ([id, label]) => ({ id, label }));
  }, [modifikatsiyalar]);

  const satrlar = useMemo<Satr[]>(() => {
    return report.items.map((item) => {
      const birlikNarx = raqam(qollangan.narxTuri === "retailPrice" ? item.retailPrice : qollangan.narxTuri === "wholesalePrice" ? item.wholesalePrice : item.costPrice);
      return { kalit: `${item.modificationId}:${item.warehouseId ?? "all"}`, mahsulotNomi: item.productName, birlik: item.unitName || "—", shtrixKod: item.barcode || "", variatsiya: item.modificationName || t("omborQoldigi.baseVariant"), omborNomi: item.warehouseName || t("omborQoldigi.allWarehouses"), jami: raqam(item.quantity), rezerv: raqam(item.reservedQuantity), bosh: raqam(item.availableQuantity), birlikNarx, umumiy: raqam(item.totalAmount) };
    });
    /* Eski client-side hisoblash olib tashlandi.
    const qoldiqlar: never[] = [];
    const groups = new Map<string, Satr>();

    for (const rawStock of qoldiqlar) {
      const stock = rawStock as KengaytirilganQoldiq;
      const modification = rawStock.modification ?? modificationMap.get(rawStock.modificationId);
      if (!modification) continue;
      const productId = modification.productId ?? modification.product?.id ?? "";
      const product = productMap.get(productId);
      const warehouse = rawStock.warehouse ?? omborMap.get(rawStock.warehouseId ?? "");
      const warehouseId = rawStock.warehouseId ?? warehouse?.id ?? "";

      if (qollangan.omborlar.length && !qollangan.omborlar.includes(warehouseId)) continue;
      if (
        qollangan.filiallar.length &&
        (!warehouse?.branchId || !qollangan.filiallar.includes(warehouse.branchId))
      ) continue;
      if (qollangan.kategoriyalar.length && (!product || !qollangan.kategoriyalar.includes(product.categoryId))) continue;
      if (qollangan.mahsulotlar.length && !qollangan.mahsulotlar.includes(productId)) continue;
      if (qollangan.variatsiyalar.length && !qollangan.variatsiyalar.includes(modification.id)) continue;

      const params = Object.entries(modification.params ?? {}).map(
        ([key, value]) => `${key}:${String(value)}`
      );
      if (
        qollangan.xarakteristikalar.length &&
        !qollangan.xarakteristikalar.every((item) => params.includes(item))
      ) continue;

      const { jami, rezerv, bosh } = qoldiqQiymatlari(stock);
      const birlikNarx = raqam(modification.price?.[qollangan.narxTuri]);
      const groupKey = qollangan.omborlarBoyichaAjratish
        ? `${modification.id}::${warehouseId}`
        : modification.id;
      const mavjud = groups.get(groupKey);

      if (mavjud) {
        mavjud.jami += jami;
        mavjud.rezerv += rezerv;
        mavjud.bosh += bosh;
        mavjud.umumiy = mavjud.jami * mavjud.birlikNarx;
        continue;
      }

      const unit = product ? unitMap.get(product.unitId) : undefined;
      groups.set(groupKey, {
        kalit: groupKey,
        mahsulotNomi: mahsulotNomi(product, modification),
        birlik: unit?.shortName || unit?.name || "—",
        shtrixKod: modification.barcode ?? product?.barcode ?? "",
        variatsiya: variantNomi(modification),
        omborNomi: warehouse?.name ?? "Noma'lum ombor",
        jami,
        rezerv,
        bosh,
        birlikNarx,
        umumiy: jami * birlikNarx,
      });
    }

    const search = jadvalQidiruvi.trim().toLowerCase();
    return Array.from(groups.values())
      .filter((item) => {
        if (qollangan.qoldiqTuri === "musbat") return item.jami > 0;
        if (qollangan.qoldiqTuri === "nol") return item.jami === 0;
        if (qollangan.qoldiqTuri === "manfiy") return item.jami < 0;
        return true;
      })
      .filter((item) =>
        search
          ? `${item.mahsulotNomi} ${item.shtrixKod} ${item.variatsiya} ${item.omborNomi}`
              .toLowerCase()
              .includes(search)
          : true
      )
      .sort((a, b) => a.mahsulotNomi.localeCompare(b.mahsulotNomi, "uz"));
    */
  }, [
    report.items,
    qollangan.narxTuri,
    t,
  ]);

  const yakun = useMemo(
    () => ({ jami: raqam(report.summary.quantity), rezerv: raqam(report.summary.reservedQuantity), bosh: raqam(report.summary.availableQuantity), umumiy: raqam(report.summary.totalAmount) }),
    [report.summary]
  );

  const narxTuriNomi = narxTurlari.find((item) => item.kalit === qollangan.narxTuri)
    ? t(`omborQoldigi.priceTypes.${qollangan.narxTuri}`)
    : t("omborQoldigi.priceTypes.default");

  async function excelgaYuklash() {
    if (exportYuklanmoqda) return;
    setExportYuklanmoqda(true); setXatolik(null);
    try { await stockBalanceExport(reportParams(qollangan, jadvalQidiruvi, 1, 1000)); }
    catch (error) { setXatolik(getApiErrorMessage(error)); }
    finally { setExportYuklanmoqda(false); }
    return;
    const headers = [
      "Nomi",
      "O'lchov birligi",
      ...(qollangan.shtrixKodniKorsatish ? ["Shtrix kod"] : []),
      ...(qollangan.variatsiyalarniKorsatish ? ["Variatsiya"] : []),
      ...(qollangan.omborlarBoyichaAjratish ? ["Ombor"] : []),
      "Jami",
      "Bo'sh",
      `${narxTuriNomi} (birlik)`,
      "Umumiy summa",
    ];
    const rows = satrlar.map((item) =>
      [
        item.mahsulotNomi,
        item.birlik,
        ...(qollangan.shtrixKodniKorsatish ? [item.shtrixKod] : []),
        ...(qollangan.variatsiyalarniKorsatish ? [item.variatsiya] : []),
        ...(qollangan.omborlarBoyichaAjratish ? [item.omborNomi] : []),
        item.jami,
        item.bosh,
        item.birlikNarx,
        item.umumiy,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(";")
    );
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + [headers.join(";"), ...rows].join("\n")], {
        type: "text/csv;charset=utf-8",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ombor-qoldiqlari-${qollangan.sana}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const faolFiltrlar =
    filtr.omborlar.length +
    filtr.filiallar.length +
    filtr.kategoriyalar.length +
    filtr.mahsulotlar.length +
    filtr.variatsiyalar.length +
    filtr.xarakteristikalar.length +
    (filtr.qoldiqTuri !== "hammasi" ? 1 : 0);
  const ulush = (qism: number) => (yakun.jami > 0 ? Math.round((qism / yakun.jami) * 100) : 0);
  const kartaYuklanmoqda = yuklanmoqda && satrlar.length === 0;
  const oxirgiSatrlar = satrlar.slice(0, 7);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
            <Boxes size={26} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">{t("omborQoldigi.eyebrow")}</p>
            <h1 className="mt-0.5 text-3xl font-black tracking-tight text-gray-950">{t("omborQoldigi.title")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("omborQoldigi.subtitle")}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
          <CalendarCheck size={15} className="shrink-0 text-orange-500" aria-hidden />
          {t("omborQoldigi.asOfStatus", { date: sana(qollangan.sana), generatedAt: sana(shakllantirilgan) })}
        </span>
      </header>

      {xatolik && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <span className="flex items-center gap-2"><TriangleAlert size={17} aria-hidden /> {xatolik}</span>
          <button type="button" onClick={() => void malumotlarniYuklash()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100">
            <RefreshCw size={13} aria-hidden /> {t("omborQoldigi.retry")}
          </button>
        </div>
      )}

      <section aria-label={t("omborQoldigi.summary.aria")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KorsatkichKartasi
          icon={Boxes}
          nom={t("omborQoldigi.summary.total")}
          qiymat={shakllantirildi ? son(yakun.jami) : "—"}
          rang="blue"
          belgi={shakllantirildi ? { matn: t("omborQoldigi.summary.positions", { count: report.total }) } : undefined}
          ornament={shakllantirildi ? <KartaChiziqlari qiymatlar={oxirgiSatrlar.map((item) => item.jami)} klass="bg-blue-400" /> : undefined}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni={t("omborQoldigi.loading")}
        />
        <KorsatkichKartasi
          icon={PackageCheck}
          nom={t("omborQoldigi.summary.available")}
          qiymat={shakllantirildi ? son(yakun.bosh) : "—"}
          rang="emerald"
          belgi={shakllantirildi ? { matn: `${ulush(yakun.bosh)}%` } : undefined}
          ornament={shakllantirildi ? <KartaOlchagich faol={yakun.bosh} jami={yakun.jami} klass="bg-emerald-400" /> : undefined}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni={t("omborQoldigi.loading")}
        />
        <KorsatkichKartasi
          icon={Bookmark}
          nom={t("omborQoldigi.summary.reserved")}
          qiymat={shakllantirildi ? son(yakun.rezerv) : "—"}
          rang="amber"
          belgi={shakllantirildi ? { matn: `${ulush(yakun.rezerv)}%` } : undefined}
          ornament={shakllantirildi ? <KartaOlchagich faol={yakun.rezerv} jami={yakun.jami} klass="bg-amber-400" /> : undefined}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni={t("omborQoldigi.loading")}
        />
        <KorsatkichKartasi
          icon={Coins}
          nom={t("omborQoldigi.summary.value", { narx: narxTuriNomi })}
          qiymat={shakllantirildi ? pulYaxlit(yakun.umumiy) : "—"}
          rang="violet"
                    ornament={shakllantirildi ? <KartaChiziqlari qiymatlar={oxirgiSatrlar.map((item) => item.umumiy)} klass="bg-violet-400" /> : undefined}
          yuklanmoqda={kartaYuklanmoqda}
          yuklanishMatni={t("omborQoldigi.loading")}
        />
      </section>

      <section className="rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)]">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-[26px] border-b border-slate-100 bg-linear-to-r from-orange-50/70 via-white to-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-400 text-white shadow-md shadow-orange-200/60">
              <SlidersHorizontal size={19} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-gray-900">{t("omborQoldigi.filters.title")}</h2>
                {faolFiltrlar > 0 && (
                  <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-white tabular-nums">
                    {t("omborQoldigi.filters.activeCount", { count: faolFiltrlar })}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-medium text-gray-500">{t("omborQoldigi.filters.subtitle")}</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {faolFiltrlar > 0 && (
              <button
                type="button"
                onClick={filtrlarniTozalash}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold text-gray-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-gray-800"
              >
                <Eraser size={15} aria-hidden /> {t("omborQoldigi.filters.clear")}
              </button>
            )}
            <div className="flex w-full items-center gap-1.5 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200 sm:w-auto">
              <span className="flex shrink-0 items-center gap-1.5 pl-2.5 pr-1 text-xs font-bold text-gray-500">
                <CalendarDays size={14} className="text-orange-500" aria-hidden /> <span className="hidden sm:inline">{t("omborQoldigi.filters.byDate")}</span>
              </span>
              <input
                type="date"
                value={filtr.sana}
                onChange={(event) => ozgartirish("sana", event.target.value)}
                aria-label={t("omborQoldigi.filters.byDate")}
                className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
              />
              <button
                type="button"
                onClick={() => ozgartirish("sana", bugun())}
                className="h-9 shrink-0 cursor-pointer rounded-xl bg-orange-500 px-3.5 text-xs font-black text-white transition hover:bg-orange-600"
              >
                {t("omborQoldigi.filters.today")}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <FiltrGuruhi nom={t("omborQoldigi.filters.groupLocation")} rang="bg-indigo-400" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KopTanlov ikonka={Warehouse} sarlavha={t("omborQoldigi.filters.warehouse")} variantlar={omborlar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.omborlar} onOzgarish={(value) => ozgartirish("omborlar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.warehouseSearchPlaceholder")} />
              <KopTanlov ikonka={Building2} sarlavha={t("omborQoldigi.filters.branch")} variantlar={filiallar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.filiallar} onOzgarish={(value) => ozgartirish("filiallar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.branchSearchPlaceholder")} />
              <div className="min-w-0">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500"><Coins size={13} aria-hidden className="shrink-0 text-gray-400" />{t("omborQoldigi.filters.priceType")}</p>
                <AppSelect value={filtr.narxTuri} onChange={(event) => ozgartirish("narxTuri", event.target.value as NarxTuri)} className="h-12 w-full rounded-xl !p-0 text-sm font-semibold text-gray-700 [&>button]:!border-slate-200 [&>button]:!bg-slate-50/60 [&>button]:!px-3.5 [&>button:hover]:!bg-white">
                  {narxTurlari.map((item) => <option key={item.kalit} value={item.kalit}>{t(`omborQoldigi.priceTypes.${item.kalit}`)}</option>)}
                </AppSelect>
              </div>
              <div className="min-w-0">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500"><Package size={13} aria-hidden className="shrink-0 text-gray-400" />{t("omborQoldigi.filters.stockType")}</p>
                <AppSelect value={filtr.qoldiqTuri} onChange={(event) => ozgartirish("qoldiqTuri", event.target.value as QoldiqFiltri)} className="h-12 w-full rounded-xl !p-0 text-sm font-semibold text-gray-700 [&>button]:!border-slate-200 [&>button]:!bg-slate-50/60 [&>button]:!px-3.5 [&>button:hover]:!bg-white">
                  <option value="hammasi">{t("omborQoldigi.filters.stockOptions.hammasi")}</option>
                  <option value="musbat">{t("omborQoldigi.filters.stockOptions.musbat")}</option>
                  <option value="nol">{t("omborQoldigi.filters.stockOptions.nol")}</option>
                  <option value="manfiy">{t("omborQoldigi.filters.stockOptions.manfiy")}</option>
                </AppSelect>
              </div>
            </div>
          </div>

          <div>
            <FiltrGuruhi nom={t("omborQoldigi.filters.groupProduct")} rang="bg-emerald-400" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KopTanlov ikonka={Tags} sarlavha={t("omborQoldigi.filters.category")} variantlar={kategoriyalar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.kategoriyalar} onOzgarish={(value) => ozgartirish("kategoriyalar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.categorySearchPlaceholder")} />
              <KopTanlov ikonka={Package} sarlavha={t("omborQoldigi.filters.product")} variantlar={mahsulotlar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.mahsulotlar} onOzgarish={(value) => ozgartirish("mahsulotlar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.productSearchPlaceholder")} />
              <KopTanlov ikonka={Layers} sarlavha={t("omborQoldigi.filters.variations")} variantlar={variatsiyaVariantlari} tanlangan={filtr.variatsiyalar} onOzgarish={(value) => ozgartirish("variatsiyalar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.variationsSearchPlaceholder")} />
              <KopTanlov ikonka={ListFilter} sarlavha={t("omborQoldigi.filters.characteristics")} variantlar={xarakteristikaVariantlari} tanlangan={filtr.xarakteristikalar} onOzgarish={(value) => ozgartirish("xarakteristikalar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.characteristicsSearchPlaceholder")} />
            </div>
          </div>

          <div>
            <FiltrGuruhi nom={t("omborQoldigi.filters.groupView")} rang="bg-amber-400" />
            <div className="flex flex-wrap gap-2.5">
              {([
                ["omborlarBoyichaAjratish", t("omborQoldigi.filters.groupByWarehouse"), Warehouse],
                ["shtrixKodniKorsatish", t("omborQoldigi.filters.showBarcode"), Package],
                ["variatsiyalarniKorsatish", t("omborQoldigi.filters.showVariations"), Boxes],
              ] as Array<["omborlarBoyichaAjratish" | "shtrixKodniKorsatish" | "variatsiyalarniKorsatish", string, typeof Package]>).map(([key, label, Ikona]) => {
                const belgilangan = filtr[key];
                return (
                  <label
                    key={key}
                    className={`inline-flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm font-bold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-orange-100 ${
                      belgilangan ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <input type="checkbox" checked={belgilangan} onChange={(event) => ozgartirish(key, event.target.checked)} className="sr-only" />
                    <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${belgilangan ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300 bg-white text-transparent"}`}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <Ikona size={15} aria-hidden className={belgilangan ? "text-orange-500" : "text-gray-400"} />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void hisobotniShakllantirish()} disabled={yuklanmoqda} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none">
          {yuklanmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          {t("omborQoldigi.actions.generateReport")}
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"><Printer size={17} />{t("omborQoldigi.actions.print")}</button>
        <button type="button" onClick={() => void excelgaYuklash()} disabled={exportYuklanmoqda} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{exportYuklanmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <FileDown size={17} />}{t("omborQoldigi.actions.exportExcel")}</button>
        <label className="relative w-full min-w-0 sm:ml-auto sm:max-w-sm sm:flex-1">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={jadvalQidiruvi} onChange={(event) => setJadvalQidiruvi(event.target.value)} placeholder={t("omborQoldigi.tableSearchPlaceholder")} className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50" />
        </label>
      </div>

      {qollangan.sana !== bugun() && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden /> {t("omborQoldigi.reportNotice")}
        </div>
      )}

      <OmborJadval className="[&_thead_th]:!h-auto [&_thead_th]:!py-3 [&_thead_th]:!px-5 [&_tbody_td]:!px-5 [&_tbody_td]:!py-3.5 [&_thead_th]:!border-slate-200 [&_thead_th]:!text-slate-500 [&_tbody]:!divide-slate-100 shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)]">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-xs font-black uppercase tracking-wide">
              <tr>
                <th rowSpan={2} className="text-left">{t("omborQoldigi.columns.name")}</th>
                {qollangan.shtrixKodniKorsatish && <th rowSpan={2} className="text-left">{t("omborQoldigi.columns.barcode")}</th>}
                {qollangan.variatsiyalarniKorsatish && <th rowSpan={2} className="text-left">{t("omborQoldigi.columns.variation")}</th>}
                {qollangan.omborlarBoyichaAjratish && <th rowSpan={2} className="text-left">{t("omborQoldigi.columns.warehouse")}</th>}
                <th rowSpan={2} className="text-left">{t("omborQoldigi.columns.unit")}</th>
                <th colSpan={2} className="border-b border-slate-200 text-center">{t("omborQoldigi.columns.totalStock")}</th>
                <th colSpan={2} className="border-b border-slate-200 text-center">{narxTuriNomi}</th>
              </tr>
              <tr>
                <th className="text-right">{t("omborQoldigi.columns.total")}</th>
                <th className="text-right">{t("omborQoldigi.columns.available")}</th>
                <th className="text-right">{t("omborQoldigi.columns.unitPrice")}</th>
                <th className="text-right">{t("omborQoldigi.columns.totalAmount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satrlar.map((item) => (
                <tr key={item.kalit} className="transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-orange-50/50 motion-reduce:transition-none">
                  <td>
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-100">
                        <Package size={16} />
                      </span>
                      <span className="min-w-0 max-w-[340px] font-black leading-snug text-gray-950">{item.mahsulotNomi}</span>
                    </div>
                  </td>
                  {qollangan.shtrixKodniKorsatish && <td className="tabular-nums text-gray-500">{item.shtrixKod || "—"}</td>}
                  {qollangan.variatsiyalarniKorsatish && <td className="text-gray-500">{item.variatsiya}</td>}
                  {qollangan.omborlarBoyichaAjratish && (
                    <td>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                        <Warehouse size={12} aria-hidden /> {item.omborNomi}
                      </span>
                    </td>
                  )}
                  <td><span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{item.birlik}</span></td>
                  <td className={`text-right font-bold tabular-nums ${item.jami < 0 ? "text-red-500" : "text-gray-800"}`}>{son(item.jami)}</td>
                  <td className="text-right">
                    <span className={`inline-flex min-w-12 justify-end rounded-lg px-2.5 py-1 font-extrabold tabular-nums ${item.bosh < 0 ? "bg-red-50 text-red-600" : item.bosh === 0 ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{son(item.bosh)}</span>
                  </td>
                  <td className="text-right tabular-nums text-gray-600">{pul(item.birlikNarx)}</td>
                  <td className="text-right font-black tabular-nums text-gray-900">{pul(item.umumiy)}</td>
                </tr>
              ))}
            </tbody>
            {satrlar.length > 0 && (
              <tfoot className="border-t-2 border-orange-100 bg-linear-to-r from-orange-50/70 to-orange-50/30 font-black text-gray-800">
                <tr>
                  <td className="px-5 py-3.5" colSpan={1 + (qollangan.shtrixKodniKorsatish ? 1 : 0) + (qollangan.variatsiyalarniKorsatish ? 1 : 0) + (qollangan.omborlarBoyichaAjratish ? 1 : 0)}>{t("omborQoldigi.summaryLine", { count: satrlar.length })}</td>
                  <td className="px-5 py-3.5" />
                  <td className="px-5 py-3.5 text-right tabular-nums">{son(yakun.jami)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-emerald-700">{son(yakun.bosh)}</td>
                  <td className="px-5 py-3.5" />
                  <td className="px-5 py-3.5 text-right tabular-nums">{pul(yakun.umumiy)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        {!yuklanmoqda && satrlar.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><PackageOpen size={26} /></span>
            <p className="max-w-md font-semibold text-gray-500">{shakllantirildi ? t("omborQoldigi.emptyState") : t("omborQoldigi.notGenerated")}</p>
          </div>
        )}
        {yuklanmoqda && satrlar.length === 0 && (
          <LoadingState matn={t("omborQoldigi.loading")} ikonka={<Boxes size={24} />} className="min-h-[260px] rounded-none border-0 bg-transparent" />
        )}
      </OmborJadval>
      <TablePagination page={page} pageSize={pageSize} totalItems={report.total} onPageChange={(value) => void sahifaniOlish(value)} onPageSizeChange={(value) => void sahifaniOlish(1,value)} />
    </div>
  );
}
