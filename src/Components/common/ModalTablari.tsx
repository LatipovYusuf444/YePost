import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/Components/ui/tabs";

export type TabElementi = { id: string; nom: string; soni?: number; icon?: ReactNode };

// Butun ilova uchun yagona tab ko'rinishi (shadcn Tabs asosida). Faqat navigatsiya:
// tanlangan tabning ma'lumoti chaquruvchi tomonda ko'rsatiladi.
export default function ModalTablari({
  tablar,
  faol,
  onChange,
  className = "",
}: {
  tablar: TabElementi[];
  faol: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <Tabs value={faol} onValueChange={onChange} className={`max-w-full ${className}`}>
      <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList className="h-auto w-fit gap-1 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/70 group-data-horizontal/tabs:h-auto">
          {tablar.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="h-9 flex-none gap-1.5 rounded-lg px-3.5 text-[13px] font-bold text-slate-500 after:hidden hover:text-slate-800 data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-[0_2px_8px_rgba(37,99,235,.18)] data-[state=active]:ring-1 data-[state=active]:ring-blue-100">
              {tab.icon}
              {tab.nom}
              {typeof tab.soni === "number" && (
                <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-500 group-data-[state=active]/tabs-list:bg-blue-50">
                  {tab.soni}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
