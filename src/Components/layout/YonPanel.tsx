import { NavLink } from "react-router-dom";
import {
  Home,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

const menyular = [
  { nom: "Bosh sahifa", path: "/", icon: Home },
  { nom: "Savdo", path: "/savdo", icon: ShoppingCart },
  { nom: "Ombor", path: "/ombor", icon: Warehouse },
  { nom: "Mijozlar", path: "/mijozlar", icon: Users },
  { nom: "Mahsulotlar", path: "/mahsulotlar", icon: Package },
  { nom: "Kassa", path: "/kassa", icon: Wallet },
  { nom: "Sozlamalar", path: "/sozlamalar", icon: Settings },
];

export default function YonPanel() {
  return (
    <aside className="peer/sidebar group fixed left-0 top-0 z-50 flex h-screen w-14 overflow-hidden rounded-r-[28px] bg-gradient-to-b from-orange-400 via-orange-600 to-orange-700 text-white shadow-2xl shadow-orange-600/25 transition-[width] duration-300 ease-out hover:w-[246px]">
      <div className="flex h-full w-14 shrink-0 flex-col items-center bg-gradient-to-b from-orange-700 via-orange-800 to-orange-900/95">
        <div className="flex h-[108px] w-full items-start justify-center pt-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-black text-orange-600 shadow-sm">
            Y
          </div>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-3">
          {menyular.map((menu) => {
            const Icon = menu.icon;

            return (
              <NavLink
                key={menu.path}
                to={menu.path}
                title={menu.nom}
                className={({ isActive }) =>
                  [
                    "relative flex h-10 w-10 items-center justify-center rounded-2xl text-white/85 transition duration-300 hover:bg-white/12 hover:text-white",
                    isActive ? "bg-white/18 text-white" : "",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                    )}
                    <Icon size={21} strokeWidth={2.2} />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex h-[96px] w-full items-center justify-center">
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl text-white/85 transition duration-300 hover:bg-white/12 hover:text-white">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="flex h-full w-[190px] shrink-0 translate-x-[-12px] flex-col duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100">
        <div className="flex h-[108px] items-start px-6 pt-7">
          <div className="flex items-center">
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold leading-5 tracking-wide text-white">
                YEPOST
              </h2>
              <p className="mt-0.5 truncate text-sm font-medium leading-5 text-white/78">
                Savdo tizimi
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-3 px-3">
          {menyular.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) =>
                [
                  "relative flex h-10 items-center rounded-full px-7 text-[15px] font-bold text-white/86 transition duration-300 hover:bg-white/12 hover:text-white",
                  isActive ? "bg-white/18 text-white" : "",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white" />
                  )}
                  <span className="truncate">{menu.nom}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative mx-4 flex h-[96px] items-center">
          <span className="absolute left-0 right-0 top-0 h-px bg-white/18" />
          <button className="flex h-10 w-full items-center rounded-full px-7 text-[15px] font-bold text-white/86 transition duration-300 hover:bg-white/12 hover:text-white">
            <span>Chiqish</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
