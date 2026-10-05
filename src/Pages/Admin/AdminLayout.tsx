import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ChevronRight, CreditCard, Headset, LayoutDashboard, LogOut, ShieldCheck, Tag, Users } from "lucide-react";
import LanguageSwitcher from "@/Components/common/LanguageSwitcher";
import ThemeSwitcher from "@/Components/theme/ThemeSwitcher";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";

const MENYU = [
  { key: "dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { key: "kompaniyalar", path: "/admin/kompaniyalar", icon: Building2, end: false },
  { key: "tariflar", path: "/admin/tariflar", icon: Tag, end: false },
  { key: "obunalar", path: "/admin/obunalar", icon: CreditCard, end: false },
  { key: "foydalanuvchilar", path: "/admin/foydalanuvchilar", icon: Users, end: false },
  { key: "qollabQuvvatlash", path: "/admin/qollab-quvvatlash", icon: Headset, end: false },
] as const;

const qatorKlass = "group relative flex h-11 items-center gap-3 rounded-[14px] px-3.5 text-[14.5px] transition-colors duration-200";

// Super admin (isStaff) uchun alohida maket: kompaniyaga bog'liq narsalar (qo'llab-quvvatlash, bildirishnoma,
// ombor, savdo) yo'q, shuning uchun oddiy YonPanel/YuqoriPanel ishlatilmaydi.
export default function AdminLayout() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const joriy = MENYU.find((item) => (item.end ? pathname === item.path : pathname.startsWith(item.path))) ?? MENYU[0];
  const JoriyIkonka = joriy.icon;
  const logout = useAuthStore((state) => state.logout);
  const username = useAuthStore((state) => state.username);
  const profil = useAuthProfileStore((state) => state.profil);
  const ism = profil?.fullName?.trim() || profil?.username || username || "";

  async function chiqish() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-cream-50 via-cream-200 to-gold-150">
      <aside className="theme-sidebar fixed left-3 top-3 z-50 hidden h-[calc(100vh-24px)] w-[260px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1424] text-[#8391A7] shadow-[0_28px_70px_rgba(2,6,23,.38)] md:flex">
        <div className="flex h-[72px] shrink-0 items-center gap-3 px-[18px]">
          <div className="theme-logo flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-sky-400 to-blue-600 text-lg font-black text-white">Y</div>
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-bold leading-6 tracking-wide text-white">YEPOST</h2>
            <p className="flex items-center gap-1 truncate text-[12.5px] font-medium leading-4 text-violet-300">
              <ShieldCheck size={12} /> {t("brandTagline")}
            </p>
          </div>
        </div>
        <span className="mx-3 h-px shrink-0 bg-white/10" />
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {MENYU.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `${qatorKlass} ${isActive ? "theme-sidebar-active font-semibold text-white shadow-[0_8px_20px_rgba(2,6,23,.28)]" : "theme-sidebar-item font-medium hover:bg-[#122036] hover:text-slate-100"}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3 top-2.5 h-6 w-1 rounded-r-full bg-sky-400" />}
                    <Icon size={18} strokeWidth={2} className={isActive ? "text-sky-300" : "transition-colors group-hover:text-slate-200"} />
                    <span className="truncate">{t(`menu.${item.key}`)}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="theme-sidebar-profile flex items-center gap-3 rounded-[12px] bg-[#111C30] p-2.5 ring-1 ring-white/5">
            <span className="theme-sidebar-avatar relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#123A55] text-[15px] font-bold text-sky-200">
              {ism.charAt(0).toUpperCase() || "S"}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111C30] bg-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold leading-5 text-slate-100">{ism}</p>
              <p className="truncate text-[12.5px] leading-4 text-violet-300">{t("superAdmin")}</p>
            </div>
            <button type="button" onClick={() => void chiqish()} aria-label={t("chiqish")} title={t("chiqish")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8391A7] transition-colors hover:bg-red-500/10 hover:text-red-300">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen w-full min-w-0 max-w-full overflow-x-clip pl-4 pr-6 pt-3 pb-4 md:pl-[288px]">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[#0B1424] px-4 py-3 text-slate-200 shadow-[0_18px_44px_rgba(2,6,23,.28)]">
          <div className="flex items-center gap-2 text-sm font-black md:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white">Y</span>
            {t("superAdmin")}
          </div>
          <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-violet-300">
              <ShieldCheck size={16} />
            </span>
            <span className="font-semibold text-slate-400">{t("brandTagline")}</span>
            <ChevronRight size={15} className="text-slate-600" />
            <span className="inline-flex items-center gap-1.5 truncate font-black text-white">
              <JoriyIkonka size={15} className="text-sky-300" /> {t(`menu.${joriy.key}`)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher variant="dark" />
            <LanguageSwitcher />
            <button type="button" onClick={() => void chiqish()} aria-label={t("chiqish")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-red-500/15 hover:text-red-300 md:hidden">
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* Mobil: yon panel yo'q, shuning uchun gorizontal menyu. */}
        <nav className="mb-3 flex gap-2 overflow-x-auto md:hidden" aria-label={t("brandTagline")}>
          {MENYU.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-black transition ${isActive ? "bg-orange-500 text-white shadow-md shadow-orange-500/25" : "bg-white text-slate-600 ring-1 ring-slate-200"}`
                }
              >
                <Icon size={16} /> {t(`menu.${item.key}`)}
              </NavLink>
            );
          })}
        </nav>

        <div className="app-main-surface @container min-h-[calc(100vh-120px)] min-w-0 max-w-full rounded-[34px] border border-gold-200/60 bg-white/80 p-7 shadow-gold-medium backdrop-blur-xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
