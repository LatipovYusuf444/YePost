import { Ban, Calculator, CheckCircle2, FilePlus2, FlaskConical, PackageCheck, PackageSearch, Wallet, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sananiFormatlash } from "../savdoYordamchilari";
import type { VaqtChizigiTuri, VaqtChizigiVoqeasi } from "./mockReturnData";

const IKONKALAR: Record<VaqtChizigiTuri, { ikonka: LucideIcon; rang: string }> = {
  yaratildi: { ikonka: FilePlus2, rang: "bg-slate-100 text-slate-600" },
  mahsulot: { ikonka: PackageSearch, rang: "bg-orange-50 text-orange-600" },
  hisob: { ikonka: Calculator, rang: "bg-amber-50 text-amber-600" },
  tasdiqlandi: { ikonka: CheckCircle2, rang: "bg-emerald-50 text-emerald-600" },
  ombor: { ikonka: PackageCheck, rang: "bg-sky-50 text-sky-600" },
  moliya: { ikonka: Wallet, rang: "bg-emerald-50 text-emerald-600" },
  bekorQilindi: { ikonka: Ban, rang: "bg-rose-50 text-rose-600" },
};

// Qaytarish bo'yicha jarayon tarixi (activity timeline). Hozircha backendda yo'q — namunaviy voqealar
// (mockReturnData.ts) ko'rsatiladi va shu haqda belgi chiqadi. Backend tayyor bo'lgach faqat `voqealar` manbasi almashadi.
export default function QaytarishVaqtChizigi({ voqealar }: { voqealar: VaqtChizigiVoqeasi[] }) {
  const { t } = useTranslation("savdo_qaytarish");
  const namunaBor = voqealar.some((voqea) => voqea.namuna);

  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6" aria-label={t("detail.timelineTitle")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-slate-900">{t("detail.timelineTitle")}</h3>
        {namunaBor && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200" title={t("detail.timelineSampleNote")}>
            <FlaskConical size={12} aria-hidden /> {t("detail.sample")}
          </span>
        )}
      </div>
      <ol className="mt-5 space-y-0">
        {voqealar.map((voqea, indeks) => {
          const { ikonka: Ikona, rang } = IKONKALAR[voqea.turi];
          const oxirgi = indeks === voqealar.length - 1;
          return (
            <li key={voqea.id} className="relative flex gap-4 pb-5 last:pb-0">
              {!oxirgi && <span aria-hidden className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200" />}
              <span aria-hidden className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${rang}`}>
                <Ikona size={17} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-sm font-extrabold text-slate-800">{t(`detail.events.${voqea.turi}`)}</p>
                {voqea.sana && <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-400">{sananiFormatlash(voqea.sana)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
