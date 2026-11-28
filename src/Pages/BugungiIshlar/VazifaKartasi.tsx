import { memo } from "react";
import { Ban, CalendarClock, CircleCheck, Clock, LoaderCircle, Receipt, UserCog, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isoniAjratish } from "@/lib/crmNatija";
import { cn } from "@/lib/utils";
import type { Activity, ActivityTuri, KunTartibi } from "@/types/crm";
import { vazifaIkonkasi } from "@/Pages/XaridorUchot/crm/crmBelgilar";
import { kechikishKunlari, muddatiOtganmi, surishErtagadanKeyinmi } from "./bugungiIshlar";

// "Bugungi ishlar" dagi bitta vazifa: tur, mavzu, mijoz, sotuv, muddat va amallar (Bajarildi / Ertaga / Bekor).
// Diqqat: bu mavzuda "orange-*" ko'k — haqiqiy ranglar uchun sky/violet/emerald/amber/rose.

const TUR_RANGLARI: Record<ActivityTuri, string> = {
  CALL: "bg-sky-50 text-sky-600 ring-sky-100",
  MEETING: "bg-violet-50 text-violet-600 ring-violet-100",
  MESSAGE: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  DEBT: "bg-amber-50 text-amber-600 ring-amber-100",
  TASK: "bg-slate-100 text-slate-600 ring-slate-200",
};

export type KunTartibiBolimi = keyof KunTartibi;

type Props = {
  vazifa: Activity;
  bolim: KunTartibiBolimi;
  hozir: Date;
  /** Admin/direktor ko'rinishida mas'ul nomi ham ko'rsatiladi. */
  masulNomi?: string;
  surilmoqda: boolean;
  bandmi: boolean;
  onBajarildi: (vazifa: Activity) => void;
  onBekor: (vazifa: Activity) => void;
  onSurish: (vazifa: Activity) => void;
};

function kunOyMatni(kun: string) {
  const [, oy, kunRaqami] = kun.split("-");
  return kun ? `${kunRaqami}.${oy}` : "";
}

function VazifaKartasi({ vazifa, bolim, hozir, masulNomi, surilmoqda, bandmi, onBajarildi, onBekor, onSurish }: Props) {
  const { t } = useTranslation("crm");
  const tur = (vazifa.type ?? "TASK") as ActivityTuri;
  const Ikonka = vazifaIkonkasi(tur);
  const otgan = muddatiOtganmi(vazifa, hozir);
  const { kun, vaqt } = isoniAjratish(vazifa.dueAt);
  const kechikish = otgan ? kechikishKunlari(vazifa.dueAt, hozir) : null;
  const birKunga = surishErtagadanKeyinmi(vazifa.dueAt, hozir);
  const mijoz = vazifa.partner?.name?.trim();
  const sotuv = vazifa.sale?.docNumber || (vazifa.saleId ? `#${vazifa.saleId.slice(0, 8)}` : "");
  const tavsif = vazifa.description?.trim();

  // Muddati o'tganda kun ham ko'rinadi; boshqa bo'limlarda kun bo'lim/guruh sarlavhasida.
  let muddat = vaqt || t("kunTartibi.muddatsiz");
  if (otgan && kun && bolim === "overdue") {
    muddat = kechikish && kechikish > 0 ? `${kunOyMatni(kun)} · ${vaqt}` : `${t("kunTartibi.bugun")} · ${vaqt}`;
  }

  return (
    <li
      data-vazifa-id={vazifa.id}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-3.5 transition @md:p-4 @2xl:flex-row @2xl:items-center @2xl:gap-4",
        otgan ? "border-rose-200 bg-rose-50/50 hover:border-rose-300" : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-[0_8px_24px_rgba(15,23,42,.06)]"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1", TUR_RANGLARI[tur] ?? TUR_RANGLARI.TASK)}
          title={t(`vazifaTurlari.${tur}`, { defaultValue: t("vazifaTurlari.TASK") })}
        >
          <Ikonka size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-bold leading-5 text-slate-900">
            {vazifa.subject || t(`vazifaTurlari.${tur}`, { defaultValue: t("vazifaTurlari.TASK") })}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1",
                otgan ? "bg-rose-100/70 text-rose-700 ring-rose-200" : "bg-slate-50 text-slate-700 ring-slate-200"
              )}
            >
              <Clock size={12} className={otgan ? "text-rose-500" : "text-slate-400"} aria-hidden />
              {muddat}
              {kechikish !== null && kechikish > 0 && <span className="font-black">· {t("kunTartibi.kechikdi", { count: kechikish })}</span>}
            </span>
            <span className="text-slate-400">{t(`vazifaTurlari.${tur}`, { defaultValue: t("vazifaTurlari.TASK") })}</span>
            {mijoz && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-slate-700" title={t("kunTartibi.mijoz")}>
                <UserRound size={12} className="shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{mijoz}</span>
              </span>
            )}
            {sotuv && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[#1D4ED8] ring-1 ring-blue-100" title={t("kunTartibi.sotuv")}>
                <Receipt size={12} aria-hidden />
                {sotuv}
              </span>
            )}
            {masulNomi && (
              <span className="inline-flex min-w-0 items-center gap-1 text-slate-500" title={t("kunTartibi.masul")}>
                <UserCog size={12} className="shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{masulNomi}</span>
              </span>
            )}
          </div>
          {tavsif && <p className="mt-1.5 line-clamp-2 break-words text-[13px] leading-5 text-slate-500">{tavsif}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 @md:pl-[52px] @2xl:justify-end @2xl:pl-0">
        <button
          type="button"
          onClick={() => onBajarildi(vazifa)}
          disabled={bandmi}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(16,185,129,.25)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 @md:flex-none"
        >
          <CircleCheck size={16} aria-hidden />
          {t("kunTartibi.bajarildi")}
        </button>
        <button
          type="button"
          onClick={() => onSurish(vazifa)}
          disabled={bandmi}
          title={t(birKunga ? "kunTartibi.birKunIzoh" : "kunTartibi.ertagaIzoh")}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 @md:flex-none"
        >
          {surilmoqda ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <CalendarClock size={15} className="text-slate-400" aria-hidden />}
          {surilmoqda ? t("kunTartibi.surilmoqda") : t(birKunga ? "kunTartibi.birKun" : "kunTartibi.ertaga")}
        </button>
        <button
          type="button"
          onClick={() => onBekor(vazifa)}
          disabled={bandmi}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Ban size={15} aria-hidden />
          <span>{t("kunTartibi.bekor")}</span>
        </button>
      </div>
    </li>
  );
}

export default memo(VazifaKartasi);
