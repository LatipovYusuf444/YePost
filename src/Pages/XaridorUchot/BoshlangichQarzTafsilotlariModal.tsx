import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { sotuvTafsilotiniOlish } from "@/api/savdoApi";
import { mijozQarziniTolash } from "@/api/boshlangichQarzApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { boshlangichQarzMalumoti } from "@/lib/boshlangichQarz";
import { bugungiToshkentKuni, kunMatni } from "@/lib/hujjatSanasi";
import { mijozNomi, pulniFormatlash, sotuvQarzdorlikSummasi, sotuvSummasi, sotuvTolanganSummasi, sotuvValyutasi, tolovValyutasi } from "@/Pages/Savdo/savdoYordamchilari";
import type { Sotuv } from "@/types/savdo";

export default function BoshlangichQarzTafsilotlariModal({ sotuvId, boshlangich, onClose }: { sotuvId: string; boshlangich?: Sotuv; onClose: () => void }) {
  const { t } = useTranslation("xaridor_uchot");
  const [debt, setDebt] = useState<Sotuv | null>(boshlangich ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD" | "BANK">("CASH");
  const [note, setNote] = useState("");
  const lock = useRef(false);
  const request = useRef(0);
  const yuklash = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try { const data = await sotuvTafsilotiniOlish(sotuvId); if (id === request.current) setDebt(data); }
    catch (cause) { if (id === request.current) setError(getApiErrorMessage(cause)); }
    finally { if (id === request.current) setLoading(false); }
  }, [sotuvId]);
  useEffect(() => {
    void yuklash();
    const current = request;
    return () => { ++current.current; };
  }, [yuklash]);
  const currency = debt ? sotuvValyutasi(debt) : "UZS";
  const remaining = debt ? sotuvQarzdorlikSummasi(debt) : 0;
  const customerId = debt?.customerId || debt?.customer?.id;
  const fieldClass = "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

  async function tolash(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !customerId || !debt?.isOpeningDebt || loading || remaining <= 0) return;
    const result = boshlangichQarzMalumoti({ amount, currency, date: "", note }, bugungiToshkentKuni());
    if (result.error) { setError(t(`openingDebt.errors.${result.error}`)); return; }
    if (result.payload.amount > remaining) { setError(t("openingDebt.payment.tooMuch")); return; }
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await mijozQarziniTolash({ customerId, amount: result.payload.amount, currency, paymentMethod: method, ...(note.trim() ? { note: note.trim() } : {}) });
      setAmount("");
      setNote("");
      window.dispatchEvent(new Event("savdo:yangilandi"));
      await yuklash();
    } catch (cause) { setError(getApiErrorMessage(cause)); }
    finally { lock.current = false; setSaving(false); }
  }

  return (
    <AppModal onClose={() => { if (!lock.current) onClose(); }} actionRail={false}>
      <section role="dialog" aria-modal="true" aria-labelledby="opening-debt-detail" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><BookOpen size={21} aria-hidden /></span><div><h2 id="opening-debt-detail" className="text-lg font-bold text-slate-900">{t("openingDebt.title")}</h2><p className="mt-0.5 text-sm text-slate-500">{debt ? mijozNomi(debt) : "…"}</p></div></div><button type="button" onClick={onClose} disabled={saving} aria-label={t("openingDebt.close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={19} /></button></header>
        <div className="space-y-5 p-5 sm:p-6">
          <p className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">{t("openingDebt.hint")}</p>
          {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />{t("openingDebt.loading")}</p>}
          {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><p>{error}</p><button type="button" disabled={loading || saving} onClick={() => void yuklash()} className="mt-2 inline-flex items-center gap-1.5 font-semibold"><RefreshCw size={14} />{t("openingDebt.refresh")}</button></div>}
          {debt && <>
            <dl className="grid gap-3 sm:grid-cols-3">{[["amount", sotuvSummasi(debt)], ["paid", sotuvTolanganSummasi(debt)], ["remaining", remaining]].map(([key, value]) => <div key={key} className={`rounded-xl border p-4 ${key === "remaining" ? "border-red-100 bg-red-50/50" : "border-slate-100 bg-slate-50"}`}><dt className="text-xs text-slate-500">{t(`openingDebt.${key}`)}</dt><dd className={`mt-2 break-words text-lg font-bold tabular-nums ${key === "remaining" ? "text-red-600" : "text-slate-900"}`}>{pulniFormatlash(Number(value), currency)}</dd></div>)}</dl>
            <dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">{t("openingDebt.date")}</dt><dd className="font-semibold text-slate-800">{kunMatni(debt.date || debt.createdAt) || "—"}</dd></div>{debt.note && <div><dt className="text-slate-500">{t("openingDebt.note")}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-800">{debt.note}</dd></div>}</dl>
            {remaining > 0 && debt.isOpeningDebt && customerId && <form onSubmit={(event) => void tolash(event)} className="space-y-4 border-t border-slate-100 pt-5"><div><h3 className="font-bold text-slate-900">{t("openingDebt.payment.title")}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{t("openingDebt.payment.hint")}</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold text-slate-600">{t("openingDebt.amount")} ({currency})<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={loading || saving} placeholder="0" className={fieldClass} /></label><label className="grid gap-1.5 text-sm font-semibold text-slate-600">{t("openingDebt.payment.method")}<select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} disabled={loading || saving} className={fieldClass}>{(["CASH", "CARD", "BANK"] as const).map((key) => <option key={key} value={key}>{t(`openingDebt.payment.${key}`)}</option>)}</select></label></div><label className="grid gap-1.5 text-sm font-semibold text-slate-600">{t("openingDebt.note")}<input value={note} maxLength={255} onChange={(event) => setNote(event.target.value)} disabled={loading || saving} className={fieldClass} /></label><div className="flex justify-end"><button type="submit" disabled={loading || saving || !amount.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving && <LoaderCircle size={16} className="animate-spin" />}{t(saving ? "openingDebt.saving" : "openingDebt.payment.pay")}</button></div></form>}
            {(debt.payments?.length ?? 0) > 0 && <div className="border-t border-slate-100 pt-4"><h3 className="mb-3 text-sm font-bold text-slate-800">{t("openingDebt.payment.history")}</h3><ul className="divide-y divide-slate-100">{debt.payments?.map((payment, index) => <li key={payment.id || index} className="flex justify-between gap-3 py-2 text-sm"><span className="text-slate-500">{kunMatni(payment.date || payment.paidAt || payment.createdAt) || "—"}</span><span className="font-semibold text-emerald-700">{pulniFormatlash(Number(payment.amount), tolovValyutasi(payment, debt))}</span></li>)}</ul></div>}
          </>}
        </div>
      </section>
    </AppModal>
  );
}
