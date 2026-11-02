import { useEffect, useState } from "react";
import { Factory, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { sonMaydoni } from "@/lib/ishlabChiqarish";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";
import { BolimKarta } from "./UmumiyUI";

const inputKlass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

// Sozlamalar → Ishlab chiqarish (faqat direktor). Modul shu yerda yoqiladi: o'chiq paytda menyu ko'rinmaydi.
export default function IshlabChiqarishBolimi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const saqlash = useIshlabChiqarishStore((holat) => holat.saqlash);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");
  const [saqlandi, setSaqlandi] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [deviationPercent, setDeviation] = useState("");
  const [yieldWarnPercent, setYieldWarn] = useState("");
  const [commentRequired, setCommentRequired] = useState(false);

  useEffect(() => {
    let faol = true;
    ishlabChiqarishApi.sozlamaOlish()
      .then((sozlama) => {
        if (!faol) return;
        setEnabled(sozlama.enabled === true);
        setDeviation(sozlama.deviationPercent != null ? String(sozlama.deviationPercent) : "");
        setYieldWarn(sozlama.yieldWarnPercent != null ? String(sozlama.yieldWarnPercent) : "");
        setCommentRequired(sozlama.commentRequired === true);
      })
      .catch((error) => { if (faol) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (faol) setYuklanmoqda(false); });
    return () => { faol = false; };
  }, []);

  async function yuborish() {
    setBand(true);
    setXato("");
    setSaqlandi(false);
    try {
      await saqlash({ enabled, deviationPercent: sonMaydoni(deviationPercent), yieldWarnPercent: sonMaydoni(yieldWarnPercent), commentRequired });
      setSaqlandi(true);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setBand(false);
    }
  }

  return (
    <BolimKarta sarlavha={t("settings.title")} izoh={t("settings.subtitle")}>
      {yuklanmoqda ? (
        <p className="flex items-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle size={16} className="animate-spin" />{t("loading")}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><Factory size={24} /></span>
            <div className="min-w-0 flex-1">
              <h3 id="production-enabled" className="text-base font-bold text-slate-900">{t("settings.enabled")}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{t("settings.enabledHint")}</p>
            </div>
            <button type="button" role="switch" aria-checked={enabled} aria-labelledby="production-enabled" onClick={() => setEnabled(!enabled)} className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${enabled ? "bg-blue-600" : "bg-slate-300"}`}>
              <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5"><span className="text-xs font-bold text-slate-500">{t("settings.deviationPercent")}</span><input type="number" min="0" step="any" value={deviationPercent} onChange={(event) => setDeviation(event.target.value)} className={inputKlass} /></label>
            <label className="grid gap-1.5"><span className="text-xs font-bold text-slate-500">{t("settings.yieldWarnPercent")}</span><input type="number" min="0" step="any" value={yieldWarnPercent} onChange={(event) => setYieldWarn(event.target.value)} className={inputKlass} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={commentRequired} onChange={(event) => setCommentRequired(event.target.checked)} className="h-5 w-5 accent-orange-500" />{t("settings.commentRequired")}</label>
          {xato && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{xato}</p>}
          {saqlandi && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{t("settings.saved")}</p>}
          <button type="button" disabled={band} onClick={() => void yuborish()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">{band && <LoaderCircle size={16} className="animate-spin" />}{t("actions.save")}</button>
        </div>
      )}
    </BolimKarta>
  );
}
