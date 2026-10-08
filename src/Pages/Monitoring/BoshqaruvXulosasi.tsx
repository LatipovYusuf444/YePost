import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  ClipboardList,
  PackageCheck,
  PackageOpen,
  Receipt,
  RefreshCw,
  TriangleAlert,
  Truck,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import InlineLoading from "@/Components/common/InlineLoading";
import { pulMatni } from "@/lib/valyuta";
import type { BuyurtmaKorsatkichlari, MoliyaQiymatlari } from "./boshqaruvMalumotlari";
import { summaniAjratish } from "./summaMatni";

type Props = {
  buyurtma: { malumot: BuyurtmaKorsatkichlari | null; yuklanmoqda: boolean; xato: string };
  onBuyurtmaQayta: () => void;
  moliya: MoliyaQiymatlari | null;
  moliyaYuklanmoqda: boolean;
  moliyaXato: string;
};

// Tepada: buyurtmalar (yetkazib berish) bo'yicha jami / faol / yakunlangan / kechikayotgan.
// Pastda: tanlangan davr uchun daromad, xarajat va sof foyda. Ma'lumotlar real backenddan keladi.
export default function BoshqaruvXulosasi({ buyurtma, onBuyurtmaQayta, moliya, moliyaYuklanmoqda, moliyaXato }: Props) {
  const { t, i18n } = useTranslation("monitoring");
  const pul = (summa: number) => pulMatni(summa, "UZS", true, t("dynamics.currency"));
  const son = (qiymat: number) => qiymat.toLocaleString(i18n.resolvedLanguage === "ru" ? "ru-RU" : "uz-UZ");
  const b = buyurtma.malumot;
  const foydaFoizi = moliya && moliya.daromad > 0 ? (moliya.sofFoyda / moliya.daromad) * 100 : null;

  return (
    <section aria-label={t("boshqaruv.title")} className="monitoring-enter relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <span aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-linear-to-br from-blue-200/60 to-transparent blur-3xl" />

      <header className="relative">
        <h2 className="text-lg font-bold tracking-tight text-slate-950">{t("boshqaruv.title")}</h2>
        <p className="mt-0.5 text-[13px] leading-5 text-slate-500">{t("boshqaruv.subtitle")}</p>
      </header>

      <div className="relative mt-5">
        <GuruhSarlavhasi nom={t("boshqaruv.orders.title")} belgi={t("boshqaruv.orders.badge")} belgiHint={t("boshqaruv.orders.badgeHint")} />
        {buyurtma.yuklanmoqda ? (
          <Holat><InlineLoading matn={t("boshqaruv.orders.loading")} ikonka={<Truck size={14} />} /></Holat>
        ) : buyurtma.xato ? (
          <Holat xato>
            <span className="flex items-center gap-2"><TriangleAlert size={16} aria-hidden />{t("boshqaruv.orders.error")}</span>
            <button type="button" onClick={onBuyurtmaQayta} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100">
              <RefreshCw size={13} aria-hidden /> {t("boshqaruv.retry")}
            </button>
          </Holat>
        ) : !b || b.jami === 0 ? (
          <Holat>
            <span className="flex items-center gap-2.5">
              <PackageOpen size={18} aria-hidden className="text-slate-400" />
              <span><b className="font-bold text-slate-700">{t("boshqaruv.orders.empty")}</b> {t("boshqaruv.orders.emptyHint")}</span>
            </span>
          </Holat>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
            <Plitka icon={ClipboardList} nom={t("boshqaruv.orders.total")} qiymat={son(b.jami)} izoh={t("boshqaruv.orders.totalSub", { count: b.bekorQilingan })} tile="from-blue-500 to-indigo-500 shadow-blue-500/30" />
            <Plitka icon={Truck} nom={t("boshqaruv.orders.active")} qiymat={son(b.faol)} izoh={t("boshqaruv.orders.activeSub")} tile="from-sky-500 to-cyan-500 shadow-sky-500/30" />
            <Plitka icon={PackageCheck} nom={t("boshqaruv.orders.completed")} qiymat={son(b.yakunlangan)} izoh={t("boshqaruv.orders.completedSub")} tile="from-emerald-500 to-teal-500 shadow-emerald-500/30" />
            <Plitka
              icon={Clock}
              nom={t("boshqaruv.orders.late")}
              qiymat={son(b.kechikayotgan)}
              izoh={b.kechikayotgan > 0 ? t("boshqaruv.orders.lateSub") : t("boshqaruv.orders.lateNone")}
              tile="from-amber-500 to-yellow-500 shadow-amber-500/30"
              diqqat={b.kechikayotgan > 0}
            />
          </div>
        )}
      </div>

      <div className="relative mt-6 border-t border-dashed border-slate-200 pt-5">
        <GuruhSarlavhasi nom={t("boshqaruv.finance.title")} belgi={t("boshqaruv.finance.badge")} belgiHint={t("boshqaruv.finance.badgeHint")} />
        {moliyaYuklanmoqda ? (
          <Holat><InlineLoading matn={t("boshqaruv.finance.loading")} ikonka={<Wallet size={14} />} /></Holat>
        ) : moliyaXato ? (
          <Holat xato>
            <span className="flex items-center gap-2"><TriangleAlert size={16} aria-hidden />{t("boshqaruv.finance.error")}: {moliyaXato}</span>
          </Holat>
        ) : !moliya ? (
          <Holat>
            <span className="flex items-center gap-2.5"><Wallet size={18} aria-hidden className="text-slate-400" /><b className="font-bold text-slate-700">{t("boshqaruv.finance.empty")}</b></span>
          </Holat>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
            <Plitka icon={TrendingUp} nom={t("boshqaruv.finance.revenue")} pulQiymat={pul(moliya.daromad)} izoh={moliya.qaytarilgan > 0 ? t("boshqaruv.finance.revenueSubReturns", { summa: pul(moliya.qaytarilgan) }) : t("boshqaruv.finance.revenueSub")} tile="from-blue-500 to-indigo-500 shadow-blue-500/30" />
            <Plitka icon={Receipt} nom={t("boshqaruv.finance.expense")} pulQiymat={pul(moliya.xarajat)} izoh={t("boshqaruv.finance.expenseSub", { tannarx: pul(moliya.tannarx), operatsion: pul(moliya.operatsion) })} tile="from-amber-500 to-yellow-500 shadow-amber-500/30" />
            <Plitka
              icon={Wallet}
              nom={moliya.sofFoyda < 0 ? t("boshqaruv.finance.loss") : t("boshqaruv.finance.profit")}
              pulQiymat={pul(moliya.sofFoyda)}
              izoh={foydaFoizi != null ? t("boshqaruv.finance.profitSub", { percent: foydaFoizi.toFixed(1) }) : t("boshqaruv.finance.profitFormula")}
              tile={moliya.sofFoyda < 0 ? "from-rose-500 to-pink-500 shadow-rose-500/30" : "from-emerald-500 to-teal-500 shadow-emerald-500/30"}
              manfiy={moliya.sofFoyda < 0}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function GuruhSarlavhasi({ nom, belgi, belgiHint }: { nom: string; belgi: string; belgiHint: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-600">{nom}</h3>
      <span title={belgiHint} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{belgi}</span>
    </div>
  );
}

function Holat({ children, xato = false }: { children: ReactNode; xato?: boolean }) {
  return (
    <div
      role={xato ? "alert" : undefined}
      className={`flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        xato ? "border-rose-100 bg-rose-50 text-rose-700" : "border-dashed border-slate-200 bg-slate-50/60 text-slate-500"
      }`}
    >
      {children}
    </div>
  );
}

function Plitka({
  icon: Icon,
  nom,
  qiymat,
  pulQiymat,
  izoh,
  tile,
  diqqat = false,
  manfiy = false,
}: {
  icon: LucideIcon;
  nom: string;
  qiymat?: string;
  // Pul qiymati: katta raqam + kichik "so'm" ko'rinishida chiqadi.
  pulQiymat?: string;
  izoh: string;
  tile: string;
  diqqat?: boolean;
  manfiy?: boolean;
}) {
  const pulBolaklari = pulQiymat ? summaniAjratish(pulQiymat) : null;
  return (
    <div className="group flex min-w-0 items-start gap-3.5 rounded-2xl border border-slate-200/70 bg-white p-4 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
      <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg ${tile}`}>
        <Icon size={20} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-500">{nom}</p>
        <p className={`mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-extrabold leading-tight tracking-tight tabular-nums ${manfiy ? "text-rose-600" : "text-slate-950"}`}>
          {pulBolaklari ? (
            <>
              <span>{pulBolaklari.raqam}</span>
              {pulBolaklari.birlik && <span className="text-sm font-semibold tracking-normal text-slate-500">{pulBolaklari.birlik}</span>}
            </>
          ) : (
            qiymat
          )}
        </p>
        <p className={`mt-1 text-xs font-medium leading-4 ${diqqat ? "text-amber-700" : "text-slate-500"}`}>{izoh}</p>
      </div>
    </div>
  );
}
