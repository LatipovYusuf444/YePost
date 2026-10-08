import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ArrowLeftRight,
  Banknote,
  Coins,
  CreditCard,
  Gauge,
  Globe,
  Landmark,
  LoaderCircle,
  PieChart as PieChartIcon,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { pulMatni } from "@/lib/valyuta";

type Davr = "kunlik" | "oylik" | "yillik";
type Nuqta = { nom: string; summa: number };

const SERIYA_RANGLARI = [
  "var(--theme-chart-series-1)",
  "var(--theme-chart-series-2)",
  "var(--theme-chart-series-3)",
  "var(--theme-chart-series-4)",
  "var(--theme-chart-series-5)",
  "var(--theme-chart-series-6)",
];

const TOLOV_IKONKALARI: Record<string, LucideIcon> = {
  CASH: Banknote,
  CARD: CreditCard,
  BANK: Landmark,
  TRANSFER: ArrowLeftRight,
  ONLINE: Globe,
};

const tooltipUslubi = {
  borderRadius: 16,
  border: "1px solid var(--theme-chart-grid)",
  boxShadow: "0 12px 32px #0f172a15",
  padding: "12px 16px",
};

function useFormat() {
  const { t, i18n } = useTranslation("monitoring");
  const locale = i18n.resolvedLanguage === "ru" ? "ru-RU" : "uz-UZ";
  const number = (qiymat: number) => qiymat.toLocaleString(locale, { maximumFractionDigits: 1 });
  const number2 = (qiymat: number) => qiymat.toLocaleString(locale, { maximumFractionDigits: 2 });
  const foiz = (qiymat: number) => (qiymat > 0 && qiymat < 0.1 ? "<0.1" : number(qiymat));
  const money = (qiymat: number) => pulMatni(qiymat, "UZS", true, t("dynamics.currency"));
  return { t, number, number2, foiz, money };
}

function Yuklanish() {
  const { t } = useTranslation("monitoring");
  return (
    <div role="status" aria-live="polite" className="flex min-h-[300px] flex-1 flex-col items-center justify-center gap-2 text-center text-sm font-semibold text-slate-400">
      <LoaderCircle size={22} className="animate-spin text-blue-500" aria-hidden />
      <span>{t("dynamics.loading")}</span>
    </div>
  );
}

function Xatolik() {
  const { t } = useTranslation("monitoring");
  return (
    <div role="alert" className="flex min-h-[300px] flex-1 items-center justify-center px-4 text-center text-sm font-semibold text-slate-400">
      {t("dynamics.loadError")}
    </div>
  );
}

function BoshHolat({ matn, ikonka: Ikona }: { matn: string; ikonka: LucideIcon }) {
  return (
    <div className="flex min-h-[300px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
      <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
        <Ikona size={20} />
      </span>
      <p className="text-sm font-semibold text-slate-500">{matn}</p>
    </div>
  );
}

function KartaSarlavhasi({
  ikonka: Ikona,
  ikonkaUslubi,
  sarlavha,
  tavsif,
  qorongi = false,
  oxiri,
}: {
  ikonka: LucideIcon;
  ikonkaUslubi: string;
  sarlavha: string;
  tavsif: string;
  qorongi?: boolean;
  oxiri?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg ${ikonkaUslubi}`}>
          <Ikona size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className={`text-base font-bold leading-tight ${qorongi ? "text-white" : "text-slate-950"}`}>{sarlavha}</h2>
          <p className={`mt-1 text-xs leading-4 ${qorongi ? "text-slate-400" : "text-slate-500"}`}>{tavsif}</p>
        </div>
      </div>
      {oxiri}
    </div>
  );
}

function DavrTanlov({ qiymat, onChange }: { qiymat: Davr; onChange: (davr: Davr) => void }) {
  const { t } = useTranslation("monitoring");
  const davrlar: Array<{ id: Davr; nom: string }> = [
    { id: "kunlik", nom: t("period.daily") },
    { id: "oylik", nom: t("period.monthly") },
    { id: "yillik", nom: t("period.yearly") },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100/80 p-1">
      {davrlar.map((davr) => (
        <button
          key={davr.id}
          type="button"
          onClick={() => onChange(davr.id)}
          aria-pressed={qiymat === davr.id}
          className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition-[background-color,box-shadow,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none ${
            qiymat === davr.id ? "bg-blue-600 text-white shadow-md shadow-blue-500/25" : "text-slate-600 hover:bg-white hover:text-slate-900"
          }`}
        >
          {davr.nom}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── Foyda ko'rsatkichi ─────────────────────────

function FoydaMiniKarta({ ikonka: Ikona, nom, qiymat, minus = false }: { ikonka: LucideIcon; nom: string; qiymat: string; minus?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[.04] p-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <Ikona size={13} aria-hidden /> {nom}
      </p>
      <p className={`mt-1.5 text-[15px] font-bold tabular-nums ${minus ? "text-rose-300" : "text-slate-100"}`}>{qiymat}</p>
    </div>
  );
}

export function FoydaKartasi({
  sofFoyda,
  rentabellik,
  yalpiFoyda,
  xarajat,
  yuklanmoqda,
  xato,
}: {
  sofFoyda: number;
  rentabellik: number;
  yalpiFoyda: number | null;
  xarajat: number | null;
  yuklanmoqda?: boolean;
  xato?: string;
}) {
  const { t, number2, money } = useFormat();
  const id = useId().replace(/:/g, "");
  const musbat = sofFoyda >= 0;
  const [boshlanish, tugash] = musbat ? ["#5eead4", "#10b981"] : ["#fda4af", "#f43f5e"];
  const foiz = Math.min(100, Math.abs(rentabellik));
  const Holat = musbat ? TrendingUp : TrendingDown;

  return (
    <section
      aria-label={t("charts.profitGauge.title")}
      className="monitoring-enter relative flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-linear-to-br from-slate-950 via-[#071a33] to-slate-900 p-5 shadow-[0_24px_60px_-28px_rgba(2,6,23,.9)] sm:p-6"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full blur-3xl ${musbat ? "bg-teal-400/20" : "bg-rose-400/20"}`}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <KartaSarlavhasi
          ikonka={Gauge}
          ikonkaUslubi={musbat ? "bg-linear-to-br from-teal-300 to-emerald-500 text-slate-950 shadow-teal-500/30" : "bg-linear-to-br from-rose-300 to-rose-500 text-slate-950 shadow-rose-500/30"}
          sarlavha={t("charts.profitGauge.title")}
          tavsif={t("charts.profitGauge.subtitle")}
          qorongi
          oxiri={
            !yuklanmoqda && !xato ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                  musbat ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25" : "bg-rose-400/10 text-rose-300 ring-rose-400/25"
                }`}
              >
                <Holat size={12} aria-hidden /> {t(musbat ? "visuals.profitState" : "visuals.lossState")}
              </span>
            ) : undefined
          }
        />

        {yuklanmoqda ? (
          <Yuklanish />
        ) : xato ? (
          <Xatolik />
        ) : (
          <div className="mt-4 flex flex-1 flex-col justify-center gap-4">
            <div>
              <svg aria-hidden width="0" height="0" className="absolute">
                <defs>
                  <linearGradient id={`foyda-${id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={boshlanish} />
                    <stop offset="100%" stopColor={tugash} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="relative h-56 sm:h-60" style={{ filter: `drop-shadow(0 0 14px ${musbat ? "rgba(45,212,191,.28)" : "rgba(251,113,133,.28)"})` }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 240 }}>
                  <RadialBarChart data={[{ value: foiz }]} innerRadius="78%" outerRadius="100%" startAngle={180} endAngle={0} cy="85%" barSize={18}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "rgba(148,163,184,.16)" }} fill={`url(#foyda-${id})`} isAnimationActive={false} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-4 text-center">
                  <p className="text-xs font-medium text-slate-400">{t("visuals.margin")}</p>
                  <p className={`mt-1 bg-linear-to-r bg-clip-text text-4xl font-extrabold tabular-nums text-transparent ${musbat ? "from-teal-200 to-emerald-400" : "from-rose-200 to-rose-400"}`}>
                    {number2(rentabellik)}%
                  </p>
                </div>
              </div>
              <div className="flex justify-between px-2 text-[10px] font-medium text-slate-500">
                <span>0%</span>
                <span>{t("visuals.dialScale")}</span>
                <span>100%</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-center">
              <p className="text-xs font-semibold text-slate-400">{t("kpi.netProfit")}</p>
              <p className="mt-1 break-words text-2xl font-extrabold tabular-nums text-white">{money(sofFoyda)}</p>
            </div>

            {yalpiFoyda != null && xarajat != null && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                <FoydaMiniKarta ikonka={Coins} nom={t("kpi.grossProfit")} qiymat={money(yalpiFoyda)} />
                <FoydaMiniKarta ikonka={Receipt} nom={t("kpi.expenses")} qiymat={xarajat > 0 ? `−${money(xarajat)}` : money(0)} minus={xarajat > 0} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ───────────────────────── To'lov turlari bo'yicha taqsimot ─────────────────────────

export function TolovTurlariKartasi({
  items,
  davr,
  onDavrChange,
  yorliq,
  yuklanmoqda,
  xato,
}: {
  items: Nuqta[];
  davr: Davr;
  onDavrChange: (davr: Davr) => void;
  yorliq: string;
  yuklanmoqda?: boolean;
  xato?: string;
}) {
  const { t, foiz, money } = useFormat();
  const jami = items.reduce((yigindi, item) => yigindi + item.summa, 0);
  const nomi = (kod: string) => t(`visuals.payment.${kod}`, { defaultValue: kod });
  const eng = items.reduce<Nuqta | null>((katta, item) => (!katta || item.summa > katta.summa ? item : katta), null);
  const engIndeks = eng ? items.indexOf(eng) : 0;
  const ulush = (summa: number) => (jami > 0 ? (summa / jami) * 100 : 0);
  // Juda kichik bo'lak (<3%) bo'lsa, bo'laklar orasidagi bo'shliq va yumaloq uchlar uni chiziqqa aylantirib yuboradi.
  const mayda = items.some((item) => ulush(item.summa) < 3);

  return (
    <section
      aria-label={t("charts.paymentMethods.title")}
      className="monitoring-enter flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-linear-to-br from-blue-50/50 via-white to-white p-5 shadow-[0_4px_24px_-12px_rgba(15,23,42,.15)] sm:p-6"
    >
      <KartaSarlavhasi
        ikonka={Wallet}
        ikonkaUslubi="bg-linear-to-br from-blue-500 to-indigo-500 text-white shadow-blue-500/30"
        sarlavha={t("charts.paymentMethods.title")}
        tavsif={yorliq ? `${t("charts.paymentMethods.subtitle")} · ${yorliq}` : t("charts.paymentMethods.subtitle")}
      />
      <DavrTanlov qiymat={davr} onChange={onDavrChange} />

      {yuklanmoqda ? (
        <Yuklanish />
      ) : xato ? (
        <Xatolik />
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col">
          <BoshHolat matn={t("noData")} ikonka={PieChartIcon} />
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-4">
          <div className="relative mx-auto h-52 w-full max-w-[280px] shrink-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 280, height: 208 }}>
              <PieChart>
                <Pie
                  data={items}
                  dataKey="summa"
                  nameKey="nom"
                  innerRadius={68}
                  outerRadius={94}
                  paddingAngle={items.length > 1 && !mayda ? 3 : 0}
                  cornerRadius={mayda ? 0 : 7}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {items.map((item, index) => (
                    <Cell key={item.nom} fill={SERIYA_RANGLARI[index % SERIYA_RANGLARI.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(qiymat, nom) => [money(Number(qiymat)), nomi(String(nom))]} contentStyle={tooltipUslubi} />
              </PieChart>
            </ResponsiveContainer>
            {eng && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[28px] font-extrabold leading-none tabular-nums text-slate-950">{foiz(ulush(eng.summa))}%</span>
                <span className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: SERIYA_RANGLARI[engIndeks % SERIYA_RANGLARI.length] }} />
                  {nomi(eng.nom)}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-950 px-4 py-3.5 text-center shadow-lg shadow-slate-900/10">
            <p className="text-xs font-semibold text-slate-400">{t("dynamics.total")}</p>
            <p className="mt-1 break-words text-xl font-extrabold tabular-nums text-white">{money(jami)}</p>
          </div>

          <ul className="grid gap-2.5">
            {items.map((item, index) => {
              const renk = SERIYA_RANGLARI[index % SERIYA_RANGLARI.length];
              const Ikona = TOLOV_IKONKALARI[item.nom.toUpperCase()] ?? Wallet;
              const bulak = ulush(item.summa);
              return (
                <li key={item.nom} className="rounded-2xl border border-slate-100 bg-white/90 p-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `color-mix(in srgb, ${renk} 16%, white)`, color: renk }}
                    >
                      <Ikona size={17} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-600">{nomi(item.nom)}</p>
                      <p className="text-sm font-bold tabular-nums text-slate-950">{money(item.summa)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-600">{foiz(bulak)}%</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(bulak, bulak > 0 ? 1.5 : 0)}%`, background: renk }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── Eng ko'p qarzdor mijozlar ─────────────────────────

const QARZ_RANGLARI = ["#e11d48", "#fb7185", "#fda4af", "#fecdd3", "#ffe4e6", "#fff1f2"];

export function QarzdorlarKartasi({
  items,
  jami,
  soni,
  yuklanmoqda,
  xato,
}: {
  items: Nuqta[];
  jami: number;
  soni: number;
  yuklanmoqda?: boolean;
  xato?: string;
}) {
  const { t, foiz, money } = useFormat();
  const eng = Math.max(1, ...items.map((item) => item.summa));
  // Qarzdor kam bo'lsa ro'yxat karta balandligini to'ldirmaydi — ulush halqasi shu bo'shliqni foydali ma'lumot bilan to'ldiradi.
  const halqaKorinsin = items.length > 0 && items.length <= 3 && jami > 0;
  const engUlush = items.length > 0 && jami > 0 ? (Math.max(...items.map((item) => item.summa)) / jami) * 100 : 0;

  return (
    <section
      aria-label={t("charts.debtors.title")}
      className="monitoring-enter flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-rose-100 bg-linear-to-br from-rose-50 via-white to-white p-5 shadow-[0_4px_24px_-12px_rgba(244,63,94,.18)] sm:p-6"
    >
      <KartaSarlavhasi
        ikonka={Users}
        ikonkaUslubi="bg-linear-to-br from-rose-500 to-pink-500 text-white shadow-rose-500/30"
        sarlavha={t("charts.debtors.title")}
        tavsif={t("charts.debtors.subtitle")}
      />

      {yuklanmoqda ? (
        <Yuklanish />
      ) : xato ? (
        <Xatolik />
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-4">
          <div className="rounded-2xl bg-linear-to-br from-rose-500 to-rose-600 p-4 text-white shadow-lg shadow-rose-500/25">
            <p className="text-xs font-semibold text-rose-100">{t("kpi.totalDebt")}</p>
            <p className="mt-1 break-words text-3xl font-extrabold tabular-nums">{money(jami)}</p>
          </div>

          {halqaKorinsin && (
            <div className="relative mx-auto h-44 w-full max-w-[240px] shrink-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 240, height: 176 }}>
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="summa"
                    nameKey="nom"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={items.length > 1 ? 3 : 0}
                    cornerRadius={items.length > 1 ? 6 : 0}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {items.map((item, index) => (
                      <Cell key={`${item.nom}-${index}`} fill={QARZ_RANGLARI[index % QARZ_RANGLARI.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(qiymat, nom) => [money(Number(qiymat)), String(nom)]} contentStyle={tooltipUslubi} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold leading-none tabular-nums text-slate-950">{foiz(engUlush)}%</span>
                <span className="mt-1.5 text-[11px] font-semibold text-slate-500">{t("charts.debtors.topShare")}</span>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <BoshHolat matn={t("charts.debtors.empty")} ikonka={Users} />
          ) : (
            <ol className="grid gap-2.5">
              {items.map((item, index) => (
                <li key={`${item.nom}-${index}`} className="rounded-2xl border border-rose-100/80 bg-white/90 p-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                        index === 0 ? "bg-linear-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30" : "bg-rose-50 text-rose-500"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-700" title={item.nom}>{item.nom}</p>
                      <p className="text-sm font-bold tabular-nums text-slate-950">{money(item.summa)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold tabular-nums text-rose-600">
                      {foiz(jami > 0 ? (item.summa / jami) * 100 : 0)}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-rose-50">
                    <div className="h-full rounded-full bg-linear-to-r from-rose-300 to-rose-500" style={{ width: `${(item.summa / eng) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-white/80 px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Users size={15} aria-hidden className="text-rose-400" /> {t("charts.debtors.countLabel")}
            </span>
            <span className="text-sm font-extrabold tabular-nums text-slate-950">{t("charts.debtors.countValue", { count: soni })}</span>
          </div>
        </div>
      )}
    </section>
  );
}
