import { Bell, CalendarDays, ChevronDown, Search, Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type ModuleKey = "savdo" | "mahsulotlar" | "mijozlar" | "ombor" | "default";

const moduleTabs: Record<ModuleKey, Array<{ nom: string; path: string }>> = {
  savdo: [{ nom: "Savdo", path: "/savdo" }],
  mahsulotlar: [{ nom: "Mahsulotlar", path: "/mahsulotlar" }],
  mijozlar: [{ nom: "Mijozlar", path: "/mijozlar" }],
  ombor: [
    { nom: "Omborlar", path: "/ombor" },
    { nom: "Kirim", path: "/ombor/kirimlar" },
    { nom: "Amalga oshirilganlar", path: "/ombor/amalga-oshirilganlar" },
    { nom: "Chiqim", path: "/ombor/chiqimlar" },
    { nom: "Ko'chirish", path: "/ombor/kochirishlar" },
    { nom: "Qoldiq", path: "/ombor/qoldiq" },
    { nom: "Inventarizatsiya", path: "/ombor/inventarizatsiya" },
  ],
  default: [{ nom: "Bosh sahifa", path: "/" }],
};

function getModuleKey(pathname: string): ModuleKey {
  if (pathname.startsWith("/savdo")) return "savdo";
  if (pathname.startsWith("/mahsulotlar")) return "mahsulotlar";
  if (pathname.startsWith("/mijozlar")) return "mijozlar";
  if (pathname.startsWith("/ombor")) return "ombor";
  return "default";
}

export default function YuqoriPanel() {
  const { pathname } = useLocation();
  const moduleKey = getModuleKey(pathname);

  if (moduleKey === "default") {
    return (
      <header className="mb-6 flex items-center gap-4">
        <div className="flex h-11 flex-1 items-center rounded-2xl border border-orange-100 bg-white/60 px-4 shadow-sm">
          <input
            placeholder="Qidirish"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <Search size={18} className="text-gray-400" />
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white/60 text-gray-700">
          <Bell size={18} />
        </button>
      </header>
    );
  }

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-xl">
      <nav className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
        {moduleTabs[moduleKey].map((tab) => {
          const isActive =
            pathname === tab.path ||
            (tab.path !== "/ombor" && pathname.startsWith(`${tab.path}/`));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`relative shrink-0 pb-2 text-sm ${
                isActive
                  ? "font-bold text-orange-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-orange-500"
                  : "font-medium text-gray-500 hover:text-orange-600"
              }`}
            >
              {tab.nom}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white/60 text-gray-700">
          <Bell size={18} />
        </button>
        <button className="hidden h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white/60 px-3 text-sm text-gray-600 lg:flex">
          <CalendarDays size={17} /> Bugun <ChevronDown size={15} />
        </button>
        <button className="hidden h-10 items-center gap-2 rounded-2xl bg-orange-500 px-3 text-sm font-bold text-white lg:flex">
          <Zap size={17} /> Tezkor amallar
        </button>
      </div>
    </header>
  );
}
