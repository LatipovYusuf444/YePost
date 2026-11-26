import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, MessagesSquare, ShieldCheck, SlidersHorizontal, Sparkles, Target, type LucideIcon } from "lucide-react";
import Suhbatlar from "./Suhbatlar";
import Lidlar from "./Lidlar";

export type SavdoAgentiBolimi = "tasdiq" | "lidlar" | "suhbatlar" | "sozlamalar";

// Tartib spetsifikatsiya (11-bo'lim) bo'yicha. `tayyor: false` — backend keyingi bosqichda keladi.
const TABLAR: Array<{ bolim: SavdoAgentiBolimi; yol: string; icon: LucideIcon; tayyor: boolean }> = [
  { bolim: "tasdiq", yol: "/savdo-agenti/tasdiq-kutayotganlar", icon: ShieldCheck, tayyor: false },
  { bolim: "lidlar", yol: "/savdo-agenti/lidlar", icon: Target, tayyor: true },
  { bolim: "suhbatlar", yol: "/savdo-agenti/suhbatlar", icon: MessagesSquare, tayyor: true },
  { bolim: "sozlamalar", yol: "/savdo-agenti/sozlamalar", icon: SlidersHorizontal, tayyor: false },
];

export default function SavdoAgenti({ bolim }: { bolim: SavdoAgentiBolimi }) {
  const { t } = useTranslation("savdo_agenti");

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-200">
          <Bot size={24} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-black leading-7 text-slate-900">{t("title")}</h1>
          <p className="text-sm font-medium text-slate-500">{t("subtitle")}</p>
        </div>
      </header>

      <nav
        role="tablist"
        aria-label={t("title")}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm [scrollbar-width:none]"
      >
        {TABLAR.map(({ bolim: tabBolimi, yol, icon: Icon, tayyor }) => {
          const faol = tabBolimi === bolim;
          return (
            <NavLink
              key={tabBolimi}
              to={yol}
              role="tab"
              aria-selected={faol}
              className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                faol ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span>{t(`tabs.${tabBolimi}`)}</span>
              {!tayyor && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    faol ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {t("tezOrada.badge")}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {bolim === "suhbatlar" ? <Suhbatlar /> : bolim === "lidlar" ? <Lidlar /> : <TezOrada bolim={bolim} />}
    </div>
  );
}

function TezOrada({ bolim }: { bolim: "tasdiq" | "sozlamalar" }) {
  const { t } = useTranslation("savdo_agenti");
  const Icon = bolim === "tasdiq" ? ShieldCheck : SlidersHorizontal;
  return (
    <section className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-[26px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-amber-50 to-orange-100 text-amber-600 ring-1 ring-amber-100">
        <Icon size={34} />
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
        <Sparkles size={13} />
        {t("tezOrada.badge")}
      </span>
      <h2 className="text-lg font-black text-slate-900">{t(`tabs.${bolim}`)}</h2>
      <p className="max-w-md text-sm leading-6 text-slate-500">{t(`tezOrada.${bolim}`)}</p>
      <p className="text-xs font-bold text-slate-400">{t("tezOrada.hozir")}</p>
    </section>
  );
}
