import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, FilePlus2, FileText, LoaderCircle, Receipt, RefreshCw } from "lucide-react";
import { sotuvHujjatiPdfOchish, sotuvHujjatiYaratish, sotuvHujjatlariniOlish, type SotuvHujjati } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Sotuv } from "@/types/savdo";
import { sananiFormatlash } from "./savdoYordamchilari";

// Sotuvning saqlangan hujjatlari: tasdiqlashda olingan chek nusxasi (RECEIPT) va talab bo'yicha
// yaratiladigan hisob-faktura (INVOICE). Ro'yxat GET /sales/:id/documents, yaratish POST /sales/:id/documents.
export default function SotuvHujjatlariTab({ sotuv }: { sotuv: Sotuv }) {
  const { t } = useTranslation("savdo_tafsilot");
  const [hujjatlar, setHujjatlar] = useState<SotuvHujjati[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [yaratilmoqda, setYaratilmoqda] = useState(false);
  const [pdfYuklanmoqda, setPdfYuklanmoqda] = useState<string | null>(null);
  const [xatolik, setXatolik] = useState("");

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      setHujjatlar(await sotuvHujjatlariniOlish(sotuv.id));
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, [sotuv.id]);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  async function hisobFakturaYaratish() {
    setYaratilmoqda(true);
    setXatolik("");
    try {
      await sotuvHujjatiYaratish(sotuv.id, "INVOICE");
      await yuklash();
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYaratilmoqda(false);
    }
  }

  async function pdfOchish(hujjat: SotuvHujjati) {
    setPdfYuklanmoqda(hujjat.id);
    setXatolik("");
    try {
      await sotuvHujjatiPdfOchish(sotuv.id, hujjat.id);
    } catch (error) {
      setXatolik(error instanceof Error && error.message === "PDF_YOQ" ? t("hujjatlarTab.pdfYoq") : getApiErrorMessage(error));
    } finally {
      setPdfYuklanmoqda(null);
    }
  }

  const turiMatni = (turi?: string) => t(`hujjatlarTab.turlar.${String(turi ?? "").toUpperCase()}`, { defaultValue: turi ?? "—" });

  return (
    <div className="rounded-[26px] bg-[#EEF3F6] px-8 py-8" onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_55px_rgba(15,23,42,.07)] ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-black text-slate-900">{t("hujjatlarTab.sarlavha")}</h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">{t("hujjatlarTab.tavsif")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void yuklash()}
              disabled={yuklanmoqda}
              aria-label={t("hujjatlarTab.yangilash")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw size={16} className={yuklanmoqda ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={() => void hisobFakturaYaratish()}
              disabled={yaratilmoqda}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {yaratilmoqda ? <LoaderCircle size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
              {t("hujjatlarTab.hisobFakturaYaratish")}
            </button>
          </div>
        </div>

        {xatolik && <div className="mx-5 mt-4 rounded-2xl bg-red-50 p-3.5 text-sm font-bold text-red-600">{xatolik}</div>}

        <table className="w-full text-left text-[13px] text-slate-600">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">{t("hujjatlarTab.columns.raqam")}</th>
              <th className="px-3 py-4 font-medium">{t("hujjatlarTab.columns.turi")}</th>
              <th className="px-3 py-4 font-medium">{t("hujjatlarTab.columns.kimYaratgan")}</th>
              <th className="px-3 py-4 font-medium">{t("hujjatlarTab.columns.sana")}</th>
              <th className="w-28 px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {hujjatlar.map((hujjat) => (
              <tr key={hujjat.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 font-bold text-slate-900">
                    {String(hujjat.type).toUpperCase() === "INVOICE" ? <FileText size={16} className="text-[#2563EB]" /> : <Receipt size={16} className="text-emerald-500" />}
                    {hujjat.content?.docNumber || hujjat.docNumber || hujjat.number || hujjat.id.slice(0, 8).toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-4">{turiMatni(hujjat.type)}</td>
                <td className="px-3 py-4">{hujjat.createdBy?.fullName || hujjat.createdBy?.name || hujjat.user?.fullName || "—"}</td>
                <td className="px-3 py-4">{sananiFormatlash(hujjat.createdAt)}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => void pdfOchish(hujjat)}
                    disabled={pdfYuklanmoqda === hujjat.id}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-50 px-3 text-xs font-black text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white disabled:opacity-60"
                  >
                    {pdfYuklanmoqda === hujjat.id ? <LoaderCircle size={14} className="animate-spin" /> : <FileDown size={14} />}
                    PDF
                  </button>
                </td>
              </tr>
            ))}
            {!yuklanmoqda && hujjatlar.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                  {t("hujjatlarTab.bosh")}
                </td>
              </tr>
            )}
            {yuklanmoqda && hujjatlar.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                  <LoaderCircle size={20} className="mx-auto animate-spin text-[#2563EB]" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
