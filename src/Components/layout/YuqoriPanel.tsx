import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Bell, LoaderCircle, LogOut, Menu, PackagePlus, Search, Settings, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/Components/common/LanguageSwitcher";
import ThemeSwitcher from "@/Components/theme/ThemeSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { crmApi } from "@/api/crmApi";
import MahsulotTanlashModal from "./MahsulotTanlashModal";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { Bildirishnoma } from "@/types/crm";
import type { JoriyFoydalanuvchi } from "@/types/tenant";

export default function YuqoriPanel({
  sidebarAcik,
  onSidebarToggle,
}: {
  sidebarAcik: boolean;
  onSidebarToggle: () => void;
}) {
  const { t } = useTranslation("topbar");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [bildirishnomalar, setBildirishnomalar] = useState<Bildirishnoma[]>([]);
  const [bildirishnomaOchiq, setBildirishnomaOchiq] = useState(false);
  const [bildirishnomaYuklanmoqda, setBildirishnomaYuklanmoqda] = useState(false);
  const [mahsulotModalOchiq, setMahsulotModalOchiq] = useState(false);

  const profil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!profil) void profilniYuklash();
  }, [profil, profilniYuklash]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const oqilmaganSoni = useMemo(
    () => bildirishnomalar.filter((item) => !item.isRead && !item.readAt).length,
    [bildirishnomalar]
  );

  async function bildirishnomalarniYuklash(unread = false) {
    setBildirishnomaYuklanmoqda(true);
    try {
      setBildirishnomalar(await crmApi.bildirishnomalar(unread || undefined));
    } catch {
      setBildirishnomalar([]);
    } finally {
      setBildirishnomaYuklanmoqda(false);
    }
  }

  async function bildirishnomaniOqish(id: string) {
    try {
      const yangilangan = await crmApi.bildirishnomaOqildi(id);
      setBildirishnomalar((items) =>
        items.map((item) => (item.id === id ? { ...item, ...yangilangan, isRead: true } : item))
      );
    } catch {
      setBildirishnomalar((items) =>
        items.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
    }
  }

  async function hammasiniOqish() {
    try {
      await crmApi.barchaBildirishnomalarOqildi();
      setBildirishnomalar((items) => items.map((item) => ({ ...item, isRead: true })));
    } catch {
      setBildirishnomalar((items) => items.map((item) => ({ ...item, isRead: true })));
    }
  }

  useEffect(() => {
    void bildirishnomalarniYuklash();
  }, []);

  // Bosh sahifa ("/") navbari avvalgidek qoladi; qolgan barcha sahifalar minimal navbardan foydalanadi.
  if (pathname === "/") {
    return (
      <header className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onSidebarToggle}
          aria-label={sidebarAcik ? t("sidebarClose") : t("sidebarOpen")}
          aria-expanded={sidebarAcik}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Menu size={20} />
        </button>
        <div className="theme-search flex h-13 min-w-0 flex-1 items-center rounded-[18px] border border-gold-200/60 bg-white/75 px-5 shadow-gold-soft transition focus-within:border-gold-400">
          <Search size={18} className="mr-3 shrink-0 text-[#94A3B8]" />
          <input
            placeholder={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
          />
        </div>
        <button
          type="button"
          onClick={() => setMahsulotModalOchiq(true)}
          className="flex h-13 w-13 items-center justify-center rounded-2xl border border-gold-200/60 bg-white text-[#0F172A] shadow-gold-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-300 hover:bg-gold-100 hover:text-gold-600 hover:shadow-gold-medium active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
          aria-label={t("addProduct")}
        >
          <PackagePlus size={20} />
        </button>
        <ThemeSwitcher />
        <LanguageSwitcher variant="light" />
        <BildirishnomaTugmasi
          ochiq={bildirishnomaOchiq}
          setOchiq={setBildirishnomaOchiq}
          items={bildirishnomalar}
          oqilmaganSoni={oqilmaganSoni}
          yuklanmoqda={bildirishnomaYuklanmoqda}
          onReload={() => void bildirishnomalarniYuklash()}
          onRead={(id) => void bildirishnomaniOqish(id)}
          onReadAll={() => void hammasiniOqish()}
        />
        <ProfilTugmasi
          profil={profil}
          onLogout={() => void handleLogout()}
        />
        {mahsulotModalOchiq && (
          <MahsulotTanlashModal onClose={() => setMahsulotModalOchiq(false)} />
        )}
      </header>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 flex h-16 items-center justify-between gap-2 rounded-2xl border border-gray-200/80 bg-white px-4"
    >
      <button
        type="button"
        onClick={onSidebarToggle}
        aria-label={sidebarAcik ? t("sidebarClose") : t("sidebarOpen")}
        aria-expanded={sidebarAcik}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher variant="light" />
        <BildirishnomaTugmasi
        ochiq={bildirishnomaOchiq}
        setOchiq={setBildirishnomaOchiq}
        items={bildirishnomalar}
        oqilmaganSoni={oqilmaganSoni}
        yuklanmoqda={bildirishnomaYuklanmoqda}
        onReload={() => void bildirishnomalarniYuklash()}
        onRead={(id) => void bildirishnomaniOqish(id)}
        onReadAll={() => void hammasiniOqish()}
      />
      <ProfilTugmasi
        profil={profil}
        onLogout={() => void handleLogout()}
        bosHarfBilan
      />
      </div>
    </motion.header>
  );
}

function BildirishnomaTugmasi({
  ochiq,
  setOchiq,
  items,
  oqilmaganSoni,
  yuklanmoqda,
  onReload,
  onRead,
  onReadAll,
}: {
  ochiq: boolean;
  setOchiq: (value: boolean) => void;
  items: Bildirishnoma[];
  oqilmaganSoni: number;
  yuklanmoqda: boolean;
  onReload: () => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  const { t } = useTranslation("topbar");
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState({ top: 0, right: 24 });

  useEffect(() => {
    if (!ochiq) return;

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(380, window.innerWidth - 24);
      setPosition({
        top: rect.bottom + 10,
        right: Math.max(12, window.innerWidth - rect.right),
      });
      if (rect.right - width < 12) {
        setPosition({
          top: rect.bottom + 10,
          right: 12,
        });
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [ochiq]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOchiq(!ochiq);
          if (!ochiq) onReload();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
        aria-label={t("notifications.aria")}
      >
        <Bell size={18} />
        {oqilmaganSoni > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {oqilmaganSoni > 9 ? "9+" : oqilmaganSoni}
          </span>
        )}
      </button>

      {ochiq &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[190] cursor-default bg-transparent"
              aria-label={t("notifications.closeAria")}
              onClick={() => setOchiq(false)}
            />
            <div
              className="fixed z-[200] w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-gold-100 bg-white shadow-[0_24px_90px_rgba(15,23,42,.22)]"
              style={{ top: position.top, right: position.right }}
            >
          <div className="flex items-center justify-between border-b border-gold-50 px-4 py-3">
            <div>
              <p className="font-black text-gray-900">{t("notifications.title")}</p>
              <p className="text-xs text-gray-400">{t("notifications.unreadCount", { count: oqilmaganSoni })}</p>
            </div>
            <button
              type="button"
              onClick={onReadAll}
              className="rounded-xl bg-gold-50 px-3 py-2 text-xs font-bold text-gold-600"
            >
              {t("notifications.markAllRead")}
            </button>
          </div>

          <div className="max-h-[380px] overflow-auto p-2">
            {yuklanmoqda ? (
              <div className="flex h-28 items-center justify-center">
                <LoaderCircle className="animate-spin text-gold-500" size={24} />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm font-medium text-gray-400">
                {t("notifications.empty")}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onRead(item.id)}
                  className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-gold-50"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        item.isRead || item.readAt ? "bg-gray-200" : "bg-gold-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-gray-800">
                        {item.title ?? t("notifications.defaultTitle")}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                        {item.text ?? item.message ?? t("notifications.defaultMessage")}
                      </p>
                      {item.createdAt && (
                        <p className="mt-1 text-[11px] font-bold text-gold-500">
                          {new Date(item.createdAt).toLocaleString("uz-UZ")}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

function ProfilTugmasi({
  profil,
  onLogout,
  bosHarfBilan = false,
}: {
  profil: JoriyFoydalanuvchi | null;
  onLogout: () => void;
  bosHarfBilan?: boolean;
}) {
  const { t } = useTranslation(["topbar", "nav"]);

  const ism = profil?.fullName?.trim() || profil?.username || "";
  const rolNomi = profil ? t(`roles.${profil.role}`, { ns: "nav", defaultValue: profil.role }) : "";
  const rasmUrl = profil?.avatarUrl || "";
  // Rasm bo'lmasa ism bosh harfi (faqat bosHarfBilan berilgan navbarda); ism yo'q bo'lsa avvalgi ikonka.
  const bosHarf = bosHarfBilan && ism ? ism.charAt(0).toUpperCase() : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 ${bosHarf ? "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-gray-200 bg-white/60 text-gray-700 hover:border-gold-200 hover:bg-gold-50 hover:text-gold-600"}`}
          aria-label={t("profile.menuAria")}
        >
          {rasmUrl ? (
            <img src={rasmUrl} alt={ism || t("profile.defaultName")} className="h-full w-full object-cover" />
          ) : bosHarf ? (
            <span className="text-sm font-bold">{bosHarf}</span>
          ) : (
            <UserRound size={18} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-65 overflow-hidden rounded-[24px] p-0">
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/70 p-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-sm ${bosHarf ? "border-blue-100 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"}`}>
            {rasmUrl ? (
              <img src={rasmUrl} alt={ism || t("profile.defaultName")} className="h-full w-full object-cover" />
            ) : bosHarf ? (
              <span className="text-base font-bold">{bosHarf}</span>
            ) : (
              <UserRound size={20} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-black text-slate-900">{ism || t("profile.defaultName")}</p>
            <p className="truncate text-xs font-bold text-gray-500">{rolNomi || t("profile.unknownRole")}</p>
          </div>
        </div>
        <div className="p-2">
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-2.5 font-bold text-gray-700">
            <Link to="/sozlamalar">
              <UserRound size={17} /> {t("profile.myProfile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-2xl px-3 py-2.5 font-bold text-gray-700">
            <Link to="/sozlamalar">
              <Settings size={17} /> {t("profile.settings")}
            </Link>
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="mx-0 bg-gold-100" />
        <div className="p-2">
          <DropdownMenuItem variant="destructive" onClick={onLogout} className="rounded-2xl px-3 py-2.5 font-bold">
            <LogOut size={17} /> {t("profile.logout")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
