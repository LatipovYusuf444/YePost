import {
  Activity,
  BarChart3,
  FileClock,
  Layers,
  Scale,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import TovarHarakati from "./TovarHarakati";
import QoldiqHisoboti from "./QoldiqHisoboti";
import OzaroHisobKitob from "./OzaroHisobKitob";
import FoydaHisoboti from "./FoydaHisoboti";
import FoydaXarajatHisoboti from "./FoydaXarajatHisoboti";
import KirimChiqimHisoboti from "./KirimChiqimHisoboti";
import { HisobotRealDataProvider, useHisobotRealData } from "./HisobotRealData";
import type { HisobotTab } from "./types";
import AuditLoglari from "./AuditLoglari";

const tablar: Array<{ id: HisobotTab; nom: string; icon: typeof BarChart3 }> = [
  { id: "stock", nom: "Tovar harakati", icon: Activity },
  { id: "qoldiq", nom: "Ombor qoldig'i", icon: Layers },
  { id: "counterparty", nom: "O'zaro hisob-kitob", icon: UsersRound },
  { id: "profit", nom: "Foyda hisoboti", icon: TrendingUp },
  { id: "foydaxarajat", nom: "Foyda va xarajat", icon: Scale },
  { id: "income", nom: "Kirim-chiqim", icon: WalletCards },
  { id: "audit", nom: "Audit loglari", icon: FileClock },
];

export default function HisobotUchot({ tab }: { tab: HisobotTab }) {
  return (
    <HisobotRealDataProvider tab={tab}>
      <HisobotSahifasi tab={tab} />
    </HisobotRealDataProvider>
  );
}

function HisobotSahifasi({ tab }: { tab: HisobotTab }) {
  const { yuklanmoqda, xato } = useHisobotRealData();
  const joriyTab = tablar.find((item) => item.id === tab) ?? tablar[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">Hisobotlar / Alohida hisobot</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-gray-950">{joriyTab.nom}</h1>
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-emerald-50 px-3 text-sm font-bold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {yuklanmoqda ? "Ma’lumot yuklanmoqda" : "Real backend"}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Ushbu hisobot o‘ziga tegishli real backend ma’lumotlarini ko‘rsatadi.</p>
      </header>

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {tab === "stock" ? (
        <TovarHarakati />
      ) : tab === "qoldiq" ? (
        <QoldiqHisoboti />
      ) : tab === "counterparty" ? (
        <OzaroHisobKitob />
      ) : tab === "profit" ? (
        <FoydaHisoboti />
      ) : tab === "foydaxarajat" ? (
        <FoydaXarajatHisoboti />
      ) : tab === "income" ? (
        <KirimChiqimHisoboti />
      ) : (
        <AuditLoglari />
      )}
    </div>
  );
}
