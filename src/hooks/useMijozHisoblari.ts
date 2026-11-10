import { useEffect, useState } from "react";
import { counterpartyBalanceReportApi } from "@/api/reportsApi";
import { mijozHisoblariniMoslash, type MijozHisoblari, type MijozHisobHolati } from "@/lib/mijozHisobQoldigi";

export function useMijozHisoblari(yoqilgan = true, customerId?: string) {
  const [hisoblar, setHisoblar] = useState<MijozHisoblari>({});
  const [holat, setHolat] = useState<MijozHisobHolati>("yuklanmoqda");
  const [yangilanish, setYangilanish] = useState(0);
  const yangilash = () => setYangilanish((value) => value + 1);

  useEffect(() => {
    const listener = () => setYangilanish((value) => value + 1);
    window.addEventListener("savdo:yangilandi", listener);
    return () => window.removeEventListener("savdo:yangilandi", listener);
  }, []);

  useEffect(() => {
    if (!yoqilgan) return;
    let faol = true;
    setHolat("yuklanmoqda");
    const params = { counterpartyType: "CUSTOMER" as const, debtStatus: "ALL" as const, customerIds: customerId };
    Promise.all([
      counterpartyBalanceReportApi.barchasi({ ...params, currency: "UZS" }),
      counterpartyBalanceReportApi.barchasi({ ...params, currency: "USD" }),
    ]).then(([uzs, usd]) => {
      const natija = mijozHisoblariniMoslash(uzs, usd);
      if (faol) { setHisoblar(natija); setHolat("tayyor"); }
    }).catch(() => { if (faol) { setHisoblar({}); setHolat("xato"); } });
    return () => { faol = false; };
  }, [yoqilgan, customerId, yangilanish]);

  return { hisoblar, holat, yangilash };
}
