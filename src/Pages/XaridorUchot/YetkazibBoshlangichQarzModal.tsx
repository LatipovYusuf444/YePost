import { useRef, useState, type FormEvent } from "react";
import { BookOpen, LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import AppModal from "@/Components/common/AppModal";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { yetkazibBoshlangichQarzApi } from "@/api/yetkazibBoshlangichQarzApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import { boshlangichQarzMalumoti } from "@/lib/boshlangichQarz";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import { bugungiToshkentKuni } from "@/lib/hujjatSanasi";
import { muvaffaqiyatXabari } from "@/lib/toast";
import { useValyutaStore } from "@/lib/valyuta";
import { YETKAZIB_QARZ_IZOH_UZUNLIGI, type YetkazibBoshlangichQarzi } from "@/lib/yetkazibBoshlangichQarz";
import type { YetkazibBeruvchi } from "./types";

// Server xatosi qaysi maydonga tegishli (opening-debt tanasi: amount, currency, date, note). Sana birinchi: "yopilgan davr" (423) va "kelajak sana" sanaga.
const QARZ_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  date: { maydonlar: ["date"], kodlar: ["date", "period"], sozlar: ["sana", "davr", "дата", "период"] },
  currency: { maydonlar: ["currency"], kodlar: ["currency"], sozlar: ["valyuta", "валют"] },
  amount: { maydonlar: ["amount"], kodlar: ["amount"], sozlar: ["summa", "сумм"] },
  note: { maydonlar: ["note"] },
};

// Yetkazib beruvchiga boshlang'ich qarz kiritish (POST /partners/suppliers/:id/opening-debt): darhol tasdiqlanadi, qoralama yo'q.
// Faqat admin va direktor (tugma boshqa rollarda ko'rsatilmaydi; yakuniy tekshiruv backendda).
export default function YetkazibBoshlangichQarzModal({
  beruvchi,
  onClose,
  onSaqlandi,
}: {
  beruvchi: YetkazibBeruvchi;
  onClose: () => void;
  onSaqlandi?: (qarz: YetkazibBoshlangichQarzi) => void;
}) {
  const { t } = useTranslation("xaridor_uchot");
  const fx = useMaydonXatolari(QARZ_XATO_QOIDALARI);
  // USD faqat valyuta rejimi yoqilgan bo'lsa (aks holda backend errors.currency.mode_off qaytaradi).
  const dollarMumkin = useValyutaStore((holat) => holat.rejimYoniq);
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
    const result = boshlangichQarzMalumoti({ amount, currency, date, note: note.slice(0, YETKAZIB_QARZ_IZOH_UZUNLIGI) }, bugungiToshkentKuni());
    if (result.error) {
      setError("");
      fx.ornat({ [result.error]: t(`openingDebt.errors.${result.error}`) });
      return;
    }
    lock.current = true;
    setSaving(true);
    setError("");
    fx.ornat({});
    try {
      const qarz = await yetkazibBoshlangichQarzApi.yaratish(beruvchi.id, result.payload);
      muvaffaqiyatXabari(t("yetkazibDetails.openingDebt.saved", { raqam: qarz.docNumber || "" }));
      onSaqlandi?.(qarz);
      onClose();
    } catch (cause) {
      fx.serverdan(axios.isAxiosError(cause) ? cause.response?.data : undefined);
      setError(getApiErrorMessage(cause));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <AppModal onClose={() => { if (!lock.current) onClose(); }} actionRail={false}>
      <section role="dialog" aria-modal="true" aria-labelledby="supplier-opening-debt-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={21} aria-hidden /></span>
            <div>
              <h2 id="supplier-opening-debt-title" className="text-lg font-bold text-slate-900">{t("openingDebt.title")}</h2>
              <p className="mt-0.5 break-words text-sm text-slate-500">{beruvchi.nomi}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t("openingDebt.close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={19} /></button>
        </header>
        <form onSubmit={(event) => void saqlash(event)} className="space-y-5 p-5 sm:p-6">
          <p className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">{t("yetkazibDetails.openingDebt.hint")}</p>
          <div className={dollarMumkin ? "grid grid-cols-[minmax(0,1fr)_110px] gap-3" : "grid gap-3"}>
            <XatoliMaydon xato={fx.xato("amount")}>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
                {t("openingDebt.amount")}
                <SummaMaydoni autoFocus required value={amount} onChange={(qiymat) => { fx.tozala("amount"); setAmount(qiymat); }} disabled={saving} placeholder="10 150" className={fieldClass} />
              </label>
            </XatoliMaydon>
            {dollarMumkin && (
              <XatoliMaydon xato={fx.xato("currency")}>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
                  {t("openingDebt.currency")}
                  <select value={currency} onChange={(event) => { fx.tozala("currency"); setCurrency(event.target.value); }} disabled={saving} className={fieldClass}>
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </XatoliMaydon>
            )}
          </div>
          {!dollarMumkin && fx.xato("currency") && <p role="alert" className="text-sm font-semibold text-red-600">{fx.xato("currency")}</p>}
          <XatoliMaydon xato={fx.xato("date")}>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
              {t("openingDebt.date")}
              <input type="date" value={date} max={bugungiToshkentKuni()} onChange={(event) => { fx.tozala("date"); setDate(event.target.value); }} disabled={saving} className={fieldClass} />
            </label>
          </XatoliMaydon>
          <XatoliMaydon xato={fx.xato("note")}>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
              <span className="flex items-center justify-between gap-2">
                {t("openingDebt.note")}
                <span className="text-xs font-medium text-slate-400">{note.length}/{YETKAZIB_QARZ_IZOH_UZUNLIGI}</span>
              </span>
              <textarea
                value={note}
                maxLength={YETKAZIB_QARZ_IZOH_UZUNLIGI}
                onChange={(event) => { fx.tozala("note"); setNote(event.target.value); }}
                disabled={saving}
                rows={3}
                placeholder={t("openingDebt.notePlaceholder")}
                className={`${fieldClass} h-auto resize-y py-3`}
              />
            </label>
          </XatoliMaydon>
          {(fx.tepadagi || (fx.bor ? "" : error)) && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{fx.tepadagi || error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-50">{t("openingDebt.cancel")}</button>
            <button type="submit" disabled={saving || !amount.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {t(saving ? "openingDebt.saving" : "openingDebt.save")}
            </button>
          </div>
        </form>
      </section>
    </AppModal>
  );
}
