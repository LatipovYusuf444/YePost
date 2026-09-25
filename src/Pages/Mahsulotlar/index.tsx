import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import {
  Boxes,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  ImagePlus,
  Layers3,
  LayoutGrid,
  LoaderCircle,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { mahsulotlarApi } from "@/api/catalogApi";
import { omborlarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { rolniNormallashtirish } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useMahsulotlarStore } from "@/store/mahsulotlarStore";
import type {
  Kategoriya,
  Mahsulot,
  MahsulotImportNatijasi,
  MahsulotModifikatsiyasi,
  OlchovBirligi,
  StandardUnit,
} from "@/types/catalog";
import type { Ombor } from "@/types/ombor";

type Tab = "mahsulotlar" | "kategoriyalar";
type Korinish = "kartochka" | "jadval";
type VariationRow = {
  id: number;
  attribute: string;
  attributeAdded: boolean;
  value: string;
  options: string[];
};

type VariantCombination = {
  key: string;
  label: string;
  params: Record<string, string>;
};

type VariantDraft = {
  barcode: string;
  imageUrl: string;
  active: boolean;
  costPrice: string;
  costCurrency: "UZS" | "USD";
  markup: string;
  retailPrice: string;
  retailCurrency: "UZS" | "USD";
  wholesalePrice: string;
  wholesaleCurrency: "UZS" | "USD";
};

type VariantStockDraft = {
  open: boolean;
  warehouseId: string;
  quantity: string;
  minStock: string;
};

type OptionalFeatureField = {
  id: number;
  name: string;
  value: string;
};

const STANDARD_UNIT_PREFIX = "standard:";

// Mahsulot uchun faqat miqdor/massa/uzunlik/yuza/hajm birliklari; vaqt, quvvat, qadoq va h.k. chiqarilmaydi.
const PRODUCT_UNIT_CATEGORIES = new Set([
  "QUANTITY",
  "MASS",
  "LENGTH",
  "AREA",
  "VOLUME",
]);

function unitKey(value?: string | null) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

// Faqat ko'rsatish uchun: workspace birligi standart katalogdagi mahsulotga mos bo'lmagan
// kategoriyaga (masalan TIME) tegishli bo'lsa, Mahsulot selectida yashiriladi. Ma'lumot o'chirilmaydi.
// Moslik ustuvorligi: code -> shortName -> name; mos standart topilmasa (mahalliy birlik) ko'rsatiladi.
function isProductUnit(unit: OlchovBirligi, standardUnits: StandardUnit[]) {
  const ownCategory = (unit as { category?: unknown }).category;
  if (typeof ownCategory === "string") return PRODUCT_UNIT_CATEGORIES.has(ownCategory);

  const code = unitKey(unit.code);
  const shortName = unitKey(unit.shortName);
  const name = unitKey(unit.name);
  const levels: StandardUnit[][] = [
    code ? standardUnits.filter((s) => unitKey(s.code) === code) : [],
    shortName
      ? standardUnits.filter((s) => [s.shortNameUz, s.shortNameRu].some((v) => unitKey(v) === shortName))
      : [],
    name ? standardUnits.filter((s) => [s.nameUz, s.nameRu].some((v) => unitKey(v) === name)) : [],
  ];
  const matches = levels.find((level) => level.length > 0);
  return matches ? matches.some((s) => PRODUCT_UNIT_CATEGORIES.has(s.category)) : true;
}

// Standart birlik workspace ro'yxatida allaqachon bormi (code -> shortName -> name, saqlash oqimidagi
// moslik bilan bir xil). Faqat Mahsulot selectida takror ko'rsatmaslik uchun ishlatiladi.
function standardUnitInWorkspace(standard: StandardUnit, units: OlchovBirligi[]) {
  const code = unitKey(standard.code);
  if (code && units.some((unit) => unitKey(unit.code) === code)) return true;

  const shortNames = [standard.shortNameUz, standard.shortNameRu].map(unitKey).filter(Boolean);
  if (units.some((unit) => shortNames.includes(unitKey(unit.shortName)))) return true;

  const names = [standard.nameUz, standard.nameRu].map(unitKey).filter(Boolean);
  return units.some((unit) => names.includes(unitKey(unit.name)));
}

function standardUnitLabel(unit: StandardUnit) {
  const shortName = unit.shortNameUz?.trim();
  return shortName && unitKey(shortName) !== unitKey(unit.nameUz)
    ? `${unit.nameUz} (${shortName})`
    : unit.nameUz;
}

const korinishlar: Array<{ id: Korinish; nom: string; icon: typeof Boxes }> = [
  { id: "kartochka", nom: "Kartochka", icon: LayoutGrid },
  { id: "jadval", nom: "Jadval", icon: Table2 },
];

export default function Mahsulotlar() {
  const { t } = useTranslation("mahsulotlar");
  const store = useMahsulotlarStore();
  const profil = useAuthProfileStore((state) => state.profil);
  const yuklash = store.yuklash;
  const modifikatsiyalarniYuklash = store.modifikatsiyalarniYuklash;
  const [tab, setTab] = useState<Tab>("mahsulotlar");
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("jadval");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [korinishMenu, setKorinishMenu] = useState(false);
  const [mahsulotModal, setMahsulotModal] = useState<Mahsulot | "new" | null>(null);
  const [oddiyModal, setOddiyModal] = useState<Kategoriya | "new" | null>(null);
  const [modProduct, setModProduct] = useState<Mahsulot | null>(null);
  const [importModalOchiq, setImportModalOchiq] = useState(false);
  const [excelAmali, setExcelAmali] = useState<"template" | "export" | null>(null);
  const [excelXatolik, setExcelXatolik] = useState("");

  useEffect(() => { void yuklash(); }, [yuklash]);

  const mahsulotlar = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    return q
      ? store.mahsulotlar.filter((item) =>
          [item.name, item.barcode, item.article].join(" ").toLowerCase().includes(q)
        )
      : store.mahsulotlar;
  }, [qidiruv, store.mahsulotlar]);
  useEffect(() => {
    store.mahsulotlar.forEach((item) => {
      if (!useMahsulotlarStore.getState().modifikatsiyalar[item.id]) void modifikatsiyalarniYuklash(item.id);
    });
  }, [store.mahsulotlar, modifikatsiyalarniYuklash]);
  const pageCount = Math.max(1, Math.ceil(mahsulotlar.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedMahsulotlar = mahsulotlar.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function oddiyOchirish(id: string) {
    if (!window.confirm(t("confirm.deleteCategory"))) return;
    await store.kategoriyaOchirish(id);
  }

  async function oddiyTahrirlash(item: Kategoriya) {
    const toliq = await store.kategoriyaOlish(item.id);
    if (toliq) setOddiyModal(toliq);
  }

  async function mahsulotTahrirlash(item: Mahsulot) {
    const toliq = await store.mahsulotOlish(item.id);
    if (toliq) setMahsulotModal(toliq);
  }

  async function mahsulotOchirish(id: string) {
    if (!window.confirm(t("confirm.deleteProduct"))) return;
    await store.mahsulotOchirish(id);
  }

  const tanlanganKorinish = korinishlar.find((item) => item.id === korinish) ?? korinishlar[0];
  const TanlanganIcon = tanlanganKorinish.icon;
  const rol = rolniNormallashtirish(profil?.role);
  const excelAmallariMumkin = rol === "ADMIN" || rol === "DIREKTOR";

  async function importShabloniniYuklash() {
    if (excelAmali) return;
    setExcelAmali("template");
    setExcelXatolik("");
    try {
      const fayl = await mahsulotlarApi.importShabloniniOlish();
      excelFaylniSaqlash(
        fayl.blob,
        fayl.contentDisposition,
        "mahsulot-import-shablon.xlsx"
      );
    } catch (error) {
      setExcelXatolik(await excelXatoXabariniOlish(error));
    } finally {
      setExcelAmali(null);
    }
  }

  async function mahsulotlarniExportQilish() {
    if (excelAmali) return;
    setExcelAmali("export");
    setExcelXatolik("");
    try {
      const fayl = await mahsulotlarApi.exportQilish();
      excelFaylniSaqlash(fayl.blob, fayl.contentDisposition, "mahsulotlar.xlsx");
    } catch (error) {
      setExcelXatolik(await excelXatoXabariniOlish(error));
    } finally {
      setExcelAmali(null);
    }
  }

  function kategoriyaNomi(item: Mahsulot) {
    return item.category?.name ?? store.kategoriyalar.find((x) => x.id === item.categoryId)?.name ?? t("fallback.category");
  }

  function birlikNomi(item: Mahsulot) {
    return item.unit?.shortName ?? item.unit?.name ?? store.birliklar.find((x) => x.id === item.unitId)?.shortName ?? t("fallback.unit");
  }

  function mahsulotAmallari(item: Mahsulot, ixcham = false) {
    return (
      <div className={ixcham ? "flex justify-end gap-2" : "mt-5 grid grid-cols-[1fr_1fr_42px] gap-2 border-t pt-4"}>
        <button onClick={()=>{setModProduct(item);void store.modifikatsiyalarniYuklash(item.id)}} className={`inline-flex items-center justify-center gap-1 rounded-xl bg-slate-50 font-bold text-slate-600 ${ixcham ? "h-10 px-3 text-sm" : "py-2.5 text-sm"}`}><Eye size={15}/>{!ixcham&&t("actions.variants")}</button>
        <button onClick={()=>void mahsulotTahrirlash(item)} className={`inline-flex items-center justify-center gap-1 rounded-xl bg-orange-50 font-bold text-orange-600 ${ixcham ? "h-10 px-3 text-sm" : "py-2.5 text-sm"}`}><Edit3 size={15}/>{!ixcham&&t("actions.edit")}</button>
        <button onClick={()=>void mahsulotOchirish(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={16}/></button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">{t("header.eyebrow")}</p>
          <h1 className="mt-1 text-3xl font-black">{t("header.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("header.subtitle")}</p>
        </div>
        <button onClick={() => void yuklash()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600">
          <RefreshCw size={17}/>{t("header.refresh")}
        </button>
      </header>

      {store.xatolik && <div className="flex justify-between rounded-2xl bg-red-50 p-4 font-bold text-red-600"><span>{store.xatolik}</span><button onClick={store.xatolikniTozalash}>{t("actions.close")}</button></div>}
      {excelXatolik && <div className="flex justify-between gap-4 rounded-2xl bg-red-50 p-4 font-bold text-red-600"><span>{excelXatolik}</span><button onClick={()=>setExcelXatolik("")}>{t("actions.close")}</button></div>}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2">
        {[
          ["mahsulotlar",t("tabs.products"),Boxes],
          ["kategoriyalar",t("tabs.categories"),Layers3],
        ].map(([id,nom,Icon]) => {
          const IconComponent = Icon as typeof Boxes;
          return <button key={String(id)} onClick={()=>setTab(id as Tab)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 font-bold ${tab===id?"bg-orange-500 text-white":"text-gray-500 hover:bg-orange-50"}`}><IconComponent size={17}/>{String(nom)}</button>;
        })}
      </nav>

      {store.yuklanmoqda ? <div className="flex h-72 items-center justify-center"><LoaderCircle className="animate-spin text-orange-500" size={34}/></div> : tab === "mahsulotlar" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
            <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border bg-white px-4 lg:flex-1"><Search size={17} className="text-gray-400"/><input value={qidiruv} onChange={e=>{setQidiruv(e.target.value);setPage(1)}} className="min-w-0 flex-1 outline-none" placeholder={t("toolbar.searchPlaceholder")}/></label>
            {excelAmallariMumkin&&<>
              <button type="button" onClick={()=>setImportModalOchiq(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 font-bold text-blue-600 hover:border-blue-200 hover:bg-blue-50"><Upload size={17}/>{t("toolbar.import")}</button>
              <button type="button" disabled={excelAmali!==null} onClick={()=>void mahsulotlarniExportQilish()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 font-bold text-blue-600 disabled:opacity-50 hover:border-blue-200 hover:bg-blue-50">{excelAmali==="export"?<LoaderCircle size={17} className="animate-spin"/>:<Download size={17}/>}{t("toolbar.export")}</button>
              <button type="button" disabled={excelAmali!==null} onClick={()=>void importShabloniniYuklash()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-600 disabled:opacity-50 hover:border-blue-200 hover:text-blue-600">{excelAmali==="template"?<LoaderCircle size={17} className="animate-spin"/>:<FileSpreadsheet size={17}/>}{t("toolbar.downloadTemplate")}</button>
            </>}
            <div className="relative">
              <button type="button" onClick={()=>setKorinishMenu((value)=>!value)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600 shadow-sm hover:border-orange-200 hover:text-orange-600 lg:w-auto">
                <TanlanganIcon size={17} className="text-orange-500"/>
                {t("toolbar.view")}
                {korinishMenu ? <ChevronUp size={16} className="text-orange-500"/> : <ChevronDown size={16} className="text-orange-500"/>}
              </button>
              {korinishMenu&&(
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-orange-100 bg-white p-2 shadow-xl">
                  {korinishlar.map((item)=>{
                    const Icon=item.icon;
                    return <button key={item.id} type="button" onClick={()=>{setKorinish(item.id);setKorinishMenu(false)}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${korinish===item.id?"bg-orange-500 text-white":"text-gray-600 hover:bg-orange-50 hover:text-orange-600"}`}><Icon size={17}/>{t(`views.${item.id}`)}</button>
                  })}
                </div>
              )}
            </div>
            <button disabled={store.kategoriyalar.length===0||store.birliklar.length===0} onClick={()=>setMahsulotModal("new")} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50"><Plus size={17}/>{t("toolbar.addProduct")}</button>
          </div>
          {(store.kategoriyalar.length===0||store.birliklar.length===0)&&<div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">{t("warnings.needCategoryAndUnit")}</div>}
          {korinish==="kartochka" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mahsulotlar.map(item=><article key={item.id} className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <div className="flex justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Boxes size={22}/></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isActive?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}`}>{item.isActive?t("status.active"):t("status.inactive")}</span></div>
              <h2 className="mt-4 text-xl font-black">{item.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{item.category?.name??store.kategoriyalar.find(x=>x.id===item.categoryId)?.name??t("fallback.category")} В· {item.unit?.shortName??item.unit?.name??store.birliklar.find(x=>x.id===item.unitId)?.shortName??t("fallback.unit")}</p>
              <p className="mt-2 text-xs text-gray-400">{t("table.barcode")}: {item.barcode||t("notEntered")} В· {t("table.article")}: {item.article||t("notEntered")}</p>
              {store.modifikatsiyalar[item.id]?.length ? (
                <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
                  {store.modifikatsiyalar[item.id].map((modification) => (
                    <div key={modification.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      {store.modifikatsiyalar[item.id].length > 1 && <p className="mb-1 truncate text-xs font-bold text-gray-500">{modification.name || modification.barcode || t("card.defaultVariant")}</p>}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-orange-50 px-2 py-1.5"><p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">{t("card.salePrice")}</p><p className="text-sm font-black text-orange-700">{modification.price?.retailPrice == null ? t("card.noPrice") : money(modification.price.retailPrice)}</p></div>
                        <div className="rounded-lg bg-emerald-50 px-2 py-1.5"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">{t("card.costPrice")}</p><p className="text-sm font-black text-emerald-700">{modification.price?.costPrice == null ? t("card.noPrice") : money(modification.price.costPrice)}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-orange-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">{t("card.salePrice")}</p><p className="text-sm font-black text-orange-700">{t("card.noPrice")}</p></div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">{t("card.costPrice")}</p><p className="text-sm font-black text-emerald-700">{t("card.noPrice")}</p></div>
                </div>
              )}\n              <div className="mt-5 grid grid-cols-[1fr_1fr_42px] gap-2 border-t pt-4">
                <button onClick={()=>{setModProduct(item);void store.modifikatsiyalarniYuklash(item.id)}} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-50 py-2.5 text-sm font-bold text-slate-600"><Eye size={15}/>{t("actions.variants")}</button>
                <button onClick={()=>void mahsulotTahrirlash(item)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-orange-50 py-2.5 text-sm font-bold text-orange-600"><Edit3 size={15}/>{t("actions.edit")}</button>
                <button onClick={()=>void mahsulotOchirish(item.id)} className="flex items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={16}/></button>
              </div>
            </article>)}
            {mahsulotlar.length===0&&<Empty matn={t("empty.products")}/>}
          </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-orange-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4">{t("table.index")}</th>
                      <th className="px-5 py-4">{t("table.product")}</th>
                      <th className="px-5 py-4">{t("table.category")}</th>
                      <th className="px-5 py-4">{t("table.unit")}</th>
                      <th className="px-5 py-4">{t("table.barcode")}</th>
                      <th className="px-5 py-4">{t("table.article")}</th>
                      <th className="px-5 py-4">{t("table.status")}</th>
                      <th className="px-5 py-4 text-right">{t("table.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {paginatedMahsulotlar.map((item,index)=>(
                      <tr key={item.id} className="hover:bg-orange-50/40">
                        <td className="px-5 py-4 font-bold text-gray-500">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-5 py-4">
                          <span className="font-black text-gray-900">{item.name}</span>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-600">{kategoriyaNomi(item)}</td>
                        <td className="px-5 py-4 font-bold text-gray-600">{birlikNomi(item)}</td>
                        <td className="px-5 py-4 text-gray-500">{item.barcode||t("notEntered")}</td>
                        <td className="px-5 py-4 text-gray-500">{item.article||t("notEntered")}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isActive?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}`}>{item.isActive?t("status.active"):t("status.inactive")}</span></td>
                        <td className="px-5 py-4">{mahsulotAmallari(item,true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mahsulotlar.length===0&&<Empty matn={t("empty.products")}/>}
              {mahsulotlar.length>0&&<div className="flex flex-col gap-3 border-t border-orange-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500"><span>{t("table.perPage")}</span><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}} className="rounded-lg border border-orange-100 bg-white px-2 py-1 font-bold text-gray-700">{[10,20,30,50,100].map(size=><option key={size} value={size}>{size}</option>)}</select><span>· {t("table.totalItems",{count:mahsulotlar.length})}</span></div>
                <div className="flex items-center justify-between gap-3 sm:justify-end"><button type="button" onClick={()=>setPage(currentPage-1)} disabled={currentPage<=1} className="rounded-lg border border-orange-100 px-3 py-1.5 text-sm font-bold text-gray-600 disabled:opacity-40">{t("table.prev")}</button><span className="text-sm font-bold text-gray-600">{currentPage} / {pageCount}</span><button type="button" onClick={()=>setPage(currentPage+1)} disabled={currentPage>=pageCount} className="rounded-lg border border-orange-100 px-3 py-1.5 text-sm font-bold text-gray-600 disabled:opacity-40">{t("table.next")}</button></div>
              </div>}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-end justify-between"><div><h2 className="text-2xl font-black">{t("categoriesTab.title")}</h2><p className="text-sm text-gray-500">{t("categoriesTab.subtitle")}</p></div><button onClick={()=>setOddiyModal("new")} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white"><Plus size={17}/>{t("categoriesTab.add")}</button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {store.kategoriyalar.map(item=><article key={item.id} className="rounded-[24px] border border-orange-100 bg-white p-5">
              <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Tags size={21}/></div><div className="flex gap-2"><button onClick={()=>void oddiyTahrirlash(item)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Edit3 size={15}/></button><button onClick={()=>void oddiyOchirish(item.id)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={15}/></button></div></div>
              <h3 className="mt-4 text-lg font-black">{item.name}</h3>
            </article>)}
            {store.kategoriyalar.length===0&&<Empty matn={t("empty.noData")}/>}
          </div>
        </section>
      )}

      {mahsulotModal&&<MahsulotModalKeng item={mahsulotModal} onClose={()=>setMahsulotModal(null)}/>}
      {oddiyModal&&<OddiyModal item={oddiyModal} onClose={()=>setOddiyModal(null)}/>}
      {modProduct&&<ModifikatsiyalarModal product={modProduct} onClose={()=>setModProduct(null)}/>}
      {importModalOchiq&&<MahsulotImportModal onClose={()=>setImportModalOchiq(false)} onImported={yuklash}/>}
    </div>
  );
}

function Empty({matn}:{matn:string}) {
  return <div className="col-span-full rounded-[24px] border border-dashed border-orange-200 p-12 text-center text-gray-400">{matn}</div>;
}

function dispositionFaylNomi(disposition: string) {
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const oddiy = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const qiymat = utf8 ?? oddiy;
  if (!qiymat) return "";
  try {
    return decodeURIComponent(qiymat).split(/[\\/]/).pop()?.trim() ?? "";
  } catch {
    return qiymat.split(/[\\/]/).pop()?.trim() ?? "";
  }
}

function excelFaylniSaqlash(blob: Blob, disposition: string, fallback: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = dispositionFaylNomi(disposition) || fallback;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function excelXatoXabariniOlish(error: unknown) {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text()) as {
        message?: string | string[];
        detail?: string;
        error?: string;
      };
      if (Array.isArray(body.message)) return body.message.join(" ");
      if (body.message) return body.message;
      if (body.detail) return body.detail;
      if (body.error) return body.error;
    } catch {
      // JSON bo'lmagan binary xato javobida loyihaning standart handleriga o'tiladi.
    }
  }
  return getApiErrorMessage(error);
}

function MahsulotImportModal({onClose,onImported}:{onClose:()=>void;onImported:()=>Promise<void>}) {
  const { t } = useTranslation("mahsulotlar");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [natija, setNatija] = useState<MahsulotImportNatijasi | null>(null);
  const [bosqich, setBosqich] = useState<"preview" | "result">("preview");
  const [amal, setAmal] = useState<"dryRun" | "import" | null>(null);
  const [xatolik, setXatolik] = useState("");
  const band = amal !== null;

  async function dryRun(chosenFile: File) {
    if (band) return;
    setAmal("dryRun");
    setXatolik("");
    setNatija(null);
    setBosqich("preview");
    try {
      setNatija(await mahsulotlarApi.importQilish(chosenFile, true));
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setAmal(null);
    }
  }

  async function faylTanlandi(event: ChangeEvent<HTMLInputElement>) {
    const chosenFile = event.target.files?.[0];
    event.target.value = "";
    if (!chosenFile) return;
    if (!chosenFile.name.toLocaleLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setNatija(null);
      setXatolik("excelImport.onlyXlsx");
      return;
    }
    if (chosenFile.size > 2 * 1024 * 1024) {
      setFile(null);
      setNatija(null);
      setXatolik("excelImport.maxSizeError");
      return;
    }
    setFile(chosenFile);
    await dryRun(chosenFile);
  }

  async function importniTasdiqlash() {
    if (!file || band) return;
    setAmal("import");
    setXatolik("");
    try {
      const result = await mahsulotlarApi.importQilish(file);
      setNatija(result);
      setBosqich("result");
      await onImported();
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setAmal(null);
    }
  }

  function boshidanBoshlash() {
    setFile(null);
    setNatija(null);
    setBosqich("preview");
    setXatolik("");
    inputRef.current?.click();
  }

  const preview = bosqich === "preview";
  return <AppModal><div className="scrollbar-hidden max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
      <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">{t("excelImport.eyebrow")}</p><h2 className="mt-1 text-2xl font-black text-slate-900">{t("excelImport.title")}</h2><p className="mt-1 text-sm text-slate-500">{t("excelImport.subtitle")}</p></div>
      <button type="button" disabled={band} onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200"><X size={18}/></button>
    </div>
    <div className="space-y-5 p-6">
      <input ref={inputRef} type="file" accept=".xlsx" disabled={band} onChange={(event)=>void faylTanlandi(event)} className="sr-only"/>
      <button type="button" disabled={band} onClick={()=>inputRef.current?.click()} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-5 py-5 font-black text-blue-700 disabled:opacity-50 hover:bg-blue-50">
        {amal==="dryRun"?<LoaderCircle size={21} className="animate-spin"/>:<FileSpreadsheet size={21}/>}
        {amal==="dryRun"?t("excelImport.checking"):file?file.name:t("excelImport.chooseFile")}
      </button>
      <p className="text-center text-xs font-bold text-slate-400">{t("excelImport.maxSizeHint")}</p>

      {xatolik&&<div className="rounded-2xl bg-red-50 p-4 font-bold text-red-600">{t(xatolik)}</div>}

      {natija&&<>
        <div className={`rounded-2xl border p-4 ${preview?"border-blue-100 bg-blue-50/50":"border-emerald-100 bg-emerald-50/60"}`}>
          <p className={`font-black ${preview?"text-blue-700":"text-emerald-700"}`}>{preview?t("excelImport.dryRunDone"):t("excelImport.importDone")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [t("excelImport.stats.total"),natija.totalRows,"bg-slate-50 text-slate-700"],
            [preview?t("excelImport.stats.willCreate"):t("excelImport.stats.created"),natija.created,"bg-emerald-50 text-emerald-700"],
            [preview?t("excelImport.stats.willUpdate"):t("excelImport.stats.updated"),natija.updated,"bg-blue-50 text-blue-700"],
            [preview?t("excelImport.stats.willSkip"):t("excelImport.stats.skipped"),natija.skipped,"bg-amber-50 text-amber-700"],
            [t("excelImport.stats.errors"),natija.errors.length,"bg-red-50 text-red-700"],
          ].map(([label,value,color])=><div key={String(label)} className={`rounded-2xl p-4 ${color}`}><p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
        </div>

        {(natija.createdCategories.length>0||natija.createdUnits.length>0)&&<div className="grid gap-4 md:grid-cols-2">
          {natija.createdCategories.length>0&&<div className="rounded-2xl border border-emerald-100 p-4"><h3 className="font-black text-slate-800">{t("excelImport.newCategories")}</h3><div className="mt-3 flex flex-wrap gap-2">{natija.createdCategories.map((item,index)=><span key={`${item.id??item.name}-${index}`} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{item.name}</span>)}</div></div>}
          {natija.createdUnits.length>0&&<div className="rounded-2xl border border-blue-100 p-4"><h3 className="font-black text-slate-800">{t("excelImport.newUnits")}</h3><div className="mt-3 flex flex-wrap gap-2">{natija.createdUnits.map((item,index)=><span key={`${item.id??item.name}-${index}`} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{item.name}</span>)}</div></div>}
        </div>}

        {natija.errorsTruncated&&<div className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">{t("excelImport.errorsTruncated")}</div>}
        {natija.errors.length>0&&<div className="overflow-hidden rounded-2xl border border-red-100">
          <div className="border-b border-red-100 bg-red-50 px-4 py-3"><h3 className="font-black text-red-700">{t("excelImport.rowErrorsTitle")}</h3></div>
          <div className="max-h-80 overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-4 py-3">{t("excelImport.table.row")}</th><th className="px-4 py-3">{t("excelImport.table.column")}</th><th className="px-4 py-3">{t("excelImport.table.message")}</th><th className="px-4 py-3">{t("excelImport.table.value")}</th></tr></thead><tbody className="divide-y divide-slate-100">{natija.errors.map((error,index)=><tr key={`${error.row}-${error.column??""}-${index}`}><td className="px-4 py-3 font-black text-slate-800">{error.row}</td><td className="px-4 py-3 font-bold text-slate-600">{error.column??"—"}</td><td className="min-w-72 px-4 py-3 text-slate-700">{error.message}</td><td className="max-w-64 break-all px-4 py-3 text-slate-500">{error.value??"—"}</td></tr>)}</tbody></table></div>
        </div>}
      </>}
    </div>
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
      <button type="button" disabled={band} onClick={onClose} className="h-11 rounded-2xl bg-slate-100 px-5 font-bold text-slate-700 disabled:opacity-50">{t("excelImport.close")}</button>
      {natija&&<button type="button" disabled={band} onClick={boshidanBoshlash} className="h-11 rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 disabled:opacity-50">{t("excelImport.chooseAnotherFile")}</button>}
      {natija&&preview&&<button type="button" disabled={band||!file} onClick={()=>void importniTasdiqlash()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white disabled:opacity-50">{amal==="import"&&<LoaderCircle size={17} className="animate-spin"/>}{t("excelImport.confirmImport")}</button>}
    </div>
  </div></AppModal>;
}

function formatNumberInput(value:string) {
  const [integer, decimal] = value.replace(/\s/g,"").split(".");
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
}

function MoneyInput({value,suffix,onChange,currency,onCurrencyChange,onApplyAll}:{value:string;suffix?:string;onChange:(value:string)=>void;currency?:"UZS"|"USD";onCurrencyChange?:(value:"UZS"|"USD")=>void;onApplyAll?:()=>void}) {
  const { t } = useTranslation("mahsulotlar");
  return <div className="group relative">
    <input value={formatNumberInput(value)} onChange={(e)=>onChange(e.target.value)} className={`h-12 w-full rounded-2xl border-0 bg-gray-100 px-4 text-sm font-black text-gray-700 outline-none focus:ring-2 focus:ring-orange-100 ${currency?"pr-32":"pr-12"}`} placeholder="0"/>
    {currency&&onCurrencyChange?<AppSelect value={currency} onChange={(e)=>onCurrencyChange(e.target.value as "UZS"|"USD")} className="absolute right-2 top-1/2 h-9 min-w-[76px] -translate-y-1/2 rounded-xl border border-gray-200 bg-white px-2 text-xs font-black text-gray-600 outline-none hover:border-orange-200 focus:border-orange-300"><option value="UZS">UZS</option><option value="USD">USD</option></AppSelect>:<span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">{suffix}</span>}
    {onApplyAll&&value&&<button type="button" onClick={onApplyAll} className="absolute left-0 top-[calc(100%+4px)] z-20 hidden rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black text-white shadow-lg group-focus-within:block hover:bg-blue-700">{t("moneyInput.applyToAll")}</button>}
  </div>;
}

function StockInput({value,onChange,warning}:{value:string;onChange:(value:string)=>void;warning?:boolean}) {
  const { t } = useTranslation("mahsulotlar");
  return <div className="relative max-w-[170px]">
    {warning&&<span className="absolute left-4 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-black text-white">!</span>}
    <input value={formatNumberInput(value)} onChange={(e)=>onChange(e.target.value.replace(/[^\d.]/g,""))} className={`h-11 w-full rounded-2xl border border-transparent bg-white px-4 text-sm font-black text-gray-700 outline-none focus:border-orange-200 focus:ring-2 focus:ring-orange-100 ${warning?"pl-10":"pl-4"} pr-14`} placeholder="0"/>
    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">{t("stockInput.unit")}</span>
  </div>;
}

const emptyVariantDraft: VariantDraft = {
  barcode: "",
  imageUrl: "",
  active: true,
  costPrice: "",
  costCurrency: "UZS",
  markup: "",
  retailPrice: "",
  retailCurrency: "UZS",
  wholesalePrice: "",
  wholesaleCurrency: "UZS",
};

function cleanRemoteImage(value: string) {
  const clean = value.trim();
  return clean && !clean.startsWith("blob:") ? clean : "";
}

function numericOrZero(value: string) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function MahsulotModalKeng({item,onClose}:{item:Mahsulot|"new";onClose:()=>void}) {
  const { t } = useTranslation("mahsulotlar");
  const store=useMahsulotlarStore();
  const editing=item!=="new";
  const [name,setName]=useState(editing?item.name:"");
  const [categoryId,setCategoryId]=useState(editing?item.categoryId:store.kategoriyalar[0]?.id??"");
  const [unitId,setUnitId]=useState(editing?item.unitId:store.birliklar.find((unit)=>isProductUnit(unit,store.standardBirliklar))?.id??"");
  const [unitResolving,setUnitResolving]=useState(false);
  const [barcode,setBarcode]=useState(editing?item.barcode??"":"");
  const [article,setArticle]=useState(editing?item.article??"":"");
  const [imageUrl,setImageUrl]=useState(editing?item.imageUrl??"":"");
  const [isActive,setIsActive]=useState(editing?item.isActive:true);
  const [variationRows,setVariationRows]=useState<VariationRow[]>([
    { id: Date.now(), attribute: "", attributeAdded: false, value: "", options: [] },
  ]);
  const [savedVariationOptions,setSavedVariationOptions]=useState<Record<string,string[]>>({});
  const [activeVariationRow,setActiveVariationRow]=useState<number|null>(null);
  const [variantDrafts,setVariantDrafts]=useState<Record<string,VariantDraft>>({});
  const [variantStockDrafts,setVariantStockDrafts]=useState<Record<string,VariantStockDraft>>({});
  const [baseDraft,setBaseDraft]=useState<VariantDraft>(emptyVariantDraft);
  const [baseStock,setBaseStock]=useState<VariantStockDraft>({open:true,warehouseId:"",quantity:"",minStock:""});
  const [omborlar,setOmborlar]=useState<Ombor[]>([]);
  const [brand,setBrand]=useState("");
  const [brandInput,setBrandInput]=useState("");
  const [savedBrands,setSavedBrands]=useState<string[]>([]);
  const [brandMenuOpen,setBrandMenuOpen]=useState(false);
  const [categorySearch,setCategorySearch]=useState("");
  const [newCategoryName,setNewCategoryName]=useState("");
  const [categoryCreating,setCategoryCreating]=useState(false);
  const [editingCategoryId,setEditingCategoryId]=useState<string|null>(null);
  const [editingCategoryName,setEditingCategoryName]=useState("");
  const [categoryUpdating,setCategoryUpdating]=useState(false);
  const [optionalFields,setOptionalFields]=useState<OptionalFeatureField[]>([]);
  const imageInputRef=useRef<HTMLInputElement|null>(null);

  const variantCombinations = useMemo<VariantCombination[]>(() => {
    const completed = variationRows
      .filter((row) => row.attribute.trim() && row.options.length > 0)
      .map((row) => ({ attribute: row.attribute.trim(), options: row.options }));
    if (completed.length === 0) return [];
    return completed.reduce<VariantCombination[]>((items, row) => {
      if (items.length === 0) {
        return row.options.map((option) => ({
          key: `${row.attribute}:${option}`,
          label: option,
          params: { [row.attribute]: option },
        }));
      }
      return items.flatMap((item) =>
        row.options.map((option) => ({
          key: `${item.key}|${row.attribute}:${option}`,
          label: `${item.label} / ${option}`,
          params: { ...item.params, [row.attribute]: option },
        }))
      );
    }, []);
  }, [variationRows]);

  useEffect(() => {
    setVariantDrafts((drafts) => {
      const next: Record<string, VariantDraft> = {};
      variantCombinations.forEach((combo) => {
        next[combo.key] = drafts[combo.key] ?? {
          barcode: generateBarcodeValue(),
          imageUrl: "",
          active: true,
          costPrice: "",
          costCurrency: "UZS",
          markup: "",
          retailPrice: "",
          retailCurrency: "UZS",
          wholesalePrice: "",
          wholesaleCurrency: "UZS",
        };
      });
      return next;
    });
  }, [variantCombinations]);

  useEffect(() => {
    let mounted=true;
    Promise.allSettled([omborlarApi.royxat()])
      .then(([omborNatija])=>{
        if(!mounted)return;
        setOmborlar(omborNatija.status==="fulfilled"?omborNatija.value:[]);
      });
    return ()=>{mounted=false};
  }, []);

  const filteredCategories=useMemo(()=>{
    const query=categorySearch.trim().toLowerCase();
    return query
      ?store.kategoriyalar.filter((kategoriya)=>kategoriya.name.toLowerCase().includes(query))
      :store.kategoriyalar;
  },[categorySearch,store.kategoriyalar]);

  // Tahrirlashda mahsulotning joriy birligi (agar mahsulotga mos bo'lmasa ham) ko'rinib turishi uchun saqlanadi.
  const productWorkspaceUnits=useMemo(
    ()=>store.birliklar.filter((unit)=>(editing&&unit.id===item.unitId)||isProductUnit(unit,store.standardBirliklar)),
    [store.birliklar,store.standardBirliklar,editing,item]
  );
  // Standart katalogda faqat mahsulotga mos va workspace'da hali ko'rinmaydigan birliklar qoladi.
  const productStandardUnits=useMemo(
    ()=>store.standardBirliklar.filter((unit)=>PRODUCT_UNIT_CATEGORIES.has(unit.category)&&!standardUnitInWorkspace(unit,productWorkspaceUnits)),
    [store.standardBirliklar,productWorkspaceUnits]
  );

  useEffect(() => {
    setVariantStockDrafts((drafts) => {
      const next: Record<string, VariantStockDraft> = {};
      variantCombinations.forEach((combo,index) => {
        next[combo.key] = drafts[combo.key] ?? {
          open: index === 0,
          warehouseId: omborlar[0]?.id ?? "",
          quantity: "",
          minStock: "",
        };
      });
      return next;
    });
  }, [variantCombinations, omborlar]);

  async function save(e:FormEvent){
    e.preventDefault();
    const variantParams=variationRows.reduce<Record<string, string[]>>((params,row)=>{
      const attribute=row.attribute.trim();
      if(attribute&&row.options.length>0)params[attribute]=row.options;
      return params;
    },{});
    const hasVariantParams=Object.keys(variantParams).length>0;
    const characteristicParams:Record<string, unknown>={};
    if(brand.trim())characteristicParams.brand=brand.trim();
    optionalFields.forEach((field)=>{
      const key=field.name.trim();
      const value=field.value.trim();
      if(key&&value)characteristicParams[key]=value;
    });
    const defaultParams={
      ...(hasVariantParams?variantParams:{}),
      ...characteristicParams,
    };
    const hasDefaultParams=Object.keys(defaultParams).length>0;
    const generatedVariants=variantCombinations
      .filter((combo)=>variantDrafts[combo.key]?.active!==false)
      .map((combo)=>({
        name:combo.label,
        barcode:variantDrafts[combo.key]?.barcode||generateBarcodeValue(),
        article:article.trim()||undefined,
        imageUrl:cleanRemoteImage(variantDrafts[combo.key]?.imageUrl??"")||undefined,
        minStock:numericOrZero(variantStockDrafts[combo.key]?.minStock??""),
        params:{...combo.params,...characteristicParams},
        price:{
          costPrice:Number(variantDrafts[combo.key]?.costPrice||0),
          retailPrice:Number(variantDrafts[combo.key]?.retailPrice||0),
          wholesalePrice:Number(variantDrafts[combo.key]?.wholesalePrice||variantDrafts[combo.key]?.retailPrice||0),
          currency:variantDrafts[combo.key]?.retailCurrency??"UZS",
        },
      }));
    if(!name.trim()||!categoryId||!unitId||(!editing&&generatedVariants.length===0&&!barcode.trim()))return;
    let productUnitId=unitId;
    if(unitId.startsWith(STANDARD_UNIT_PREFIX)){
      const standardId=Number(unitId.slice(STANDARD_UNIT_PREFIX.length));
      const standardUnit=store.standardBirliklar.find((unit)=>unit.id===standardId);
      if(!standardUnit)return;
      setUnitResolving(true);
      const workspaceUnitId=await store.standardBirlikniWorkspacegaOtkazish(standardUnit);
      setUnitResolving(false);
      if(!workspaceUnitId)return;
      productUnitId=workspaceUnitId;
      setUnitId(workspaceUnitId);
    }
    const safeImageUrl=cleanRemoteImage(imageUrl);
    const data={name:name.trim(),categoryId,unitId:productUnitId,barcode:barcode.trim()||undefined,article:article.trim()||undefined,imageUrl:safeImageUrl||undefined,isActive};
    const ok=editing
      ?await store.mahsulotSaqlash(item.id,data)
      :generatedVariants.length>0
        ?await store.mahsulotVariantlarBilanYaratish(data,generatedVariants)
        :await store.mahsulotNarxBilanYaratish(data,{
          name:hasVariantParams?Object.values(variantParams).flat().join(", "):"Asosiy variant",
          barcode:barcode.trim(),
          article:article.trim()||undefined,
          imageUrl:safeImageUrl||undefined,
          minStock:numericOrZero(baseStock.minStock),
          params:hasDefaultParams?defaultParams:undefined,
          price:{
            costPrice:Number(baseDraft.costPrice||0),
            retailPrice:Number(baseDraft.retailPrice||0),
            wholesalePrice:Number(baseDraft.wholesalePrice||baseDraft.retailPrice||0),
            currency:baseDraft.retailCurrency??"UZS",
          },
        });
    if(ok)onClose()
  }

  function generateArticle() {
    const prefix=name.trim().slice(0,3).toUpperCase().replace(/[^A-Z0-9]/g,"")||"PRD";
    setArticle(`${prefix}-${Date.now().toString().slice(-6)}`);
  }

  function generateBarcodeValue() {
    return `478${Math.floor(100000000+Math.random()*900000000)}`;
  }

  function generateBarcode() {
    setBarcode(generateBarcodeValue());
  }

  function quickFill() {
    if(!article.trim())generateArticle();
    if(!barcode.trim())generateBarcode();
  }

  function selectImage(file?:File) {
    if(!file||!file.type.startsWith("image/"))return;
    setImageUrl(URL.createObjectURL(file));
  }

  function handleImageChange(e:ChangeEvent<HTMLInputElement>) {
    selectImage(e.target.files?.[0]);
  }

  function handleImageDrop(e:DragEvent<HTMLDivElement>) {
    e.preventDefault();
    selectImage(e.dataTransfer.files?.[0]);
  }

  function updateVariationRow(id:number, patch:Partial<{attribute:string;attributeAdded:boolean;value:string;options:string[]}>) {
    setVariationRows((rows)=>rows.map((row)=>row.id===id?{...row,...patch}:row));
  }

  function addVariationAttribute(id:number) {
    const row=variationRows.find((item)=>item.id===id);
    if(!row?.attribute.trim())return;
    updateVariationRow(id,{attributeAdded:true});
  }

  function addVariationOption(id:number) {
    const row=variationRows.find((item)=>item.id===id);
    const value=row?.value.trim()??"";
    if(!row||!value||row.options.includes(value))return;
    const attribute=row.attribute.trim();
    if(attribute)setSavedVariationOptions((saved)=>({...saved,[attribute]:Array.from(new Set([...(saved[attribute]??[]),value]))}));
    const nextRows=variationRows.map((item)=>item.id===id?{...item,value:"",options:[...item.options,value]}:item);
    const lastRow=nextRows[nextRows.length-1];
    setVariationRows(lastRow.id===id?[...nextRows,{id:Date.now()+1,attribute:"",attributeAdded:false,value:"",options:[]}]:nextRows);
  }

  function selectSavedVariationOption(id:number, option:string) {
    const nextRows=variationRows.map((row)=>row.id===id&& !row.options.includes(option)?{...row,value:"",options:[...row.options,option]}:row);
    const lastRow=nextRows[nextRows.length-1];
    setVariationRows(lastRow.id===id?[...nextRows,{id:Date.now()+1,attribute:"",attributeAdded:false,value:"",options:[]}]:nextRows);
    setActiveVariationRow(null);
  }

  function removeVariationRow(id:number) {
    setVariationRows((rows)=>{
      const next=rows.filter((row)=>row.id!==id);
      return next.length>0?next:[{id:Date.now(),attribute:"",attributeAdded:false,value:"",options:[]}];
    });
  }

  function removeVariationOption(id:number, option:string) {
    setVariationRows((rows)=>rows.map((row)=>row.id===id?{...row,options:row.options.filter((item)=>item!==option)}:row));
  }

  function savedOptionsFor(row:VariationRow) {
    const query=row.value.trim().toLowerCase();
    return (savedVariationOptions[row.attribute.trim()]??[]).filter((option)=>
      !row.options.includes(option)&&(!query||option.toLowerCase().includes(query))
    );
  }

  function filteredBrands() {
    const query=brandInput.trim().toLowerCase();
    return savedBrands.filter((item)=>item!==brand&&(!query||item.toLowerCase().includes(query)));
  }

  function addBrand(value=brandInput) {
    const clean=value.trim();
    if(!clean)return;
    setBrand(clean);
    setSavedBrands((items)=>Array.from(new Set([...items,clean])));
    setBrandInput(clean);
    setBrandMenuOpen(false);
  }

  function addOptionalField() {
    setOptionalFields((fields)=>[...fields,{id:Date.now(),name:"",value:""}]);
  }

  function updateOptionalField(id:number, patch:Partial<OptionalFeatureField>) {
    setOptionalFields((fields)=>fields.map((field)=>field.id===id?{...field,...patch}:field));
  }

  function removeOptionalField(id:number) {
    setOptionalFields((fields)=>fields.filter((field)=>field.id!==id));
  }

  async function createCategoryFromCharacteristics() {
    const nameValue=(newCategoryName.trim()||categorySearch.trim());
    if(!nameValue)return;
    const existing=store.kategoriyalar.find((kategoriya)=>
      kategoriya.name.toLowerCase()===nameValue.toLowerCase()
    );
    if(existing){
      setCategoryId(existing.id);
      setCategorySearch("");
      setNewCategoryName("");
      return;
    }
    setCategoryCreating(true);
    const ok=await store.kategoriyaSaqlash(null,{name:nameValue});
    setCategoryCreating(false);
    if(!ok)return;
    const created=useMahsulotlarStore.getState().kategoriyalar.find((kategoriya)=>
      kategoriya.name.toLowerCase()===nameValue.toLowerCase()
    );
    if(created)setCategoryId(created.id);
    setCategorySearch("");
    setNewCategoryName("");
  }

  function startCategoryEdit(kategoriya:Kategoriya) {
    setEditingCategoryId(kategoriya.id);
    setEditingCategoryName(kategoriya.name);
  }

  async function saveCategoryEdit() {
    const nameValue=editingCategoryName.trim();
    if(!editingCategoryId||!nameValue)return;
    setCategoryUpdating(true);
    const ok=await store.kategoriyaSaqlash(editingCategoryId,{name:nameValue});
    setCategoryUpdating(false);
    if(!ok)return;
    setEditingCategoryId(null);
    setEditingCategoryName("");
  }

  function updateVariantDraft(key:string, patch:Partial<VariantDraft>) {
    setVariantDrafts((drafts)=>({
      ...drafts,
      [key]: {...(drafts[key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"}),...patch},
    }));
  }

  function updateVariantStockDraft(key:string, patch:Partial<VariantStockDraft>) {
    setVariantStockDrafts((drafts)=>({
      ...drafts,
      [key]: {...(drafts[key]??{open:false,warehouseId:omborlar[0]?.id??"",quantity:"",minStock:""}),...patch},
    }));
  }

  function updateVariantPrice(key:string, field:"costPrice"|"markup"|"retailPrice"|"wholesalePrice", value:string) {
    const numericValue=value.replace(/[^\d.]/g,"");
    const current=variantDrafts[key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
    const patch:Partial<VariantDraft>={[field]:numericValue};
    if(field==="costPrice"||field==="markup"){
      const cost=Number(field==="costPrice"?numericValue:current.costPrice||0);
      const markup=Number(field==="markup"?numericValue:current.markup||0);
      if(cost>0&&markup>=0)patch.retailPrice=String(Math.round(cost+(cost*markup/100)));
    }
    if(field==="retailPrice"){
      const cost=Number(current.costPrice||0);
      const retail=Number(numericValue||0);
      if(cost>0&&retail>=0)patch.markup=String(Number((((retail-cost)/cost)*100).toFixed(2)));
    }
    updateVariantDraft(key,patch);
  }

  function updateBasePrice(field:"costPrice"|"markup"|"retailPrice"|"wholesalePrice", value:string) {
    const numericValue=value.replace(/[^\d.]/g,"");
    setBaseDraft((current)=>{
      const patch:Partial<VariantDraft>={[field]:numericValue};
      if(field==="costPrice"||field==="markup"){
        const cost=Number(field==="costPrice"?numericValue:current.costPrice||0);
        const markup=Number(field==="markup"?numericValue:current.markup||0);
        if(cost>0&&markup>=0)patch.retailPrice=String(Math.round(cost+(cost*markup/100)));
      }
      if(field==="retailPrice"){
        const cost=Number(current.costPrice||0);
        const retail=Number(numericValue||0);
        if(cost>0&&retail>=0)patch.markup=String(Number((((retail-cost)/cost)*100).toFixed(2)));
      }
      return {...current,...patch};
    });
  }

  function applyCostToAll(sourceKey:string) {
    const source=variantDrafts[sourceKey];
    if(!source?.costPrice)return;
    setVariantDrafts((drafts)=>{
      const next={...drafts};
      variantCombinations.forEach((combo)=>{
        const current=next[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
        const cost=Number(source.costPrice||0);
        const markup=Number(current.markup||0);
        next[combo.key]={
          ...current,
          costPrice:source.costPrice,
          costCurrency:source.costCurrency,
          retailPrice:cost>0&&markup>=0?String(Math.round(cost+(cost*markup/100))):current.retailPrice,
        };
      });
      return next;
    });
  }

  function applyMarkupToAll(sourceKey:string) {
    const source=variantDrafts[sourceKey];
    if(!source?.markup)return;
    setVariantDrafts((drafts)=>{
      const next={...drafts};
      variantCombinations.forEach((combo)=>{
        const current=next[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
        const cost=Number(current.costPrice||0);
        const markup=Number(source.markup||0);
        next[combo.key]={
          ...current,
          markup:source.markup,
          retailPrice:cost>0&&markup>=0?String(Math.round(cost+(cost*markup/100))):current.retailPrice,
        };
      });
      return next;
    });
  }

  function applyRetailToAll(sourceKey:string) {
    const source=variantDrafts[sourceKey];
    if(!source?.retailPrice)return;
    setVariantDrafts((drafts)=>{
      const next={...drafts};
      variantCombinations.forEach((combo)=>{
        const current=next[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
        const cost=Number(current.costPrice||0);
        const retail=Number(source.retailPrice||0);
        next[combo.key]={
          ...current,
          retailPrice:source.retailPrice,
          retailCurrency:source.retailCurrency,
          markup:cost>0&&retail>=0?String(Number((((retail-cost)/cost)*100).toFixed(2))):current.markup,
        };
      });
      return next;
    });
  }

  function handleVariantImage(key:string, file?:File) {
    if(!file||!file.type.startsWith("image/"))return;
    updateVariantDraft(key,{imageUrl:URL.createObjectURL(file)});
  }

  return <AppModal className="product-modal-overlay"><form onSubmit={save} className="product-modal-panel scrollbar-hidden max-h-[94vh] w-full overflow-y-auto rounded-[30px] bg-white shadow-2xl">
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white"><X size={18}/></button>
        <h2 className="truncate text-2xl font-black">{editing?t("productModal.editTitle"):t("productModal.createTitle")}</h2>
      </div>
    </div>

    <div className="px-6 py-6">
      <main className="min-w-0 space-y-8">
        {store.xatolik&&<div className="mb-4"><ErrorBox/></div>}
        <section className="space-y-5">
          <div className="flex items-center gap-4"><h3 className="text-xl font-black">{t("productModal.sectionMain")}</h3><div className="h-px flex-1 bg-gray-100"/></div>
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-4">
                <label className="block text-sm font-black text-gray-500">{t("productModal.nameLabel")}
                  <div className="relative mt-2">
                    <input value={name} onChange={e=>setName(e.target.value)} className="input pr-28" placeholder={t("productModal.namePlaceholder")}/>
                    <button type="button" onClick={quickFill} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-black text-orange-600 hover:bg-orange-50">{t("productModal.quickFill")}</button>
                  </div>
                </label>
                <label className="block text-sm font-black text-gray-500">{t("productModal.articleLabel")}
                  <div className="relative mt-2">
                    <input value={article} onChange={e=>setArticle(e.target.value)} className="input pr-24" placeholder={t("productModal.articlePlaceholder")}/>
                    <button type="button" onClick={generateArticle} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-black text-orange-600 hover:bg-orange-50">{t("productModal.generate")}</button>
                  </div>
                </label>
            </div>
            <div className="space-y-4">
                <label className="block text-sm font-black text-gray-500">{t("productModal.barcodeLabel")}{editing?"":" *"}
                  <div className="relative mt-2">
                    <input value={barcode} onChange={e=>setBarcode(e.target.value)} className="input pr-24" placeholder={t("productModal.barcodePlaceholder")}/>
                    <button type="button" onClick={generateBarcode} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-black text-orange-600 hover:bg-orange-50">{t("productModal.generate")}</button>
                  </div>
                </label>
                <label className="block text-sm font-black text-gray-500">{t("productModal.categoryLabel")}
                  <AppSelect value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="input mt-2"><option value="">{t("productModal.categoryPlaceholder")}</option>{store.kategoriyalar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</AppSelect>
                </label>
            </div>
            <div className="space-y-4">
                <div className="block text-sm font-black text-gray-500">
                  <p>{t("productModal.unitLabel")}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <AppSelect value={unitId} onChange={e=>setUnitId(e.target.value)} className="input min-w-0 flex-1">
                      <option value="">{t("productModal.unitPlaceholder")}</option>
                      <optgroup label={t("productModal.unitGroupWorkspace")}>
                        {productWorkspaceUnits.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                      </optgroup>
                      {productStandardUnits.length>0&&<optgroup label={t("productModal.unitGroupStandard")}>
                        {productStandardUnits.map(x=><option key={x.id} value={`${STANDARD_UNIT_PREFIX}${x.id}`}>{standardUnitLabel(x)}</option>)}
                      </optgroup>}
                    </AppSelect>
                    <button type="button" onClick={()=>setIsActive(!isActive)} aria-label={t("productModal.toggleActiveAria")} className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${isActive?"bg-orange-500 shadow-sm shadow-orange-100":"bg-gray-200"}`}>
                      <span className={`h-6 w-6 rounded-full bg-white shadow transition ${isActive?"translate-x-6":"translate-x-0"}`}/>
                    </button>
                  </div>
                </div>
              <div className="space-y-2">
                <p className="text-sm font-black text-gray-500">{t("productModal.photoLabel")}</p>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden"/>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={()=>imageInputRef.current?.click()}
                  onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" ")imageInputRef.current?.click()}}
                  onDragOver={(e)=>e.preventDefault()}
                  onDrop={handleImageDrop}
                  className="flex min-h-[108px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-gray-100 px-4 py-4 text-center transition hover:border-orange-200 hover:bg-orange-50/40"
                >
                  {imageUrl ? <div className="relative">
                    <img src={imageUrl} alt={t("productModal.photoAlt")} className="max-h-24 rounded-2xl object-contain"/>
                    <button type="button" onClick={(event)=>{event.stopPropagation();setImageUrl("")}} className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 shadow-lg ring-1 ring-red-100 hover:bg-red-500 hover:text-white"><X size={15}/></button>
                  </div> : <>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm"><ImagePlus size={20}/></div>
                    <p className="text-sm font-black text-gray-600">{t("productModal.photoDrop")}</p>
                    <p className="text-sm font-black text-orange-600">{t("productModal.photoBrowse")}</p>
                  </>}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4"><h3 className="text-xl font-black">{t("productModal.sectionVariations")}</h3><div className="h-px flex-1 bg-gray-100"/></div>
            <div>
              <p className="text-sm font-black text-gray-500">{t("productModal.variationAttributeLabel")}</p>
              <p className="mt-1 text-xs font-bold text-gray-400">{t("productModal.variationAttributeHint")}</p>
              <div className="mt-3 space-y-4">
                {variationRows.map((row)=>(
                  <div key={row.id} className={`grid gap-4 ${row.attributeAdded?"md:grid-cols-2":"md:grid-cols-[minmax(260px,420px)]"}`}>
                    <div className="space-y-2">
                      <div className="relative">
                        <input value={row.attribute} onChange={e=>updateVariationRow(row.id,{attribute:e.target.value,attributeAdded:false,value:"",options:[]})} className="input pr-12" placeholder={t("productModal.attributePlaceholder")}/>
                        <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                      </div>
                      {!row.attributeAdded&&row.attribute.trim()&&<button type="button" onClick={()=>addVariationAttribute(row.id)} className="flex w-full items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600"><Plus size={16}/>{t("productModal.addAttribute",{value:row.attribute.trim()})}</button>}
                      {!row.attribute.trim()&&<div className="rounded-2xl bg-gray-50 px-4 py-3 text-center text-sm font-bold text-gray-400">{t("productModal.noVariants")}</div>}
                    </div>
                    {row.attributeAdded&&<div className="relative space-y-2">
                      <div className="flex min-h-12 items-center gap-2 rounded-2xl border bg-white px-3 py-2 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          {row.options.map((option)=><span key={option} className="inline-flex max-w-full items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-orange-600"><span className="truncate">{option}</span><button type="button" onClick={()=>removeVariationOption(row.id,option)} className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white"><X size={12}/></button></span>)}
                          <input value={row.value} onFocus={()=>setActiveVariationRow(row.id)} onChange={e=>{updateVariationRow(row.id,{value:e.target.value});setActiveVariationRow(row.id)}} onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addVariationOption(row.id)}}} className="h-8 min-w-28 flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none" placeholder={row.options.length?t("productModal.optionPlaceholderMore"):t("productModal.optionPlaceholder",{attribute:row.attribute})}/>
                        </div>
                        <span className="shrink-0 text-gray-300">в‹®в‹®</span>
                        <button type="button" onClick={()=>removeVariationRow(row.id)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"><X size={14}/></button>
                      </div>
                      {activeVariationRow===row.id&&savedOptionsFor(row).length>0&&<div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
                        {savedOptionsFor(row).map((option)=><button key={option} type="button" onMouseDown={(e)=>{e.preventDefault();selectSavedVariationOption(row.id,option)}} className="block w-full px-5 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600">{option}</button>)}
                      </div>}
                      {row.value.trim()&&<button type="button" onClick={()=>addVariationOption(row.id)} className="flex w-full items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600"><Plus size={16}/>{t("productModal.addOption",{value:row.value.trim()})}</button>}
                    </div>}
                  </div>
                ))}
              </div>
            </div>
            {variantCombinations.length>0&&<div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white">
              <div className="grid grid-cols-[70px_1fr_220px_90px] border-b border-gray-100 px-4 py-3 text-sm font-semibold text-slate-600">
                <span>{t("productModal.variantTable.photo")}</span>
                <span>{t("productModal.variantTable.variation")}</span>
                <span>{t("productModal.variantTable.barcode")}</span>
                <span className="text-right">{t("productModal.variantTable.status")}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {variantCombinations.map((combo)=>{
                  const draft=variantDrafts[combo.key]??{barcode:"",imageUrl:"",active:true};
                  return <div key={combo.key} className="grid grid-cols-[70px_1fr_220px_90px] items-center gap-4 px-4 py-3">
                    <label className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-orange-600 hover:bg-orange-50">
                      {draft.imageUrl?<img src={draft.imageUrl} alt={combo.label} className="h-full w-full object-cover"/>:<Plus size={18}/>}
                      <input type="file" accept="image/*" className="hidden" onChange={(e)=>handleVariantImage(combo.key,e.target.files?.[0])}/>
                    </label>
                    <div className="font-black text-gray-600">{combo.label}</div>
                    <div className="relative">
                      <input value={draft.barcode} onChange={(e)=>updateVariantDraft(combo.key,{barcode:e.target.value})} className="input h-11 pr-24" placeholder={t("productModal.barcodePlaceholder")}/>
                      <button type="button" onClick={()=>updateVariantDraft(combo.key,{barcode:generateBarcodeValue()})} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs font-black text-orange-600 hover:bg-orange-50">{t("productModal.generateShort")}</button>
                    </div>
                    <button type="button" onClick={()=>updateVariantDraft(combo.key,{active:!draft.active})} className={`ml-auto flex h-8 w-14 items-center rounded-full p-1 transition ${draft.active?"bg-blue-500":"bg-gray-200"}`}>
                      <span className={`h-6 w-6 rounded-full bg-white shadow transition ${draft.active?"translate-x-6":"translate-x-0"}`}/>
                    </button>
                  </div>
                })}
              </div>
            </div>}
            {variantCombinations.length>0&&<div className="overflow-x-auto rounded-[24px] border border-gray-100 bg-white">
              <div className="grid min-w-[1080px] grid-cols-[1fr_230px_150px_230px_230px] border-b border-gray-100 px-4 py-3 text-sm font-semibold text-slate-600">
                <span>{t("productModal.priceTable.variation")}</span>
                <span>{t("productModal.priceTable.costPrice")}</span>
                <span>{t("productModal.priceTable.markup")}</span>
                <span>{t("productModal.priceTable.retailPrice")}</span>
                <span>{t("productModal.priceTable.wholesalePrice")}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {variantCombinations.map((combo)=>{
                  const draft=variantDrafts[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
                  return <div key={combo.key} className="grid min-w-[1080px] grid-cols-[1fr_230px_150px_230px_230px] items-center gap-4 px-4 py-3">
                    <div className="font-black text-gray-600">{combo.label}</div>
                    <MoneyInput value={draft.costPrice} currency={draft.costCurrency} onChange={(value)=>updateVariantPrice(combo.key,"costPrice",value)} onCurrencyChange={(value)=>updateVariantDraft(combo.key,{costCurrency:value})} onApplyAll={()=>applyCostToAll(combo.key)}/>
                    <MoneyInput value={draft.markup} suffix="%" onChange={(value)=>updateVariantPrice(combo.key,"markup",value)} onApplyAll={()=>applyMarkupToAll(combo.key)}/>
                    <MoneyInput value={draft.retailPrice} currency={draft.retailCurrency} onChange={(value)=>updateVariantPrice(combo.key,"retailPrice",value)} onCurrencyChange={(value)=>updateVariantDraft(combo.key,{retailCurrency:value})} onApplyAll={()=>applyRetailToAll(combo.key)}/>
                    <MoneyInput value={draft.wholesalePrice} currency={draft.wholesaleCurrency} onChange={(value)=>updateVariantPrice(combo.key,"wholesalePrice",value)} onCurrencyChange={(value)=>updateVariantDraft(combo.key,{wholesaleCurrency:value})}/>
                  </div>
                })}
              </div>
            </div>}
            {variantCombinations.length===0&&<div className="rounded-[24px] border border-orange-100 bg-orange-50/30 p-4">
              <div className="mb-4">
                <p className="text-base font-black text-gray-700">{t("productModal.baseVariant.title")}</p>
                <p className="mt-1 text-sm font-bold text-gray-400">{t("productModal.baseVariant.subtitle")}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <label className="block text-xs font-black uppercase tracking-[0.06em] text-gray-500">{t("productModal.baseVariant.costPrice")}
                  <div className="mt-2"><MoneyInput value={baseDraft.costPrice} currency={baseDraft.costCurrency} onChange={(value)=>updateBasePrice("costPrice",value)} onCurrencyChange={(value)=>setBaseDraft((draft)=>({...draft,costCurrency:value}))}/></div>
                </label>
                <label className="block text-xs font-black uppercase tracking-[0.06em] text-gray-500">{t("productModal.baseVariant.markup")}
                  <div className="mt-2"><MoneyInput value={baseDraft.markup} suffix="%" onChange={(value)=>updateBasePrice("markup",value)}/></div>
                </label>
                <label className="block text-xs font-black uppercase tracking-[0.06em] text-gray-500">{t("productModal.baseVariant.retailPrice")}
                  <div className="mt-2"><MoneyInput value={baseDraft.retailPrice} currency={baseDraft.retailCurrency} onChange={(value)=>updateBasePrice("retailPrice",value)} onCurrencyChange={(value)=>setBaseDraft((draft)=>({...draft,retailCurrency:value}))}/></div>
                </label>
                <label className="block text-xs font-black uppercase tracking-[0.06em] text-gray-500">{t("productModal.baseVariant.wholesalePrice")}
                  <div className="mt-2"><MoneyInput value={baseDraft.wholesalePrice} currency={baseDraft.wholesaleCurrency} onChange={(value)=>updateBasePrice("wholesalePrice",value)} onCurrencyChange={(value)=>setBaseDraft((draft)=>({...draft,wholesaleCurrency:value}))}/></div>
                </label>
                <label className="block text-xs font-black uppercase tracking-[0.06em] text-gray-500">{t("productModal.baseVariant.minStock")}
                  <div className="mt-2"><StockInput value={baseStock.minStock} onChange={(value)=>setBaseStock((stock)=>({...stock,minStock:value}))} warning/></div>
                </label>
              </div>
            </div>}
            {variantCombinations.length>0&&<div className="space-y-3">
              {variantCombinations.map((combo)=>{
                const stock=variantStockDrafts[combo.key]??{open:false,warehouseId:omborlar[0]?.id??"",quantity:"",minStock:""};
                return <div key={combo.key} className="overflow-hidden rounded-[24px] bg-gray-50 ring-1 ring-gray-100">
                  <button type="button" onClick={()=>updateVariantStockDraft(combo.key,{open:!stock.open})} className="flex w-full items-center gap-2 border-b border-gray-100 px-5 py-4 text-left text-sm font-black text-gray-600 hover:bg-orange-50/50">
                    {stock.open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
                    <span className="truncate">{name.trim()||t("productModal.stock.defaultProductName")} / {combo.label}</span>
                  </button>
                  {stock.open&&<div className="px-5 pb-5 pt-4">
                    <div className="grid grid-cols-[minmax(180px,1fr)_190px_190px] gap-4 border-b border-gray-200 pb-3 text-sm font-semibold text-slate-600">
                      <span>{t("productModal.stock.warehouseColumn")}</span>
                      <span>{t("productModal.stock.quantityColumn")}</span>
                      <span>{t("productModal.stock.minStockColumn")}</span>
                    </div>
                    <div className="grid grid-cols-[minmax(180px,1fr)_190px_190px] items-center gap-4 pt-3">
                      {omborlar.length>0?<AppSelect value={stock.warehouseId} onChange={(e)=>updateVariantStockDraft(combo.key,{warehouseId:e.target.value})} className="h-11 rounded-2xl border border-transparent bg-white px-4 text-sm font-black text-gray-600 outline-none focus:border-orange-200 focus:ring-2 focus:ring-orange-100">
                        {omborlar.map((ombor)=><option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
                      </AppSelect>:<div className="h-11 rounded-2xl bg-white px-4 py-3 text-sm font-black text-gray-600">{t("productModal.stock.defaultWarehouse")}</div>}
                      <StockInput value={stock.quantity} onChange={(value)=>updateVariantStockDraft(combo.key,{quantity:value})}/>
                      <StockInput value={stock.minStock} onChange={(value)=>updateVariantStockDraft(combo.key,{minStock:value})} warning/>
                    </div>
                  </div>}
                </div>
              })}
            </div>}
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-4"><h3 className="text-xl font-black">{t("productModal.sectionCharacteristics")}</h3><div className="h-px flex-1 border-t border-dashed border-gray-200"/></div>
              <div>
                <label className="block text-sm font-black text-gray-500">{t("productModal.brandLabel")}
                  <div className="relative mt-2 space-y-2">
                    <div className="relative">
                      <input value={brandInput} onFocus={()=>setBrandMenuOpen(true)} onChange={(e)=>{setBrandInput(e.target.value);setBrand(e.target.value.trim());setBrandMenuOpen(true)}} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();addBrand()}}} className="input bg-gray-100 pr-12 focus:border-blue-400 focus:ring-blue-100" placeholder={t("productModal.brandPlaceholder")}/>
                      <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                    </div>
                    {brandMenuOpen&&filteredBrands().length>0&&<div className="absolute left-0 right-0 top-[52px] z-30 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
                      {filteredBrands().map((item)=><button key={item} type="button" onMouseDown={(e)=>{e.preventDefault();addBrand(item)}} className="block w-full px-5 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600">{item}</button>)}
                    </div>}
                    {brandInput.trim()&&!savedBrands.includes(brandInput.trim())&&<button type="button" onClick={()=>addBrand()} className="flex w-full items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600"><Plus size={16}/>{t("productModal.addBrand",{value:brandInput.trim()})}</button>}
                  </div>
                </label>
              </div>
              <div className="rounded-[24px] border border-dashed border-gray-200 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-black text-gray-600">{t("productModal.optionalField.title")}</p>
                    <p className="mt-1 text-sm font-bold text-gray-400">{t("productModal.optionalField.subtitle")}</p>
                  </div>
                  <button type="button" onClick={addOptionalField} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 text-sm font-black text-blue-500 hover:bg-orange-50 hover:text-orange-600"><Plus size={17}/>{t("productModal.optionalField.add")}</button>
                </div>
                {optionalFields.length>0&&<div className="mt-4 space-y-3">
                  {optionalFields.map((field)=>(
                    <div key={field.id} className="grid gap-3 md:grid-cols-[1fr_1fr_44px]">
                      <input value={field.name} onChange={(e)=>updateOptionalField(field.id,{name:e.target.value})} className="input bg-gray-100" placeholder={t("productModal.optionalField.namePlaceholder")}/>
                      <input value={field.value} onChange={(e)=>updateOptionalField(field.id,{value:e.target.value})} className="input bg-gray-100" placeholder={t("productModal.optionalField.valuePlaceholder")}/>
                      <button type="button" onClick={()=>removeOptionalField(field.id)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"><X size={18}/></button>
                    </div>
                  ))}
                </div>}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black text-gray-500">{t("productModal.categorySection.title")}</p>
                <div className="rounded-[24px] border border-gray-200 p-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={categorySearch} onChange={(e)=>setCategorySearch(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();void createCategoryFromCharacteristics()}}} className="input bg-gray-100 pl-11" placeholder={t("productModal.categorySection.searchPlaceholder")}/>
                  </div>
                  <div className="scrollbar-hidden mt-3 max-h-40 space-y-2 overflow-y-auto">
                    {filteredCategories.map((kategoriya)=>(
                      editingCategoryId===kategoriya.id?
                        <div key={kategoriya.id} className="flex items-center gap-2 rounded-2xl bg-orange-50 p-2 ring-1 ring-orange-100">
                          <input value={editingCategoryName} onChange={(e)=>setEditingCategoryName(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();void saveCategoryEdit()}if(e.key==="Escape"){setEditingCategoryId(null);setEditingCategoryName("")}}} className="h-10 min-w-0 flex-1 rounded-xl border border-orange-100 bg-white px-3 text-sm font-black text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100" autoFocus/>
                          <button type="button" disabled={categoryUpdating||!editingCategoryName.trim()} onClick={()=>void saveCategoryEdit()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white disabled:opacity-50">{categoryUpdating?<LoaderCircle size={16} className="animate-spin"/>:<Edit3 size={16}/>}</button>
                          <button type="button" onClick={()=>{setEditingCategoryId(null);setEditingCategoryName("")}} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-400 hover:text-red-500"><X size={16}/></button>
                        </div>:
                        <div key={kategoriya.id} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${categoryId===kategoriya.id?"bg-orange-50 text-orange-600 ring-1 ring-orange-100":"bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600"}`}>
                          <button type="button" onClick={()=>setCategoryId(kategoriya.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${categoryId===kategoriya.id?"border-orange-500 bg-orange-500":"border-gray-300 bg-white"}`}>
                              {categoryId===kategoriya.id&&<span className="h-1.5 w-1.5 rounded-sm bg-white"/>}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{kategoriya.name}</span>
                          </button>
                          <button type="button" onClick={()=>startCategoryEdit(kategoriya)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-blue-500 hover:bg-white hover:text-orange-500"><Edit3 size={16}/></button>
                        </div>
                    ))}
                    {filteredCategories.length===0&&<div className="rounded-2xl bg-gray-50 px-4 py-3 text-center text-sm font-bold text-gray-400">{t("productModal.categorySection.notFound")}</div>}
                  </div>
                  <div className="mt-3">
                    <input value={newCategoryName} onChange={(e)=>setNewCategoryName(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();void createCategoryFromCharacteristics()}}} className="sr-only" placeholder={t("productModal.categorySection.newNamePlaceholder")}/>
                    <button type="button" disabled={categoryCreating||!(newCategoryName.trim()||categorySearch.trim())} onClick={()=>void createCategoryFromCharacteristics()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 px-5 text-sm font-black text-blue-500 disabled:opacity-50 hover:bg-orange-50 hover:text-orange-600">
                      {categoryCreating?<LoaderCircle size={16} className="animate-spin"/>:<Plus size={17}/>}
                      {t("productModal.categorySection.addNew")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>

    <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
      <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">{t("productModal.cancel")}</button>
      <button disabled={store.amalBajarilmoqda||unitResolving} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50">{(store.amalBajarilmoqda||unitResolving)&&<LoaderCircle size={16} className="animate-spin"/>}{editing?t("productModal.save"):t("productModal.create")}</button>
    </div>
  </form></AppModal>
}

function MahsulotModal({item,onClose}:{item:Mahsulot|"new";onClose:()=>void}) {
  const { t } = useTranslation("mahsulotlar");
  const store=useMahsulotlarStore();
  const editing=item!=="new";
  const [name,setName]=useState(editing?item.name:"");
  const [categoryId,setCategoryId]=useState(editing?item.categoryId:store.kategoriyalar[0]?.id??"");
  const [unitId,setUnitId]=useState(editing?item.unitId:store.birliklar[0]?.id??"");
  const [barcode,setBarcode]=useState(editing?item.barcode??"":"");
  const [article,setArticle]=useState(editing?item.article??"":"");
  const [imageUrl,setImageUrl]=useState(editing?item.imageUrl??"":"");
  const [isActive,setIsActive]=useState(editing?item.isActive:true);
  const [costPrice,setCostPrice]=useState("");
  const [retailPrice,setRetailPrice]=useState("");
  async function save(e:FormEvent){
    e.preventDefault();
    if(!name.trim()||!categoryId||!unitId||(!editing&&!barcode.trim()))return;
    const data={name:name.trim(),categoryId,unitId,barcode:barcode.trim()||undefined,article:article.trim()||undefined,imageUrl:imageUrl.trim()||undefined,isActive};
    const ok=editing
      ?await store.mahsulotSaqlash(item.id,data)
      :await store.mahsulotNarxBilanYaratish(data,{
          name:t("variantsModal.defaultVariant"),
          barcode:barcode.trim(),
          article:article.trim()||undefined,
          price:{
            costPrice:Number(costPrice),
            retailPrice:Number(retailPrice),
            wholesalePrice:Number(retailPrice),
          },
        });
    if(ok)onClose()
  }
  return <Modal title={editing?t("productModal.editTitle"):t("productModal.createTitle")} onClose={onClose}><form onSubmit={save} className="space-y-4">
    {store.xatolik&&<ErrorBox/>}<input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder={t("simpleProductModal.namePlaceholder")}/>
    <div className="grid gap-4 sm:grid-cols-2"><AppSelect value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="input"><option value="">{t("simpleProductModal.categoryPlaceholder")}</option>{store.kategoriyalar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</AppSelect><AppSelect value={unitId} onChange={e=>setUnitId(e.target.value)} className="input"><option value="">{t("simpleProductModal.unitPlaceholder")}</option>{store.birliklar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</AppSelect><input value={barcode} onChange={e=>setBarcode(e.target.value)} className="input" placeholder={editing?t("simpleProductModal.barcodePlaceholder"):t("simpleProductModal.barcodePlaceholderRequired")}/><input value={article} onChange={e=>setArticle(e.target.value)} className="input" placeholder={t("simpleProductModal.articlePlaceholder")}/></div>
    {!editing&&<div className="rounded-[22px] border border-orange-100 bg-orange-50/60 p-4">
      <div className="mb-4"><p className="font-black text-orange-800">{t("simpleProductModal.initialPrices.title")}</p><p className="mt-1 text-xs text-orange-700/70">{t("simpleProductModal.initialPrices.subtitle")}</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-gray-700">{t("simpleProductModal.initialPrices.costLabel")}
          <div className="relative mt-2"><input type="number" min="0" step="0.01" value={costPrice} onChange={e=>setCostPrice(e.target.value)} className="input pr-16" placeholder={t("simpleProductModal.initialPrices.costPlaceholder")}/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">{t("simpleProductModal.initialPrices.currencySuffix")}</span></div>
        </label>
        <label className="text-sm font-bold text-gray-700">{t("simpleProductModal.initialPrices.retailLabel")}
          <div className="relative mt-2"><input type="number" min="0" step="0.01" value={retailPrice} onChange={e=>setRetailPrice(e.target.value)} className="input pr-16" placeholder={t("simpleProductModal.initialPrices.retailPlaceholder")}/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">{t("simpleProductModal.initialPrices.currencySuffix")}</span></div>
        </label>
      </div>
      {retailPrice!==""&&costPrice!==""&&Number(costPrice)>Number(retailPrice)&&<p className="mt-3 text-sm font-bold text-amber-700">{t("simpleProductModal.initialPrices.belowCostWarning")}</p>}
    </div>}
    <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="input" placeholder={t("simpleProductModal.imagePlaceholder")}/>
    <label className="flex items-center gap-3 rounded-2xl bg-orange-50 p-4 font-bold"><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="h-5 w-5 accent-orange-500"/>{t("simpleProductModal.activeLabel")}</label>
    <Actions loading={store.amalBajarilmoqda} onClose={onClose}/>
  </form></Modal>
}

void MahsulotModal;

function OddiyModal({item,onClose}:{item:Kategoriya|"new";onClose:()=>void}) {
  const { t } = useTranslation("mahsulotlar");
  const store=useMahsulotlarStore();const editing=item!=="new";const [name,setName]=useState(editing?item.name:"");
  async function save(e:FormEvent){e.preventDefault();if(!name.trim())return;const ok=await store.kategoriyaSaqlash(editing?item.id:null,{name:name.trim()});if(ok)onClose()}
  return <Modal title={editing?t("categoryModal.editTitle"):t("categoryModal.createTitle")} onClose={onClose}><form onSubmit={save} className="space-y-4">{store.xatolik&&<ErrorBox/>}<input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder={t("categoryModal.namePlaceholder")}/><Actions loading={store.amalBajarilmoqda} onClose={onClose}/></form></Modal>
}

function ModifikatsiyalarModal({product,onClose}:{product:Mahsulot;onClose:()=>void}) {
  const { t } = useTranslation("mahsulotlar");
  const store=useMahsulotlarStore();const items=store.modifikatsiyalar[product.id]??[];const [editing,setEditing]=useState<MahsulotModifikatsiyasi|"new"|null>(null);
  async function remove(id:string){if(window.confirm(t("confirm.deleteVariant")))await store.modifikatsiyaOchirish(product.id,id)}
  async function edit(item:MahsulotModifikatsiyasi){const [toliq,narx]=await Promise.all([store.modifikatsiyaOlish(item.id),store.narxOlish(item.id)]);if(toliq)setEditing({...toliq,price:narx??toliq.price})}
  return <Modal wide title={t("variantsModal.title",{product:product.name})} onClose={onClose}>
    <div className="flex justify-end"><button onClick={()=>setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black text-white"><PackagePlus size={16}/>{t("variantsModal.addVariant")}</button></div>
    <div className="mt-4 space-y-3">{items.map(item=><div key={item.id} className="rounded-2xl border border-orange-100 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row"><div><h3 className="font-black">{item.name||t("variantsModal.defaultVariant")}</h3><p className="text-sm text-gray-500">{t("variantsModal.barcodeLine",{barcode:item.barcode,article:item.article||"—"})}</p><p className="mt-2 text-sm font-bold text-orange-600">{t("variantsModal.priceLine",{cost:money(item.price?.costPrice),retail:money(item.price?.retailPrice),wholesale:money(item.price?.wholesalePrice)})}</p></div><div className="flex gap-2"><button onClick={()=>void edit(item)} className="rounded-xl bg-orange-50 px-3 py-2 font-bold text-orange-600">{t("variantsModal.edit")}</button><button onClick={()=>void remove(item.id)} className="rounded-xl bg-red-50 px-3 py-2 text-red-500"><Trash2 size={16}/></button></div></div></div>)}{items.length===0&&<Empty matn={t("empty.variants")}/>}</div>
    {editing&&<ModForm productId={product.id} item={editing} onClose={()=>setEditing(null)}/>}
  </Modal>
}

function ModForm({productId,item,onClose}:{productId:string;item:MahsulotModifikatsiyasi|"new";onClose:()=>void}) {
  const { t } = useTranslation("mahsulotlar");
  const store=useMahsulotlarStore();const editing=item!=="new";const [name,setName]=useState(editing?item.name??"":"");const [barcode,setBarcode]=useState(editing?item.barcode:"");const [article,setArticle]=useState(editing?item.article??"":"");const [params,setParams]=useState(editing&&item.params?JSON.stringify(item.params):"");const [cost,setCost]=useState(Number(editing?item.price?.costPrice??0:0));const [retail,setRetail]=useState(Number(editing?item.price?.retailPrice??0:0));const [wholesale,setWholesale]=useState(Number(editing?item.price?.wholesalePrice??0:0));const [jsonError,setJsonError]=useState("");
  async function save(e:FormEvent){e.preventDefault();if(!barcode.trim())return;let parsed:Record<string,unknown>|undefined;try{parsed=params.trim()?JSON.parse(params):undefined;setJsonError("")}catch{setJsonError("modForm.invalidJson");return}const ok=await store.modifikatsiyaSaqlash(productId,editing?item.id:null,{name:name.trim()||undefined,barcode:barcode.trim(),article:article.trim()||undefined,params:parsed,price:{costPrice:cost,retailPrice:retail,wholesalePrice:wholesale}});if(ok&&editing)await store.narxYangilash(productId,item.id,{costPrice:cost,retailPrice:retail,wholesalePrice:wholesale});if(ok)onClose()}
  return <AppModal><form onSubmit={save} className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl"><div className="flex justify-between"><h2 className="text-2xl font-black">{editing?t("modForm.editTitle"):t("modForm.createTitle")}</h2><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100"><X size={18}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder={t("modForm.namePlaceholder")}/><input value={barcode} onChange={e=>setBarcode(e.target.value)} className="input" placeholder={t("modForm.barcodePlaceholder")}/><input value={article} onChange={e=>setArticle(e.target.value)} className="input" placeholder={t("modForm.articlePlaceholder")}/><input value={params} onChange={e=>setParams(e.target.value)} className="input" placeholder={t("modForm.paramsPlaceholder")}/><input type="number" min="0" value={cost} onChange={e=>setCost(Number(e.target.value))} className="input" placeholder={t("modForm.costPlaceholder")}/><input type="number" min="0" value={retail} onChange={e=>setRetail(Number(e.target.value))} className="input" placeholder={t("modForm.retailPlaceholder")}/><input type="number" min="0" value={wholesale} onChange={e=>setWholesale(Number(e.target.value))} className="input" placeholder={t("modForm.wholesalePlaceholder")}/></div>{jsonError&&<p className="mt-3 text-sm font-bold text-red-500">{t(jsonError)}</p>}<Actions loading={store.amalBajarilmoqda} onClose={onClose}/></form></AppModal>
}

function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){return <AppModal><div className={`scrollbar-hidden max-h-[94vh] w-full overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl ${wide?"max-w-5xl":"max-w-xl"}`}><div className="mb-5 flex justify-between gap-4"><h2 className="text-2xl font-black">{title}</h2><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 hover:bg-orange-500 hover:text-white"><X size={18}/></button></div>{children}</div></AppModal>}
function Actions({loading,onClose}:{loading:boolean;onClose:()=>void}){const { t } = useTranslation("mahsulotlar");return <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">{t("actions.cancel")}</button><button disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50">{loading&&<LoaderCircle size={16} className="animate-spin"/>}{t("actions.save")}</button></div>}
function ErrorBox(){const x=useMahsulotlarStore(s=>s.xatolik);return <div className="rounded-xl bg-red-50 p-3 font-bold text-red-600">{x}</div>}
function money(value:number|string|undefined){return `${Number(value??0).toLocaleString("uz-UZ")} so'm`}
