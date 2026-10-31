import { useEffect } from "react";
import { CheckCircle2, LoaderCircle, PackageMinus, RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useInventorySettingsStore } from "@/store/inventorySettingsStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { rolniNormallashtirish } from "@/lib/roles";
import { BolimKarta } from "./UmumiyUI";

export default function InventoryBolimi() {
  const { t } = useTranslation("common");
  const state = useInventorySettingsStore();
  const profile = useAuthProfileStore((s) => s.profil);
  const role = rolniNormallashtirish(profile?.role);
  const canEdit = role === "DIREKTOR" || role === "ADMIN";
  const load = state.load;
  useEffect(() => { void load(); }, [load]);
  const blocked = !state.loaded || state.loading || state.saving || !canEdit;
  return <BolimKarta sarlavha={t("negativeStock.settingsTitle")} izoh={t("negativeStock.settingsSubtitle")}>
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><PackageMinus size={24} /></span>
        <div className="min-w-0 flex-1"><h3 className="text-base font-bold text-slate-900" id="negative-stock-label">{t("negativeStock.title")}</h3><p id="negative-stock-description" className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t("negativeStock.description")}</p></div>
        <button type="button" role="switch" aria-checked={state.allowNegativeStock} aria-labelledby="negative-stock-label" aria-describedby="negative-stock-description" disabled={blocked} onClick={() => void state.update(!state.allowNegativeStock)} className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${state.allowNegativeStock ? "bg-blue-600" : "bg-slate-300"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${state.allowNegativeStock ? "translate-x-6" : "translate-x-1"}`} /></button>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4 text-xs font-semibold">
        <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${state.allowNegativeStock ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-500"}`}><CheckCircle2 size={15} />{t(state.allowNegativeStock ? "negativeStock.enabled" : "negativeStock.disabled")}</span>
        {state.loaded && <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-slate-500"><ShieldCheck size={15} />{t(state.canSellNegative ? "negativeStock.allowed" : "negativeStock.notAllowed")}</span>}
        {(state.loading || state.saving) && <LoaderCircle size={18} className="animate-spin text-blue-600" />}
      </div>
    </div>
    {!canEdit && <p className="mt-4 text-sm text-slate-500">{t("negativeStock.adminOnly")}</p>}
    <p className="mt-4 text-xs leading-6 text-slate-500">{t("negativeStock.historyHint")}</p>
    {state.error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">{state.error}<button type="button" disabled={state.loading} onClick={() => void state.load()} className="inline-flex items-center gap-2 font-semibold"><RefreshCw size={15} />{t("negativeStock.retry")}</button></div>}
  </BolimKarta>;
}
