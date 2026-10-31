import { StockQuantity } from "@/Components/common/NegativeStockBadge";
import { ArrowDownRight, ArrowUpRight, Barcode, CalendarDays, Check, CheckCircle2, ClipboardCheck, ClipboardList, Info, MessageSquareText, Minus, Package, PackageSearch, UserRound, Warehouse, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KiritilganBelgisi } from "@/Components/common/HujjatSanasi";
import type { InventarizatsiyaHujjati, MahsulotModifikatsiyasi } from "@/types/ombor";
import { inventarizatsiyaQatorFarqi, inventarizatsiyaQatorXulosasi } from "@/lib/inventarizatsiyaKorinish";
import InventoryDocumentActivity from "./InventoryDocumentActivity";
import { modificationNomi, sana } from "./omborYordamchilari";

type Props = {
  hujjat: InventarizatsiyaHujjati;
  modifikatsiyalar: MahsulotModifikatsiyasi[];
  omborNomi: string;
  masulNomi: string;
};
const sonMatni = (value: string | number | undefined) => value == null || String(value).trim() === "" || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString("uz-UZ", { maximumFractionDigits: 6 });

export default function InventarizatsiyaKorinish({ hujjat, modifikatsiyalar, omborNomi, masulNomi }: Props) {
  const { t } = useTranslation("ombor_hujjat");
  const items = hujjat.items ?? [];
  const xulosa = inventarizatsiyaQatorXulosasi(items);
  const holat = String(hujjat.status ?? "DRAFT").toUpperCase();
  const bekor = ["CANCELLED", "CANCELED"].includes(holat);
  const tasdiqlangan = holat === "CONFIRMED";
  const modXarita = new Map(modifikatsiyalar.map(item => [item.id, item]));
  const statistika = [
    { nom: "total", son: xulosa.jami, icon: Package, stil: "border-blue-300 bg-blue-50/70 text-blue-700", ikonka: "bg-blue-100 text-blue-600" },
    { nom: "matched", son: xulosa.mos, icon: CheckCircle2, stil: "border-teal-300 bg-teal-50/70 text-teal-700", ikonka: "bg-teal-100 text-teal-600" },
    { nom: "surplus", son: xulosa.ortiqcha, icon: ArrowUpRight, stil: "border-emerald-300 bg-emerald-50/70 text-emerald-700", ikonka: "bg-emerald-100 text-emerald-600" },
    { nom: "shortage", son: xulosa.kamomad, icon: ArrowDownRight, stil: "border-rose-300 bg-rose-50/70 text-rose-700", ikonka: "bg-rose-100 text-rose-600" },
  ];

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[22px] border-2 border-blue-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,.03)]">
      <div className={`flex items-start gap-2.5 border-b-2 px-5 py-3 text-sm ${bekor ? "border-rose-200 bg-rose-50/70 text-rose-700" : tasdiqlangan ? "border-emerald-200 bg-emerald-50/70 text-emerald-700" : "border-amber-200 bg-amber-50/70 text-amber-800"}`}>
        <Info size={17} className="mt-0.5 shrink-0" /><p>{t(`inventoryView.${bekor ? "cancelledHint" : tasdiqlangan ? "confirmedHint" : "draftHint"}`)}</p>
      </div>
      <dl className="grid gap-5 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
        <Malumot icon={Warehouse} nom={t("view.warehouse")} qiymat={omborNomi} ohang="bg-blue-50 text-blue-600" />
        <div><Malumot icon={CalendarDays} nom={t("view.createdAt")} qiymat={sana(hujjat.date ?? hujjat.createdAt)} ohang="bg-violet-50 text-violet-600" /><KiritilganBelgisi date={hujjat.date} createdAt={hujjat.createdAt} className="ml-12 mt-1" /></div>
        <Malumot icon={UserRound} nom={t("view.responsible")} qiymat={masulNomi} ohang="bg-cyan-50 text-cyan-600" />
        <Malumot icon={ClipboardList} nom={t("view.stockTakeType")} qiymat={t(hujjat.type === "PARTIAL" ? "stockTakeType.partial" : "stockTakeType.full")} ohang="bg-amber-50 text-amber-600" />
      </dl>
    </section>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {statistika.map(item => {
        const Icon = item.icon;
        return <div key={item.nom} className={`flex items-center gap-3 rounded-[20px] border-2 p-4 ${item.stil}`}>
          <span className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex ${item.ikonka}`}><Icon size={22} /></span>
          <div><p className="text-xs font-semibold">{t(`inventoryView.summary.${item.nom}`)}</p><p className="mt-1 text-2xl font-bold tabular-nums">{item.son}</p><p className="text-[11px] opacity-70">{t("inventoryView.rows")}</p></div>
        </div>;
      })}
    </div>

    <section className="overflow-hidden rounded-[22px] border-2 border-blue-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,.03)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-blue-200 px-5 py-4">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ClipboardCheck size={21} /></span><div><h3 className="font-bold text-slate-900">{t("inventoryView.results")}</h3><p className="mt-0.5 text-xs text-slate-500">{t("inventoryView.resultsHint")}</p></div></div>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">{t("view.productsCount", { count: items.length })}</span>
      </div>
      {xulosa.noaniq > 0 && <p className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/60 px-5 py-2.5 text-xs text-amber-800"><Info size={15} className="shrink-0" />{t("inventoryView.unknown", { count: xulosa.noaniq })}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b-2 border-blue-200 bg-slate-50/80 text-xs font-semibold text-slate-500"><tr>
            <th className="w-12 px-5 py-3.5">№</th><th className="min-w-64 px-4 py-3.5">{t("table.product")}</th><th className="px-4 py-3.5">{t("table.barcode")}</th><th className="px-4 py-3.5">{t("table.warehouse")}</th><th className="px-4 py-3.5 text-right">{t("table.systemQuantity")}</th><th className="px-4 py-3.5 text-right text-blue-600">{t("table.actualQuantity")}</th><th className="px-5 py-3.5 text-right">{t("table.difference")}</th>
          </tr></thead>
          <tbody className="divide-y divide-blue-200">{items.map((item, index) => {
            const mod = item.modification ?? modXarita.get(item.modificationId);
            const farq = inventarizatsiyaQatorFarqi(item);
            const FarqIcon = farq === null ? Minus : farq > 0 ? ArrowUpRight : farq < 0 ? ArrowDownRight : Check;
            const farqStili = farq === null ? "border-slate-300 bg-slate-50 text-slate-400" : farq > 0 ? "border-emerald-300 bg-emerald-50 text-emerald-700" : farq < 0 ? "border-rose-300 bg-rose-50 text-rose-600" : "border-teal-300 bg-teal-50 text-teal-700";
            return <tr key={item.id ?? `${item.modificationId}-${index}`} className="transition hover:bg-blue-50/30">
              <td className="px-5 py-4 tabular-nums text-slate-400">{index + 1}</td>
              <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400"><Package size={18} /></span><p className="max-w-sm break-words font-semibold text-slate-900">{modificationNomi(mod)}</p></div></td>
              <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-500"><Barcode size={14} />{mod?.barcode || "—"}</span></td>
              <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600"><Warehouse size={14} className="text-slate-400" />{omborNomi}</span></td>
              <td className="px-4 py-4 text-right font-semibold tabular-nums text-slate-600">{<StockQuantity value={item.expectedQuantity ?? item.systemQuantity} />}</td>
              <td className="px-4 py-4 text-right"><span className="inline-flex min-w-14 justify-center rounded-lg border-2 border-blue-300 bg-blue-50 px-3 py-2 font-bold tabular-nums text-blue-700">{sonMatni(item.actualQuantity)}</span></td>
              <td className="px-5 py-4 text-right"><span className={`inline-flex min-w-20 items-center justify-center gap-1 rounded-lg border-2 px-2.5 py-2 font-bold tabular-nums ${farqStili}`}><FarqIcon size={15} />{farq === null ? "—" : `${farq > 0 ? "+" : ""}${sonMatni(farq)}`}</span></td>
            </tr>;
          })}</tbody>
        </table>
        {items.length === 0 && <div className="px-5 py-12 text-center text-slate-400"><PackageSearch size={32} className="mx-auto mb-3" /><p className="text-sm">{t("table.empty")}</p></div>}
      </div>
      <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400 sm:hidden">{t("inventoryView.scrollHint")}</p>
    </section>

    {hujjat.note && <section className="rounded-[22px] border-2 border-blue-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 font-semibold text-slate-800"><MessageSquareText size={18} className="text-blue-500" />{t("view.note")}</div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{hujjat.note}</p></section>}
    <div data-stock-take-activity><InventoryDocumentActivity documentType="STOCK_TAKE" documentId={hujjat.id} /></div>
  </div>;
}

function Malumot({ icon: Icon, nom, qiymat, ohang }: { icon: LucideIcon; nom: string; qiymat: string; ohang: string }) {
  return <div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ohang}`}><Icon size={19} /></span><div className="min-w-0"><dt className="text-xs font-medium text-slate-400">{nom}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{qiymat}</dd></div></div>;
}
