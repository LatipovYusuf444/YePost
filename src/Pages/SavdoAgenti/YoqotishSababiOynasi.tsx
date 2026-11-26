import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { LoaderCircle, XCircle } from "lucide-react";
import AppSelect from "@/Components/ui/AppSelect";
import { LID_YOQOTISH_SABABLARI } from "@/types/crm";

// Kanbanda "Yo'qotildi" ustuniga tashlanganda sabab so'raladi (backend LOST uchun lostReason majburiy).
export default function YoqotishSababiOynasi({
  nom,
  onSaqlash,
  onYopish,
}: {
  nom: string;
  onSaqlash: (sabab: string) => Promise<void> | void;
  onYopish: () => void;
}) {
  const { t } = useTranslation("savdo_agenti");
  const [sabab, setSabab] = useState("");
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
      await onSaqlash(sabab);
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lid-yoqotish-sarlavha"
      onClick={(event) => {
        if (!saqlanmoqda && event.target === event.currentTarget) onYopish();
      }}
      className="fixed inset-0 z-[99995] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-[26px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,.28)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-8 ring-rose-50/60">
          <XCircle size={26} />
        </span>
        <h3 id="lid-yoqotish-sarlavha" className="mt-4 text-center text-lg font-black text-slate-950">
          {t("lid.lostDialog.title")}
        </h3>
        <p className="mx-auto mt-2 max-w-full truncate rounded-full bg-slate-100 px-4 py-1.5 text-center text-sm font-black text-slate-700">{nom}</p>
        <p className="mt-3 text-center text-sm leading-6 text-slate-500">{t("lid.lostDialog.text")}</p>
        <div className="mt-4" data-maydon-xato={xato ? "true" : undefined}>
          <AppSelect
            value={sabab}
            onChange={(event) => {
              setSabab(event.target.value);
              setXato(false);
            }}
            aria-label={t("lid.card.lostReason")}
            className={`h-11 w-full rounded-xl ${xato ? "!border-red-400 ring-2 ring-red-100" : ""}`}
          >
            <option value="">{t("lid.card.lostReasonPick")}</option>
            {LID_YOQOTISH_SABABLARI.map((qiymat) => (
              <option key={qiymat} value={qiymat}>
                {t(`lid.reason.${qiymat}`)}
              </option>
            ))}
          </AppSelect>
          {xato && <p className="mt-1 px-1 text-xs font-bold text-red-600">{t("lid.card.lostReasonRequired")}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onYopish}
            disabled={saqlanmoqda}
            className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {t("lid.lostDialog.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void saqlash()}
            disabled={saqlanmoqda}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 text-sm font-black text-white shadow-md shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-60"
          >
            {saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}
            {t("lid.lostDialog.save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
