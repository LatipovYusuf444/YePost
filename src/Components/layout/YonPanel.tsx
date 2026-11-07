import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Activity,
  Ban,
  BarChart3,
  BookOpenCheck,
  Boxes,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Disc3,
  Factory,
  FileText,
  Gauge,
  HandCoins,
  BadgePercent,
  Headset,
  History,
  Home,
  LogOut,
  Layers,
  PackageOpen,
  PackageSearch,
  ReceiptText,
  Settings,
  Scale,
  Timer,
  ShoppingCart,
  Truck,
  TrendingUp,
  Undo2,
  UserCog,
  Users,
  Wallet,
  WalletCards,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useSupportStore } from "@/store/supportStore";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";
import { sahifagaRuxsatBormi } from "@/lib/roles";
import MobilNavigatsiya from "./MobilNavigatsiya";

import { useAvatarUrl } from "@/store/avatarStore";
import type { YonPanelRejimi } from "./yonPanelHolati";
import "./yonPanel.css";
type MenyuBolasi = { key: string; path: string; icon: LucideIcon };
type Menyu = { key: string; path: string; icon: LucideIcon; bolalar?: MenyuBolasi[] };

// bolalar bo'lsa menyu sidebar ichida ochiladigan (accordion) bo'lim bo'ladi.
// Bolalarning yo'llari AppRouter va Savdo sahifasidagi ?tab= qiymatlari bilan bir xil.
// nom o'rniga `key` ishlatiladi: matn "nav" i18n namespace'idan `menu.<key>` orqali olinadi.
const menyular: Menyu[] = [
  { key: "boshSahifa", path: "/", icon: Home },
  { key: "monitoring", path: "/monitoring", icon: Gauge },
  {
    key: "savdo",
    path: "/savdo",
    icon: ShoppingCart,
    bolalar: [
      { key: "savdoBarchaSotuvlar", path: "/savdo", icon: ReceiptText },
      { key: "savdoQoralamalar", path: "/savdo?tab=savatcha", icon: FileText },
      { key: "savdoTarixi", path: "/savdo?tab=tarix", icon: History },
      { key: "qarzdorliklar", path: "/savdo?tab=qarzdorliklar", icon: HandCoins },
      { key: "qaytarish", path: "/savdo?tab=qaytarish", icon: Undo2 },
      { key: "buyurtmalar", path: "/savdo?tab=buyurtmalar", icon: Truck },
      { key: "bekorQilinganlar", path: "/savdo?tab=bekor-qilingan", icon: Ban },
    ],
  },
  { key: "mahsulotlar", path: "/mahsulotlar", icon: PackageSearch },
  {
    key: "ombor",
    path: "/ombor",
    icon: Warehouse,
    bolalar: [
      { key: "inventarizatsiya", path: "/ombor/inventarizatsiya", icon: ClipboardList },
      { key: "kirim", path: "/ombor/kirimlar", icon: ArrowDownToLine },
      { key: "chiqim", path: "/ombor/chiqimlar", icon: ArrowUpFromLine },
      { key: "kochirish", path: "/ombor/kochirishlar", icon: ArrowLeftRight },
      { key: "qoldiq", path: "/ombor/qoldiq", icon: Boxes },
      { key: "amalgaOshirilganlar", path: "/ombor/amalga-oshirilganlar", icon: CheckCircle2 },
      { key: "omborlar", path: "/ombor/omborlar", icon: Warehouse },
    ],
  },
  {
    key: "ishlabChiqarish",
    path: "/ishlab-chiqarish",
    icon: Factory,
    bolalar: [
      { key: "icBuyurtmalar", path: "/ishlab-chiqarish/buyurtmalar", icon: ClipboardList },
      { key: "icRetseptlar", path: "/ishlab-chiqarish/retseptlar", icon: BookOpenCheck },
      { key: "icKalkulyatsiya", path: "/ishlab-chiqarish/kalkulyatsiya", icon: Calculator },
      { key: "icSexgaBerish", path: "/ishlab-chiqarish/sexga-berish", icon: PackageOpen },
      { key: "icSmena", path: "/ishlab-chiqarish/smena", icon: Timer },
      { key: "icRulonlar", path: "/ishlab-chiqarish/rulonlar", icon: Disc3 },
    ],
  },
  {
    key: "xaridorlar",
    path: "/mijozlar",
    icon: Users,
    bolalar: [
      { key: "xaridorlar", path: "/mijozlar", icon: Users },
      { key: "kompaniya", path: "/mijozlar/kompaniya", icon: Building2 },
      { key: "yetkazibBeruvchilar", path: "/mijozlar/yetkazib-beruvchilar", icon: Truck },
    ],
  },
  { key: "kassa", path: "/kassa", icon: Wallet },
  {
    key: "hisobotlar",
    path: "/hisobotlar",
    icon: BarChart3,
    bolalar: [
      { key: "hisobotTovarHarakati", path: "/hisobotlar/tovar-harakati", icon: Activity },
      { key: "hisobotOmborQoldigi", path: "/hisobotlar/ombor-qoldigi", icon: Layers },
      { key: "hisobotOzaroHisobKitob", path: "/hisobotlar/ozaro-hisob-kitob", icon: Users },
      { key: "hisobotFoyda", path: "/hisobotlar/foyda", icon: TrendingUp },
      { key: "hisobotFoydaXarajat", path: "/hisobotlar/foyda-xarajat", icon: Scale },
      { key: "hisobotKirimChiqim", path: "/hisobotlar/kirim-chiqim", icon: WalletCards },
      { key: "hisobotKunlikKassa", path: "/hisobotlar/kunlik-kassa", icon: WalletCards },
      { key: "hisobotChegirmalar", path: "/hisobotlar/chegirmalar", icon: BadgePercent },
      { key: "hisobotAudit", path: "/hisobotlar/audit-loglari", icon: History },
    ],
  },
  { key: "xodimlar", path: "/hodimlar", icon: UserCog },
  { key: "qollabQuvvatlash", path: "/qollab-quvvatlash", icon: Headset },
  { key: "sozlamalar", path: "/sozlamalar", icon: Settings },
];

function yolIchida(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

// Savdo bolalari bitta yo'l (/savdo) va ?tab= bilan farqlanadi; boshqalari faqat yo'l bo'yicha.
function bolaFaolmi(bola: MenyuBolasi, pathname: string, search: string) {
  const [bolaYoli, bolaSorovi = ""] = bola.path.split("?");
  if (pathname !== bolaYoli) return false;
  const joriyTab = new URLSearchParams(search).get("tab") ?? "barchasi";
  const bolaTabi = new URLSearchParams(bolaSorovi).get("tab") ?? "barchasi";
  return joriyTab === bolaTabi;
}

type MaslahatHolati = { matn: string; qoshimcha?: string; top: number; left: number };
type MaslahatBoshqaruvi = {
  korsat: (element: HTMLElement, matn: string, qoshimcha?: string) => void;
  yashir: (darhol?: boolean) => void;
};

// Tooltip alohida komponent: sichqoncha bandlar ustida yurganda butun menyu qayta chizilmaydi.
// Bandlar orasidagi 4px bo'shliqdan o'tganda yo'qolib-qaytmasligi uchun yashirish 90ms kechiktiriladi.
function MaslahatQatlami({ boshqaruv }: { boshqaruv: Ref<MaslahatBoshqaruvi> }) {
  const [holat, setHolat] = useState<MaslahatHolati | null>(null);
  const taymer = useRef<number | undefined>(undefined);

  useImperativeHandle(boshqaruv, () => ({
    korsat(element, matn, qoshimcha) {
      window.clearTimeout(taymer.current);
      const rect = element.getBoundingClientRect();
      const panel = element.closest(".yp-aside")?.getBoundingClientRect();
      const markaz = rect.top + rect.height / 2;
      setHolat({
        matn,
        qoshimcha,
        // Ekran chetidan chiqib ketmasin.
        top: Math.min(Math.max(markaz, 28), window.innerHeight - 28),
        left: (panel?.right ?? rect.right) + 12,
      });
    },
    yashir(darhol = false) {
      window.clearTimeout(taymer.current);
      if (darhol) setHolat(null);
      else taymer.current = window.setTimeout(() => setHolat(null), 90);
    },
  }), []);

  useEffect(() => () => window.clearTimeout(taymer.current), []);

  if (!holat) return null;
  return (
    <div role="tooltip" className="yp-tip theme-sidebar" style={{ top: holat.top, left: holat.left }}>
      <span className="yp-tip-text">{holat.matn}</span>
      {holat.qoshimcha && <span className="yp-tip-sub">{holat.qoshimcha}</span>}
    </div>
  );
}

type FlyoutHolati = { path: string; top: number; left: number; klaviatura: boolean };

// Yopiq panelda ichki bo'limli band bosilganda: panel kengaymaydi, o'ng tomonda ixcham ro'yxat ochiladi.
// Faqat ruxsat berilgan bolalar keladi (korinadiganMenyular orqali).
function BolimFlyouti({
  menu,
  holat,
  onYopish,
}: {
  menu: Menyu & { bolalar: MenyuBolasi[] };
  holat: FlyoutHolati;
  onYopish: (fokusQaytsin: boolean) => void;
}) {
  const { t } = useTranslation("nav");
  const { pathname, search } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const sarlavha = t(`menu.${menu.key}`);

  // Ekran pastidan chiqib ketmasin; klaviatura bilan ochilganda fokus ichkariga o'tadi.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const top = Math.max(12, Math.min(holat.top, window.innerHeight - element.offsetHeight - 12));
    element.style.top = `${top}px`;
    if (holat.klaviatura) {
      (element.querySelector<HTMLElement>('[aria-current="page"]') ?? element.querySelector<HTMLElement>("a"))?.focus({ preventScroll: true });
    }
  }, [holat]);

  function klaviatura(event: KeyboardEvent<HTMLDivElement>) {
    const havolalar = Array.from(ref.current?.querySelectorAll<HTMLElement>("a") ?? []);
    if (havolalar.length === 0) return;
    const joriy = havolalar.indexOf(document.activeElement as HTMLElement);
    const otish = (indeks: number) => {
      event.preventDefault();
      havolalar[(indeks + havolalar.length) % havolalar.length]?.focus();
    };
    if (event.key === "ArrowDown") otish(joriy + 1);
    else if (event.key === "ArrowUp") otish(joriy - 1);
    else if (event.key === "Home") otish(0);
    else if (event.key === "End") otish(havolalar.length - 1);
    else if (event.key === "Escape" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      onYopish(true);
    } else if (event.key === "Tab") {
      // Fokus trigger'ga qaytadi, Tab esa undan keyingi bandga o'tadi.
      onYopish(true);
    }
  }

  return (
    <div
      ref={ref}
      id={`yp-fly-${menu.key}`}
      role="group"
      aria-label={sarlavha}
      tabIndex={-1}
      className="yp-fly theme-sidebar"
      style={{ top: holat.top, left: holat.left }}
      onKeyDown={klaviatura}
      onBlur={(event) => {
        const keyingi = event.relatedTarget as HTMLElement | null;
        if (keyingi && (event.currentTarget.contains(keyingi) || keyingi.closest(`[data-flyout="${menu.key}"]`))) return;
        onYopish(false);
      }}
    >
      <p className="yp-fly-title">{sarlavha}</p>
      <div className="yp-fly-list">
        {menu.bolalar.map((bola) => {
          const faol = bolaFaolmi(bola, pathname, search);
          const BolaIcon = bola.icon;
          return (
            <Link
              key={bola.path}
              to={bola.path}
              onClick={() => onYopish(false)}
              aria-current={faol ? "page" : undefined}
              data-faol={faol || undefined}
              className={`yp-child ${faol ? "theme-sidebar-subactive" : "theme-sidebar-item"}`}
            >
              {faol && <span className="yp-child-bar bg-sky-400" aria-hidden="true" />}
              <BolaIcon size={16} strokeWidth={2} className={`shrink-0 ${faol ? "text-sky-300" : ""}`} />
              <span className="yp-label">{t(`menu.${bola.key}`)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function YonPanel({
  acik,
  rejim = "keng",
  onYopish,
}: {
  acik: boolean;
  rejim?: YonPanelRejimi;
  onYopish?: () => void;
}) {
  const { t } = useTranslation("nav");
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const username = useAuthStore((state) => state.username);
  const profil = useAuthProfileStore((state) => state.profil);
  const oqilmaganXabarSoni = useSupportStore((state) => state.oqilmaganSoni);
  const oqilmaganSoniniYangilash = useSupportStore((state) => state.oqilmaganSoniniYangilash);
  const ishlabChiqarishYoqilgan = useIshlabChiqarishStore((state) => state.enabled);
  const maslahatRef = useRef<MaslahatBoshqaruvi>(null);
  const navRef = useRef<HTMLElement>(null);
  const [flyout, setFlyout] = useState<FlyoutHolati | null>(null);
  // Planshetda (768–1279px) ochiq panel kontent ustida turadi: fon, Escape va band tanlanganda yopiladi.
  const ustida = rejim === "orta" && acik;

  // Qo'llab-quvvatlash bo'limidagi o'qilmagan xabarlar soni sidebar
  // ikonkasida badge sifatida ko'rsatiladi — har 60 soniyada, faqat sahifa ko'rinib turganda
  // yangilanadi; yashirin vkladka so'rov yubormaydi, foydalanuvchi qaytganda darrov yangilanadi.
  useEffect(() => {
    const yangilash = () => {
      if (document.visibilityState === "visible") void oqilmaganSoniniYangilash();
    };
    yangilash();
    const oraliq = setInterval(yangilash, 60000);
    document.addEventListener("visibilitychange", yangilash);
    return () => {
      clearInterval(oraliq);
      document.removeEventListener("visibilitychange", yangilash);
    };
  }, [oqilmaganSoniniYangilash]);

  // Profil hali yuklanmagan bo'lsa hamma bandni ko'rsatamiz (bir lahzalik
  // holat, backend real cheklovni baribir 403 orqali ta'minlaydi) — aks
  // holda KASSIR/OMBORCHI uchun ruxsati yo'q bandlar (va ularning bolalari)
  // menyudan yashiriladi.
  const korinadiganMenyular = useMemo(() => {
    // Ishlab chiqarish moduli yoqilmaguncha server hamma yo'lda 403 qaytaradi: menyuda ko'rsatilmaydi.
    const yoqilganlar = ishlabChiqarishYoqilgan ? menyular : menyular.filter((menu) => menu.key !== "ishlabChiqarish");
    if (!profil) return yoqilganlar;
    return yoqilganlar
      .filter((menu) => sahifagaRuxsatBormi(profil, menu.path))
      .map((menu) =>
        menu.bolalar
          ? { ...menu, bolalar: menu.bolalar.filter((bola) => sahifagaRuxsatBormi(profil, bola.path.split("?")[0])) }
          : menu
      );
  }, [profil, ishlabChiqarishYoqilgan]);

  // Joriy marshrut tegishli bo'lim ochiq turadi (yangilashdan keyin ham); qolganlarini foydalanuvchi ochadi.
  const faolBolim = menyular.find((menu) => menu.bolalar && yolIchida(pathname, menu.path))?.path;
  const [ochiqBolimlar, setOchiqBolimlar] = useState<Record<string, boolean>>(() =>
    faolBolim ? { [faolBolim]: true } : {}
  );

  useEffect(() => {
    if (faolBolim) setOchiqBolimlar((joriy) => (joriy[faolBolim] ? joriy : { ...joriy, [faolBolim]: true }));
  }, [faolBolim]);

  // Panel holati yoki marshrut o'zgarsa ochiq flyout va tooltip yopiladi.
  useEffect(() => {
    setFlyout(null);
    maslahatRef.current?.yashir(true);
  }, [acik, pathname, search]);

  // Uzun menyuda faol band ko'rinmay qolgan bo'lsa, u ko'rinadigan joyga siljiydi; aks holda scroll pozitsiyasi o'zgarmaydi.
  useEffect(() => {
    const nav = navRef.current;
    const faol = nav?.querySelector<HTMLElement>('.yp-item[data-faol="true"], .yp-item[aria-current="page"]');
    if (!nav || !faol) return;
    const navRect = nav.getBoundingClientRect();
    const faolRect = faol.getBoundingClientRect();
    if (faolRect.top < navRect.top || faolRect.bottom > navRect.bottom) faol.scrollIntoView({ block: "nearest" });
  }, [pathname, search]);

  // Flyout tashqarisiga bosilganda, oyna o'lchami o'zgarganda yoki menyu aylantirilganda yopiladi.
  useEffect(() => {
    if (!flyout) return;
    const nav = navRef.current;
    const tashqariBosish = (event: PointerEvent) => {
      const nishon = event.target as HTMLElement | null;
      if (nishon?.closest(".yp-fly") || nishon?.closest("[data-flyout]")) return;
      setFlyout(null);
    };
    const yopish = () => setFlyout(null);
    // Sichqoncha bilan ochilganda fokus trigger'da qoladi — Escape baribir yopadi va fokusni trigger'ga qaytaradi.
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setFlyout(null);
      const kalit = menyular.find((menu) => menu.path === flyout.path)?.key;
      if (kalit) document.querySelector<HTMLElement>(`[data-flyout="${kalit}"]`)?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", tashqariBosish);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", yopish);
    nav?.addEventListener("scroll", yopish, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", tashqariBosish);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", yopish);
      nav?.removeEventListener("scroll", yopish);
    };
  }, [flyout]);

  // Planshetdagi ochiq panel Escape bilan yopiladi va fokus navbardagi toggle tugmasiga qaytadi.
  useEffect(() => {
    if (!ustida || !onYopish) return;
    const tugma = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      onYopish();
      document.querySelector<HTMLElement>("[data-yon-panel-tugmasi]")?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", tugma);
    return () => document.removeEventListener("keydown", tugma);
  }, [ustida, onYopish]);

  // Bo'lim sarlavhasi faqat ochadi/yopadi; yopiq bo'limga tashqaridan kirilsa birinchi (asosiy) sahifaga o'tadi.
  // Yopiq (ikonkali) panelda esa bolalar flyout'da ko'rsatiladi.
  function bolimniBosish(menu: Menyu, event: MouseEvent<HTMLButtonElement>) {
    const bolalar = menu.bolalar ?? [];
    if (!acik) {
      if (flyout?.path === menu.path) {
        setFlyout(null);
        return;
      }
      maslahatRef.current?.yashir(true);
      const rect = event.currentTarget.getBoundingClientRect();
      const panel = event.currentTarget.closest(".yp-aside")?.getBoundingClientRect();
      setFlyout({ path: menu.path, top: rect.top - 8, left: (panel?.right ?? rect.right) + 10, klaviatura: event.detail === 0 });
      return;
    }
    if (ochiqBolimlar[menu.path]) {
      setOchiqBolimlar((joriy) => ({ ...joriy, [menu.path]: false }));
      return;
    }
    setOchiqBolimlar((joriy) => ({ ...joriy, [menu.path]: true }));
    if (!yolIchida(pathname, menu.path) && bolalar[0]) navigate(bolalar[0].path);
  }

  function flyoutniYopish(fokusQaytsin: boolean) {
    const kalit = korinadiganMenyular.find((menu) => menu.path === flyout?.path)?.key;
    setFlyout(null);
    if (fokusQaytsin && kalit) document.querySelector<HTMLElement>(`[data-flyout="${kalit}"]`)?.focus({ preventScroll: true });
  }

  // Tooltip: yopiq panelda har bir ikonkada; ochiq panelda faqat nomi qisqargan (…) bandlarda va ikonkali tugmalarda.
  function maslahatniKorsat(element: HTMLElement, matn: string, qoshimcha: string | undefined, doim: boolean) {
    if (acik && !doim) {
      const yorliq = element.querySelector<HTMLElement>(".yp-label");
      if (!yorliq || yorliq.scrollWidth <= yorliq.clientWidth) return;
    }
    if (!acik && flyout && element.dataset.flyout) return;
    maslahatRef.current?.korsat(element, matn, qoshimcha);
  }

  const maslahatHodisalari = (matn: string, qoshimcha?: string, doim = false) => ({
    onMouseEnter: (event: MouseEvent<HTMLElement>) => maslahatniKorsat(event.currentTarget, matn, qoshimcha, doim),
    onMouseLeave: () => maslahatRef.current?.yashir(),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(":focus-visible")) maslahatniKorsat(event.currentTarget, matn, qoshimcha, doim);
    },
    onBlur: () => maslahatRef.current?.yashir(true),
  });

  const bandTanlandi = ustida ? onYopish : undefined;

  const ism = profil?.fullName?.trim() || profil?.username || username || "";
  const rolNomi = profil ? t(`roles.${profil.role}`, { defaultValue: profil.role }) : "";
  const rasmUrl = useAvatarUrl(profil?.id, profil?.avatarUrl);
  const profilgaRuxsat = !profil || sahifagaRuxsatBormi(profil, "/sozlamalar");

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const flyoutMenyusi = flyout && !acik
    ? korinadiganMenyular.find((menu): menu is Menyu & { bolalar: MenyuBolasi[] } => menu.path === flyout.path && Boolean(menu.bolalar))
    : undefined;

  const avatarIchi = rasmUrl ? <img src={rasmUrl} alt="" className="h-full w-full object-cover" /> : ism.charAt(0).toUpperCase();

  return (
    <>
      {ustida && <div className="yp-backdrop" aria-hidden="true" onClick={onYopish} />}

      <aside className="yp-aside theme-sidebar" data-ochiq={acik || undefined} data-ustida={ustida || undefined}>
        <div className="yp-head">
          <div className="yp-logo theme-logo bg-linear-to-br from-sky-400 to-blue-600" aria-hidden="true">Y</div>
          <div className="yp-brand yp-fade">
            <h2 className="yp-brand-name">{t("brand")}</h2>
            <p className="yp-brand-tag">{t("brandTagline")}</p>
          </div>
        </div>

        <span className="yp-sep" aria-hidden="true" />

        <nav ref={navRef} aria-label={t("sidebar.label")} className="yp-nav">
          {korinadiganMenyular.map((menu, index) => {
            const Icon = menu.icon;
            const nom = t(`menu.${menu.key}`);
            const tartib = { "--i": index } as CSSProperties;

            if (menu.bolalar) {
              const guruhFaol = yolIchida(pathname, menu.path);
              const ochiq = Boolean(ochiqBolimlar[menu.path]);
              const korinadi = acik && ochiq;
              const flyoutOchiq = !acik && flyout?.path === menu.path;
              const bolimId = `yp-bolim-${menu.key}`;

              return (
                <div key={menu.path} className="yp-enter" style={tartib}>
                  <button
                    type="button"
                    data-flyout={menu.key}
                    data-faol={guruhFaol || undefined}
                    data-ochiq-bolim={korinadi || flyoutOchiq || undefined}
                    onClick={(event) => bolimniBosish(menu, event)}
                    onKeyDown={(event) => {
                      if (!acik && event.key === "ArrowRight" && !flyoutOchiq) {
                        event.preventDefault();
                        event.currentTarget.click();
                      }
                    }}
                    aria-expanded={acik ? ochiq : flyoutOchiq}
                    aria-controls={acik ? bolimId : flyoutOchiq ? `yp-fly-${menu.key}` : undefined}
                    aria-label={nom}
                    {...maslahatHodisalari(nom)}
                    className={`yp-item ${guruhFaol ? "theme-sidebar-active" : "theme-sidebar-item"}`}
                  >
                    <span className="yp-bar bg-sky-400" aria-hidden="true" />
                    <span className={`yp-icon ${guruhFaol ? "text-sky-300" : ""}`}>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="yp-label yp-fade">{nom}</span>
                    <ChevronDown size={16} aria-hidden="true" className="yp-chev" data-ochiq={ochiq || undefined} />
                    <span className="yp-dot" aria-hidden="true" />
                  </button>

                  {/* Yopiq panelda accordion balandligi 0 ga tushadi (bolalar flyout orqali ochiladi). */}
                  <div id={bolimId} className="yp-sub" data-ochiq={korinadi || undefined} inert={!korinadi}>
                    <div className="yp-sub-inner">
                      <div className="yp-sub-list theme-sidebar-children">
                        {menu.bolalar.map((bola) => {
                          const faol = bolaFaolmi(bola, pathname, search);
                          const BolaIcon = bola.icon;
                          const bolaNomi = t(`menu.${bola.key}`);

                          return (
                            <Link
                              key={bola.path}
                              to={bola.path}
                              onClick={bandTanlandi}
                              aria-current={faol ? "page" : undefined}
                              data-faol={faol || undefined}
                              {...maslahatHodisalari(bolaNomi)}
                              className={`yp-child ${faol ? "theme-sidebar-subactive" : "theme-sidebar-item"}`}
                            >
                              {faol && <span className="yp-child-bar bg-sky-400" aria-hidden="true" />}
                              <BolaIcon size={16} strokeWidth={2} className={`shrink-0 ${faol ? "text-sky-300" : ""}`} />
                              <span className="yp-label">{bolaNomi}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const badge = menu.key === "qollabQuvvatlash" && oqilmaganXabarSoni > 0 ? oqilmaganXabarSoni : 0;

            return (
              <div key={menu.path} className="yp-enter" style={tartib}>
                <NavLink
                  to={menu.path}
                  aria-label={nom}
                  onClick={bandTanlandi}
                  {...maslahatHodisalari(nom)}
                  className={({ isActive }) => `yp-item ${isActive ? "theme-sidebar-active" : "theme-sidebar-item"}`}
                >
                  {({ isActive }) => (
                    <>
                      <span className="yp-bar bg-sky-400" aria-hidden="true" />
                      <span className={`yp-icon ${isActive ? "text-sky-300" : ""}`}>
                        <Icon size={18} strokeWidth={2} />
                        {badge > 0 && <span className="yp-badge">{badge > 9 ? "9+" : badge}</span>}
                      </span>
                      <span className="yp-label yp-fade">{nom}</span>
                    </>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="yp-foot">
          <div className="yp-profile theme-sidebar-profile">
            {ism && (
              <>
                {profilgaRuxsat ? (
                  <Link
                    to="/sozlamalar"
                    onClick={bandTanlandi}
                    aria-label={t("sidebar.profile", { name: ism })}
                    {...maslahatHodisalari(ism, rolNomi || undefined)}
                    className="yp-avatar theme-sidebar-avatar"
                  >
                    {avatarIchi}
                  </Link>
                ) : (
                  <span
                    role="img"
                    tabIndex={acik ? -1 : 0}
                    aria-label={rolNomi ? `${ism}, ${rolNomi}` : ism}
                    {...maslahatHodisalari(ism, rolNomi || undefined)}
                    className="yp-avatar theme-sidebar-avatar"
                  >
                    {avatarIchi}
                  </span>
                )}
                <div className="yp-profile-info yp-fade">
                  <p className="yp-profile-name">{ism}</p>
                  {rolNomi && <p className="yp-profile-role">{rolNomi}</p>}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={t("logout")}
              {...maslahatHodisalari(t("logout"), undefined, true)}
              className="yp-foot-btn"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      <MaslahatQatlami boshqaruv={maslahatRef} />
      {flyoutMenyusi && flyout && <BolimFlyouti menu={flyoutMenyusi} holat={flyout} onYopish={flyoutniYopish} />}

      <MobilNavigatsiya menyular={korinadiganMenyular.map((menu) => ({
        ...menu,
        label: t(`menu.${menu.key}`),
        badge: menu.key === "qollabQuvvatlash" ? oqilmaganXabarSoni : undefined,
        bolalar: menu.bolalar?.map((bola) => ({ ...bola, label: t(`menu.${bola.key}`) })),
      }))} />
    </>
  );
}
