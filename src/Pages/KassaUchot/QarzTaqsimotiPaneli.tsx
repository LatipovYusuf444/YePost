import { useEffect, useState } from "react";
import { ListOrdered, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cashOperationsApi } from "@/api/cashOperationsApi";
import { mijozQarzlariniOlish } from "@/api/mijozQarzlariApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { qisqaHujjatRaqami, taqsimotValyutasi } from "@/lib/qarzTaqsimoti";
import type { MijozQarzQatori, QarzTaqsimoti } from "@/types/qarzTaqsimoti";
import TaqsimotQatorlari from "./TaqsimotQatorlari";
import { kassaSummasi, sanaFormat } from "./yordamchilar";

type Props = {
  customerId: string;
  /** Kiritilgan summa (to'lov valyutasida); 0 bo'lsa oldindan ko'rish so'ralmaydi. */
  amount: number;
  currency: "UZS" | "USD";
  rate?: number;
  /** Birinchi yopiladigan savdo (ixtiyoriy); bo'sh — eng eski qarzdan boshlanadi. */
  saleId: string;
  onSaleIdChange: (saleId: string) => void;
  /** Oldindan ko'rish so'rovi kiritish to'xtagach shuncha ms dan keyin yuboriladi. */
  kechikishMs?: number;
};

// "Mijoz hisobini to'ldirish": mijozning ochiq qarzlari (eng eskisi birinchi) va kiritilgan summa qaysi qarzlarni yopishi
// (POST /finance/cash-operations/allocation-preview — hech narsa saqlanmaydi). Kassir xohlasa birinchi yopiladigan savdoni tanlaydi (`saleId`).
export default function QarzTaqsimotiPaneli({ customerId, amount, currency, rate, saleId, onSaleIdChange, kechikishMs = 400 }: Props) {
  const { t } = useTranslation("kassa_uchot");
  const [qarzlar, setQarzlar] = useState<MijozQarzQatori[] | null>(null);
  const [qarzXatosi, setQarzXatosi] = useState("");
  const [korish, setKorish] = useState<QarzTaqsimoti | null>(null);
  const [korishYuklanmoqda, setKorishYuklanmoqda] = useState(false);

  useEffect(() => {
    let faol = true;
    setQarzlar(null);
    setQarzXatosi("");
    mijozQarzlariniOlish(customerId, true)
      .then((malumot) => { if (faol) setQarzlar(malumot.items); })
      .catch((error) => { if (faol) setQarzXatosi(getApiErrorMessage(error)); });
    return () => { faol = false; };
  }, [customerId]);

  useEffect(() => {
    if (!(amount > 0)) {
      setKorish(null);
      setKorishYuklanmoqda(false);
      return;
    }
    let faol = true;
    setKorishYuklanmoqda(true);
    const timer = window.setTimeout(() => {
      cashOperationsApi
        .taqsimotOldindanKorish({ customerId, amount, currency, ...(rate ? { rate } : {}), ...(saleId ? { saleId } : {}) })
        .then((natija) => { if (faol) setKorish(natija); })
        .catch(() => { if (faol) setKorish(null); })
        .finally(() => { if (faol) setKorishYuklanmoqda(false); });
    }, kechikishMs);
    return () => { faol = false; window.clearTimeout(timer); };
  }, [customerId, amount, currency, rate, saleId, kechikishMs]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" data-testid="qarz-taqsimoti">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <ListOrdered size={15} aria-hidden />
        {t("taqsimot.title")}
      </div>
      {qarzXatosi ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{qarzXatosi}</p>
      ) : qarzlar === null ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={14} className="animate-spin" />{t("taqsimot.loading")}</p>
      ) : qarzlar.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-slate-500">{t("taqsimot.empty")}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-400">{t("taqsimot.orderHint")}</p>
          <ul className="mt-2 space-y-1.5">
            {qarzlar.map((qarz, index) => {
              const tanlangan = saleId === qarz.saleId;
              return (
                <li key={qarz.saleId}>
                  <button
                    type="button"
                    aria-pressed={tanlangan}
                    onClick={() => onSaleIdChange(tanlangan ? "" : qarz.saleId)}
                    className={`flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-left text-sm ring-1 transition ${
                      tanlangan ? "bg-orange-50 ring-orange-300" : "bg-white ring-slate-100 hover:ring-orange-200"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-bold text-slate-800">
                        {index + 1}. {qarz.isOpeningDebt ? t("taqsimot.openingDebt") : t("taqsimot.sale")} {qisqaHujjatRaqami(qarz.docNumber)}
                      </span>
                      {qarz.date && <span className="ml-2 text-xs text-slate-400">{sanaFormat(qarz.date)}</span>}
                      {tanlangan && <span className="ml-2 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">{t("taqsimot.first")}</span>}
                    </span>
                    <span className="font-black tabular-nums text-red-600">{kassaSummasi(Number(qarz.debtAmount), taqsimotValyutasi(qarz.currency))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-400">{t("taqsimot.firstHint")}</p>
        </>
      )}
      {amount > 0 && qarzlar !== null && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t("taqsimot.previewTitle")}</p>
          {korishYuklanmoqda ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={14} className="animate-spin" />{t("taqsimot.loading")}</p>
          ) : korish ? (
            <div className="mt-2"><TaqsimotQatorlari taqsimot={korish} tolovValyutasi={currency} /></div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">{t("taqsimot.previewUnavailable")}</p>
          )}
        </div>
      )}
    </div>
  );
}
