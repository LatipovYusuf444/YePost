import { useEffect, useState } from "react";
import { warehouseFlowReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { korsatiladiganValyuta, useValyutaStore, type Valyuta } from "@/lib/valyuta";
import { hisobotValyutasiniTekshirish } from "@/Pages/HisobotUchot/hisobotValyutasi";
import { omborOqiminiMoslash, type OmborOqimiGuruhi, type OmborOqimiQatori } from "./omborHarakatOynasi";

type Natija = { kalit: string; qatorlar: OmborOqimiQatori[]; xato: string };

const BOSH: OmborOqimiQatori[] = [];

// GET /reports/warehouse-flow so'rovi. `faol` false bo'lsa so'rov yuborilmaydi. So'rov parametrlari o'zgarganda eski natija
// ko'rsatilmaydi (holat "yuklanmoqda"); xato yoki valyuta mos kelmasa holat "xato" bo'ladi — chaqiruvchi zaxira hisobga o'tadi.
// Summalar korsatiladiganValyuta() da so'raladi (bir valyutali rejimda — rejim valyutasi) va server shu valyutada hisoblaydi;
// qaytarilgan `valyuta` — qatorlar summasining valyutasi, grafiklar ularni o'girmasdan shu valyutada formatlaydi.
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
  // Rejim, kurs yoki hisobot valyutasi o'zgarsa qayta chiziladi va (kalit o'zgargani uchun) qayta so'raladi.
  const valyuta: Valyuta = useValyutaStore(() => korsatiladiganValyuta());
  const kalit = `${dateFrom}|${dateTo}|${groupBy}|${warehouseId}|${valyuta}|${yangilanish}`;
  const [natija, setNatija] = useState<Natija | null>(null);

  useEffect(() => {
    if (!faol) return;
    let active = true;
    warehouseFlowReportApi
      .olish({ dateFrom, dateTo, groupBy, warehouseIds: warehouseId || undefined, currency: valyuta })
      .then((javob) => {
        const moslangan = omborOqiminiMoslash(javob, groupBy);
        hisobotValyutasiniTekshirish(moslangan.currency, valyuta);
        if (active) setNatija({ kalit, qatorlar: moslangan.qatorlar, xato: "" });
      })
      .catch((error) => {
        if (active) setNatija({ kalit, qatorlar: BOSH, xato: getApiErrorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, groupBy, warehouseId, valyuta, faol, kalit]);

  const joriy = faol && natija?.kalit === kalit ? natija : null;
  const holat: "ochiq-emas" | "yuklanmoqda" | "tayyor" | "xato" = !faol
    ? "ochiq-emas"
    : !joriy
      ? "yuklanmoqda"
      : joriy.xato
        ? "xato"
        : "tayyor";
  return { holat, qatorlar: joriy?.qatorlar ?? BOSH, xato: joriy?.xato ?? "", valyuta };
}
