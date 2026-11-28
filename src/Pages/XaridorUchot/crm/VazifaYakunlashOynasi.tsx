import { useId, useState } from "react";
import axios from "axios";
import { CalendarClock, CircleCheck, LoaderCircle, Receipt, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import AppModal, { MODAL_YOPISH_ATRIBUTI } from "@/Components/common/AppModal";
import { crmApi } from "@/api/crmApi";
import { xatoKodi } from "@/api/xatoKodlari";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { contactTuriTanlanadimi, vazifaTuridanContactTuri, vazifaYopilganXatosimi } from "@/lib/crmNatija";
import type { Activity, ActivityYakunlashJavobi } from "@/types/crm";
import { vazifaIkonkasi } from "./crmBelgilar";
import NatijaFormasi from "./NatijaFormasi";
import { useNatijaFormasi, type NatijaSotuvi, type NatijaXodimi } from "./useNatijaFormasi";

// "Vazifani yakunlash": natija + keyingi qadam bitta so'rovda (POST /crm/activities/:id/complete { contact, nextTask? }).

export type VazifaYakunlashOynasiProps = {
  vazifa: Activity;
  xodimlar?: NatijaXodimi[];
  masulTanlashMumkin?: boolean;
  /** "Zakaz olindi" da bog'lash uchun mijoz sotuvlari (ixtiyoriy). */
  sotuvlar?: NatijaSotuvi[];
  onYopish: () => void;
  onBajarildi: (javob: ActivityYakunlashJavobi) => void;
  /** Vazifa allaqachon yopilgan (activity_not_pending): ota oynani yopib, ro'yxatni yangilaydi. */
  onEskirdi?: () => void;
};

export default function VazifaYakunlashOynasi({ vazifa, xodimlar, masulTanlashMumkin = false, sotuvlar, onYopish, onBajarildi, onEskirdi }: VazifaYakunlashOynasiProps) {
  const { t } = useTranslation("crm");
  const turTanlanadi = contactTuriTanlanadimi(vazifa.type);
  const natija = useNatijaFormasi({
    type: vazifaTuridanContactTuri(vazifa.type),
    // Keyingi vazifa ham shu sotuv bo'yicha davom etadi.
    // Admin/direktor boshqa xodimning vazifasini yopsa, keyingi vazifa standart bo'yicha o'sha xodimda qoladi (o'zgartirish mumkin).
    keyingi: {
      ...(vazifa.saleId ? { saleId: vazifa.saleId } : {}),
      ...(masulTanlashMumkin && vazifa.assigneeId ? { assigneeId: vazifa.assigneeId } : {}),
    },
  });
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const id = useId();
  const Ikonka = vazifaIkonkasi(vazifa.type);
  const muddat = vaqtMatni(vazifa.dueAt);
  const mijoz = vazifa.partner?.name?.trim();
  const sotuvRaqami = vazifa.sale?.docNumber || (vazifa.saleId ? `#${vazifa.saleId.slice(0, 8)}` : "");

  async function yakunlash() {
    if (saqlanmoqda || !natija.tekshir()) return;
    setSaqlanmoqda(true);
    try {
      const javob = await crmApi.activityNatijaBilanYakunlash(vazifa.id, natija.yakunlashTanasi());
      const keyingi = javob.nextTask;
      toast.success(t("yakunlash.muvaffaqiyat"), {
        description: keyingi ? t("yakunlash.keyingiYaratildi", { subject: keyingi.subject ?? "", due: vaqtMatni(keyingi.dueAt) }) : undefined,
      });
      onBajarildi(javob);
    } catch (error) {
      // Vazifa boshqa joyda yopilgan: oyna yopiladi, ro'yxat yangilanadi (matn global toastda).
      if (onEskirdi && vazifaYopilganXatosimi(xatoKodi(axios.isAxiosError(error) ? error.response?.data : undefined))) {
        onEskirdi();
        return;
      }
      // Matn global toastda; tegishli maydon qizil bo'ladi.
      natija.serverXatosi(error);
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <AppModal onClose={onYopish} ozgarishBor={natija.ozgarishBor && !saqlanmoqda}>
      <div
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-sarlavha`}
        data-testid="vazifa-yakunlash-oynasi"
      >
        <header className="flex items-start gap-3 border-b border-slate-100 bg-linear-to-r from-blue-50 to-white px-5 py-4 sm:px-6">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-[0_8px_20px_rgba(37,99,235,.28)]">
            <Ikonka size={19} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">{t("yakunlash.sarlavha")}</p>
            <h2 id={`${id}-sarlavha`} className="mt-0.5 break-words text-lg font-black leading-6 text-slate-900">
              {vazifa.subject || t(`vazifaTurlari.${vazifa.type ?? "TASK"}`, { defaultValue: t("vazifaTurlari.TASK") })}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
              {mijoz && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200" title={t("yakunlash.mijoz")}>
                  <UserRound size={13} className="shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{mijoz}</span>
                </span>
              )}
              {muddat && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ${
                    vazifa.overdue ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-white ring-slate-200"
                  }`}
                  title={t("yakunlash.muddat")}
                >
                  <CalendarClock size={13} className={`shrink-0 ${vazifa.overdue ? "text-rose-500" : "text-slate-400"}`} aria-hidden />
                  {muddat}
                  {vazifa.overdue && <span className="font-black">· {t("yakunlash.muddatiOtgan")}</span>}
                </span>
              )}
              {sotuvRaqami && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200" title={t("yakunlash.sotuv")}>
                  <Receipt size={13} className="shrink-0 text-slate-400" aria-hidden />
                  {sotuvRaqami}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onYopish}
            {...{ [MODAL_YOPISH_ATRIBUTI]: "" }}
            aria-label={t("yakunlash.yopish")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <X size={17} aria-hidden />
          </button>
        </header>

        <form
          id={`${id}-forma`}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            // Bu forma xaridor/kompaniya/yetkazib beruvchi tahrir formasi ichida (yoki portal orqali) turadi: submit tashqi formaga chiqmasin.
            e.stopPropagation();
            void yakunlash();
          }}
        >
          <NatijaFormasi
            natija={natija}
            qatiyTur={turTanlanadi ? undefined : vazifaTuridanContactTuri(vazifa.type)}
            sotuvlar={sotuvlar}
            xodimlar={xodimlar}
            masulTanlashMumkin={masulTanlashMumkin}
            disabled={saqlanmoqda}
          />
        </form>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onYopish}
            {...{ [MODAL_YOPISH_ATRIBUTI]: "" }}
            disabled={saqlanmoqda}
            className="h-11 rounded-xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {t("yakunlash.ortga")}
          </button>
          <button
            type="submit"
            form={`${id}-forma`}
            disabled={saqlanmoqda}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.28)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saqlanmoqda ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : <CircleCheck size={17} aria-hidden />}
            {saqlanmoqda ? t("yakunlash.saqlanmoqda") : t("yakunlash.saqlash")}
          </button>
        </footer>
      </div>
    </AppModal>
  );
}
