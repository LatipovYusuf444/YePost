import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Home,
  BarChart3,
  PackageSearch,
  LogOut,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const menyular = [
  { nom: "Bosh sahifa", path: "/", icon: Home },
  { nom: "Savdo", path: "/savdo", icon: ShoppingCart },
  { nom: "Mahsulotlar", path: "/mahsulotlar", icon: PackageSearch },
  { nom: "Ombor", path: "/ombor", icon: Warehouse },
  { nom: "Mijozlar", path: "/mijozlar", icon: Users },
  { nom: "Kassa", path: "/kassa", icon: Wallet },
  { nom: "Hisobotlar", path: "/hisobotlar", icon: BarChart3 },
  { nom: "Xodimlar", path: "/hodimlar", icon: UserCog },
  { nom: "Sozlamalar", path: "/sozlamalar", icon: Settings },
];

export default function YonPanel() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <motion.aside
      initial={{ x: -64, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="peer/sidebar group fixed left-0 top-0 z-50 flex h-screen w-16 overflow-hidden bg-linear-to-br from-orange-400 via-orange-500 to-orange-700 text-white shadow-2xl shadow-orange-900/30 transition-[width] duration-200 ease-in-out hover:w-[246px]"
    >
      <div className="pointer-events-none absolute -top-12 left-0 h-44 w-44 rounded-full bg-white/25 blur-3xl" />
      <div className="flex h-full w-16 shrink-0 flex-col items-center bg-linear-to-b from-orange-600 via-orange-700 to-orange-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-25 w-full items-center justify-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-black text-orange-600 shadow-md">
            Y
          </div>
        </motion.div>

        <span className="mb-2 h-px w-8 shrink-0 bg-white/15" />

        <nav className="flex flex-1 flex-col items-center gap-2.5 py-1">
          {menyular.map((menu, index) => {
            const Icon = menu.icon;

            return (
              <motion.div
                key={menu.path}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.045, ease: [0.16, 1, 0.3, 1] }}
              >
                <NavLink
                  to={menu.path}
                  title={menu.nom}
                  className={({ isActive }) =>
                    [
                      "relative flex h-11 w-11 items-center justify-center rounded-2xl text-white/85 transition duration-300 hover:bg-white/12 hover:text-white",
                      isActive ? "bg-white/18 text-white shadow-inner" : "",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                      )}
                      <Icon size={22} strokeWidth={2.2} />
                    </>
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        <span className="mt-2 h-px w-8 shrink-0 bg-white/15" />

        <div className="flex h-23 w-full items-center justify-center">
          <button
            onClick={() => void handleLogout()}
            title="Tizimdan chiqish"
            aria-label="Tizimdan chiqish"
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/85 transition duration-300 hover:bg-white/12 hover:text-white"
          >
            <LogOut size={21} />
          </button>
        </div>
      </div>

      <div className="flex h-full w-[190px] shrink-0 -translate-x-3 flex-col opacity-0 transition-[transform,opacity] duration-200 ease-in-out group-hover:translate-x-0 group-hover:opacity-100">
        <div className="flex h-25 w-full items-center px-6">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold leading-5 tracking-wide text-white">
              YEPOST
            </h2>
            <p className="mt-0.5 truncate text-sm font-medium leading-5 text-white/78">
              Savdo tizimi
            </p>
          </div>
        </div>

        <span className="mb-2 ml-6 h-px w-8 shrink-0 bg-white/15" />

        <nav className="flex flex-1 flex-col gap-2.5 px-3 py-1">
          {menyular.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) =>
                [
                  "relative flex h-11 items-center rounded-full px-7 text-[15px] font-bold text-white/86 transition duration-300 hover:bg-white/12 hover:text-white",
                  isActive ? "bg-white/18 text-white shadow-inner" : "",
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

        <span className="mt-2 h-px w-8 shrink-0 bg-white/15" />

        <div className="flex h-23 w-full items-center px-3">
          <button
            onClick={() => void handleLogout()}
            className="flex h-11 w-full items-center rounded-full px-7 text-[15px] font-bold text-white/86 transition duration-300 hover:bg-white/12 hover:text-white"
          >
            <span>Chiqish</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
