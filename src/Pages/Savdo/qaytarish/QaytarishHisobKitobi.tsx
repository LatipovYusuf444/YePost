import type { ReactNode } from "react";
import { BadgeCheck, CircleCheck, CircleDollarSign, Eye, HandCoins, Info, PackageOpen, Wallet } from "lucide-react";
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
  const qarzYopildi = hisob.mavjudQarz !== null && hisob.qolganQarz !== null && hisob.mavjudQarz > 0 && hisob.qolganQarz === 0;
  const usulKichik = String(usul).toUpperCase();

  return (
    <section aria-label={t("wizard.calc.heading")} className="space-y-3">
      {/* 1) Qaytarilgan tovar qiymati va uning taqsimoti */}
      <div className="relative overflow-hidden rounded-[22px] border border-orange-200/70 bg-linear-to-br from-orange-50 via-white to-sky-50/60 p-4 sm:p-5">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              <PackageOpen size={14} className="text-orange-500" aria-hidden /> {t("wizard.calc.goods")}
            </p>
            <p className={`mt-1.5 font-extrabold leading-none tracking-tight tabular-nums ${jami === null ? "text-base text-slate-400" : "text-slate-950"} ${jami === null ? "" : ixcham ? "text-2xl" : "text-[26px] sm:text-[30px]"}`}>
              {summa(jami)}
            </p>
          </div>
          {oldindan && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-200" title={t("wizard.calc.estimateNote")}>
              <Eye size={13} aria-hidden /> {t("wizard.calc.estimate")}
            </span>
          )}
        </div>

        {ulushlarBor && (
          <div className="relative mt-4">
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70"
              role="img"
              aria-label={`${t("wizard.calc.debtReduction")} ${qarzUlushi}%, ${t("wizard.calc.refund")} ${pulUlushi}%`}
            >
              <span className="h-full bg-linear-to-r from-emerald-400 to-emerald-500 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${qarzUlushi}%` }} />
              <span className="h-full bg-linear-to-r from-orange-400 to-orange-500 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${Math.min(pulUlushi, 100 - qarzUlushi)}%` }} />
            </div>
            <div className="mt-2.5 grid gap-x-4 gap-y-1.5 text-xs font-bold sm:grid-cols-2">
              <span className="inline-flex items-center gap-2 text-emerald-700">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                {t("wizard.calc.debtReduction")}: {summa(hisob.qarzdanAyriladi)} · {qarzUlushi}%
              </span>
              <span className="inline-flex items-center gap-2 text-orange-700 sm:justify-end">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
                {t("wizard.calc.refund")}: {summa(hisob.mijozgaQaytariladi)} · {pulUlushi}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2) Qayerga ketadi */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Karta
          rang="amber"
          ikonka={<CircleDollarSign size={17} />}
          nom={t("wizard.calc.currentDebt")}
          qiymat={summa(hisob.mavjudQarz)}
          yoq={hisob.mavjudQarz === null}
          izoh={t("wizard.calc.currentDebtHint")}
        />
        <Karta
          rang="emerald"
          ikonka={<BadgeCheck size={17} />}
          nom={t("wizard.calc.debtReduction")}
          qiymat={hisob.qarzdanAyriladi === null ? yoq : `− ${pulniFormatlash(hisob.qarzdanAyriladi)}`}
          yoq={hisob.qarzdanAyriladi === null}
          izoh={t("wizard.calc.debtReductionHint")}
        />
        <Karta
          rang="blue"
          ikonka={<HandCoins size={17} />}
          nom={t("wizard.calc.refund")}
          qiymat={summa(hisob.mijozgaQaytariladi)}
          yoq={hisob.mijozgaQaytariladi === null}
          izoh={usulKichik === "NONE" ? t("wizard.calc.refundHintNone") : usulKichik === "BALANCE" ? t("wizard.calc.refundHintBalance") : t("wizard.calc.refundHint")}
        />
      </div>

      {/* 3) Natija: qaytarishdan keyingi qarz */}
      <div
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border px-4 py-3.5 ${
          qarzYopildi ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              !qarzBelgilangan ? "bg-slate-100 text-slate-400" : (hisob.qolganQarz ?? 0) > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-100 text-emerald-600"
            }`}
          >
            <Wallet size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{t("wizard.calc.remaining")}</p>
            {hisob.mavjudQarz !== null && hisob.qolganQarz !== null && (
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-400">
                {pulniFormatlash(hisob.mavjudQarz)} → {pulniFormatlash(hisob.qolganQarz)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {qarzYopildi && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
              <CircleCheck size={12} aria-hidden /> {t("wizard.calc.debtClosed")}
            </span>
          )}
          {qarzBelgilangan ? (
            <p className={`text-xl font-extrabold tabular-nums ${(hisob.qolganQarz ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pulniFormatlash(hisob.qolganQarz)}</p>
          ) : (
            <p className="text-sm font-bold text-slate-400">{yoq}</p>
          )}
        </div>
      </div>

      {holat && (
        <p className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">
          <Info size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
          {t(`wizard.calc.notes.${holat}`)}
        </p>
      )}
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
}: {
  rang: "amber" | "emerald" | "blue";
  ikonka: ReactNode;
  nom: string;
  qiymat: string;
  izoh: string;
  // true — backendda bu qiymat yo'q (null): kulrang, kichik matn.
  yoq?: boolean;
}) {
  const uslub = {
    amber: { karta: "border-amber-200/80 bg-linear-to-br from-amber-50 to-white", tile: "bg-amber-100 text-amber-700", son: "text-amber-800", chiziq: "bg-amber-400" },
    emerald: { karta: "border-emerald-200/80 bg-linear-to-br from-emerald-50 to-white", tile: "bg-emerald-100 text-emerald-700", son: "text-emerald-700", chiziq: "bg-emerald-400" },
    blue: { karta: "border-orange-200/80 bg-linear-to-br from-orange-50 to-white", tile: "bg-orange-100 text-orange-700", son: "text-orange-700", chiziq: "bg-orange-400" },
  }[rang];
  return (
    <div className={`relative min-w-0 overflow-hidden rounded-2xl border p-4 ${uslub.karta}`}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${uslub.chiziq}`} />
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${uslub.tile}`}>{ikonka}</span>
        <p className="text-[11px] font-black uppercase leading-tight tracking-wide text-slate-600">{nom}</p>
      </div>
      <p className={`mt-3 break-words font-extrabold tabular-nums ${yoq ? "text-sm !font-bold text-slate-400" : `${uslub.son} text-lg sm:text-xl`}`}>{qiymat}</p>
      <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{izoh}</p>
    </div>
  );
}
