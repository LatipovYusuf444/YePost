import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, CreditCard, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type { Sotuv, SotuvTolovi } from "@/types/savdo";
import { masulNomi, pulniFormatlash, sananiFormatlash, sotuvRaqami, tolovTuriMatni } from "./savdoYordamchilari";

type TolovQatori = {
  tolov: SotuvTolovi;
  raqam: string;
  sana?: string;
};

// Backend to'lov sanasini qaysi nom bilan qaytarishidan qat'i nazar o'qiymiz.
function tolovSanasi(tolov: SotuvTolovi) {
  return tolov.createdAt ?? tolov.paidAt ?? tolov.date;
}

function qisqaSana(value?: string) {
  if (!value) return "";
  const sana = new Date(value);
  if (Number.isNaN(sana.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(sana);
}

function qatorlarniYigish(sotuv: Sotuv): TolovQatori[] {
  return (sotuv.payments ?? [])
    .filter((tolov) => Number(tolov.amount) > 0)
    .map((tolov, index) => ({ tolov, raqam: `${sotuvRaqami(sotuv)}/${index + 1}`, sana: tolovSanasi(tolov) }));
}

// Kelishuv kartasidagi "To'lov" qatorlari: havola + amallar + holat belgisi.
// Havola bosilsa shu to'lovning ma'lumotlari ochiladi.
export default function SotuvTolovlari({ sotuv, mijoz }: { sotuv: Sotuv; mijoz: string }) {
  const { t } = useTranslation("savdo_tafsilot");
  const [ochiqMenuId, setOchiqMenuId] = useState<string | null>(null);
  const [tanlangan, setTanlangan] = useState<TolovQatori | null>(null);
  const qatorlar = qatorlarniYigish(sotuv);

  if (qatorlar.length === 0) return null;

  return (
    <>
      <div className="mt-4 space-y-3">
        {qatorlar.map((qator) => {
          const sanaMatni = qisqaSana(qator.sana);
          const qarz = qator.tolov.paymentType === "DEBT";
          const menuOchiq = ochiqMenuId === qator.raqam;
          return (
            <div key={qator.tolov.id ?? qator.raqam}>
              <button
                type="button"
                onClick={() => setTanlangan(qator)}
                className="text-left text-sm font-medium text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline"
              >
                {t("tolovQatori.nomi", { raqam: qator.raqam })}
                {sanaMatni ? ` — ${sanaMatni}` : ""} ({t("tolovQatori.summa", { summa: pulniFormatlash(qator.tolov.amount) })})
              </button>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOchiqMenuId(menuOchiq ? null : qator.raqam)}
                    className="inline-flex h-6 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    {t("tolovQatori.amallar")}
                    <ChevronDown size={12} className={`transition ${menuOchiq ? "rotate-180" : ""}`} />
                  </button>
                  {menuOchiq && (
                    <>
                      <button type="button" aria-label={t("tolovTafsilot.yopish")} className="fixed inset-0 z-30 cursor-default" onClick={() => setOchiqMenuId(null)} />
                      <div className="absolute left-0 top-8 z-40 w-[190px] rounded-2xl bg-white py-2 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-1 ring-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setOchiqMenuId(null);
                            setTanlangan(qator);
                          }}
                          className="flex h-9 w-full items-center px-4 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-[#2563EB]"
                        >
                          {t("tolovQatori.ochish")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <span
                  className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${
                    qarz ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {!qarz && <CheckCircle2 size={12} />}
                  {qarz ? t("tolovQatori.qarz") : t("tolovQatori.tolangan")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {tanlangan && <TolovTafsilotModal sotuv={sotuv} mijoz={mijoz} qator={tanlangan} onYopish={() => setTanlangan(null)} />}
    </>
  );
}

function TolovTafsilotModal({ sotuv, mijoz, qator, onYopish }: { sotuv: Sotuv; mijoz: string; qator: TolovQatori; onYopish: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const { tolov } = qator;
  const qarz = tolov.paymentType === "DEBT";

  return (
    <AppModal onClose={onYopish}>
      <div className="w-full max-w-xl overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-7 py-6">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
              <CreditCard size={24} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">{t("tolovTafsilot.belgisi")}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">№{qator.raqam}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onYopish}
            aria-label={t("tolovTafsilot.yopish")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-7 py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">{t("tolovTafsilot.summa")}</p>
              <p className="mt-1 text-4xl font-light tracking-wide text-slate-700">{pulniFormatlash(tolov.amount)}</p>
            </div>
            <span
              className={`inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-bold ${
                qarz ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {!qarz && <CheckCircle2 size={13} />}
              {qarz ? t("tolovQatori.qarz") : t("tolovQatori.tolangan")}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Malumot label={t("tolovTafsilot.sotuv")} value={sotuvRaqami(sotuv)} />
            <Malumot label={t("tolovTafsilot.mijoz")} value={mijoz} />
            <Malumot label={t("tolovTafsilot.tolovTuri")} value={tolovTuriMatni[tolov.paymentType] ?? tolov.paymentType} />
            <Malumot label={t("tolovTafsilot.sana")} value={sananiFormatlash(qator.sana)} />
            <Malumot label={t("tolovTafsilot.masulShaxs")} value={masulNomi(sotuv)} />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onYopish}
              className="h-11 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
            >
              {t("tolovTafsilot.yopish")}
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function Malumot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}
