import { useEffect, useState } from "react";
import { LoaderCircle, Package, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";
import { stockBalanceReportAll, type StockBalanceItem } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { StockQuantity } from "@/Components/common/NegativeStockBadge";

export default function ProductStockSummary({ productId }: { productId: string }) {
  const { t } = useTranslation("common");
  const [state, setState] = useState<{ id: string; rows: StockBalanceItem[]; error: string } | null>(null);
  useEffect(() => {
    let active = true;
    stockBalanceReportAll({ productIds: productId, groupByWarehouse: true, balanceStatus: "ALL" }, 500, { xatoniYashirish: true })
      .then((rows) => { if (active) setState({ id: productId, rows, error: "" }); })
      .catch((error) => { if (active) setState({ id: productId, rows: [], error: getApiErrorMessage(error) }); });
    return () => { active = false; };
  }, [productId]);
  const current = state?.id === productId ? state : null;
  return <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><Package size={16} />{t("negativeStock.productStock")}</h3>
    {!current ? <LoaderCircle size={18} className="animate-spin text-slate-400" /> : current.error ? <p role="alert" className="text-xs text-red-600">{current.error}</p> : current.rows.length === 0 ? <p className="text-xs text-slate-500">{t("negativeStock.noStock")}</p> : <div className="max-h-52 space-y-2 overflow-y-auto">
      {current.rows.map((row, index) => <div key={`${row.warehouseId}:${row.modificationId}:${index}`} className="flex items-center justify-between gap-4 rounded-xl bg-white px-3 py-2.5 text-xs">
        <span className="min-w-0"><span className="block truncate font-semibold text-slate-700">{row.modificationName || row.productName}</span><span className="mt-1 flex items-center gap-1 text-slate-400"><Warehouse size={12} />{row.warehouseName || "—"}</span></span>
        <span className="shrink-0 font-semibold text-slate-700"><StockQuantity value={row.quantity} /> {row.unitName}</span>
      </div>)}
    </div>}
  </section>;
}
