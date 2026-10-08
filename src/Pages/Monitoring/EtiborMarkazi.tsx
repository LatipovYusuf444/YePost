import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BellRing,
  CircleCheck,
  Info,
  OctagonAlert,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import InlineLoading from "@/Components/common/InlineLoading";
import { pulMatni } from "@/lib/valyuta";
import { kunKaliti, type Ogohlantirish, type OgohlantirishDarajasi } from "./boshqaruvMalumotlari";
import { sanaMatni } from "./summaMatni";

type UmumiyHolat = OgohlantirishDarajasi | "ok";

// Daraja ranglari. "Ogohlantirish" uchun haqiqiy to'q sariq (hex) ishlatiladi: loyihada `orange-*` klasslari
// tema rangiga almashtirilgan, shuning uchun ularni bu yerda ishlatib bo'lmaydi.
const DARAJALAR: Record<
  OgohlantirishDarajasi,
  { icon: LucideIcon; tile: string; belgi: string; chiziq: string; matn: string; statistika: string }
> = {
  critical: {
    icon: OctagonAlert,
    tile: "bg-rose-50 text-rose-600 ring-rose-100",
    belgi: "bg-rose-50 text-rose-700 ring-rose-100",
    chiziq: "bg-rose-500",
    matn: "text-rose-600",
    statistika: "border-rose-100 bg-rose-50/70",
  },
  warning: {
    icon: TriangleAlert,
    tile: "bg-[#FFF4E8] text-[#EA580C] ring-[#FED7AA]",
    belgi: "bg-[#FFF4E8] text-[#C2410C] ring-[#FED7AA]",
    chiziq: "bg-[#F97316]",
    matn: "text-[#C2410C]",
    statistika: "border-[#FED7AA] bg-[#FFF8F0]",
  },
  attention: {
    icon: Info,
    tile: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    belgi: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    chiziq: "bg-yellow-400",
    matn: "text-yellow-700",
    statistika: "border-yellow-200 bg-yellow-50/70",
  },
};

// Umumiy holat: sarlavhadagi ikonka plitkasi va belgisi shu bo'yicha rangga bo'yaladi.
const UMUMIY_HOLAT: Record<UmumiyHolat, { icon: LucideIcon; tile: string; belgi: string }> = {
  critical: { icon: OctagonAlert, tile: "from-rose-500 to-pink-500 shadow-rose-500/30", belgi: "bg-rose-50 text-rose-700 ring-rose-100" },
  warning: { icon: TriangleAlert, tile: "from-[#F97316] to-amber-500 shadow-[#F97316]/30", belgi: "bg-[#FFF4E8] text-[#C2410C] ring-[#FED7AA]" },
  attention: { icon: BellRing, tile: "from-yellow-400 to-amber-400 shadow-yellow-400/30", belgi: "bg-yellow-50 text-yellow-800 ring-yellow-200" },
  ok: { icon: ShieldCheck, tile: "from-emerald-500 to-teal-500 shadow-emerald-500/30", belgi: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
};

const DARAJA_RO_YXATI: OgohlantirishDarajasi[] = ["critical", "warning", "attention"];

// ISO vaqtni mahalliy kunga o'tkazadi (kechasi UTC bo'yicha bir kun adashmasligi uchun).
function mahalliyKun(qiymat: string) {
  const sana = new Date(qiymat);
  return Number.isNaN(sana.getTime()) ? qiymat.slice(0, 10) : kunKaliti(sana);
}

type Props = {
  ogohlantirishlar: Ogohlantirish[];
  // Tekshirilgan va muammo topilmagan qoidalar (kalitlari).
  otganTekshiruvlar: string[];
  yuklanmoqda: boolean;
  // Ma'lumot manbalaridan hammasi yuklanmagan holat: xabar ko'rsatiladi.
  xato: string;
  // Manbalardan ba'zilari yuklanmagan: mavjud ma'lumotlar bo'yicha holatlar ko'rsatiladi, ogohlantirish chiqadi.
  qismanXato: boolean;
  className?: string;
};

export default function EtiborMarkazi({ ogohlantirishlar, otganTekshiruvlar, yuklanmoqda, xato, qismanXato, className = "" }: Props) {
  const { t } = useTranslation("monitoring");
  const sanoq = (daraja: OgohlantirishDarajasi) => ogohlantirishlar.filter((item) => item.daraja === daraja).length;
  const pul = (summa: number) => pulMatni(summa, "UZS", true, t("dynamics.currency"));
  const umumiy: UmumiyHolat = sanoq("critical") > 0 ? "critical" : sanoq("warning") > 0 ? "warning" : sanoq("attention") > 0 ? "attention" : "ok";
  const holat = UMUMIY_HOLAT[umumiy];
  const HolatIkonasi = holat.icon;
  const tayyor = !yuklanmoqda && !xato;

  return (
    <section aria-label={t("boshqaruv.alerts.title")} className={`monitoring-enter relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-linear-to-br from-amber-200/50 to-transparent blur-3xl" />

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg ${tayyor ? holat.tile : "from-slate-400 to-slate-500 shadow-slate-400/30"}`}>
            {tayyor ? <HolatIkonasi size={22} strokeWidth={2.2} /> : <BellRing size={22} strokeWidth={2.2} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">{t("boshqaruv.alerts.title")}</h2>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">{t("boshqaruv.alerts.subtitle")}</p>
          </div>
        </div>
        {tayyor && (
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${holat.belgi}`}>
            <HolatIkonasi size={13} aria-hidden />
            {t(`boshqaruv.alerts.status.${umumiy}`)}
          </span>
        )}
      </header>

      {tayyor && (
        <div className="relative mt-5 grid grid-cols-3 gap-2.5">
          {DARAJA_RO_YXATI.map((daraja) => {
            const soni = sanoq(daraja);
            const d = DARAJALAR[daraja];
            return (
              <div key={daraja} className={`rounded-2xl border px-3 py-2.5 ${soni > 0 ? d.statistika : "border-slate-200/70 bg-slate-50/70"}`}>
                <p className={`text-2xl font-extrabold leading-none tabular-nums ${soni > 0 ? d.matn : "text-slate-300"}`}>{soni}</p>
                <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${soni > 0 ? "text-slate-700" : "text-slate-400"}`}>
                  <span aria-hidden className={`h-2 w-2 rounded-full ${soni > 0 ? d.chiziq : "bg-slate-300"}`} />
                  {t(`boshqaruv.alerts.severity.${daraja}`)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative mt-4 flex-1">
        {yuklanmoqda ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
            <InlineLoading matn={t("boshqaruv.alerts.loading")} ikonka={<BellRing size={14} />} />
          </div>
        ) : xato ? (
          <div role="alert" className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-8 text-center text-sm text-rose-700">
            <TriangleAlert size={22} aria-hidden />
            <p className="font-semibold">{t("boshqaruv.alerts.error")}</p>
            <p className="text-xs">{xato}</p>
          </div>
        ) : ogohlantirishlar.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-8 text-center">
            <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CircleCheck size={24} />
            </span>
            <p className="text-sm font-bold text-emerald-800">{t("boshqaruv.alerts.ok")}</p>
            <p className="max-w-72 text-xs leading-5 text-emerald-700">{t("boshqaruv.alerts.okHint")}</p>
          </div>
        ) : (
          <ul className="scrollbar-orange space-y-3 xl:max-h-[600px] xl:overflow-y-auto xl:pr-1.5">
            {ogohlantirishlar.map((item) => {
              const d = DARAJALAR[item.daraja];
              const Ikona = d.icon;
              return (
                <li key={item.id}>
                  <Link
                    to={item.havola}
                    className="group relative block overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 pl-5 transition-[border-color,box-shadow] duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none"
                  >
                    <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${d.chiziq}`} />
                    <span className="flex items-start gap-3">
                      <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${d.tile}`}>
                        <Ikona size={19} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="text-[15px] font-bold leading-5 text-slate-950">{t(`boshqaruv.alerts.items.${item.kalit}.title`, item.params)}</span>
                          <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${d.belgi}`}>
                            {t(`boshqaruv.alerts.severity.${item.daraja}`)}
                          </span>
                        </span>
                        <span className="mt-1 block text-[13px] leading-5 text-slate-500">{t(`boshqaruv.alerts.items.${item.kalit}.desc`, item.params)}</span>
                      </span>
                    </span>

                    {item.summa != null && (
                      <span className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                        <span className="text-xs font-semibold text-slate-500">{t(`boshqaruv.alerts.items.${item.kalit}.metric`)}</span>
                        <span className={`text-base font-extrabold tabular-nums ${item.daraja === "critical" ? "text-rose-600" : "text-slate-950"}`}>{pul(item.summa)}</span>
                      </span>
                    )}

                    {(item.bogliq || item.sana) && (
                      <span className="mt-3 grid gap-1.5 text-xs">
                        {item.bogliq && (
                          <span className="flex gap-2">
                            <span className="shrink-0 text-slate-500">{t(`boshqaruv.alerts.items.${item.kalit}.relatedLabel`)}</span>
                            <span className="min-w-0 truncate font-semibold text-slate-800">{item.bogliq}</span>
                          </span>
                        )}
                        {item.sana && (
                          <span className="flex gap-2">
                            <span className="shrink-0 text-slate-500">{t(`boshqaruv.alerts.items.${item.kalit}.dateLabel`)}</span>
                            <span className="font-semibold tabular-nums text-slate-800">
                              {sanaMatni(mahalliyKun(item.sana))}
                              {item.kunOldin != null && (
                                <span className="font-medium text-slate-500"> · {item.kunOldin === 0 ? t("boshqaruv.alerts.agoToday") : t("boshqaruv.alerts.agoDays", { count: item.kunOldin })}</span>
                              )}
                            </span>
                          </span>
                        )}
                      </span>
                    )}

                    <span className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className={`text-xs font-bold ${d.matn}`}>{t(`boshqaruv.alerts.items.${item.kalit}.cta`)}</span>
                      <ArrowRight size={15} aria-hidden className="text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500 motion-reduce:transition-none" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {tayyor && otganTekshiruvlar.length > 0 && (
        <div className="relative mt-5 border-t border-dashed border-slate-200 pt-4">
          <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <ShieldCheck size={14} aria-hidden />
            {t("boshqaruv.alerts.passedTitle")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {otganTekshiruvlar.map((kalit) => (
              <li key={kalit} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <CircleCheck size={13} aria-hidden />
                {t(`boshqaruv.alerts.items.${kalit}.ok`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {qismanXato && tayyor && (
        <p className="relative mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          {t("boshqaruv.alerts.partial")}
        </p>
      )}
    </section>
  );
}
