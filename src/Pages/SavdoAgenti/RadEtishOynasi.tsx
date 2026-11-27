import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { LoaderCircle, XCircle } from "lucide-react";
import AppSelect from "@/Components/ui/AppSelect";
import { RAD_ETISH_IZOHI_UZUNLIGI } from "@/lib/savdoAgentiSozlama";
import { LID_YOQOTISH_SABABLARI } from "@/types/crm";

// Agent buyurtmasini rad etish: sabab (lid yo'qotish sababi bilan bir xil, majburiy) va mijozga yuboriladigan ixtiyoriy izoh.
export default function RadEtishOynasi({
  nom,
  onSaqlash,
  onYopish,
}: {
  nom: string;
  onSaqlash: (natija: { lostReason: string; note?: string }) => Promise<void> | void;
  onYopish: () => void;
}) {
  const { t } = useTranslation("savdo_agenti");
  const [sabab, setSabab] = useState("");
  const [izoh, setIzoh] = useState("");
  const [xato, setXato] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  useEffect(() => {
    const tugma = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saqlanmoqda) onYopish();
    };
    document.addEventListener("keydown", tugma);
    return () => document.removeEventListener("keydown", tugma);
  }, [onYopish, saqlanmoqda]);

  async function saqlash() {
    if (!sabab) {
      setXato(true);
      return;
    }
    setSaqlanmoqda(true);
    try {
      const toza = izoh.trim();
      await onSaqlash(toza ? { lostReason: sabab, note: toza } : { lostReason: sabab });
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-rad-sarlavha"
      data-agent-rad-oynasi
      onClick={(event) => {
        if (!saqlanmoqda && event.target === event.currentTarget) onYopish();
      }}
      className="fixed inset-0 z-[99995] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[26px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,.28)] sm:rounded-[26px]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-8 ring-rose-50/60">
          <XCircle size={26} />
        </span>
        <h3 id="agent-rad-sarlavha" className="mt-4 text-center text-lg font-black text-slate-950">
          {t("tasdiq.reject.title")}
        </h3>
        <p className="mx-auto mt-2 max-w-full truncate rounded-full bg-slate-100 px-4 py-1.5 text-center text-sm font-black text-slate-700">{nom}</p>
        <p className="mt-3 text-center text-sm leading-6 text-slate-500">{t("tasdiq.reject.text")}</p>

        <label className="mt-4 block text-xs font-bold text-slate-600" htmlFor="agent-rad-sabab">
          {t("tasdiq.reject.reason")}
        </label>
        <div className="mt-1" data-maydon-xato={xato ? "true" : undefined}>
          <AppSelect
            id="agent-rad-sabab"
            value={sabab}
            onChange={(event) => {
              setSabab(event.target.value);
              setXato(false);
            }}
            aria-label={t("tasdiq.reject.reason")}
            className={`h-11 w-full rounded-xl ${xato ? "!border-red-400 ring-2 ring-red-100" : ""}`}
          >
            <option value="">{t("lid.card.lostReasonPick")}</option>
            {LID_YOQOTISH_SABABLARI.map((qiymat) => (
              <option key={qiymat} value={qiymat}>
                {t(`lid.reason.${qiymat}`)}
              </option>
            ))}
          </AppSelect>
          {xato && <p className="mt-1 px-1 text-xs font-bold text-red-600">{t("tasdiq.reject.reasonRequired")}</p>}
        </div>

        <label className="mt-4 block text-xs font-bold text-slate-600" htmlFor="agent-rad-izoh">
          {t("tasdiq.reject.note")}
        </label>
        <textarea
          id="agent-rad-izoh"
          value={izoh}
          maxLength={RAD_ETISH_IZOHI_UZUNLIGI}
          rows={3}
          onChange={(event) => setIzoh(event.target.value)}
          placeholder={t("tasdiq.reject.notePlaceholder")}
          className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <div className="mt-1 flex justify-between gap-3 px-1 text-[11px] font-semibold text-slate-400">
          <span>{t("tasdiq.reject.noteHint")}</span>
          <span>
            {izoh.length}/{RAD_ETISH_IZOHI_UZUNLIGI}
          </span>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onYopish}
            disabled={saqlanmoqda}
            className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {t("tasdiq.reject.cancel")}
          </button>
          <button
            type="button"
            data-agent-rad-tasdiq
            onClick={() => void saqlash()}
            disabled={saqlanmoqda}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 text-sm font-black text-white shadow-md shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-60"
          >
            {saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}
            {t("tasdiq.reject.submit")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
