import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Bell, BellOff, CheckCheck, FileBarChart, LoaderCircle, LogOut, Menu, Package, PackagePlus, Search, Settings, ShoppingCart, UserRound, Users, Wallet } from "lucide-react";
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
import { Checkbox } from "@/Components/ui/checkbox";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { Bildirishnoma } from "@/types/crm";
import type { JoriyFoydalanuvchi } from "@/types/tenant";

import { useAvatarUrl } from "@/store/avatarStore";
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
      <header className="theme-sidebar mb-4 flex items-center gap-3 rounded-[24px] border border-white/10 bg-[#0B1424] px-3 py-2.5 shadow-[0_18px_44px_rgba(2,6,23,.28)]">
        <button
          type="button"
          onClick={onSidebarToggle}
          aria-label={sidebarAcik ? t("sidebarClose") : t("sidebarOpen")}
          aria-expanded={sidebarAcik}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="theme-search flex h-11 min-w-0 flex-1 items-center rounded-2xl border border-white/10 bg-white/10 px-4 transition focus-within:border-white/30 focus-within:bg-white/15">
          <Search size={18} className="mr-3 shrink-0 text-white/60" />
          <input
            placeholder={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
          />
        </div>
        <button
          type="button"
          onClick={() => setMahsulotModalOchiq(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label={t("addProduct")}
        >
          <PackagePlus size={20} />
        </button>
        <ThemeSwitcher variant="dark" />
        <LanguageSwitcher variant="dark" />
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
      className="theme-sidebar mb-4 flex items-center gap-3 rounded-[24px] border border-white/10 bg-[#0B1424] px-3 py-2.5 shadow-[0_18px_44px_rgba(2,6,23,.28)] justify-between"
    >
      <button
        type="button"
        onClick={onSidebarToggle}
        aria-label={sidebarAcik ? t("sidebarClose") : t("sidebarOpen")}
        aria-expanded={sidebarAcik}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <ThemeSwitcher variant="dark" />
        <LanguageSwitcher variant="dark" />
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

// Bildirishnoma matniga qarab mos ikonka va rang tanlanadi.
function bildirishnomaTuri(matn: string) {
  const q = matn.toLowerCase();
  if (/sotuv|savdo|sale/.test(q)) return { icon: ShoppingCart, ton: "bg-emerald-50 text-emerald-600" };
  if (/hisobot|report/.test(q)) return { icon: FileBarChart, ton: "bg-blue-50 text-blue-600" };
  if (/to['ʻ‘’`]?lov|kassa|payment|cash/.test(q)) return { icon: Wallet, ton: "bg-amber-50 text-amber-600" };
  if (/ombor|kirim|chiqim|qoldiq|stock/.test(q)) return { icon: Package, ton: "bg-violet-50 text-violet-600" };
  if (/xodim|mijoz|xaridor|customer|user/.test(q)) return { icon: Users, ton: "bg-sky-50 text-sky-600" };
  return { icon: Bell, ton: "bg-gold-50 text-gold-600" };
}

function nisbiVaqt(iso: string, t: (key: string, options?: Record<string, unknown>) => string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return "";
  const daqiqa = Math.round((Date.now() - sana.getTime()) / 60000);
  if (daqiqa < 1) return t("notifications.justNow");
  if (daqiqa < 60) return t("notifications.minutesAgo", { count: daqiqa });
  const soat = Math.round(daqiqa / 60);
  if (soat < 24) return t("notifications.hoursAgo", { count: soat });
  const kun = Math.round(soat / 24);
  if (kun < 7) return t("notifications.daysAgo", { count: kun });
  return sana.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
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
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
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
              className="fixed z-[200] w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_28px_90px_rgba(15,23,42,.28)]"
              style={{ top: position.top, right: position.right }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">
                    <Bell size={19} />
                    {oqilmaganSoni > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
                  </span>
                  <div>
                    <p className="font-black leading-5 text-slate-900">{t("notifications.title")}</p>
                    <p className="text-xs font-semibold text-slate-400">{t("notifications.unreadCount", { count: oqilmaganSoni })}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onReadAll}
                  disabled={oqilmaganSoni === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gold-50 px-3 py-2 text-xs font-bold text-gold-600 transition hover:bg-gold-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <CheckCheck size={14} />
                  {t("notifications.markAllRead")}
                </button>
              </div>

              <div className="max-h-[430px] overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
                {yuklanmoqda ? (
                  <div className="flex h-32 items-center justify-center">
                    <LoaderCircle className="animate-spin text-gold-500" size={26} />
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><BellOff size={24} /></span>
                    <p className="text-sm font-semibold text-slate-400">{t("notifications.empty")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { kalit: "new", nom: t("notifications.sectionNew"), royxat: items.filter((item) => !(item.isRead || item.readAt)) },
                      { kalit: "earlier", nom: t("notifications.sectionEarlier"), royxat: items.filter((item) => Boolean(item.isRead || item.readAt)) },
                    ]
                      .filter((guruh) => guruh.royxat.length > 0)
                      .map((guruh) => (
                        <section key={guruh.kalit}>
                          <p className="mb-2 flex items-center gap-2 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
                            {guruh.nom}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{guruh.royxat.length}</span>
                          </p>
                          <ul className="space-y-2">
                            {guruh.royxat.map((item) => {
                              const oqilgan = Boolean(item.isRead || item.readAt);
                              const sarlavha = item.title ?? t("notifications.defaultTitle");
                              const matn = item.text ?? item.message ?? t("notifications.defaultMessage");
                              const tur = bildirishnomaTuri(`${sarlavha} ${matn}`);
                              const Ikonka = tur.icon;
                              return (
                                <li key={item.id}>
                                  <label
                                    className={`group flex items-start gap-3 rounded-2xl border p-3 transition ${
                                      oqilgan
                                        ? "cursor-default border-slate-100 bg-white"
                                        : "cursor-pointer border-gold-200 bg-gold-50/60 shadow-[0_6px_18px_rgba(37,99,235,.08)] hover:bg-gold-50"
                                    }`}
                                  >
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${oqilgan ? "bg-slate-100 text-slate-400" : tur.ton}`}>
                                      <Ikonka size={18} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className={`truncate text-sm ${oqilgan ? "font-bold text-slate-600" : "font-black text-slate-900"}`}>{sarlavha}</p>
                                        <span
                                          className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-400"
                                          title={item.createdAt ? new Date(item.createdAt).toLocaleString("uz-UZ") : undefined}
                                        >
                                          {!oqilgan && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                                          {item.createdAt ? nisbiVaqt(item.createdAt, t) : ""}
                                        </span>
                                      </div>
                                      <p className={`mt-0.5 line-clamp-2 text-xs leading-5 ${oqilgan ? "text-slate-400" : "text-slate-500"}`}>{matn}</p>
                                    </div>
                                    <Checkbox
                                      checked={oqilgan}
                                      disabled={oqilgan}
                                      onCheckedChange={(qiymat) => {
                                        if (qiymat === true && !oqilgan) onRead(item.id);
                                      }}
                                      aria-label={t("notifications.markReadAria", { title: sarlavha })}
                                      className="mt-0.5 size-5 shrink-0 rounded-md border-slate-300 data-checked:border-emerald-500 data-checked:bg-emerald-500 data-checked:text-white disabled:opacity-100"
                                    />
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      ))}
                  </div>
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
  const rasmUrl = useAvatarUrl(profil?.id, profil?.avatarUrl);
  // Rasm bo'lmasa ism bosh harfi (faqat bosHarfBilan berilgan navbarda); ism yo'q bo'lsa avvalgi ikonka.
  const bosHarf = bosHarfBilan && ism ? ism.charAt(0).toUpperCase() : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 ${bosHarf ? "border-white/20 bg-white/15 text-white hover:bg-white/25" : "border-white/10 bg-white/10 text-white/90 hover:bg-white/20 hover:text-white"}`}
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
