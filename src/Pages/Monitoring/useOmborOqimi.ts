import { useEffect, useState } from "react";
import { warehouseFlowReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { hisobotValyutasiniTekshirish } from "@/Pages/HisobotUchot/hisobotValyutasi";
import { omborOqiminiMoslash, type OmborOqimiGuruhi, type OmborOqimiQatori } from "./omborHarakatOynasi";

type Natija = { kalit: string; qatorlar: OmborOqimiQatori[]; xato: string };

const BOSH: OmborOqimiQatori[] = [];

// GET /reports/warehouse-flow so'rovi. `faol` false bo'lsa so'rov yuborilmaydi. So'rov parametrlari o'zgarganda eski natija
// ko'rsatilmaydi (holat "yuklanmoqda"); xato yoki valyuta mos kelmasa holat "xato" bo'ladi — chaqiruvchi zaxira hisobga o'tadi.
export function useOmborOqimi({
  dateFrom,
  dateTo,
  groupBy,
  warehouseId = "",
  faol,
  yangilanish,
}: {
  dateFrom: string;
  dateTo: string;
  groupBy: OmborOqimiGuruhi;
  warehouseId?: string;
  faol: boolean;
  yangilanish: number;
}) {
  const kalit = `${dateFrom}|${dateTo}|${groupBy}|${warehouseId}|${yangilanish}`;
  const [natija, setNatija] = useState<Natija | null>(null);

  useEffect(() => {
    if (!faol) return;
    let active = true;
    warehouseFlowReportApi
      .olish({ dateFrom, dateTo, groupBy, warehouseIds: warehouseId || undefined })
      .then((javob) => {
        const moslangan = omborOqiminiMoslash(javob, groupBy);
        hisobotValyutasiniTekshirish(moslangan.currency, "UZS");
        if (active) setNatija({ kalit, qatorlar: moslangan.qatorlar, xato: "" });
      })
      .catch((error) => {
        if (active) setNatija({ kalit, qatorlar: BOSH, xato: getApiErrorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, groupBy, warehouseId, faol, kalit]);

  const joriy = faol && natija?.kalit === kalit ? natija : null;
  const holat: "ochiq-emas" | "yuklanmoqda" | "tayyor" | "xato" = !faol
    ? "ochiq-emas"
    : !joriy
      ? "yuklanmoqda"
      : joriy.xato
        ? "xato"
        : "tayyor";
  return { holat, qatorlar: joriy?.qatorlar ?? BOSH, xato: joriy?.xato ?? "" };
}
