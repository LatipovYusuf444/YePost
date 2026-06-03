import { NavLink } from "react-router-dom";
import {
  // Grid2X2,
  Home,
  Boxes,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

const menyular = [
  { nom: "Bosh sahifa", path: "/", icon: Home },
  { nom: "Savdo", path: "/savdo", icon: ShoppingCart },
  { nom: "Ombor", path: "/ombor", icon: Boxes },
  // { nom: "POS", path: "/pos", icon: Grid2X2 },
  { nom: "Mijozlar", path: "/mijozlar", icon: Users },
  { nom: "Mahsulotlar", path: "/mahsulotlar", icon: Package },
  { nom: "Kassa", path: "/kassa", icon: Wallet },
  { nom: "Sozlamalar", path: "/sozlamalar", icon: Settings },
];

export default function YonPanel() {
  return (
    <aside className="peer/sidebar group fixed left-0 top-0 z-50 flex h-screen w-[92px] flex-col rounded-r-[42px] bg-gradient-to-b from-orange-400 via-orange-600 to-orange-700 px-4 py-6 text-white shadow-2xl shadow-orange-500/30 transition-all duration-500 ease-in-out hover:w-[280px]">
      <div className="mb-8 flex h-12 items-center gap-3 overflow-hidden">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-orange-600">
          Y
        </div>

        <div className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-500 group-hover:w-[160px] group-hover:opacity-100">
          <h2 className="text-base font-bold leading-4">YEPOST</h2>
          <p className="mt-1 text-xs text-white/70">Savdo tizimi</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-3">
        {menyular.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.path}
              to={menu.path}
              title={menu.nom}
              className={({ isActive }) =>
                [
                  "flex h-12 items-center gap-4 rounded-full px-3 text-sm font-semibold transition-all duration-300",
                  isActive
                    ? "bg-white text-orange-600 shadow-lg shadow-orange-900/10"
                    : "text-white/90 hover:bg-white/15 hover:text-white",
                ].join(" ")
              }
            >
              <Icon size={24} className="shrink-0" />
              <span className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-500 group-hover:w-[170px] group-hover:opacity-100">
                {menu.nom}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <button className="mt-6 flex h-12 items-center gap-4 overflow-hidden rounded-full px-3 text-sm font-semibold text-white/90 transition hover:bg-white/15">
        <LogOut size={20} className="shrink-0" />
        <span className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-500 group-hover:w-[170px] group-hover:opacity-100">
          Chiqish
        </span>
      </button>
    </aside>
  );
}
