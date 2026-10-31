import { useEffect, useState } from "react";
import { AlertTriangle, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import { mijozQarzlariniOlish } from "@/api/mijozQarzlariApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { qisqaHujjatRaqami, taqsimotSummasi } from "@/lib/qarzTaqsimoti";
import type { MijozQarzQatori, MijozQarzlari } from "@/types/qarzTaqsimoti";
import { sanaFormat } from "./yordamchilar";

// Mijozning ochiq qarzlari (GET /partners/customers/:id/debts) to'lov tartibida: eng eskisi birinchi yopiladi.
// Kassadagi "Mijoz hisobini to'ldirish" va mijoz hisobidagi pul shu tartibda yopadi.
export default function MijozQarzlariTab({ xaridorId }: { xaridorId: string }) {
  const { t } = useTranslation("xaridor_uchot");
  const [malumot, setMalumot] = useState<MijozQarzlari | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [yangilanish, setYangilanish] = useState(0);

  useEffect(() => {
    const yangilash = () => setYangilanish((value) => value + 1);
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => window.removeEventListener("savdo:yangilandi", yangilash);
  }, []);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXatolik("");
    mijozQarzlariniOlish(xaridorId, true)
      .then((javob) => { if (active) setMalumot(javob); })
      .catch((error) => { if (active) setXatolik(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [xaridorId, yangilanish]);

  if (yuklanmoqda) return <div className="px-9 py-7 text-sm font-bold text-slate-500">{t("qarzlarTab.loading")}</div>;
  if (xatolik) return <div className="px-9 py-7 text-sm font-bold text-red-600">{xatolik}</div>;

  const qatorlar = (malumot?.items ?? []).map((qarz) => ({ ...qarz, id: qarz.saleId }));
  const jamilar = Object.entries(malumot?.debtTotals ?? {}).filter(([, summa]) => Number(summa) > 0);
  const hisob = Number(malumot?.accountBalance ?? 0);

  const ustunlar: Ustun<MijozQarzQatori & { id: string }>[] = [
    {
      id: "hujjat",
      nom: t("qarzlarTab.columns.hujjat"),
      kenglik: 200,
      katak: (qarz) => <span className="font-black text-slate-900">{qarz.isOpeningDebt ? t("openingDebt.title") : qisqaHujjatRaqami(qarz.docNumber) || "—"}</span>,
    },
    { id: "sana", nom: t("qarzlarTab.columns.sana"), kenglik: 130, katak: (qarz) => <span className="text-slate-500">{qarz.date ? sanaFormat(qarz.date) : "—"}</span> },
    { id: "jami", nom: t("qarzlarTab.columns.jami"), kenglik: 150, katak: (qarz) => <span className="font-bold text-slate-700">{taqsimotSummasi(qarz.totalAmount, qarz.currency)}</span> },
    { id: "tolangan", nom: t("qarzlarTab.columns.tolangan"), kenglik: 150, katak: (qarz) => <span className="font-bold text-emerald-600">{taqsimotSummasi(qarz.paidAmount, qarz.currency)}</span> },
    { id: "qarz", nom: t("qarzlarTab.columns.qarz"), kenglik: 150, katak: (qarz) => <span className="font-black text-red-600">{taqsimotSummasi(qarz.debtAmount, qarz.currency)}</span> },
    {
      id: "holat",
      nom: t("qarzlarTab.columns.holat"),
      kenglik: 160,
      katak: (qarz) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${qarz.status === "PARTIALLY_PAID" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
          {t(`qarzlarTab.status.${qarz.status ?? "UNPAID"}`, { defaultValue: qarz.status ?? "" })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 px-9 py-7">
      <div className="flex flex-wrap items-center gap-2">
        {jamilar.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">{t("qarzlarTab.noDebt")}</span>
        ) : (
          jamilar.map(([valyuta, summa]) => (
            <span key={valyuta} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-100">
              <AlertTriangle size={13} aria-hidden />
              {t("qarzlarTab.total", { valyuta })}: {taqsimotSummasi(summa, valyuta)}
            </span>
          ))
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
          <Wallet size={13} aria-hidden />
          {t("qarzlarTab.account")}: {taqsimotSummasi(hisob, malumot?.accountCurrency)}
        </span>
      </div>
      <p className="text-xs font-semibold text-slate-400">{t("qarzlarTab.hint")}</p>
      {qatorlar.length === 0 ? (
        <p className="rounded-[26px] border border-dashed border-orange-200 bg-white/60 p-16 text-center font-bold text-slate-400">{t("qarzlarTab.empty")}</p>
      ) : (
        <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={qatorlar} kengaytir />
      )}
    </div>
  );
}
