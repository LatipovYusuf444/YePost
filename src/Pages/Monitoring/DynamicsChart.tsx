import { pulMatni, summaniOgirish } from "@/lib/valyuta";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  CalendarRange,
  Info,
  Trophy,
  TrendingUp,
  Gauge,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sanaMatni, summaniAjratish } from "./summaMatni";
import InlineLoading from "@/Components/common/InlineLoading";
import LoadingState from "@/Components/common/LoadingState";

type Point = { nom: string; summa: number; kassa?: number; ombor?: number };
type Variant = "sales" | "income" | "expense";
type Period = "kunlik" | "oylik" | "yillik";

type Props = {
  variant: Variant;
  data: Point[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  loading: boolean;
  error?: string;
  dateFrom: string;
  dateTo: string;
};

// Savdo chizig'i ilova temasining asosiy rangiga bog'langan (ko'k / yashil / binafsha temalarda o'zi o'zgaradi).
const SALES_LINE = "var(--theme-primary, #2563EB)";
const AXIS_TEXT = "#64748b";

// Har bir variant uchun to'liq (literal) klasslar: ikonka plitkasi, orqa fon nuri, faol tugma, almashtirgich rangi.
const themes = {
  sales: {
    color: SALES_LINE,
    pale: "var(--theme-primary-faint, #EFF6FF)",
    icon: TrendingUp,
    key: "salesTrend",
    totalKey: "totalSales",
    tile: "from-blue-500 to-indigo-500 shadow-blue-500/30",
    glow: "from-blue-200/70 to-transparent",
    label: "text-blue-600",
    active: "bg-blue-600 shadow-blue-600/25",
    toggle: "bg-blue-600",
  },
  income: {
    color: "#059669",
    pale: "#ecfdf5",
    icon: ArrowDownLeft,
    key: "income",
    totalKey: "totalIncome",
    tile: "from-emerald-500 to-teal-500 shadow-emerald-500/30",
    glow: "from-emerald-200/70 to-transparent",
    label: "text-emerald-600",
    active: "bg-emerald-600 shadow-emerald-600/25",
    toggle: "bg-emerald-600",
  },
  expense: {
    color: "#e11d48",
    pale: "#fff1f2",
    icon: ArrowUpRight,
    key: "expense",
    totalKey: "totalExpense",
    tile: "from-rose-500 to-amber-500 shadow-rose-500/30",
    glow: "from-rose-200/70 to-transparent",
    label: "text-rose-600",
    active: "bg-rose-600 shadow-rose-600/25",
    toggle: "bg-rose-600",
  },
} as const;

function MoneyTooltip({
  active,
  payload,
  label,
  color,
  title,
  format,
  items,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Point }>;
  label?: string | number;
  color: string;
  title: string;
  format: (value: number) => string;
  items: Point[];
}) {
  const { t } = useTranslation("monitoring");
  const point = items.find((item) => item.nom === String(label)) ?? payload?.[0]?.payload;
  if (!active || !point) return null;
  const { raqam, birlik } = summaniAjratish(format(point.summa));
  return (
    <div className="min-w-52 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur">
      <p className="mb-2 text-xs font-semibold tabular-nums text-slate-500">{label}</p>
      <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: color }} />
        {title}
      </p>
      <p className="mt-1.5 flex items-baseline gap-1.5 text-lg font-extrabold tabular-nums tracking-tight text-slate-950">
        {raqam}
        {birlik && <span className="text-xs font-semibold tracking-normal text-slate-500">{birlik}</span>}
      </p>
      {point.kassa !== undefined && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
          <p className="flex justify-between gap-5">
            <span className="text-slate-500">{t("dynamics.cashExpense")}</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {format(point.kassa)}
            </span>
          </p>
          <p className="flex justify-between gap-5">
            <span className="text-slate-500">{t("dynamics.stockExpense")}</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {format(point.ombor ?? 0)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function DynamicsChart({
  variant,
  data,
  period,
  onPeriodChange,
  loading,
  error,
  dateFrom,
  dateTo,
}: Props) {
  const { t, i18n } = useTranslation("monitoring");
  const [showAverage, setShowAverage] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const id = useId().replace(/:/g, "");
  const gradientId = `${id}-${variant}`;
  const { color, pale, icon: Icon, key, totalKey, tile, glow, label, active, toggle } = themes[variant];
  const locale = i18n.resolvedLanguage === "ru" ? "ru-RU" : "uz-UZ";
  const format = (value: number) => pulMatni(value, "UZS", true, t("dynamics.currency"));
  const compact = (qiymat: number) => {
    const value = summaniOgirish(qiymat);
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000)
      return `${Number((value / 1_000_000_000).toFixed(1))} ${t("dynamics.billion")}`;
    if (abs >= 1_000_000)
      return `${Number((value / 1_000_000).toFixed(1))} ${t("dynamics.million")}`;
    if (abs >= 1_000)
      return `${Number((value / 1_000).toFixed(1))} ${t("dynamics.thousand")}`;
    return value.toLocaleString(locale);
  };
  const total = data.reduce((sum, point) => sum + point.summa, 0);
  const average = data.length ? total / data.length : 0;
  const peak = data.reduce<Point | undefined>(
    (best, point) => (!best || point.summa > best.summa ? point : best),
    undefined,
  );
  const activePeriods = data.filter((point) => point.summa !== 0).length;
  const hasData = activePeriods > 0;
  const title = t(`charts.${key}.title`);
  // Kunlik / Oylik / Yillik tanloviga qarab "kuniga", "oyiga", "yiliga" kabi aniq so'zlar tanlanadi.
  const periodKey = period === "kunlik" ? "Daily" : period === "oylik" ? "Monthly" : "Yearly";
  const bestLabel = t(`dynamics.best${periodKey}`);
  const averageLabel = t(`dynamics.avg${periodKey}`);
  const totalMoney = summaniAjratish(format(total));
  const peakMoney = summaniAjratish(format(peak?.summa ?? 0));
  const axes = {
    x: (
      <XAxis
        dataKey="nom"
        axisLine={false}
        tickLine={false}
        tick={{ fill: AXIS_TEXT, fontSize: 12 }}
        tickMargin={12}
        minTickGap={28}
        padding={{ left: 12, right: 12 }}
      />
    ),
    y: (
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: AXIS_TEXT, fontSize: 12 }}
        tickFormatter={compact}
        width={78}
      />
    ),
    grid: (
      <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--theme-chart-grid)" />
    ),
    tooltip: (
      <Tooltip
        content={<MoneyTooltip color={color} title={title} format={format} items={data} />}
        cursor={
          variant === "income"
            ? { fill: pale, radius: 8 }
            : { stroke: color, strokeDasharray: "4 4", strokeOpacity: 0.35 }
        }
      />
    ),
  };

  return (
    <section
      aria-label={title}
      className="monitoring-enter relative min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-linear-to-br ${glow} blur-3xl`}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg ${tile}`}
          >
            <Icon size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              {t(`charts.${key}.subtitle`)}
            </p>
          </div>
        </div>
        <div
          className="flex max-w-full gap-1 rounded-2xl bg-slate-100/80 p-1"
          role="group"
          aria-label={`${title}: ${t("dynamics.grouping")}`}
        >
          {(["kunlik", "oylik", "yillik"] as Period[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={period === item}
              onClick={() => onPeriodChange(item)}
              className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${period === item ? `${active} text-white shadow-md` : "text-slate-600 hover:bg-white hover:text-slate-950"}`}
            >
              {t(
                `period.${item === "kunlik" ? "daily" : item === "oylik" ? "monthly" : "yearly"}`,
              )}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="relative m-5 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700"
        >
          <p className="font-semibold">{t("dynamics.loadError")}</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <>
          <div className="relative mt-5 flex flex-wrap items-end justify-between gap-4 px-5 sm:px-6">
            <div>
              <p className="text-[13px] font-medium text-slate-500">
                {t(`dynamics.${totalKey}`)}
              </p>
              {loading ? (
                <InlineLoading matn={t("dynamics.loading")} ikonka={<Icon size={14} />} className="mt-1.5" />
              ) : (
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-3xl font-extrabold leading-tight tracking-tight tabular-nums text-slate-950 sm:text-[34px]">
                  <span>{totalMoney.raqam}</span>
                  {totalMoney.birlik && (
                    <span className="text-base font-semibold tracking-normal text-slate-500">
                      {totalMoney.birlik}
                    </span>
                  )}
                </p>
              )}
            </div>
            <span
              title={t("dynamics.rangeHint")}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold tabular-nums text-slate-600"
            >
              <CalendarRange size={14} aria-hidden />
              {sanaMatni(dateFrom)} — {sanaMatni(dateTo)}
            </span>
          </div>

          <div
            className={`relative mt-5 grid gap-4 px-3 pb-2 sm:px-5 ${variant === "sales" ? "lg:grid-cols-[minmax(0,1fr)_220px]" : ""}`}
          >
            <div className="min-w-0">
              <div className="h-70" aria-busy={loading}>
                {loading ? (
                  <LoadingState
                    matn={t("dynamics.loading")}
                    ikonka={<Icon size={22} />}
                    className="h-full min-h-0 rounded-2xl border-slate-200 bg-slate-50/60 bg-none py-0"
                  />
                ) : !hasData ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-5 text-center">
                    <span
                      className={`mb-3 rounded-2xl p-3 ${label}`}
                      style={{ background: pale }}
                    >
                      <BarChart3 size={25} />
                    </span>
                    <p className="text-sm font-semibold text-slate-700">
                      {t("noData")}
                    </p>
                    <p className="mt-2 max-w-72 text-xs leading-5 text-slate-500">
                      {t("dynamics.emptyHint")}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 280 }}>
                    {variant === "sales" ? (
                      <AreaChart
                        data={data}
                        margin={{ top: 20, right: 16, left: 0, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={SALES_LINE}
                              stopOpacity={0.32}
                            />
                            <stop
                              offset="100%"
                              stopColor={SALES_LINE}
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        {axes.grid}
                        {axes.x}
                        {axes.y}
                        {axes.tooltip}
                        {showAverage && (
                          <ReferenceLine
                            y={average}
                            stroke="#94a3b8"
                            strokeDasharray="5 5"
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="summa"
                          stroke={color}
                          strokeWidth={2.5}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          fill={`url(#${gradientId})`}
                          dot={(props) =>
                            props.payload.summa !== 0 ? (
                              <circle
                                key={`${props.index}`}
                                cx={props.cx}
                                cy={props.cy}
                                r={3.5}
                                fill="white"
                                stroke={color}
                                strokeWidth={2}
                              />
                            ) : (
                              <g key={`${props.index}`} />
                            )
                          }
                          isAnimationActive={!reducedMotion}
                          animationDuration={720}
                          animationEasing="ease-out"
                          activeDot={{
                            r: 6,
                            fill: color,
                            stroke: "white",
                            strokeWidth: 3,
                          }}
                        />
                        {peak && peak.summa > 0 && (
                          <ReferenceDot
                            x={peak.nom}
                            y={peak.summa}
                            r={6}
                            fill={color}
                            stroke="white"
                            strokeWidth={3}
                            ifOverflow="visible"
                          />
                        )}
                      </AreaChart>
            ) : variant === "income" ? (
                      <BarChart
                        data={data}
                        margin={{ top: 20, right: 8, left: 0, bottom: 8 }}
                        barCategoryGap="28%"
                      >
                        <defs>
                          <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                        {axes.grid}
                        {axes.x}
                        {axes.y}
                        {axes.tooltip}
                        <Bar
                          dataKey="summa"
                          fill={`url(#${gradientId})`}
                          radius={[8, 8, 0, 0]}
                          maxBarSize={42}
                          isAnimationActive={!reducedMotion}
                          animationDuration={650}
                          animationEasing="ease-out"
                        >
                          {data.map((point, index) => (
                            <Cell
                              key={`${index}-${point.nom}`}
                              fill={
                                point === peak ? color : `url(#${gradientId})`
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <LineChart
                        data={data}
                        margin={{ top: 20, right: 8, left: 0, bottom: 8 }}
                      >
                        {axes.grid}
                        {axes.x}
                        {axes.y}
                        {axes.tooltip}
                        <Line
                          type="stepAfter"
                          dataKey="summa"
                          stroke={color}
                          strokeWidth={2.5}
                          isAnimationActive={!reducedMotion}
                          animationDuration={650}
                          animationEasing="ease-out"
                          dot={(props) =>
                            props.payload.summa !== 0 ? (
                              <circle
                                key={`${props.index}`}
                                cx={props.cx}
                                cy={props.cy}
                                r={4}
                                fill="white"
                                stroke={color}
                                strokeWidth={2}
                              />
                            ) : (
                              <g key={`${props.index}`} />
                            )
                          }
                          activeDot={{
                            r: 6,
                            fill: color,
                            stroke: "white",
                            strokeWidth: 3,
                          }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-slate-500">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${variant === "sales" ? "" : active.split(" ")[0]}`}
                    style={variant === "sales" ? { background: SALES_LINE } : undefined}
                  />
                  {t(`dynamics.${variant}Legend`)}
                </span>
                {variant === "sales" && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showAverage}
                    onClick={() => setShowAverage((current) => !current)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2 font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                  >
                    <span
                      aria-hidden
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${showAverage ? toggle : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${showAverage ? "translate-x-4" : ""}`}
                      />
                    </span>
                    {t("dynamics.averageLine")}
                  </button>
                )}
              </div>
            </div>
            {variant === "sales" && (
              <aside className="relative grid gap-5 overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white sm:grid-cols-3 lg:flex lg:flex-col lg:justify-between">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-500/25 blur-3xl"
                />
                <div className="relative">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                      <Trophy size={13} />
                    </span>
                    {bestLabel}
                  </p>
                  {loading ? (
                    <span aria-hidden className="mt-3 block h-8 w-36 animate-pulse rounded-lg bg-white/15" />
                  ) : (
                    <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-extrabold leading-tight tabular-nums wrap-anywhere">
                      {peakMoney.raqam}
                      {peakMoney.birlik && (
                        <span className="text-sm font-semibold text-slate-400">{peakMoney.birlik}</span>
                      )}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs font-semibold tabular-nums text-sky-300">
                    {loading ? <span aria-hidden className="block h-4 w-16 animate-pulse rounded bg-white/10" /> : !hasData ? "—" : peak?.nom}
                  </p>
                </div>
                <div className="relative border-t border-white/10 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-4">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
                      <Gauge size={13} />
                    </span>
                    {averageLabel}
                  </p>
                  {loading ? (
                    <span aria-hidden className="mt-2 block h-6 w-28 animate-pulse rounded-lg bg-white/15" />
                  ) : (
                    <p className="mt-2 text-base font-bold tabular-nums">{format(average)}</p>
                  )}
                </div>
                <p className="relative flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-medium text-slate-300 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-4">
                  <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                    <CalendarCheck size={13} />
                  </span>
                  {loading ? (
                    <span className="animate-pulse motion-reduce:animate-none">{t("dynamics.loading")}</span>
                  ) : (
                    t(`dynamics.active${periodKey}`, { count: activePeriods })
                  )}
                </p>
              </aside>
            )}
          </div>

          <div className="relative mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4 text-xs sm:mx-6">
            {variant === "expense" ? (
              <span className="inline-flex flex-wrap items-center gap-1.5 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {t("dynamics.cashExpense")}
                <strong className="font-semibold tabular-nums text-slate-800">
                  {loading ? "—" : format(data.reduce((sum, point) => sum + point.summa, 0))}
                </strong>
              </span>
            ) : variant === "income" ? (
              <>
                <span className="text-slate-500">
                  {averageLabel}{" "}
                  <strong className="ml-1 font-semibold tabular-nums text-emerald-700">
                    {loading ? "—" : format(average)}
                  </strong>
                </span>
                <span className="text-slate-500">
                  {bestLabel}{" "}
                  <strong className="ml-1 font-semibold text-slate-800">
                    {loading || !hasData
                      ? "—"
                      : `${peak?.nom} · ${format(peak?.summa ?? 0)}`}
                  </strong>
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Info size={14} aria-hidden />
                  {t("dynamics.confirmedOnly")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  <BadgeCheck size={14} aria-hidden />
                  {t("dynamics.noForecast")}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
