import SmartTable from "@/Components/common/smart-table/SmartTable";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, LoaderCircle, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { yetkazibBoshlangichQarzApi } from "@/api/yetkazibBoshlangichQarzApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { muvaffaqiyatXabari } from "@/lib/toast";
import { oziValyutadaMatn, pulMatni, useYagonaValyuta } from "@/lib/valyuta";
import { yetkazibQarzAmali, type YetkazibBoshlangichQarzi } from "@/lib/yetkazibBoshlangichQarz";
import type { YetkazibBeruvchi } from "./types";

type Amal = { tur: "bekor" | "tiklash"; qarz: YetkazibBoshlangichQarzi };

// Yetkazib beruvchi kartasi → "Boshlang'ich qarz" tabi (faqat admin va direktor): GET /partners/suppliers/:id/opening-debts
// (yangisi birinchi, bekor qilinganlari ham), bekor qilish (.../cancel) va qayta tiklash (.../restore).
// `yangilanish` o'sganda (yangi qarz kiritildi) ro'yxat qayta o'qiladi.
export default function YetkazibBoshlangichQarzTab({
  beruvchi,
  yangilanish,
  onQoshish,
}: {
  beruvchi: YetkazibBeruvchi;
  yangilanish: number;
  onQoshish: () => void;
}) {
  const { t } = useTranslation("xaridor_uchot");
  const [qarzlar, setQarzlar] = useState<YetkazibBoshlangichQarzi[]>([]);
  const [holat, setHolat] = useState<"yuklanmoqda" | "tayyor" | "xato">("yuklanmoqda");
  const [xato, setXato] = useState("");
  const [amal, setAmal] = useState<Amal | null>(null);
  const faolRef = useRef(true);

  useEffect(() => {
    faolRef.current = true;
    return () => {
      faolRef.current = false;
    };
  }, []);

  const yuklash = useCallback(async () => {
    setHolat("yuklanmoqda");
    setXato("");
    try {
      const royxat = await yetkazibBoshlangichQarzApi.royxat(beruvchi.id);
      if (!faolRef.current) return;
      setQarzlar(royxat);
      setHolat("tayyor");
    } catch (error) {
      if (!faolRef.current) return;
      setXato(getApiErrorMessage(error));
      setHolat("xato");
    }
  }, [beruvchi.id]);

  useEffect(() => {
    void yuklash();
  }, [yuklash, yangilanish]);

  async function amalniBajarish() {
    if (!amal) return false;
    try {
      if (amal.tur === "bekor") await yetkazibBoshlangichQarzApi.bekorQilish(beruvchi.id, amal.qarz.id);
      else await yetkazibBoshlangichQarzApi.tiklash(beruvchi.id, amal.qarz.id);
      muvaffaqiyatXabari(t(amal.tur === "bekor" ? "yetkazibDetails.openingDebt.cancelled" : "yetkazibDetails.openingDebt.restored"));
      await yuklash();
      return true;
    } catch (error) {
      // Xato (masalan, allaqachon bekor qilingan yoki yopilgan davr) ro'yxat ustida ko'rsatiladi; ro'yxat yangilanadi.
      if (faolRef.current) setXato(getApiErrorMessage(error));
      void yuklash();
      return false;
    }
  }

  // Bir valyutali rejimda qarz o'z valyutasida, o'girilmasdan (rejimdan oldingi so'mdagi qarz Faqat dollar rejimida "$" bo'lib qolmasin).
  const yagona = useYagonaValyuta();
  const summa = (qarz: YetkazibBoshlangichQarzi) => (yagona ? oziValyutadaMatn(qarz.amount, qarz.currency) : pulMatni(qarz.amount, qarz.currency));

  return (
    <div className="px-9 py-7">
      <section data-testid="yetkazib-boshlangich-qarz" className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100/80 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen size={14} />
            </span>
            {t("yetkazibDetails.openingDebt.listTitle")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void yuklash()}
              disabled={holat === "yuklanmoqda"}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={holat === "yuklanmoqda" ? "animate-spin" : ""} />
              {t("openingDebt.refresh")}
            </button>
            <button
              type="button"
              onClick={onQoshish}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8]"
            >
              <BookOpen size={15} />
              {t("yetkazibDetails.openingDebt.add")}
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{t("yetkazibDetails.openingDebt.hint")}</p>

        {xato && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600">{xato}</p>}

        {holat === "yuklanmoqda" && qarzlar.length === 0 ? (
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <LoaderCircle size={16} className="animate-spin" />
            {t("openingDebt.loading")}
          </p>
        ) : holat === "xato" && qarzlar.length === 0 ? (
          <p className="mt-5 text-sm font-semibold text-slate-400">{t("yetkazibDetails.openingDebt.loadError")}</p>
        ) : qarzlar.length === 0 ? (
          <p className="mt-5 text-sm font-semibold text-slate-400">{t("yetkazibDetails.openingDebt.empty")}</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <SmartTable tableId="XaridorUchot/YetkazibBoshlangichQarzTab/table-1" replaceColumnControls><table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th data-column-id="h1" className="px-4 py-3">{t("yetkazibDetails.openingDebt.columns.document")}</th>
                  <th data-column-id="h2" className="px-4 py-3">{t("yetkazibDetails.openingDebt.columns.date")}</th>
                  <th data-column-id="h3" className="px-4 py-3 text-right">{t("yetkazibDetails.openingDebt.columns.amount")}</th>
                  <th data-column-id="h4" className="px-4 py-3">{t("yetkazibDetails.openingDebt.columns.note")}</th>
                  <th data-column-id="h5" className="px-4 py-3">{t("yetkazibDetails.openingDebt.columns.status")}</th>
                  <th data-column-id="h6" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qarzlar.map((qarz) => {
                  const mumkin = yetkazibQarzAmali(qarz);
                  const bekor = qarz.status === "CANCELLED";
                  return (
                    <tr key={qarz.id} className={bekor ? "bg-slate-50/60 text-slate-400" : "text-slate-800"}>
                      <td className="px-4 py-3 font-bold">{qarz.docNumber || "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{qarz.date ? kunMatni(qarz.date) : "—"}</td>
                      <td className={`px-4 py-3 text-right font-black tabular-nums ${bekor ? "line-through" : ""}`}>{summa(qarz)}</td>
                      <td className="max-w-[260px] px-4 py-3 break-words">{qarz.note || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
                            bekor ? "bg-red-50 text-red-600 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          }`}
                        >
                          {t(`yetkazibDetails.openingDebt.status.${qarz.status}`, { defaultValue: qarz.status })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {mumkin === "bekor" && (
                          <button
                            type="button"
                            onClick={() => setAmal({ tur: "bekor", qarz })}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-600 ring-1 ring-red-100 transition hover:bg-red-100"
                          >
                            <XCircle size={14} />
                            {t("yetkazibDetails.openingDebt.cancelAction")}
                          </button>
                        )}
                        {mumkin === "tiklash" && (
                          <button
                            type="button"
                            onClick={() => setAmal({ tur: "tiklash", qarz })}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
                          >
                            <RotateCcw size={14} />
                            {t("yetkazibDetails.openingDebt.restoreAction")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></SmartTable>
          </div>
        )}
      </section>

      {amal && (
        <TasdiqlashOynasi
          ikonka={amal.tur === "bekor" ? <XCircle size={24} /> : <RotateCcw size={24} />}
          ohang={amal.tur === "bekor" ? "qizil" : "kok"}
          sarlavha={t(amal.tur === "bekor" ? "yetkazibDetails.openingDebt.cancelConfirm.title" : "yetkazibDetails.openingDebt.restoreConfirm.title")}
          nom={`${amal.qarz.docNumber || beruvchi.nomi} · ${summa(amal.qarz)}`}
          tavsif={t(amal.tur === "bekor" ? "yetkazibDetails.openingDebt.cancelConfirm.description" : "yetkazibDetails.openingDebt.restoreConfirm.description")}
          ortgaMatni={t("yetkazibDetails.openingDebt.back")}
          tasdiqMatni={t(amal.tur === "bekor" ? "yetkazibDetails.openingDebt.cancelConfirm.yes" : "yetkazibDetails.openingDebt.restoreConfirm.yes")}
          jarayonMatni={t(amal.tur === "bekor" ? "yetkazibDetails.openingDebt.cancelConfirm.working" : "yetkazibDetails.openingDebt.restoreConfirm.working")}
          onTasdiq={amalniBajarish}
          onYopish={() => setAmal(null)}
        />
      )}
    </div>
  );
}
