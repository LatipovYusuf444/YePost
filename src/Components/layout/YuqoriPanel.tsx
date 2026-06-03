import {
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChevronDown,
  Clock3,
  ReceiptText,
  ScanBarcode,
  Search,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type ModuleKey = "savdo" | "mahsulotlar" | "mijozlar" | "ombor" | "default";

const moduleTabs: Record<ModuleKey, string[]> = {
  savdo: [
    "Savdo",
    "Qaytarish",
    "Bekor qilinganlar",
    "Mahsulotlar va ombor",
    "Mijozlar",
    "Analitika",
    "Smena yopish",
  ],
  mahsulotlar: [
    "Mahsulotlar",
    "Kategoriyalar",
    "Narxlar",
    "Qoldiqlar",
    "Import",
    "Analitika",
  ],
  mijozlar: ["Mijozlar", "Guruhlar", "Qarzdorlik", "Aloqalar", "Analitika"],
  ombor: ["Ombor", "Kirim", "Chiqim", "Qoldiqlar", "Inventarizatsiya"],
  default: ["Bosh sahifa", "Savdo holati", "Kassa", "Hisobotlar"],
};

const moduleBasePath: Record<ModuleKey, string> = {
  savdo: "/savdo",
  mahsulotlar: "/mahsulotlar",
  mijozlar: "/mijozlar",
  ombor: "/ombor",
  default: "/",
};

const homeIconButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white/60 text-gray-700 shadow-sm backdrop-blur-xl transition hover:bg-orange-500 hover:text-white";

function getModuleKey(pathname: string): ModuleKey {
  if (pathname.startsWith("/savdo")) return "savdo";
  if (pathname.startsWith("/mahsulotlar")) return "mahsulotlar";
  if (pathname.startsWith("/mijozlar")) return "mijozlar";
  if (pathname.startsWith("/ombor")) return "ombor";

  return "default";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

export default function YuqoriPanel() {
  const { pathname } = useLocation();
  const moduleKey = getModuleKey(pathname);
  const tabs = moduleTabs[moduleKey];
  const basePath = moduleBasePath[moduleKey];

  if (moduleKey === "default") {
    return (
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex h-11 flex-1 items-center rounded-2xl border border-orange-100 bg-white/60 px-4 shadow-sm backdrop-blur-xl">
          <input
            type="text"
            placeholder="Artikul, shtrix-kod, nomi"
            className="h-full flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-orange-900/35"
          />

          <button className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-700 transition hover:bg-white/80 hover:text-orange-600">
            <Search size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button title="Shtrix kod" className={homeIconButtonClass}>
            <ScanBarcode size={18} />
          </button>

          <button title="Ko'chirish" className={homeIconButtonClass}>
            <ArrowLeftRight size={18} />
          </button>

          <button title="Tarix" className={homeIconButtonClass}>
            <Clock3 size={18} />
          </button>

          <button title="Cheklar" className={homeIconButtonClass}>
            <ReceiptText size={18} />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-xl">
      <nav className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
        {tabs.map((tab, index) => {
          const isActive = index === 0;
          const to = index === 0 ? basePath : `${basePath}#${slugify(tab)}`;

          return (
            <Link
              key={tab}
              to={to}
              className={[
                "relative shrink-0 pb-2 text-sm transition-colors",
                isActive
                  ? "font-semibold text-orange-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500"
                  : "font-medium text-gray-500 hover:text-orange-600",
              ].join(" ")}
            >
              {tab}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <button
          title="Bildirishnomalar"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white/60 text-gray-700 shadow-sm transition hover:bg-orange-500 hover:text-white"
        >
          <Bell size={18} />
        </button>

        <button className="flex h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white/60 px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:text-orange-600">
          <CalendarDays size={17} />
          Sana filteri
        </button>

        <button className="flex h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white/60 px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:text-orange-600">
          Bugun
          <ChevronDown size={16} />
        </button>

        <button className="flex h-10 items-center gap-2 rounded-2xl bg-orange-500 px-3 text-sm font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600">
          <Zap size={17} />
          Tezkor amallar
        </button>
      </div>
    </header>
  );
}
