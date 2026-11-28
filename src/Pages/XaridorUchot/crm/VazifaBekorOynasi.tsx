import { useId, useState } from "react";
import axios from "axios";
import { Ban, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import AppModal, { MODAL_YOPISH_ATRIBUTI } from "@/Components/common/AppModal";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { crmApi } from "@/api/crmApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { xatoKodi } from "@/api/xatoKodlari";
import { serverXatoMaydoni, vazifaYopilganXatosimi } from "@/lib/crmNatija";
import type { Activity } from "@/types/crm";
import { CRM_MATN_MAYDONI, CRM_YORLIQ } from "./crmBelgilar";

// Vazifani bekor qilish: sabab majburiy (POST /crm/activities/:id/cancel { reason }), faqat ochiq vazifa.

export type VazifaBekorOynasiProps = {
  vazifa: Activity;
  onYopish: () => void;
  onBekorQilindi: (vazifa: Activity) => void;
  /** Vazifa allaqachon yopilgan (activity_not_pending): ota oynani yopib, ro'yxatni yangilaydi. */
  onEskirdi?: () => void;
};

export default function VazifaBekorOynasi({ vazifa, onYopish, onBekorQilindi, onEskirdi }: VazifaBekorOynasiProps) {
  const { t } = useTranslation("crm");
  const id = useId();
  const [sabab, setSabab] = useState("");
  const [xato, setXato] = useState("");
  const [jarayon, setJarayon] = useState(false);

  async function bekorQilish() {
    if (jarayon) return;
    const matn = sabab.trim();
    if (!matn) {
      setXato(t("bekor.sababKerak"));
      return;
    }
    setJarayon(true);
    try {
      const javob = await crmApi.activityBekorQilish(vazifa.id, matn);
      toast.success(t("bekor.muvaffaqiyat"));
      onBekorQilindi(javob && typeof javob === "object" && "id" in javob ? javob : { ...vazifa, status: "CANCELLED", cancelReason: matn });
    } catch (error) {
      // Matn global toastda; sabab xatosi maydon ostida ham.
      const kod = xatoKodi(axios.isAxiosError(error) ? error.response?.data : undefined);
      // Vazifa boshqa joyda yopilgan: oyna yopiladi, ro'yxat yangilanadi.
      if (onEskirdi && vazifaYopilganXatosimi(kod)) {
        onEskirdi();
        return;
      }
      if (serverXatoMaydoni(kod) === "reason") setXato(getApiErrorMessage(error));
    } finally {
      setJarayon(false);
    }
  }

  return (
    <AppModal onClose={onYopish} ozgarishBor={Boolean(sabab.trim()) && !jarayon}>
      <div
        className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-sarlavha`}
        data-testid="vazifa-bekor-oynasi"
      >
        <header className="flex items-start gap-3 border-b border-slate-100 bg-linear-to-r from-rose-50 to-white px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,.28)]">
            <Ban size={19} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p id={`${id}-sarlavha`} className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">{t("bekor.sarlavha")}</p>
            <h2 className="mt-0.5 break-words text-lg font-black leading-6 text-slate-900">{vazifa.subject || t("vazifaTurlari.TASK")}</h2>
            {vazifa.partner?.name && <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{vazifa.partner.name}</p>}
          </div>
          <button
            type="button"
            onClick={onYopish}
            {...{ [MODAL_YOPISH_ATRIBUTI]: "" }}
            aria-label={t("bekor.yopish")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <X size={17} aria-hidden />
          </button>
        </header>

        <form
          className="px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            // Bu forma xaridor/kompaniya/yetkazib beruvchi tahrir formasi ichida (yoki portal orqali) turadi: submit tashqi formaga chiqmasin.
            e.stopPropagation();
            void bekorQilish();
          }}
        >
          <XatoliMaydon xato={xato}>
            <label className={CRM_YORLIQ} htmlFor={`${id}-sabab`}>{t("bekor.sabab")}</label>
            <textarea
              id={`${id}-sabab`}
              value={sabab}
              autoFocus
              disabled={jarayon}
              maxLength={1000}
              rows={3}
              aria-invalid={Boolean(xato) || undefined}
              onChange={(e) => {
                setSabab(e.target.value);
                if (xato) setXato("");
              }}
              placeholder={t("bekor.sababPlaceholder")}
              className={CRM_MATN_MAYDONI}
            />
          </XatoliMaydon>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onYopish}
              {...{ [MODAL_YOPISH_ATRIBUTI]: "" }}
              disabled={jarayon}
              className="h-11 rounded-xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {t("bekor.ortga")}
            </button>
            <button
              type="submit"
              disabled={jarayon}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-500 px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(244,63,94,.25)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {jarayon ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : <Ban size={17} aria-hidden />}
              {jarayon ? t("bekor.jarayon") : t("bekor.tasdiq")}
            </button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}
