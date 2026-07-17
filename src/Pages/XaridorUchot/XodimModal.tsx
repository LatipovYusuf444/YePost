import { Briefcase, Phone, UserRound, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type { Xodim } from "./types";

type Props = {
  xodim: Xodim;
  onYopish: () => void;
};

// Savdolar jadvalidagi "Mas'ul shaxs"ni bosganda ochiladigan xodim ma'lumoti (mock).
export default function XodimModal({ xodim, onYopish }: Props) {
  return (
    <AppModal className="bg-[rgba(54,22,8,.45)] p-4 backdrop-blur-[3px]">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
        <header className="flex items-center justify-between gap-4 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-7 py-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFF3E2] text-[#FF6A00]">
              <UserRound size={22} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{xodim.ism}</h1>
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                Mas'ul xodim
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-orange-500 hover:text-white"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </header>

        <dl className="space-y-4 px-7 py-6">
          <Qator icon={<Briefcase size={14} />} nom="Lavozim" qiymat={xodim.lavozim} />
          <Qator icon={<Phone size={14} />} nom="Telefon" qiymat={xodim.telefon} />
        </dl>
      </div>
    </AppModal>
  );
}

function Qator({ icon, nom, qiymat }: { icon: React.ReactNode; nom: string; qiymat: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
        <span className="text-[#FF6A00]">{icon}</span>
        {nom}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-slate-800">{qiymat || "—"}</dd>
    </div>
  );
}
