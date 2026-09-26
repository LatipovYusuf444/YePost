import AppSelect from "@/Components/ui/AppSelect";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  FileDown,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
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
import OmborJadval from "./OmborJadval";
import TablePagination from "@/Components/common/TablePagination";
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
  return `${value.toLocaleString("uz-UZ")} so'm`;
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

  async function hisobotniShakllantirish() {
    setYuklanmoqda(true);setXatolik(null);
    try{const applied={...filtr};setPage(1);setReport(await stockBalanceReport(reportParams(applied,jadvalQidiruvi,1,pageSize)));setQollangan(applied)}catch(error){setXatolik(getApiErrorMessage(error))}finally{setYuklanmoqda(false)}
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

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">{t("omborQoldigi.eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">{t("omborQoldigi.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("omborQoldigi.subtitle")}
        </p>
      </header>

      {xatolik && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{xatolik}</span>
          <button type="button" onClick={() => void malumotlarniYuklash()}>{t("omborQoldigi.retry")}</button>
        </div>
      )}

      <section className="space-y-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-500">{t("omborQoldigi.filters.byDate")}</span>
          <div className="relative">
            <input
              type="date"
              value={filtr.sana}
              onChange={(event) => ozgartirish("sana", event.target.value)}
              className="h-12 rounded-2xl border border-gray-200 bg-white px-5 pr-11 text-sm font-semibold outline-none focus:border-orange-400"
            />
            <CalendarDays size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button type="button" onClick={() => ozgartirish("sana", bugun())} className="text-sm font-black text-orange-600 hover:underline">
            {t("omborQoldigi.filters.today")}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KopTanlov sarlavha={t("omborQoldigi.filters.warehouse")} variantlar={omborlar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.omborlar} onOzgarish={(value) => ozgartirish("omborlar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.warehouseSearchPlaceholder")} />
          <KopTanlov sarlavha={t("omborQoldigi.filters.branch")} variantlar={filiallar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.filiallar} onOzgarish={(value) => ozgartirish("filiallar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.branchSearchPlaceholder")} />
          <KopTanlov sarlavha={t("omborQoldigi.filters.category")} variantlar={kategoriyalar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.kategoriyalar} onOzgarish={(value) => ozgartirish("kategoriyalar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.categorySearchPlaceholder")} />
          <KopTanlov sarlavha={t("omborQoldigi.filters.product")} variantlar={mahsulotlar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.mahsulotlar} onOzgarish={(value) => ozgartirish("mahsulotlar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.productSearchPlaceholder")} />

          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-bold text-gray-500">{t("omborQoldigi.filters.priceType")}</p>
            <AppSelect value={filtr.narxTuri} onChange={(event) => ozgartirish("narxTuri", event.target.value as NarxTuri)} className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400">
              {narxTurlari.map((item) => <option key={item.kalit} value={item.kalit}>{t(`omborQoldigi.priceTypes.${item.kalit}`)}</option>)}
            </AppSelect>
          </div>
          <KopTanlov sarlavha={t("omborQoldigi.filters.variations")} variantlar={variatsiyaVariantlari} tanlangan={filtr.variatsiyalar} onOzgarish={(value) => ozgartirish("variatsiyalar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.variationsSearchPlaceholder")} />
          <KopTanlov sarlavha={t("omborQoldigi.filters.characteristics")} variantlar={xarakteristikaVariantlari} tanlangan={filtr.xarakteristikalar} onOzgarish={(value) => ozgartirish("xarakteristikalar", value)} qidiruvPlaceholder={t("omborQoldigi.filters.characteristicsSearchPlaceholder")} />
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-bold text-gray-500">{t("omborQoldigi.filters.stockType")}</p>
            <AppSelect value={filtr.qoldiqTuri} onChange={(event) => ozgartirish("qoldiqTuri", event.target.value as QoldiqFiltri)} className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400">
              <option value="hammasi">{t("omborQoldigi.filters.stockOptions.hammasi")}</option>
              <option value="musbat">{t("omborQoldigi.filters.stockOptions.musbat")}</option>
              <option value="nol">{t("omborQoldigi.filters.stockOptions.nol")}</option>
              <option value="manfiy">{t("omborQoldigi.filters.stockOptions.manfiy")}</option>
            </AppSelect>
          </div>
        </div>

        <div className="grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ["omborlarBoyichaAjratish", t("omborQoldigi.filters.groupByWarehouse")],
            ["shtrixKodniKorsatish", t("omborQoldigi.filters.showBarcode")],
            ["variatsiyalarniKorsatish", t("omborQoldigi.filters.showVariations")],
          ] as Array<["omborlarBoyichaAjratish" | "shtrixKodniKorsatish" | "variatsiyalarniKorsatish", string]>).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 text-sm font-bold text-gray-600">
              <input type="checkbox" checked={filtr[key]} onChange={(event) => ozgartirish(key, event.target.checked)} className="h-[18px] w-[18px] accent-orange-500" />
              {label}
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void hisobotniShakllantirish()} disabled={yuklanmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-60">
          {yuklanmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          {t("omborQoldigi.actions.generateReport")}
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 text-sm font-bold text-gray-600 hover:text-orange-600"><Printer size={17} />{t("omborQoldigi.actions.print")}</button>
        <button type="button" onClick={() => void excelgaYuklash()} disabled={exportYuklanmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 text-sm font-bold text-gray-600 hover:text-orange-600 disabled:opacity-50">{exportYuklanmoqda?<LoaderCircle size={17} className="animate-spin"/>:<FileDown size={17} />}{t("omborQoldigi.actions.exportExcel")}</button>
        <span className="text-sm font-bold text-gray-400">{t("omborQoldigi.asOfStatus", { date: sana(qollangan.sana), generatedAt: sana(shakllantirilgan) })}</span>
        <label className="relative ml-auto w-full max-w-sm">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={jadvalQidiruvi} onChange={(event) => setJadvalQidiruvi(event.target.value)} placeholder={t("omborQoldigi.tableSearchPlaceholder")} className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-orange-400" />
        </label>
      </div>

      {qollangan.sana !== bugun() && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {t("omborQoldigi.reportNotice")}
        </div>
      )}

      <OmborJadval className="[&_thead_th]:!h-auto [&_thead_th]:!py-3">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th rowSpan={2} className="px-5 py-3 text-left">{t("omborQoldigi.columns.name")}</th>
                {qollangan.shtrixKodniKorsatish && <th rowSpan={2} className="px-5 py-3 text-left">{t("omborQoldigi.columns.barcode")}</th>}
                {qollangan.variatsiyalarniKorsatish && <th rowSpan={2} className="px-5 py-3 text-left">{t("omborQoldigi.columns.variation")}</th>}
                {qollangan.omborlarBoyichaAjratish && <th rowSpan={2} className="px-5 py-3 text-left">{t("omborQoldigi.columns.warehouse")}</th>}
                <th rowSpan={2} className="px-5 py-3 text-left">{t("omborQoldigi.columns.unit")}</th>
                <th colSpan={2} className="border-b border-orange-100 px-5 py-2 text-center">{t("omborQoldigi.columns.totalStock")}</th>
                <th colSpan={2} className="border-b border-orange-100 px-5 py-2 text-center">{narxTuriNomi}</th>
              </tr>
              <tr>
                <th className="px-5 py-2 text-right">{t("omborQoldigi.columns.total")}</th>
                <th className="px-5 py-2 text-right">{t("omborQoldigi.columns.available")}</th>
                <th className="px-5 py-2 text-right">{t("omborQoldigi.columns.unitPrice")}</th>
                <th className="px-5 py-2 text-right">{t("omborQoldigi.columns.totalAmount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {satrlar.map((item) => (
                <tr key={item.kalit} className="hover:bg-orange-50/30">
                  <td className="px-5 py-3 font-black text-gray-950">{item.mahsulotNomi}</td>
                  {qollangan.shtrixKodniKorsatish && <td className="px-5 py-3 text-gray-500">{item.shtrixKod || "—"}</td>}
                  {qollangan.variatsiyalarniKorsatish && <td className="px-5 py-3 text-gray-500">{item.variatsiya}</td>}
                  {qollangan.omborlarBoyichaAjratish && <td className="px-5 py-3 text-gray-600">{item.omborNomi}</td>}
                  <td className="px-5 py-3 text-gray-500">{item.birlik}</td>
                  <td className={`px-5 py-3 text-right font-bold ${item.jami < 0 ? "text-red-500" : "text-gray-800"}`}>{item.jami}</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-600">{item.bosh}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{pul(item.birlikNarx)}</td>
                  <td className="px-5 py-3 text-right font-black text-gray-900">{pul(item.umumiy)}</td>
                </tr>
              ))}
            </tbody>
            {satrlar.length > 0 && (
              <tfoot className="border-t-2 border-orange-100 bg-orange-50/40 font-black text-gray-800">
                <tr>
                  <td className="px-5 py-3" colSpan={1 + (qollangan.shtrixKodniKorsatish ? 1 : 0) + (qollangan.variatsiyalarniKorsatish ? 1 : 0) + (qollangan.omborlarBoyichaAjratish ? 1 : 0)}>{t("omborQoldigi.summaryLine", { count: satrlar.length })}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right">{yakun.jami}</td>
                  <td className="px-5 py-3 text-right">{yakun.bosh}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right">{pul(yakun.umumiy)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        {!yuklanmoqda && satrlar.length === 0 && <div className="p-14 text-center font-semibold text-gray-400">{t("omborQoldigi.emptyState")}</div>}
        {yuklanmoqda && satrlar.length === 0 && <div className="p-14 text-center"><LoaderCircle className="mx-auto animate-spin text-orange-500" size={28} /></div>}
      </OmborJadval>
      <TablePagination page={page} pageSize={pageSize} totalItems={report.total} onPageChange={(value) => void sahifaniOlish(value)} onPageSizeChange={(value) => void sahifaniOlish(1,value)} />
    </div>
  );
}
