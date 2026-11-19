import SmartTable from "@/Components/common/smart-table/SmartTable";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { cashFlowReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { cashAmount } from "@/lib/cashReports";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { chiqimlarJami, kassaChiqimlari, type KassaChiqimi, type KassaHarakati } from "@/lib/kassaChiqimlari";
import { tolovRangi } from "@/lib/tolovTuriRanglari";
import type { CashCurrency, CashPaymentType } from "@/types/cashReports";
import YuklanmoqdaHolati from "./YuklanmoqdaHolati";

type Props = { from: string; to: string; paymentType: CashPaymentType | ""; branchId: string; valyutalar: CashCurrency[] };

// Ro'yxat doim ikkala valyutada so'raladi: ko'rinadigan valyutalar sahifadagi kartalar yuklanishiga qarab o'zgaradi, so'rov esa unga bog'liq
// bo'lmasligi kerak (aks holda har filtrda ro'yxat 2–3 marta qayta yuklanadi). Bir valyutali rejimda boshqa valyuta faqat chiqimi bo'lsa ko'rinadi.
const SORALADIGAN: readonly CashCurrency[] = ["UZS", "USD"];
// "Hammasi" — kunlik kassa summalari bilan bir xil to'lov turlari (cash-daily: CASH, CARD, BANK); qarzga (DEBT) yozilganlar kassadan chiqmaydi.
const KASSA_TOLOV_TURLARI = "CASH,CARD,BANK";

/**
 * Kunlik kassa → tanlangan davrdagi chiqimlar ro'yxati (GET /reports/cash-flow): har chiqim alohida qator, so'm va dollar alohida jami.
 * To'lov turi va filial filtrlari sahifadagi bilan bir xil.
 */
export default function KunChiqimlari({ from, to, paymentType, branchId, valyutalar }: Props) {
  const { t } = useTranslation("hisobotlar");
  const [chiqimlar, setChiqimlar] = useState<Partial<Record<CashCurrency, KassaChiqimi[]>>>({});
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  useEffect(() => {
    let faol = true;
    // Filtr almashganda oldingi davr/filial qatorlari va jamilari yangi filtr ostida ko'rinib qolmasin.
    setChiqimlar({});
    setYuklanmoqda(true);
    setXato("");
    Promise.all(SORALADIGAN.map(async (valyuta) => {
      const javob = await cashFlowReportApi.olish({ currency: valyuta, dateFrom: from, dateTo: to, paymentMethods: paymentType || KASSA_TOLOV_TURLARI, branchIds: branchId || undefined });
      return [valyuta, kassaChiqimlari((javob.items ?? []) as KassaHarakati[], valyuta)] as const;
    }))
      .then((natija) => { if (faol) setChiqimlar(Object.fromEntries(natija)); })
      .catch((error) => { if (faol) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (faol) setYuklanmoqda(false); });
    return () => { faol = false; };
  }, [from, to, paymentType, branchId]);

  const korinadigan = SORALADIGAN.filter((valyuta) => valyutalar.includes(valyuta) || (chiqimlar[valyuta]?.length ?? 0) > 0);
  const hammasi = korinadigan.flatMap((valyuta) => chiqimlar[valyuta] ?? []).sort((a, b) => String(b.sana).localeCompare(String(a.sana)));
  return (
    <section data-testid="kun-chiqimlari" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><ArrowUpRight size={18} className="text-[#B26762]" aria-hidden />{t("kunlikKassa.expenses.title")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("kunlikKassa.expenses.subtitle", { count: hammasi.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {korinadigan.map((valyuta) => (
            <span key={valyuta} className="rounded-2xl border border-[#EBC9C6] bg-[#FDF5F4] px-4 py-2 text-sm font-black tabular-nums text-[#B26762]">
              {t("kunlikKassa.expenses.total")}: {cashAmount(chiqimlarJami(chiqimlar[valyuta] ?? []), valyuta)}
            </span>
          ))}
        </div>
      </div>
      {xato && <p role="alert" className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      {yuklanmoqda && hammasi.length === 0 ? <YuklanmoqdaHolati className="h-32" /> : hammasi.length === 0 ? (
        !xato && <p className="px-6 py-10 text-center text-sm font-semibold text-slate-400">{t("kunlikKassa.expenses.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <SmartTable tableId="HisobotUchot/KunlikKassa/chiqimlar" replaceColumnControls><table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th data-column-id="sana" className="px-4 py-3">{t("kunlikKassa.expenses.columns.time")}</th>
                <th data-column-id="hujjat" className="px-4 py-3">{t("kunlikKassa.expenses.columns.document")}</th>
                <th data-column-id="turi" className="px-4 py-3">{t("kunlikKassa.expenses.columns.type")}</th>
                <th data-column-id="nomi" className="px-4 py-3">{t("kunlikKassa.expenses.columns.name")}</th>
                <th data-column-id="izoh" className="px-4 py-3">{t("kunlikKassa.expenses.columns.note")}</th>
                <th data-column-id="tolov" className="px-4 py-3">{t("kunlikKassa.expenses.columns.payment")}</th>
                <th data-column-id="summa" className="px-4 py-3 text-right">{t("kunlikKassa.expenses.columns.amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hammasi.map((qator) => {
                const rang = qator.tolovTuri === "CASH" || qator.tolovTuri === "CARD" || qator.tolovTuri === "BANK" ? tolovRangi(qator.tolovTuri) : null;
                return (
                  <tr key={`${qator.valyuta}-${qator.id}`} className="text-slate-700">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">{vaqtMatni(qator.sana) || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{qator.hujjat || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{qator.manba ? t(`kunlikKassa.expenses.source.${qator.manba}`, { defaultValue: qator.manba }) : "—"}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 font-semibold" title={qator.nomi || undefined}>{qator.nomi || "—"}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-slate-500" title={qator.izoh || undefined}>{qator.izoh || "—"}</td>
                    <td className="px-4 py-3">
                      {qator.tolovTuri ? <span className="whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black" style={rang ? { color: rang.matn, borderColor: rang.chegara, backgroundColor: rang.fon } : undefined}>{t(`kunlikKassa.expenses.payment.${qator.tolovTuri}`, { defaultValue: qator.tolovTuri })}</span> : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black tabular-nums text-[#B26762]">−{cashAmount(qator.summa, qator.valyuta)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></SmartTable>
        </div>
      )}
    </section>
  );
}
