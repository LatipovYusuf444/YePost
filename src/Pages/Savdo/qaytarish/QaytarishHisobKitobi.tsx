import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, BadgeCheck, CircleDollarSign, Eye, HandCoins, PackageOpen, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { QaytarishToloviniQaytarishUsuli } from "@/types/savdo";
import { pulniFormatlash } from "../savdoYordamchilari";
import { hisobKitobHolati, type HisobKitob } from "./hisobKitob";

type Props = {
  hisob: HisobKitob;
  usul?: QaytarishToloviniQaytarishUsuli | string;
  // Ixcham ko'rinish: detail oynasi va tasdiqlash bosqichi uchun.
  ixcham?: boolean;
  // true — tasdiqlashdan oldingi backend hisob-kitobi (POST /returns/preview): "Oldindan ko'rish" belgisi chiqadi.
  oldindan?: boolean;
};

// "Qancha pul qayerga ketadi" kartasi: tovar qiymati → qarzdan ayriladi + mijozga qaytariladi → qolgan qarz.
// Faqat ko'rsatadi: summalarni backend hisoblaydi. null — "ma'lumot mavjud emas" (0 emas).
export default function QaytarishHisobKitobi({ hisob, usul = "CASH", ixcham = false, oldindan = false }: Props) {
  const { t } = useTranslation("savdo_qaytarish");
  const yoq = t("wizard.calc.unavailable");
  const summa = (qiymat: number | null) => (qiymat === null ? yoq : pulniFormatlash(qiymat));

  const jami = hisob.tovarQiymati;
  // Ulushlar faqat backend summalarining nisbati (ko'rsatish uchun); biri noma'lum bo'lsa chiziq ko'rsatilmaydi.
  const ulushlarBor = jami !== null && jami > 0 && hisob.qarzdanAyriladi !== null && hisob.mijozgaQaytariladi !== null;
  const ulush = (qiymat: number | null) => (ulushlarBor && qiymat !== null && jami ? Math.min(Math.max(Math.round((qiymat / jami) * 100), 0), 100) : 0);
  const qarzUlushi = ulush(hisob.qarzdanAyriladi);
  const pulUlushi = ulush(hisob.mijozgaQaytariladi);
  const holat = hisobKitobHolati(hisob, usul);
  const qarzBelgilangan = hisob.qolganQarz !== null;

  return (
    <section aria-label={t("wizard.calc.heading")} className="space-y-4">
      {/* 1) Qaytgan tovar qiymati — eng katta ko'rsatkich */}
      <div className="relative overflow-hidden rounded-[26px] border border-orange-200/70 bg-linear-to-br from-orange-50 via-white to-sky-50/70 p-5 sm:p-6">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              <PackageOpen size={15} className="text-orange-500" aria-hidden /> {t("wizard.calc.goods")}
            </p>
            <p className={`mt-2 font-extrabold leading-none tracking-tight tabular-nums text-slate-950 ${ixcham ? "text-3xl" : "text-4xl sm:text-5xl"} ${jami === null ? "!text-xl !font-bold !text-slate-400" : ""}`}>{summa(jami)}</p>
          </div>
          {oldindan && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-200" title={t("wizard.calc.estimateNote")}>
              <Eye size={13} aria-hidden /> {t("wizard.calc.estimate")}
            </span>
          )}
        </div>

        {/* Tovar qiymatining taqsimoti: qarzdan ayriladi + mijozga qaytariladi */}
        {ulushlarBor && (
          <div className="relative mt-5">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200/70" role="img" aria-label={`${t("wizard.calc.debtReduction")} ${qarzUlushi}%, ${t("wizard.calc.refund")} ${pulUlushi}%`}>
              <span className="h-full bg-emerald-500 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${qarzUlushi}%` }} />
              <span className="h-full bg-orange-500 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${Math.min(pulUlushi, 100 - qarzUlushi)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />{t("wizard.calc.debtReduction")} · {qarzUlushi}%</span>
              <span className="inline-flex items-center gap-1.5 text-orange-700"><span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden />{t("wizard.calc.refund")} · {pulUlushi}%</span>
            </div>
          </div>
        )}
      </div>

      {/* 2) Qayerga ketadi */}
      <div className={`grid items-stretch gap-3 ${ixcham ? "sm:grid-cols-3" : "lg:grid-cols-[1fr_auto_1fr_1fr]"}`}>
        <Karta
          rang="amber"
          ikonka={<CircleDollarSign size={18} />}
          nom={t("wizard.calc.currentDebt")}
          qiymat={summa(hisob.mavjudQarz)}
          yoq={hisob.mavjudQarz === null}
          izoh={t("wizard.calc.currentDebtHint")}
        />
        {!ixcham && (
          <span aria-hidden className="hidden items-center justify-center text-slate-300 lg:flex">
            <ArrowRight size={22} />
          </span>
        )}
        <Karta
          rang="emerald"
          ikonka={<BadgeCheck size={18} />}
          nom={t("wizard.calc.debtReduction")}
          qiymat={hisob.qarzdanAyriladi === null ? yoq : `− ${pulniFormatlash(hisob.qarzdanAyriladi)}`}
          yoq={hisob.qarzdanAyriladi === null}
          izoh={t("wizard.calc.debtReductionHint")}
          kuchli
        />
        <Karta
          rang="blue"
          ikonka={<HandCoins size={18} />}
          nom={t("wizard.calc.refund")}
          qiymat={summa(hisob.mijozgaQaytariladi)}
          yoq={hisob.mijozgaQaytariladi === null}
          izoh={String(usul).toUpperCase() === "NONE" ? t("wizard.calc.refundHintNone") : String(usul).toUpperCase() === "BALANCE" ? t("wizard.calc.refundHintBalance") : t("wizard.calc.refundHint")}
          kuchli
        />
      </div>

      {/* 3) Natija */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`flex h-10 w-10 items-center justify-center rounded-xl ${!qarzBelgilangan ? "bg-slate-100 text-slate-400" : (hisob.qolganQarz ?? 0) > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t("wizard.calc.remaining")}</p>
            {hisob.mavjudQarz !== null && hisob.qolganQarz !== null && (
              <p className="text-[13px] font-semibold text-slate-400">
                {pulniFormatlash(hisob.mavjudQarz)} <ArrowDown size={11} className="mx-0.5 inline -rotate-90" aria-hidden /> {pulniFormatlash(hisob.qolganQarz)}
              </p>
            )}
          </div>
        </div>
        {qarzBelgilangan ? (
          <p className={`text-2xl font-extrabold tabular-nums ${(hisob.qolganQarz ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pulniFormatlash(hisob.qolganQarz)}</p>
        ) : (
          <p className="text-sm font-bold text-slate-400">{yoq}</p>
        )}
      </div>

      {holat && <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[13px] font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">{t(`wizard.calc.notes.${holat}`)}</p>}
    </section>
  );
}

function Karta({
  rang,
  ikonka,
  nom,
  qiymat,
  izoh,
  yoq = false,
  kuchli = false,
}: {
  rang: "amber" | "emerald" | "blue";
  ikonka: ReactNode;
  nom: string;
  qiymat: string;
  izoh: string;
  // true — backendda bu qiymat yo'q (null): kulrang, kichik matn.
  yoq?: boolean;
  kuchli?: boolean;
}) {
  const uslub = {
    amber: { karta: "border-amber-200/80 bg-amber-50/60", tile: "bg-amber-100 text-amber-700", son: "text-amber-800" },
    emerald: { karta: "border-emerald-200/80 bg-emerald-50/60", tile: "bg-emerald-100 text-emerald-700", son: "text-emerald-700" },
    blue: { karta: "border-orange-200/80 bg-orange-50/60", tile: "bg-orange-100 text-orange-700", son: "text-orange-700" },
  }[rang];
  return (
    <div className={`min-w-0 rounded-[22px] border p-4 ${uslub.karta}`}>
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${uslub.tile}`}>{ikonka}</span>
        <p className="text-[11px] font-black uppercase leading-tight tracking-wide text-slate-600">{nom}</p>
      </div>
      <p className={`mt-3 break-words font-extrabold tabular-nums ${yoq ? "text-sm !font-bold text-slate-400" : `${uslub.son} ${kuchli ? "text-2xl" : "text-xl"}`}`}>{qiymat}</p>
      <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{izoh}</p>
    </div>
  );
}
