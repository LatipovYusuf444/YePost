import { useRef, useState, type FormEvent } from "react";
import { BookOpen, LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { boshlangichQarzYaratish } from "@/api/boshlangichQarzApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { boshlangichQarzMalumoti } from "@/lib/boshlangichQarz";
import { bugungiToshkentKuni } from "@/lib/hujjatSanasi";
import { muvaffaqiyatXabari } from "@/lib/toast";
import type { Xaridor } from "./types";
import { xaridorNomi } from "./yordamchilar";

export default function BoshlangichQarzModal({ xaridor, onClose }: { xaridor: Xaridor; onClose: () => void }) {
  const { t } = useTranslation("xaridor_uchot");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [date, setDate] = useState(bugungiToshkentKuni);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const fieldClass = "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60";

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const result = boshlangichQarzMalumoti({ amount, currency, date, note }, bugungiToshkentKuni());
    if (result.error) { setError(t(`openingDebt.errors.${result.error}`)); return; }
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await boshlangichQarzYaratish(xaridor.id, result.payload);
      muvaffaqiyatXabari(t("openingDebt.saved"));
      onClose();
      window.dispatchEvent(new Event("savdo:yangilandi"));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <AppModal onClose={() => { if (!lock.current) onClose(); }} actionRail={false}>
      <section role="dialog" aria-modal="true" aria-labelledby="opening-debt-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={21} aria-hidden /></span>
            <div><h2 id="opening-debt-title" className="text-lg font-bold text-slate-900">{t("openingDebt.title")}</h2><p className="mt-0.5 break-words text-sm text-slate-500">{xaridorNomi(xaridor)}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t("openingDebt.close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={19} /></button>
        </header>
        <form onSubmit={(event) => void saqlash(event)} className="space-y-5 p-5 sm:p-6">
          <p className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">{t("openingDebt.hint")}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600">{t("openingDebt.amount")}<input autoFocus required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={saving} placeholder="1 200 000" className={fieldClass} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600">{t("openingDebt.currency")}<select value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={saving} className={fieldClass}><option value="UZS">UZS</option><option value="USD">USD</option></select></label>
          </div>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-600">{t("openingDebt.date")}<input type="date" value={date} max={bugungiToshkentKuni()} onChange={(event) => setDate(event.target.value)} disabled={saving} className={fieldClass} /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-600">{t("openingDebt.note")}<textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={saving} rows={3} placeholder={t("openingDebt.notePlaceholder")} className={`${fieldClass} h-auto resize-y py-3`} /></label>
          {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-50">{t("openingDebt.cancel")}</button>
            <button type="submit" disabled={saving || !amount.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving && <LoaderCircle size={16} className="animate-spin" />}{t(saving ? "openingDebt.saving" : "openingDebt.save")}</button>
          </div>
        </form>
      </section>
    </AppModal>
  );
}
