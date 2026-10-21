import { useRef, useState, type ChangeEvent } from "react";
import axios from "axios";
import { CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { boshlangichQarzImporti, boshlangichQarzShabloni } from "@/api/boshlangichQarzApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { qarzImportJavobi, qarzImportiniSaqlashMumkin, type QarzImportNatijasi } from "@/lib/boshlangichQarz";
import { muvaffaqiyatXabari } from "@/lib/toast";

export default function BoshlangichQarzImportModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("xaridor_uchot");
  const input = useRef<HTMLInputElement>(null);
  const checkedFile = useRef<File | null>(null);
  const lock = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<QarzImportNatijasi | null>(null);
  const [operation, setOperation] = useState<"template" | "check" | "save" | null>(null);
  const [error, setError] = useState("");
  const busy = operation !== null;

  async function shablon() {
    if (lock.current) return;
    lock.current = true;
    setOperation("template");
    setError("");
    try {
      const blob = await boshlangichQarzShabloni();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "boshlangich-qarzlar.xlsx";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(await xatoMatni(cause)); }
    finally { lock.current = false; setOperation(null); }
  }

  async function tekshirish(chosen: File) {
    if (lock.current) return;
    checkedFile.current = null;
    setResult(null);
    setError("");
    setFile(chosen);
    if (!/\.xlsx$/i.test(chosen.name) || chosen.size === 0) { setError(t("openingDebt.import.onlyXlsx")); return; }
    lock.current = true;
    setOperation("check");
    try {
      const report = qarzImportJavobi(await boshlangichQarzImporti(chosen, true));
      setResult(report);
      if (qarzImportiniSaqlashMumkin(report)) checkedFile.current = chosen;
      else if (report.errors.length === 0) setError(t("openingDebt.import.unverified"));
    } catch (cause) {
      if (axios.isAxiosError(cause)) setResult(qarzImportJavobi(cause.response?.data));
      setError(await xatoMatni(cause));
    } finally { lock.current = false; setOperation(null); }
  }

  function faylTanlandi(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (chosen) void tekshirish(chosen);
  }

  async function saqlash() {
    if (lock.current || !file || checkedFile.current !== file || !qarzImportiniSaqlashMumkin(result)) return;
    lock.current = true;
    checkedFile.current = null;
    setOperation("save");
    setError("");
    try {
      const report = qarzImportJavobi(await boshlangichQarzImporti(file, false));
      if (report.radEtildi || report.errors.length > 0) {
        setResult(report);
        setError(t("openingDebt.import.noChanges"));
        return;
      }
      muvaffaqiyatXabari(t("openingDebt.import.saved"));
      onClose();
      window.dispatchEvent(new Event("savdo:yangilandi"));
    } catch (cause) {
      if (axios.isAxiosError(cause)) setResult(qarzImportJavobi(cause.response?.data));
      setError(await xatoMatni(cause));
    } finally { lock.current = false; setOperation(null); }
  }

  async function xatoMatni(cause: unknown) {
    if (axios.isAxiosError(cause) && cause.response?.data instanceof Blob) {
      try {
        const data: unknown = JSON.parse(await cause.response.data.text());
        return getApiErrorMessage({ isAxiosError: true, config: cause.config, response: { ...cause.response, data } });
      }
      catch { /* Oddiy xato matni pastda olinadi. */ }
    }
    return getApiErrorMessage(cause);
  }

  const ready = checkedFile.current === file && qarzImportiniSaqlashMumkin(result);
  return (
    <AppModal onClose={() => { if (!lock.current) onClose(); }} actionRail={false}>
      <section role="dialog" aria-modal="true" aria-labelledby="debt-import-title" className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div><h2 id="debt-import-title" className="text-lg font-bold text-slate-900">{t("openingDebt.import.title")}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{t("openingDebt.import.subtitle")}</p></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("openingDebt.close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={19} /></button>
        </header>
        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <ol className="grid gap-3 text-sm sm:grid-cols-3">{["templateStep", "checkStep", "saveStep"].map((step, index) => <li key={step} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-slate-600"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600 ring-1 ring-blue-100">{index + 1}</span>{t(`openingDebt.import.${step}`)}</li>)}</ol>
          <button type="button" onClick={() => void shablon()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{operation === "template" ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}{t("openingDebt.import.template")}</button>
          <input ref={input} type="file" accept=".xlsx" onChange={faylTanlandi} disabled={busy} aria-label={t("openingDebt.import.chooseFile")} className="sr-only" />
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-5 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">{operation === "check" ? <LoaderCircle size={26} className="animate-spin" /> : <FileSpreadsheet size={26} />}<span className="break-all">{operation === "check" ? t("openingDebt.import.checking") : file?.name || t("openingDebt.import.chooseFile")}</span></button>
          <p className="text-sm leading-6 text-slate-500">{t("openingDebt.import.phoneHint")}</p>
          {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {ready && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={19} className="shrink-0" /><span>{t("openingDebt.import.ready", { count: result?.totalRows })}</span></div>}
          {result && result.errors.length > 0 && <div className="overflow-hidden rounded-xl border border-red-200">
            <p className="bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{t("openingDebt.import.noChanges")}</p>
            <div className="max-h-64 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr>{["row", "column", "error"].map((key) => <th key={key} className="px-4 py-3 font-semibold">{t(`openingDebt.import.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{result.errors.map((item, index) => <tr key={index}><td className="px-4 py-3 font-semibold text-slate-800">{item.row ?? "—"}</td><td className="px-4 py-3 text-slate-500">{item.column || "—"}</td><td className="min-w-48 break-words px-4 py-3 text-red-700">{item.message}{item.value && <span className="mt-1 block text-xs text-slate-500">{item.value}</span>}</td></tr>)}</tbody></table></div>
          </div>}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-5">
          <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-50">{t("openingDebt.close")}</button>
          {file && !ready && <button type="button" disabled={busy} onClick={() => void tekshirish(file)} className="h-11 rounded-xl border border-blue-200 px-4 text-sm font-semibold text-blue-700 disabled:opacity-50">{t("openingDebt.import.recheck")}</button>}
          <button type="button" onClick={() => void saqlash()} disabled={busy || !ready} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{operation === "save" ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}{t(operation === "save" ? "openingDebt.saving" : "openingDebt.import.confirm")}</button>
        </footer>
      </section>
    </AppModal>
  );
}
