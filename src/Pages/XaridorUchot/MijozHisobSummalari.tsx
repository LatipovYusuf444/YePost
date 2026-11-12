import { useTranslation } from "react-i18next";
import type { MijozHisobHolati, MijozHisobQoldigi } from "@/lib/mijozHisobQoldigi";
import { hisobotPulMatni } from "../HisobotUchot/hisobotValyutasi";
import { useYagonaValyuta } from "@/lib/valyuta";

export default function MijozHisobSummalari({ hisob, holat, onValyuta }: {
  hisob?: MijozHisobQoldigi;
  holat: MijozHisobHolati;
  onValyuta?: (currency: "UZS" | "USD") => void;
}) {
  const { t } = useTranslation("xaridor_uchot");
  // Bir valyutali rejimda faqat asosiy valyuta hisobi; boshqa valyutada (rejimdan oldingi) qarz/avans qolgan bo'lsa — u ham ko'rinadi.
  const yagona = useYagonaValyuta();
  if (holat !== "tayyor") return <p role={holat === "xato" ? "status" : undefined} className="text-sm font-semibold text-slate-400">{t(`hisob.${holat}`)}</p>;
  return <div className="space-y-2">
    {(["UZS", "USD"] as const).filter((currency) => !yagona || currency === yagona || (hisob?.[currency] ?? 0) !== 0).map((currency) => {
      const summa = hisob?.[currency] ?? 0;
      const matn = <><span className="text-xs font-semibold">{currency} · {t(summa < 0 ? "hisob.avans" : "hisob.qarz")}</span><span className="font-black tabular-nums">{hisobotPulMatni(Math.abs(summa), currency, t("hisob.uzs"))}</span></>;
      const klass = `flex w-full flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 ${summa > 0 ? "bg-red-50 text-red-600" : summa < 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`;
      return onValyuta
        ? <button key={currency} type="button" aria-label={t("hisob.hujjatlar", { currency })} onClick={(event) => { event.stopPropagation(); onValyuta(currency); }} className={`${klass} transition hover:ring-1 hover:ring-current`}>{matn}</button>
        : <div key={currency} className={klass}>{matn}</div>;
    })}
  </div>;
}
