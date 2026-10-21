import { useEffect, useMemo, useState } from "react";
import { Boxes, Layers3, LoaderCircle, PackageSearch, RefreshCw, Search, TriangleAlert, Warehouse, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import AppSelect from "@/Components/ui/AppSelect";
import TablePagination from "@/Components/common/TablePagination";
import { kategoriyaQoldiginiOlish } from "@/api/kategoriyaQoldigiApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { StockBalanceItem } from "@/api/reportsApi";
import type { Kategoriya, Mahsulot, OlchovBirligi } from "@/types/catalog";
import { kategoriyaMiqdorJamilari, kategoriyaQatorlari } from "@/lib/kategoriyaQoldigi";

type Props = { kategoriya: Kategoriya; mahsulotlar: Mahsulot[]; birliklar: OlchovBirligi[]; onYopish: () => void };
const sonMatni = (son: number) => son.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });

export default function KategoriyaQoldigiModal({ kategoriya, mahsulotlar, birliklar, onYopish }: Props) {
  const { t } = useTranslation("mahsulotlar");
  const [qoldiqlar, setQoldiqlar] = useState<StockBalanceItem[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [yangilash, setYangilash] = useState(0);
  const [qidiruv, setQidiruv] = useState("");
  const [omborId, setOmborId] = useState("");
  const [sahifa, setSahifa] = useState(1);
  const [hajm, setHajm] = useState(20);

  useEffect(() => {
    let faol = true;
    setYuklanmoqda(true);
    setXato("");
    kategoriyaQoldiginiOlish(kategoriya.id)
      .then(items => { if (faol) setQoldiqlar(items); })
      .catch(error => { if (faol) { setQoldiqlar([]); setXato(getApiErrorMessage(error)); } })
      .finally(() => { if (faol) setYuklanmoqda(false); });
    return () => { faol = false; };
  }, [kategoriya.id, yangilash]);

  useEffect(() => {
    const yopish = (event: KeyboardEvent) => { if (event.key === "Escape") onYopish(); };
    window.addEventListener("keydown", yopish);
    return () => window.removeEventListener("keydown", yopish);
  }, [onYopish]);

  const qatorlar = useMemo(() => kategoriyaQatorlari(kategoriya.id, mahsulotlar, qoldiqlar, birliklar), [kategoriya.id, mahsulotlar, qoldiqlar, birliklar]);
  const omborlar = useMemo(() => Array.from(new Map(qatorlar.filter(item => item.omborId).map(item => [item.omborId!, item.omborNomi])).entries()).sort((a, b) => a[1].localeCompare(b[1], "uz")), [qatorlar]);
  const filtrlangan = useMemo(() => {
    const matn = qidiruv.trim().toLocaleLowerCase();
    return qatorlar.filter(item => (!omborId || item.omborId === omborId) && (!matn || [item.nom, item.variant, item.shtrix, item.artikul, item.omborNomi].join(" ").toLocaleLowerCase().includes(matn)));
  }, [qatorlar, qidiruv, omborId]);
  const mahsulotSoni = new Set(filtrlangan.map(item => item.mahsulotId)).size;
  const omborSoni = new Set(filtrlangan.flatMap(item => item.omborId ? [item.omborId] : [])).size;
  const jamiMavjud = kategoriyaMiqdorJamilari(filtrlangan);
  const joriySahifa = Math.min(sahifa, Math.max(1, Math.ceil(filtrlangan.length / hajm)));
  const korinadigan = filtrlangan.slice((joriySahifa - 1) * hajm, joriySahifa * hajm);
  const miqdor = (value: number | null, birlik: string) => value === null ? "—" : `${sonMatni(value)}${birlik ? ` ${birlik}` : ""}`;
  const tayyor = !yuklanmoqda && !xato;

  return (
    <AppModal onClose={onYopish} actionRail={false} className="bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="kategoriya-qoldiq-nomi" className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(2,6,23,.35)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><Layers3 size={23} /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t("categoryStock.eyebrow")}</p>
              <h2 id="kategoriya-qoldiq-nomi" className="mt-1 break-words text-xl font-bold text-slate-900">{kategoriya.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("categoryStock.subtitle")}</p>
            </div>
          </div>
          <button type="button" onClick={onYopish} aria-label={t("actions.close")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"><X size={19} /></button>
        </header>

        <div className="min-h-0 overflow-y-auto">
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-3 sm:px-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Boxes size={15} />{t("categoryStock.products")}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{tayyor ? sonMatni(mahsulotSoni) : "—"}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Warehouse size={15} />{t("categoryStock.warehouses")}</p>
              <p className="mt-2 text-xl font-bold text-blue-600">{tayyor ? sonMatni(omborSoni) : "—"}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">{t("categoryStock.available")}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-base font-bold text-emerald-700">
                {tayyor && jamiMavjud.length > 0 ? jamiMavjud.map(item => <span key={item.birlik}>{miqdor(item.mavjud, item.birlik)}</span>) : "—"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-5 pb-4 sm:px-6">
            <label className="relative min-w-0 flex-1 basis-64">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label={t("categoryStock.search")} value={qidiruv} onChange={event => { setQidiruv(event.target.value); setSahifa(1); }} placeholder={t("categoryStock.search")} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </label>
            <AppSelect aria-label={t("categoryStock.warehouseFilter")} value={omborId} onChange={event => { setOmborId(event.target.value); setSahifa(1); }} className="h-11 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <option value="">{t("categoryStock.allWarehouses")}</option>
              {omborlar.map(([id, nom]) => <option key={id} value={id}>{nom || t("categoryStock.unnamedWarehouse")}</option>)}
            </AppSelect>
            <button type="button" onClick={() => setYangilash(value => value + 1)} disabled={yuklanmoqda} aria-label={t("header.refresh")} title={t("header.refresh")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"><RefreshCw size={18} className={yuklanmoqda ? "animate-spin" : ""} /></button>
          </div>

          {xato ? (
            <div role="alert" className="mx-5 mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:mx-6">
              <TriangleAlert size={20} className="shrink-0" />
              <div><p className="font-bold">{t("categoryStock.error")}</p><p className="mt-1">{xato}</p><button type="button" onClick={() => setYangilash(value => value + 1)} className="mt-3 font-bold underline underline-offset-4">{t("categoryStock.retry")}</button></div>
            </div>
          ) : yuklanmoqda ? (
            <div role="status" className="flex min-h-56 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><LoaderCircle size={22} className="animate-spin text-blue-600" />{t("categoryStock.loading")}</div>
          ) : filtrlangan.length === 0 ? (
            <div className="px-6 py-14 text-center"><PackageSearch size={36} className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-600">{t(qatorlar.length ? "categoryStock.noMatches" : "categoryStock.empty")}</p></div>
          ) : (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr>
                  <th className="px-6 py-3">{t("table.product")}</th><th className="px-4 py-3">{t("table.barcode")}</th><th className="px-4 py-3">{t("categoryStock.warehouse")}</th><th className="px-4 py-3 text-right">{t("categoryStock.stock")}</th><th className="px-4 py-3 text-right">{t("categoryStock.reserved")}</th><th className="px-6 py-3 text-right">{t("categoryStock.available")}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {korinadigan.map(item => <tr key={item.kalit} className="transition hover:bg-blue-50/40">
                    <td className="px-6 py-4"><p className="font-semibold text-slate-900">{item.nom}{item.nofaol && <span className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-500">{t("status.inactive")}</span>}</p>{item.variant && <p className="mt-1 text-xs text-slate-500">{item.variant}</p>}</td>
                    <td className="px-4 py-4 text-slate-500">{item.shtrix || "—"}</td>
                    <td className="px-4 py-4"><span className={item.omborId ? "font-medium text-slate-700" : "text-xs text-slate-400"}>{item.omborNomi || t(item.omborId ? "categoryStock.unnamedWarehouse" : "categoryStock.noStockRecord")}</span></td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums text-slate-800">{miqdor(item.qoldiq, item.birlik)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-slate-500">{miqdor(item.rezerv, item.birlik)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right"><span className={`inline-flex rounded-lg border px-3 py-1.5 font-bold tabular-nums ${item.mavjud === null ? "border-slate-100 bg-slate-50 text-slate-400" : item.mavjud < 0 ? "border-red-100 bg-red-50 text-red-600" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{miqdor(item.mavjud, item.birlik)}</span></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {tayyor && filtrlangan.length > 0 && <div className="shrink-0"><TablePagination accent="blue" page={joriySahifa} pageSize={hajm} totalItems={filtrlangan.length} onPageChange={setSahifa} onPageSizeChange={value => { setHajm(value); setSahifa(1); }} /></div>}
      </section>
    </AppModal>
  );
}
