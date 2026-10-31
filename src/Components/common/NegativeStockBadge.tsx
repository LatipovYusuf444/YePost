import { useTranslation } from "react-i18next";
import { stockQuantity } from "@/lib/negativeStock";

export function StockQuantity({ value, className = "" }: { value: unknown; className?: string }) {
  return <span className={`tabular-nums ${Number(value) < 0 ? "!text-red-600 font-bold" : ""} ${className}`}>{stockQuantity(value)}</span>;
}

export default function NegativeStockBadge({ wentNegative, costEstimated }: { wentNegative?: boolean; costEstimated?: boolean }) {
  const { t } = useTranslation("common");
  if (!wentNegative && !costEstimated) return null;
  return <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
    {wentNegative && <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700" title={t("negativeStock.badgeHint")}>{t("negativeStock.badge")}</span>}
    {costEstimated && <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500" title={t("negativeStock.costHint")}>{t("negativeStock.costEstimated")}</span>}
  </span>;
}
