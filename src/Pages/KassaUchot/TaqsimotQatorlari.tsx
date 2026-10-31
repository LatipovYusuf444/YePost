import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  qisqaHujjatRaqami,
  taqsimotQatoriBoshlangichmi,
  taqsimotQatoriRaqami,
  taqsimotQatoriValyutasi,
  taqsimotValyutasi,
  yopilganQatorlar,
} from "@/lib/qarzTaqsimoti";
import type { QarzTaqsimoti } from "@/types/qarzTaqsimoti";
import { kassaSummasi } from "./yordamchilar";

// Mijoz to'lovi qaysi qarzlarni yopgani (yoki yopishi): har qator — savdo raqami, yopilgan qism savdo valyutasida
// (to'lov valyutasi boshqa bo'lsa to'lovdan olingan qism va kurs qavsda), qolgan qarz; oxirida hisobga tushgan qism.
export default function TaqsimotQatorlari({ taqsimot, tolovValyutasi }: { taqsimot: QarzTaqsimoti; tolovValyutasi?: "UZS" | "USD" }) {
  const { t } = useTranslation("kassa_uchot");
  const yopilgan = new Set(yopilganQatorlar(taqsimot).map((qator) => qator.saleId));
  const hisobga = Number(taqsimot.toAccount ?? 0);
  return (
    <ul className="space-y-1.5" data-testid="taqsimot-qatorlari">
      {taqsimot.allocated.map((qator) => {
        const valyuta = taqsimotQatoriValyutasi(qator);
        const yopiq = yopilgan.has(qator.saleId);
        const kurs = Number(qator.rate ?? 0);
        const qoldiq = Number(qator.debtRemaining ?? 0);
        return (
          <li key={qator.saleId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-100">
            <span className="min-w-0 font-bold text-slate-800">
              {taqsimotQatoriBoshlangichmi(qator) ? t("taqsimot.openingDebt") : t("taqsimot.sale")} {qisqaHujjatRaqami(taqsimotQatoriRaqami(qator))}
              <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase ${yopiq ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {yopiq ? t("taqsimot.closed") : t("taqsimot.partial")}
              </span>
            </span>
            <span className="text-right font-black tabular-nums text-slate-900">
              {kassaSummasi(Number(qator.settledAmount ?? qator.amount), valyuta)}
              {tolovValyutasi && tolovValyutasi !== valyuta && (
                <span className="ml-1.5 text-xs font-semibold text-slate-400">
                  ({kassaSummasi(Number(qator.amount), tolovValyutasi)}
                  {kurs > 0 ? `, ${t("taqsimot.rate", { kurs: kurs.toLocaleString("uz-UZ") })}` : ""})
                </span>
              )}
              {!yopiq && qoldiq > 0 && <span className="ml-1.5 text-xs font-semibold text-amber-700">{t("taqsimot.remaining", { summa: kassaSummasi(qoldiq, valyuta) })}</span>}
            </span>
          </li>
        );
      })}
      {(hisobga > 0 || taqsimot.allocated.length === 0) && (
        <li className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 ring-1 ring-sky-100">
          <Wallet size={15} aria-hidden />
          {t("taqsimot.toAccount", { summa: kassaSummasi(hisobga, taqsimotValyutasi(taqsimot.accountCurrency)) })}
        </li>
      )}
    </ul>
  );
}
