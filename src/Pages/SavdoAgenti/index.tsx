import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, MessagesSquare, ShieldCheck, SlidersHorizontal, Target, type LucideIcon } from "lucide-react";
import { savdoAgentiApi } from "@/api/savdoAgentiApi";
import { foydalanuvchiAdminmi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import Suhbatlar from "./Suhbatlar";
import Lidlar from "./Lidlar";
import TasdiqKutayotganlar from "./TasdiqKutayotganlar";
import AgentSozlamalari from "./AgentSozlamalari";

export type SavdoAgentiBolimi = "tasdiq" | "lidlar" | "suhbatlar" | "sozlamalar";

// Tartib spetsifikatsiya (11-bo'lim) bo'yicha. Sozlamalar — faqat ADMIN/DIREKTOR (backend ham faqat ularga beradi).
const TABLAR: Array<{ bolim: SavdoAgentiBolimi; yol: string; icon: LucideIcon; faqatRahbar?: boolean }> = [
  { bolim: "tasdiq", yol: "/savdo-agenti/tasdiq-kutayotganlar", icon: ShieldCheck },
  { bolim: "lidlar", yol: "/savdo-agenti/lidlar", icon: Target },
  { bolim: "suhbatlar", yol: "/savdo-agenti/suhbatlar", icon: MessagesSquare },
  { bolim: "sozlamalar", yol: "/savdo-agenti/sozlamalar", icon: SlidersHorizontal, faqatRahbar: true },
];

const BELGI_YANGILASH_MS = 60_000;

export default function SavdoAgenti({ bolim }: { bolim: SavdoAgentiBolimi }) {
  const { t } = useTranslation("savdo_agenti");
  const profil = useAuthProfileStore((state) => state.profil);
  const rahbar = foydalanuvchiAdminmi(profil);
  const [kutayotganSoni, setKutayotganSoni] = useState<number | null>(null);

  // Tab belgisi: tasdiq kutayotgan agent buyurtmalari soni (fon so'rovi, xato bo'lsa belgi yo'q). Tasdiq tabida ro'yxatning o'zi beradi.
  const soniniYuklash = useCallback(() => {
    savdoAgentiApi
      .qoralamalar({ page: 1, pageSize: 1 }, true)
      .then((natija) => setKutayotganSoni(natija.total))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (bolim === "tasdiq") return;
    soniniYuklash();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") soniniYuklash();
    }, BELGI_YANGILASH_MS);
    return () => window.clearInterval(id);
  }, [bolim, soniniYuklash]);

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
        {TABLAR.filter((tab) => !tab.faqatRahbar || rahbar).map(({ bolim: tabBolimi, yol, icon: Icon }) => {
          const faol = tabBolimi === bolim;
          const soni = tabBolimi === "tasdiq" ? kutayotganSoni : null;
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
              {soni !== null && soni > 0 && (
                <span
                  data-tasdiq-soni={soni}
                  className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-black leading-4 ${faol ? "bg-white/25 text-white" : "bg-rose-500 text-white"}`}
                >
                  {soni > 99 ? "99+" : soni}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {bolim === "suhbatlar" ? (
        <Suhbatlar />
      ) : bolim === "lidlar" ? (
        <Lidlar />
      ) : bolim === "tasdiq" ? (
        <TasdiqKutayotganlar onSoni={setKutayotganSoni} />
      ) : (
        <AgentSozlamalari />
      )}
    </div>
  );
}
