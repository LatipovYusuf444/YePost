import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  TrendingUp,
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

const themes = {
  sales: {
    color: "#2563eb",
    pale: "#eff6ff",
    icon: TrendingUp,
    key: "salesTrend",
    label: "text-blue-600",
    tint: "from-blue-50/70",
    active: "bg-blue-600",
  },
  income: {
    color: "#059669",
    pale: "#ecfdf5",
    icon: ArrowDownLeft,
    key: "income",
    label: "text-emerald-600",
    tint: "from-emerald-50/80",
    active: "bg-emerald-600",
  },
  expense: {
    color: "#e11d48",
    pale: "#fff1f2",
    icon: ArrowUpRight,
    key: "expense",
    label: "text-rose-600",
    tint: "from-rose-50/70",
    active: "bg-rose-600",
  },
} as const;

function MoneyTooltip({
  active,
  payload,
  label,
  color,
  title,
  format,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Point }>;
  label?: string | number;
  color: string;
  title: string;
  format: (value: number) => string;
}) {
  const { t } = useTranslation("monitoring");
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="min-w-48 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xl shadow-slate-900/10">
      <p className="mb-2 text-xs font-medium text-slate-500">{label}</p>
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {title}
      </p>
      <p className="mt-1 text-base font-bold tabular-nums text-slate-950">
        {format(point.summa)}
      </p>
      {point.kassa !== undefined && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
          <p className="flex justify-between gap-5">
            <span className="text-slate-500">{t("dynamics.cashExpense")}</span>
            <span className="font-semibold text-slate-800">
              {format(point.kassa)}
            </span>
          </p>
          <p className="flex justify-between gap-5">
            <span className="text-slate-500">{t("dynamics.stockExpense")}</span>
            <span className="font-semibold text-slate-800">
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
  const [showAverage, setShowAverage] = useState(true);
  const id = useId().replace(/:/g, "");
  const gradientId = `${id}-${variant}`;
  const { color, pale, icon: Icon, key, label, tint, active } = themes[variant];
  const locale = i18n.resolvedLanguage === "ru" ? "ru-RU" : "uz-UZ";
  const format = (value: number) =>
    `${Math.round(value).toLocaleString(locale)} ${t("dynamics.currency")}`;
  const compact = (value: number) => {
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
  const periodLabel = t(
    `period.${period === "kunlik" ? "daily" : period === "oylik" ? "monthly" : "yearly"}`,
  );
  const axes = {
    x: (
      <XAxis
        dataKey="nom"
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#94a3b8", fontSize: 11 }}
        tickMargin={12}
        minTickGap={28}
        padding={{ left: 12, right: 12 }}
      />
    ),
    y: (
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#94a3b8", fontSize: 11 }}
        tickFormatter={compact}
        width={64}
      />
    ),
    grid: (
      <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e2e8f0" />
    ),
    tooltip: (
      <Tooltip
        content={<MoneyTooltip color={color} title={title} format={format} />}
        cursor={
          variant === "income"
            ? { fill: pale, radius: 8 }
            : { stroke: color, strokeDasharray: "4 4", strokeOpacity: 0.25 }
        }
      />
    ),
  };

  return (
    <section
      aria-label={title}
      className={`min-w-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-br ${tint} via-white to-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.15)]`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/90 ${label} shadow-sm`}
          >
            <Icon size={21} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t(`charts.${key}.subtitle`)}
            </p>
          </div>
        </div>
        <div
          className="flex max-w-full gap-1 rounded-xl border border-slate-200/60 bg-white/80 p-1"
          role="group"
          aria-label={`${title}: ${t("dynamics.grouping")}`}
        >
          {(["kunlik", "oylik", "yillik"] as Period[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={period === item}
              onClick={() => onPeriodChange(item)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${period === item ? `${active} text-white shadow-sm` : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
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
          className="m-5 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700"
        >
          <p className="font-semibold">{t("dynamics.loadError")}</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 px-5 sm:px-6">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {t("dynamics.total")}
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-40 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <p className="mt-1 break-words text-2xl font-bold tracking-tight tabular-nums text-slate-950 sm:text-[28px]">
                  {format(total)}
                </p>
              )}
            </div>
            <div className="text-xs text-slate-400">
              <p>
                {dateFrom} — {dateTo}
              </p>
              <p className="mt-1 text-right font-medium">{periodLabel}</p>
            </div>
          </div>

          <div
            className={`mt-5 grid gap-4 px-3 pb-2 sm:px-5 ${variant === "sales" ? "lg:grid-cols-[minmax(0,1fr)_190px]" : ""}`}
          >
            <div className="min-w-0">
              <div className="h-[260px]" aria-busy={loading}>
                {loading ? (
                  <div
                    className="flex h-full items-end gap-3 rounded-2xl bg-slate-50/60 p-6"
                    aria-label={t("dynamics.loading")}
                  >
                    <div className="h-1/3 flex-1 animate-pulse rounded-t-lg bg-slate-200/50" />
                    <div className="h-2/3 flex-1 animate-pulse rounded-t-lg bg-slate-200/50" />
                    <div className="h-1/2 flex-1 animate-pulse rounded-t-lg bg-slate-200/50" />
                    <div className="h-3/4 flex-1 animate-pulse rounded-t-lg bg-slate-200/50" />
                  </div>
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
                    <p className="mt-2 max-w-72 text-xs leading-5 text-slate-400">
                      {t("dynamics.emptyHint")}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 260 }}>
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
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="#3b82f6"
                              stopOpacity={0.015}
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
                          type="linear"
                          dataKey="summa"
                          stroke={color}
                          strokeWidth={3}
                          fill={`url(#${gradientId})`}
                          isAnimationActive={false}
                          activeDot={{
                            r: 6,
                            fill: color,
                            stroke: "white",
                            strokeWidth: 3,
                          }}
                        />
                        {peak && (
                          <ReferenceDot
                            x={peak.nom}
                            y={peak.summa}
                            r={5}
                            fill={color}
                            stroke="white"
                            strokeWidth={3}
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
                          radius={[6, 6, 0, 0]}
                          maxBarSize={42}
                          isAnimationActive={false}
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
                          isAnimationActive={false}
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${active}`} />
                  {t(`dynamics.${variant}Legend`)}
                </span>
                {variant === "sales" && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg py-1">
                    <input
                      type="checkbox"
                      checked={showAverage}
                      onChange={(event) => setShowAverage(event.target.checked)}
                      className="accent-blue-600"
                    />
                    <span>{t("dynamics.averageLine")}</span>
                  </label>
                )}
              </div>
            </div>
            {variant === "sales" && (
              <aside className="grid gap-4 rounded-[20px] bg-slate-950 p-5 text-white sm:grid-cols-3 lg:flex lg:flex-col lg:justify-between">
                <div>
                  <p className="text-xs text-slate-400">{t("dynamics.peak")}</p>
                  <p className="mt-2 break-words text-xl font-semibold tabular-nums">
                    {loading ? "—" : format(peak?.summa ?? 0)}
                  </p>
                  <p className="mt-2 text-xs font-medium text-blue-300">
                    {loading || !hasData ? "—" : peak?.nom}
                  </p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-400">
                    {t("dynamics.average")}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {loading ? "—" : format(average)}
                  </p>
                </div>
                <p className="flex items-center gap-2 text-xs text-slate-400">
                  <Check size={14} className="text-blue-300" />
                  {t("dynamics.activePeriods", {
                    count: loading ? 0 : activePeriods,
                  })}
                </p>
              </aside>
            )}
          </div>

          <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4 text-xs sm:mx-6">
            {variant === "expense" ? (
              <>
                <span className="inline-flex flex-wrap items-center gap-1.5 text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {t("dynamics.cashExpense")}
                  <strong className="font-semibold tabular-nums text-slate-800">
                    {loading
                      ? "—"
                      : format(
                          data.reduce(
                            (sum, point) => sum + (point.kassa ?? 0),
                            0,
                          ),
                        )}
                  </strong>
                </span>
                <span className="inline-flex flex-wrap items-center gap-1.5 text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {t("dynamics.stockExpense")}
                  <strong className="font-semibold tabular-nums text-slate-800">
                    {loading
                      ? "—"
                      : format(
                          data.reduce(
                            (sum, point) => sum + (point.ombor ?? 0),
                            0,
                          ),
                        )}
                  </strong>
                </span>
              </>
            ) : variant === "income" ? (
              <>
                <span className="text-slate-500">
                  {t("dynamics.average")}{" "}
                  <strong className="ml-1 font-semibold tabular-nums text-emerald-700">
                    {loading ? "—" : format(average)}
                  </strong>
                </span>
                <span className="text-slate-500">
                  {t("dynamics.peak")}{" "}
                  <strong className="ml-1 font-semibold text-slate-800">
                    {loading || !hasData
                      ? "—"
                      : `${peak?.nom} · ${format(peak?.summa ?? 0)}`}
                  </strong>
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-400">
                  {t("dynamics.confirmedOnly")}
                </span>
                <span className="font-medium text-blue-600">
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
