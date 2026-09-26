import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

type Point = { nom: string; summa: number };
const COLORS = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#38bdf8",
  "#a78bfa",
];
const tooltipStyle = {
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 32px #0f172a15",
  padding: "12px 16px",
};

function useFormat() {
  const { t, i18n } = useTranslation("monitoring");
  const locale = i18n.resolvedLanguage === "ru" ? "ru-RU" : "uz-UZ";
  const number = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const money = (value: number) =>
    `${Math.round(value).toLocaleString(locale)} ${t("dynamics.currency")}`;
  const compact = (value: number) => {
    const n = Math.abs(value);
    if (n >= 1_000_000)
      return `${number(n / 1_000_000)} ${t("dynamics.million")}`;
    if (n >= 1_000) return `${number(n / 1_000)} ${t("dynamics.thousand")}`;
    return number(n);
  };
  return { t, number, money, compact };
}

export function ProfitDial({
  profit,
  margin,
}: {
  profit: number;
  margin: number;
}) {
  const { t, money, number } = useFormat();
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="relative h-52">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 300, height: 208 }}
        >
          <RadialBarChart
            data={[{ value: Math.min(100, Math.abs(margin)) }]}
            innerRadius="80%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            cy="85%"
            barSize={18}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={12}
              background={{ fill: "#334155" }}
              fill={profit >= 0 ? "#2dd4bf" : "#fb7185"}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-5 text-center">
          <p className="text-xs text-slate-400">{t("visuals.margin")}</p>
          <p
            className={`mt-1 text-4xl font-bold tabular-nums ${margin >= 0 ? "text-teal-300" : "text-rose-300"}`}
          >
            {number(margin)}%
          </p>
        </div>
      </div>
      <div className="flex justify-between px-4 text-[10px] text-slate-500">
        <span>0%</span>
        <span>{t("visuals.dialScale")}</span>
        <span>100%</span>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-xs text-slate-400">{t("kpi.netProfit")}</p>
        <p className="mt-1 break-words text-xl font-semibold tabular-nums text-white">
          {money(profit)}
        </p>
      </div>
    </div>
  );
}

export function PaymentRing({ items }: { items: Point[] }) {
  const { t, money, number } = useFormat();
  const total = items.reduce((sum, item) => sum + item.summa, 0);
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <div className="relative h-48 shrink-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 300, height: 192 }}
        >
          <PieChart>
            <Pie
              data={items}
              dataKey="summa"
              nameKey="nom"
              innerRadius={62}
              outerRadius={86}
              paddingAngle={items.length > 1 ? 4 : 0}
              cornerRadius={6}
              stroke="none"
              isAnimationActive={false}
            >
              {items.map((item, index) => (
                <Cell key={item.nom} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                money(Number(value)),
                t("charts.paymentMethods.title"),
              ]}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold text-slate-900">
            {items.length}
          </span>
          <span className="mt-1 text-xs text-slate-400">
            {t("visuals.paymentTypes")}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500">{t("dynamics.total")}</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">
          {money(total)}
        </p>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.nom}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white/70 px-3 py-2.5 text-xs"
          >
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              {t(`visuals.payment.${item.nom}`, { defaultValue: item.nom })}
            </span>
            <span className="font-semibold text-slate-900">
              {money(item.summa)}{" "}
              <span className="ml-1 text-slate-400">
                {number(total ? (item.summa / total) * 100 : 0)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreeTile({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = "",
  index = 0,
  depth = 0,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  index?: number;
  depth?: number;
}) {
  if (!depth) return null;
  return (
    <g>
      <rect
        x={x + 3}
        y={y + 3}
        width={Math.max(0, width - 6)}
        height={Math.max(0, height - 6)}
        fill={COLORS[index % COLORS.length]}
        rx={12}
      />
      {width > 80 && height > 40 && (
        <text x={x + 15} y={y + 25} fill="white" fontSize={12} fontWeight={600}>
          {name.length > Math.floor(width / 8)
            ? `${name.slice(0, Math.max(3, Math.floor(width / 8) - 3))}…`
            : name}
        </text>
      )}
    </g>
  );
}

export function WarehouseTree({ items }: { items: Point[] }) {
  const { money } = useFormat();
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      initialDimension={{ width: 400, height: 260 }}
    >
      <Treemap
        data={items
          .filter((item) => item.summa > 0)
          .map((item) => ({ name: item.nom, value: item.summa }))}
        dataKey="value"
        nameKey="name"
        content={<TreeTile />}
        isAnimationActive={false}
      >
        <Tooltip
          formatter={(value) => money(Number(value))}
          contentStyle={tooltipStyle}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

export function WarehouseFlow({
  items,
}: {
  items: Array<{ nom: string; kirim: number; chiqim: number }>;
}) {
  const { t, money, compact } = useFormat();
  const values = items.map((item) => ({ ...item, chiqim: -item.chiqim }));
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3">
          <p className="text-xs text-emerald-600">
            {t("charts.warehouseFlow.income")}
          </p>
          <p className="mt-1 break-words text-lg font-semibold text-emerald-800">
            {money(items.reduce((sum, item) => sum + item.kirim, 0))}
          </p>
        </div>
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-xs text-rose-600">
            {t("charts.warehouseFlow.expense")}
          </p>
          <p className="mt-1 break-words text-lg font-semibold text-rose-800">
            {money(items.reduce((sum, item) => sum + item.chiqim, 0))}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 500, height: 240 }}
        >
          <BarChart
            data={values}
            layout="vertical"
            stackOffset="sign"
            margin={{ right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="#e2e8f0"
              strokeDasharray="3 6"
            />
            <XAxis
              type="number"
              tickFormatter={compact}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <YAxis
              type="category"
              dataKey="nom"
              width={95}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Tooltip
              formatter={(value, key) => [
                money(Math.abs(Number(value))),
                key === "kirim"
                  ? t("charts.warehouseFlow.income")
                  : t("charts.warehouseFlow.expense"),
              ]}
              cursor={{ fill: "#f0fdfa" }}
              contentStyle={tooltipStyle}
            />
            <Legend
              formatter={(key) =>
                key === "kirim"
                  ? t("charts.warehouseFlow.income")
                  : t("charts.warehouseFlow.expense")
              }
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar
              dataKey="chiqim"
              stackId="flow"
              fill="#fb7185"
              radius={[6, 0, 0, 6]}
              maxBarSize={26}
              isAnimationActive={false}
            />
            <Bar
              dataKey="kirim"
              stackId="flow"
              fill="#14b8a6"
              radius={[0, 6, 6, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WarehouseTimeline({
  items,
  kind,
}: {
  items: Point[];
  kind: "income" | "expense";
}) {
  const { t, money, compact } = useFormat();
  const id = useId().replace(/:/g, "");
  const tooltip = (
    <Tooltip
      formatter={(value) => [
        money(Number(value)),
        t(`charts.warehouseDetail.${kind}`),
      ]}
      contentStyle={tooltipStyle}
    />
  );
  const x = (
    <XAxis
      dataKey="nom"
      axisLine={false}
      tickLine={false}
      minTickGap={24}
      tick={{ fontSize: 10, fill: "#94a3b8" }}
    />
  );
  const y = (
    <YAxis
      width={50}
      tickFormatter={compact}
      axisLine={false}
      tickLine={false}
      tick={{ fontSize: 10, fill: "#94a3b8" }}
    />
  );
  return (
    <div className="flex h-full flex-col">
      <p
        className={`mb-3 text-xl font-bold tabular-nums ${kind === "income" ? "text-cyan-700" : "text-rose-600"}`}
      >
        {money(items.reduce((sum, item) => sum + item.summa, 0))}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 400, height: 220 }}
        >
          {kind === "income" ? (
            <AreaChart data={items} margin={{ top: 8, right: 12, bottom: 8 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#cffafe"
                strokeDasharray="3 6"
              />
              {x}
              {y}
              {tooltip}
              <Area
                type="stepAfter"
                dataKey="summa"
                stroke="#0891b2"
                fill={`url(#${id})`}
                strokeWidth={2.5}
                isAnimationActive={false}
                dot={items.length === 1 ? { r: 5 } : false}
              />
            </AreaChart>
          ) : (
            <LineChart data={items} margin={{ top: 8, right: 12, bottom: 8 }}>
              <CartesianGrid
                vertical={false}
                stroke="#ffe4e6"
                strokeDasharray="3 6"
              />
              {x}
              {y}
              {tooltip}
              {items
                .filter((item) => item.summa !== 0)
                .map((item) => (
                  <ReferenceLine
                    key={item.nom}
                    segment={[
                      { x: item.nom, y: 0 },
                      { x: item.nom, y: item.summa },
                    ]}
                    stroke="#fda4af"
                    strokeWidth={3}
                  />
                ))}
              <Line
                dataKey="summa"
                stroke="transparent"
                isAnimationActive={false}
                dot={(props) =>
                  props.payload.summa !== 0 ? (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill="#e11d48"
                      stroke="white"
                      strokeWidth={2}
                    />
                  ) : (
                    <g key={props.index} />
                  )
                }
                activeDot={{ r: 7, fill: "#e11d48" }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type ShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Point;
};
function RankMark({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  kind,
}: { kind: "top" | "bottom" } & ShapeProps) {
  const cy = y + height / 2;
  if (!payload?.summa) return <g />;
  return (
    <g>
      {kind === "top" && (
        <line
          x1={x}
          y1={cy}
          x2={x + width}
          y2={cy}
          stroke="#fbbf24"
          strokeWidth={4}
          strokeLinecap="round"
        />
      )}
      <circle
        cx={x + width}
        cy={cy}
        r={kind === "top" ? 7 : 6}
        fill={kind === "top" ? "#f59e0b" : "#8b5cf6"}
        stroke="white"
        strokeWidth={2}
      />
    </g>
  );
}

export function ProductRanking({
  items,
  kind,
}: {
  items: Point[];
  kind: "top" | "bottom";
}) {
  const { t, number } = useFormat();
  return (
    <div className="flex h-full flex-col">
      <p className="mb-4 text-xs text-slate-400">
        {t(kind === "top" ? "visuals.topHint" : "visuals.bottomHint")}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 400, height: 320 }}
        >
          <BarChart
            data={items}
            layout="vertical"
            margin={{ left: 0, right: 20, bottom: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="#e2e8f0"
              strokeDasharray="3 6"
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <YAxis
              type="category"
              dataKey="nom"
              width={105}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              formatter={(value) => [
                `${number(Number(value))} ${t("units")}`,
                t("charts.warehouseDetail.quantity"),
              ]}
              cursor={{ fill: kind === "top" ? "#fffbeb" : "#f5f3ff" }}
              contentStyle={tooltipStyle}
            />
            <Bar
              dataKey="summa"
              maxBarSize={30}
              isAnimationActive={false}
              shape={<RankMark kind={kind} />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StockQuantityTiles({
  items,
}: {
  items: Array<{ id: string; name: string; quantity: number; value: number }>;
}) {
  const { t, number, money } = useFormat();
  const max = Math.max(1, ...items.map((item) => item.quantity));
  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-slate-800">
        {t("visuals.stockComposition")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4"
          >
            <p
              title={item.name}
              className="truncate text-xs font-medium text-slate-600"
            >
              {item.name}
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums text-indigo-700">
              {number(item.quantity)}{" "}
              <span className="text-xs font-medium text-indigo-400">
                {t("units")}
              </span>
            </p>
            <div className="mt-3 flex gap-1" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <span
                  key={index}
                  className={`h-3 flex-1 rounded-sm ${index < Math.round((item.quantity / max) * 12) ? "bg-indigo-400" : "bg-indigo-100"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium tabular-nums text-slate-500">
              {money(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
