import { Banknote, CheckCircle2, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { somMatni } from "@/lib/tolovOrtiqchasi";
import type { Valyuta } from "@/lib/valyuta";
import { pulniFormatlash } from "./savdoYordamchilari";

type Props = {
  /** Mijozga qaytim berilishi kerak bo'lgan summa, so'mda (server hisoblagani). */
  qaytim: number;
  /** Mijoz hisobiga o'tgan pul, sotuv valyutasida. */
  hisobga: number;
  sotuvValyutasi: Valyuta;
  /** To'lovdan keyingi qolgan qarz, sotuv valyutasida. */
  qolganQarz: number;
  onYopish: () => void;
};

// To'lov saqlangach: kassir mijozga qancha qaytim berishi (yoki qancha pul hisobga o'tgani) aniq ko'rinadi. Oyna "Yopish" bilan yopiladi.
export default function TolovNatijasiKarta({ qaytim, hisobga, sotuvValyutasi, qolganQarz, onYopish }: Props) {
  const { t } = useTranslation("savdo_tafsilot");
  const somBelgisi = t("tolovModal.somBelgisi");

  return (
    <div className="mt-7 space-y-5" data-testid="tolov-natijasi">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/60">
          <CheckCircle2 size={34} aria-hidden />
        </span>
        <h3 className="mt-4 text-xl font-black text-slate-900">{t("tolovModal.natija.sarlavha")}</h3>
        <p className={`mt-1 text-sm font-semibold ${qolganQarz > 0 ? "text-amber-600" : "text-emerald-600"}`}>
          {qolganQarz > 0
            ? t("tolovModal.natija.qarzQoldi", { summa: pulniFormatlash(qolganQarz, sotuvValyutasi) })
            : t("tolovModal.natija.qarzYopildi")}
        </p>
      </div>

      {qaytim > 0 && (
        <section
          aria-label={t("tolovModal.natija.qaytimSarlavha")}
          className="rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50 via-white to-white p-6 text-center shadow-[0_14px_36px_rgba(16,185,129,.12)]"
        >
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
            <Banknote size={22} aria-hidden />
          </span>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{t("tolovModal.natija.qaytimSarlavha")}</p>
          <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-emerald-600" data-testid="tolov-natijasi-qaytim">
            {somMatni(qaytim, somBelgisi)}
          </p>
          <p className="mx-auto mt-3 max-w-md text-xs font-semibold leading-5 text-slate-500">{t("tolovModal.natija.qaytimIzoh")}</p>
        </section>
      )}

      {hisobga > 0 && (
        <section
          aria-label={t("tolovModal.natija.hisobgaSarlavha")}
          className="flex items-start gap-4 rounded-3xl border border-sky-200 bg-linear-to-br from-sky-50 via-white to-white p-5 shadow-[0_14px_36px_rgba(14,165,233,.10)]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm">
            <Wallet size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">{t("tolovModal.natija.hisobgaSarlavha")}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-sky-700" data-testid="tolov-natijasi-hisobga">
              {pulniFormatlash(hisobga, sotuvValyutasi)}
            </p>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500">{t("tolovModal.natija.hisobgaIzoh")}</p>
          </div>
        </section>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onYopish}
          autoFocus
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563EB] px-8 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8]"
        >
          {t("tolovModal.natija.yopish")}
        </button>
      </div>
    </div>
  );
}
