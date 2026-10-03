import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CalendarDays, CheckCircle2, ChevronDown, CreditCard, FileText, Landmark, UserCheck, UserRound } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type { Sotuv, SotuvTolovi, TolovTuri } from "@/types/savdo";
import { masulNomi, pulniFormatlash, sananiFormatlash, sotuvRaqami, sotuvSummasi, tolovTuriMatni } from "./savdoYordamchilari";

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
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{t("tolovQatori.sarlavha")}</p>
        <div className="space-y-2">
        {qatorlar.map((qator) => {
          const sanaMatni = qisqaSana(qator.sana);
          const qarz = qator.tolov.paymentType === "DEBT";
          const menuOchiq = ochiqMenuId === qator.raqam;
          return (
            <div
              key={qator.tolov.id ?? qator.raqam}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-white px-3.5 py-3 ring-1 ring-slate-100"
            >
              <button
                type="button"
                onClick={() => setTanlangan(qator)}
                className="min-w-0 text-left text-sm font-medium text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline"
              >
                {t("tolovQatori.nomi", { raqam: qator.raqam })}
                {sanaMatni ? ` — ${sanaMatni}` : ""} ({t("tolovQatori.summa", { summa: pulniFormatlash(qator.tolov.amount) })})
              </button>
              <div className="flex shrink-0 items-center gap-2">
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
                      <div className="absolute right-0 top-8 z-40 w-[190px] rounded-2xl bg-white py-2 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-1 ring-slate-100">
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
      </div>

      {tanlangan && <TolovTafsilotModal sotuv={sotuv} mijoz={mijoz} qator={tanlangan} onYopish={() => setTanlangan(null)} />}
    </>
  );
}

function tolovTuriIkonkasi(turi: TolovTuri) {
  switch (turi) {
    case "CARD":
      return <CreditCard size={17} />;
    case "BANK":
      return <Landmark size={17} />;
    default:
      return <Banknote size={17} />;
  }
}

function TolovTafsilotModal({ sotuv, mijoz, qator, onYopish }: { sotuv: Sotuv; mijoz: string; qator: TolovQatori; onYopish: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const { tolov } = qator;
  const qarz = tolov.paymentType === "DEBT";
  const sotuvJami = sotuvSummasi(sotuv);
  const sotuvUlushi = sotuvJami > 0 ? Math.min(100, Math.round((Number(tolov.amount) / sotuvJami) * 100)) : 0;

  return (
    <AppModal onClose={onYopish}>
      <div className="w-full max-w-xl overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white px-7 py-6">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
              <CreditCard size={24} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">{t("tolovTafsilot.belgisi")}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">№{qator.raqam}</h2>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-7 py-6">
          <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">{t("tolovTafsilot.summa")}</p>
                <p className="mt-1 text-4xl font-light tracking-wide text-slate-800">{pulniFormatlash(tolov.amount)}</p>
              </div>
              <span
                className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold ${
                  qarz ? "bg-amber-50 text-amber-600 ring-1 ring-amber-100" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
                }`}
              >
                {!qarz && <CheckCircle2 size={13} />}
                {qarz ? t("tolovQatori.qarz") : t("tolovQatori.tolangan")}
              </span>
            </div>

            {sotuvJami > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-600">{t("tolovTafsilot.sotuvUlushi", { foiz: sotuvUlushi })}</span>
                  <span className="text-slate-400">
                    {t("tolovTafsilot.sotuvJami")} {pulniFormatlash(sotuvJami)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sotuvUlushi}>
                  <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: `${sotuvUlushi}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <TafsilotQatori icon={<FileText size={17} />} label={t("tolovTafsilot.sotuv")} value={sotuvRaqami(sotuv)} />
            <TafsilotQatori icon={<UserRound size={17} />} label={t("tolovTafsilot.mijoz")} value={mijoz} />
            <TafsilotQatori
              icon={tolovTuriIkonkasi(tolov.paymentType)}
              label={t("tolovTafsilot.tolovTuri")}
              value={tolovTuriMatni[tolov.paymentType] ?? tolov.paymentType}
            />
            <TafsilotQatori icon={<CalendarDays size={17} />} label={t("tolovTafsilot.sana")} value={sananiFormatlash(qator.sana)} />
            <TafsilotQatori icon={<UserCheck size={17} />} label={t("tolovTafsilot.masulShaxs")} value={masulNomi(sotuv)} />
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function TafsilotQatori({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const bosh = !value || value === "-" || value === "—";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`mt-0.5 break-words text-sm font-semibold ${bosh ? "text-slate-300" : "text-slate-800"}`}>{bosh ? "—" : value}</p>
      </div>
    </div>
  );
}
