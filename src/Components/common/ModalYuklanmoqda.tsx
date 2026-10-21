import { useEffect } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "./AppModal";

export default function ModalYuklanmoqda({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("common");
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);
  return <AppModal actionRail={false} onClose={onClose}>
    <section role="dialog" aria-modal="true" aria-label={t("actions.loading")} aria-busy="true" className="relative flex min-h-64 w-full max-w-xl items-center justify-center rounded-3xl border border-gold-200 bg-white p-8 shadow-xl">
      <button type="button" onClick={onClose} aria-label={t("actions.close")} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={20} /></button>
      <div role="status" className="flex items-center gap-3 font-medium text-slate-600"><LoaderCircle className="animate-spin text-gold-600" size={24} />{t("actions.loading")}</div>
    </section>
  </AppModal>;
}
