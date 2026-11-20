import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, Trash2, X } from "lucide-react";

type KatakProps = {
  holat: boolean | "qisman";
  onChange: (belgilansin: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Ro'yxat qatori yoki "hammasini tanlash" katagi. `qisman` — bir qismi belgilangan (indeterminate). Bosilishi qatorni ochmaydi
 * (qator onClick'iga o'tmaydi).
 */
export function TanlashKatagi({ holat, onChange, ariaLabel, disabled, className = "" }: KatakProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = holat === "qisman";
  }, [holat]);
  return (
    <input
      ref={ref}
      type="checkbox"
      data-kop-tanlov-katak
      checked={holat === true}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-checked={holat === "qisman" ? "mixed" : holat}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.checked)}
      className={`h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-orange-500 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}

type PanelProps = {
  /** Belgilanganlar soni. */
  soni: number;
  /** "Hammasini tanlash" katagi (karta ko'rinishida; jadvalda u sarlavhada turadi). */
  hammasi?: { holat: boolean | "qisman"; korinadiganSoni: number; onChange: (belgilansin: boolean) => void };
  onTozalash: () => void;
  onOchirish: () => void;
  ochirilmoqda?: boolean;
  /** 500 tadan ortig'i belgilanmadi. */
  chegaraXabari?: boolean;
};

/**
 * Belgilanganlar paneli: "Hammasini tanlash", "N ta tanlandi · Bekor qilish" va "O'chirish (N)". Hech narsa belgilanmagan va "hammasini tanlash"
 * katagi yo'q bo'lsa ko'rinmaydi.
 */
export function KopTanlovPaneli({ soni, hammasi, onTozalash, onOchirish, ochirilmoqda = false, chegaraXabari = false }: PanelProps) {
  const { t } = useTranslation("common");
  if (!soni && !hammasi) return null;
  return (
    <div
      data-kop-tanlov-paneli
      role="region"
      aria-label={t("bulkDelete.panelAria")}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-2.5 shadow-sm transition-colors ${soni ? "border-red-100 bg-red-50/50" : "border-orange-100 bg-white"}`}
    >
      {hammasi && (
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-bold text-slate-700">
          <TanlashKatagi holat={hammasi.holat} onChange={hammasi.onChange} ariaLabel={t("bulkDelete.selectAllAria", { count: hammasi.korinadiganSoni })} disabled={!hammasi.korinadiganSoni || ochirilmoqda} />
          {t("bulkDelete.selectAll")}
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-slate-500">{hammasi.korinadiganSoni}</span>
        </label>
      )}
      {soni > 0 && (
        <>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700" aria-live="polite">
            <span className="rounded-lg bg-white px-2 py-0.5 font-black tabular-nums text-red-600 ring-1 ring-red-100">{soni}</span>
            {t("bulkDelete.selected", { count: soni })}
          </span>
          <button type="button" onClick={onTozalash} disabled={ochirilmoqda} className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-50">
            <X size={15} aria-hidden />
            {t("bulkDelete.clear")}
          </button>
        </>
      )}
      {chegaraXabari && <span role="status" className="text-xs font-semibold text-amber-700">{t("bulkDelete.limit", { count: 500 })}</span>}
      <button
        type="button"
        data-kop-ochirish
        onClick={onOchirish}
        disabled={!soni || ochirilmoqda}
        className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-black text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
      >
        {ochirilmoqda ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
        {t("bulkDelete.delete", { count: soni })}
      </button>
    </div>
  );
}
