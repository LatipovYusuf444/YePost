import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Ban,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  HandCoins,
  History,
  Home,
  LogOut,
  PackageSearch,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Undo2,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";

type MenyuBolasi = { nom: string; path: string; icon: LucideIcon };
type Menyu = { nom: string; path: string; icon: LucideIcon; bolalar?: MenyuBolasi[] };

// bolalar bo'lsa menyu sidebar ichida ochiladigan (accordion) bo'lim bo'ladi.
// Bolalarning yo'llari AppRouter va Savdo sahifasidagi ?tab= qiymatlari bilan bir xil.
const menyular: Menyu[] = [
  { nom: "Bosh sahifa", path: "/", icon: Home },
  {
    nom: "Savdo",
    path: "/savdo",
    icon: ShoppingCart,
    bolalar: [
      { nom: "Barcha sotuvlar", path: "/savdo", icon: ReceiptText },
      { nom: "Qoralamalar", path: "/savdo?tab=savatcha", icon: FileText },
      { nom: "Savdo tarixi", path: "/savdo?tab=tarix", icon: History },
      { nom: "To'lovlar", path: "/savdo?tab=tolovlar", icon: CreditCard },
      { nom: "Qarzdorliklar", path: "/savdo?tab=qarzdorliklar", icon: HandCoins },
      { nom: "Qaytarish", path: "/savdo?tab=qaytarish", icon: Undo2 },
      { nom: "Bekor qilinganlar", path: "/savdo?tab=bekor-qilingan", icon: Ban },
    ],
  },
  { nom: "Mahsulotlar", path: "/mahsulotlar", icon: PackageSearch },
  {
    nom: "Ombor",
    path: "/ombor",
    icon: Warehouse,
    bolalar: [
      { nom: "Inventarizatsiya", path: "/ombor/inventarizatsiya", icon: ClipboardList },
      { nom: "Kirim", path: "/ombor/kirimlar", icon: ArrowDownToLine },
      { nom: "Chiqim", path: "/ombor/chiqimlar", icon: ArrowUpFromLine },
      { nom: "Ko'chirish", path: "/ombor/kochirishlar", icon: ArrowLeftRight },
      { nom: "Qoldiq", path: "/ombor/qoldiq", icon: Boxes },
      { nom: "Amalga oshirilganlar", path: "/ombor/amalga-oshirilganlar", icon: CheckCircle2 },
      { nom: "Omborlar", path: "/ombor/omborlar", icon: Warehouse },
    ],
  },
  {
    nom: "Xaridorlar",
    path: "/mijozlar",
    icon: Users,
    bolalar: [
      { nom: "Xaridorlar", path: "/mijozlar", icon: Users },
      { nom: "Kompaniya", path: "/mijozlar/kompaniya", icon: Building2 },
      { nom: "Yetkazib beruvchilar", path: "/mijozlar/yetkazib-beruvchilar", icon: Truck },
    ],
  },
  { nom: "Kassa", path: "/kassa", icon: Wallet },
  { nom: "Hisobotlar", path: "/hisobotlar", icon: BarChart3 },
  { nom: "Xodimlar", path: "/hodimlar", icon: UserCog },
  { nom: "Sozlamalar", path: "/sozlamalar", icon: Settings },
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

const rolMatni: Record<string, string> = {
  DIREKTOR: "Direktor",
  ADMIN: "Administrator",
  KASSIR: "Kassir",
  OMBORCHI: "Omborchi",
};

// Yopiq holatda (64px) faqat ikonka ko'rinadi: qator 48px kenglikda, ikonka 18px va 15px chetlari.
const qatorKlass =
  "relative flex h-[46px] w-full items-center gap-3 px-[15px] text-[14.5px] transition-colors duration-200";
const qatorFaolKlass = "rounded-none bg-[#123A55] font-semibold text-white";
const qatorOddiyKlass = "rounded-[10px] font-medium text-[#8391A7] hover:bg-[#122036] hover:text-slate-100";
// Matn faqat sidebar ochiq (toggle) bo'lganda ko'rinadi.
const yorliqKlass =
  "min-w-0 truncate whitespace-nowrap transition-opacity duration-200";

export default function YonPanel({ acik }: { acik: boolean }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const username = useAuthStore((state) => state.username);
  const profil = useAuthProfileStore((state) => state.profil);

  // Joriy marshrut tegishli bo'lim ochiq turadi (yangilashdan keyin ham); qolganlarini foydalanuvchi ochadi.
  const faolBolim = menyular.find((menu) => menu.bolalar && yolIchida(pathname, menu.path))?.path;
  const [ochiqBolimlar, setOchiqBolimlar] = useState<Record<string, boolean>>(() =>
    faolBolim ? { [faolBolim]: true } : {}
  );

  useEffect(() => {
    if (faolBolim) setOchiqBolimlar((joriy) => (joriy[faolBolim] ? joriy : { ...joriy, [faolBolim]: true }));
  }, [faolBolim]);

  // Bo'lim sarlavhasi faqat ochadi/yopadi; yopiq bo'limga tashqaridan kirilsa birinchi (asosiy) sahifaga o'tadi.
  function bolimniBosish(menu: Menyu) {
    const bolalar = menu.bolalar ?? [];
    if (!acik) {
      if (!yolIchida(pathname, menu.path) && bolalar[0]) navigate(bolalar[0].path);
      return;
    }
    if (ochiqBolimlar[menu.path]) {
      setOchiqBolimlar((joriy) => ({ ...joriy, [menu.path]: false }));
      return;
    }
    setOchiqBolimlar((joriy) => ({ ...joriy, [menu.path]: true }));
    if (!yolIchida(pathname, menu.path) && bolalar[0]) navigate(bolalar[0].path);
  }

  const ism = profil?.fullName?.trim() || profil?.username || username || "";
  const rolNomi = profil ? rolMatni[profil.role] ?? profil.role : "";
  const rasmUrl = profil?.avatarUrl || "";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <motion.aside
      initial={{ x: -64, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-white/5 bg-[#0B1424] text-[#8391A7] transition-[width] duration-200 ease-in-out ${
        acik ? "w-70" : "w-16"
      }`}
    >
      <div className="flex h-[72px] shrink-0 items-center gap-3 px-[11px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-sky-400 to-blue-600 text-lg font-black text-white"
        >
          Y
        </motion.div>
        <div className={`min-w-0 transition-opacity duration-200 ${acik ? "opacity-100" : "opacity-0"}`}>
          <h2 className="truncate text-[17px] font-bold leading-6 tracking-wide text-white">YEPOST</h2>
          <p className="truncate text-[12.5px] font-medium leading-4 text-[#8391A7]">Savdo tizimi</p>
        </div>
      </div>

      <span className="mx-3 h-px shrink-0 bg-white/10" />

      <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-2 py-3 [scrollbar-color:#26364F_transparent] [scrollbar-width:thin]">
        {menyular.map((menu, index) => {
          const Icon = menu.icon;

          if (menu.bolalar) {
            const guruhFaol = yolIchida(pathname, menu.path);
            const ochiq = Boolean(ochiqBolimlar[menu.path]);

            return (
              <motion.div
                key={menu.path}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.045, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  type="button"
                  onClick={() => bolimniBosish(menu)}
                  aria-expanded={ochiq}
                  title={menu.nom}
                  className={`${qatorKlass} ${guruhFaol ? qatorFaolKlass : qatorOddiyKlass}`}
                >
                  <Icon size={18} strokeWidth={2} className={`shrink-0 ${guruhFaol ? "text-sky-300" : ""}`} />
                  <span className={`${yorliqKlass} ${acik ? "opacity-100" : "opacity-0"} flex-1 text-left`}>{menu.nom}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-[transform,opacity] duration-200 ${acik ? "opacity-100" : "opacity-0"} ${
                      ochiq ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Yopiq (64px) holatda bolalar ko'rinmaydi va joy egallamaydi. */}
                <div
                  className={`transition-[grid-template-rows] duration-200 ${acik ? "grid" : "hidden"} ${
                    ochiq ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="ml-6 mt-1.5 grid gap-1 border-l border-white/10 pl-0.5">
                      {menu.bolalar.map((bola) => {
                        const faol = bolaFaolmi(bola, pathname, search);
                        const BolaIcon = bola.icon;

                        return (
                          <Link
                            key={bola.path}
                            to={bola.path}
                            tabIndex={ochiq ? 0 : -1}
                            className={`relative flex h-10 items-center gap-2.5 truncate whitespace-nowrap px-3 text-[14px] transition-colors duration-200 ${
                              faol
                                ? "rounded-none bg-[#15506F] font-semibold text-sky-100 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-sky-400"
                                : "rounded-lg font-medium text-[#8391A7] hover:bg-[#122036] hover:text-slate-100"
                            }`}
                          >
                            <BolaIcon
                              size={16}
                              strokeWidth={2}
                              className={`shrink-0 ${faol ? "text-sky-300" : ""}`}
                            />
                            <span className="truncate">{bola.nom}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }

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
                className={({ isActive }) => `${qatorKlass} ${isActive ? qatorFaolKlass : qatorOddiyKlass}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={`shrink-0 ${isActive ? "text-sky-300" : ""}`}
                    />
                    <span className={`${yorliqKlass} ${acik ? "opacity-100" : "opacity-0"}`}>{menu.nom}</span>
                  </>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2">
        <div
          className={`flex overflow-hidden rounded-[10px] bg-[#111C30] ring-1 ring-white/5 ${
            acik ? "items-center gap-3 p-2.5" : "flex-col items-center gap-1 p-1.5"
          }`}
        >
          {ism && (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#123A55] text-[15px] font-bold text-sky-200">
                {rasmUrl ? (
                  <img src={rasmUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  ism.charAt(0).toUpperCase()
                )}
              </span>
              <div className={`min-w-0 flex-1 ${acik ? "" : "hidden"}`}>
                <p className="truncate text-[14.5px] font-semibold leading-5 text-slate-100">{ism}</p>
                {rolNomi && <p className="truncate text-[12.5px] leading-4 text-[#8391A7]">{rolNomi}</p>}
              </div>
            </>
          )}
          <button
            onClick={() => void handleLogout()}
            title="Tizimdan chiqish"
            aria-label="Tizimdan chiqish"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8391A7] transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
