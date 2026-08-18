import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Bell, CalendarDays, ChevronDown, LoaderCircle, LogOut, Minus, PackagePlus, Plus, RefreshCw, Search, Settings, ShoppingCart, UserRound, X, Zap } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { crmApi } from "@/api/crmApi";
import {
  katalogModifikatsiyalariniQoldiqTanlovigaOlish,
  omborlarRoyxatiniOlish,
  omborQoldiqlariniOlish,
} from "@/api/savdoApi";
import { usePosStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { Bildirishnoma } from "@/types/crm";
import type { OmborTanlovi, QoldiqTanlovi } from "@/types/savdo";
import type { FoydalanuvchiRoli, JoriyFoydalanuvchi } from "@/types/tenant";

const rolMatni: Record<FoydalanuvchiRoli, string> = {
  DIREKTOR: "Direktor",
  ADMIN: "Administrator",
  KASSIR: "Kassir",
  OMBORCHI: "Omborchi",
};

type ModuleKey = "savdo" | "mahsulotlar" | "mijozlar" | "ombor" | "hisobotlar" | "default";

const moduleTabs: Record<ModuleKey, Array<{ nom: string; path: string }>> = {
  savdo: [
    { nom: "Barcha sotuvlar", path: "/savdo" },
    { nom: "Qoralamalar", path: "/savdo?tab=savatcha" },
    { nom: "Savdo tarixi", path: "/savdo?tab=tarix" },
    { nom: "To'lovlar", path: "/savdo?tab=tolovlar" },
    { nom: "Qarzdorliklar", path: "/savdo?tab=qarzdorliklar" },
    { nom: "Qaytarish", path: "/savdo?tab=qaytarish" },
    { nom: "Bekor qilinganlar", path: "/savdo?tab=bekor-qilingan" },
  ],
  mahsulotlar: [{ nom: "Mahsulotlar", path: "/mahsulotlar" }],
  mijozlar: [
    { nom: "Xaridorlar", path: "/mijozlar" },
    { nom: "Kompaniya", path: "/mijozlar/kompaniya" },
    { nom: "Yetkazib beruvchilar", path: "/mijozlar/yetkazib-beruvchilar" },
  ],
  hisobotlar: [{ nom: "Hisobotlar", path: "/hisobotlar" }],
  ombor: [
    { nom: "Inventarizatsiya", path: "/ombor/inventarizatsiya" },
    { nom: "Kirim", path: "/ombor/kirimlar" },
    { nom: "Chiqim", path: "/ombor/chiqimlar" },
    { nom: "Ko'chirish", path: "/ombor/kochirishlar" },
    { nom: "Qoldiq", path: "/ombor/qoldiq" },
    { nom: "Amalga oshirilganlar", path: "/ombor/amalga-oshirilganlar" },
    { nom: "Omborlar", path: "/ombor/omborlar" },
  ],
  default: [{ nom: "Bosh sahifa", path: "/" }],
};

function getModuleKey(pathname: string): ModuleKey {
  if (pathname.startsWith("/savdo")) return "savdo";
  if (pathname.startsWith("/mahsulotlar")) return "mahsulotlar";
  if (pathname.startsWith("/mijozlar")) return "mijozlar";
  if (pathname.startsWith("/ombor")) return "ombor";
  if (pathname.startsWith("/hisobotlar")) return "hisobotlar";
  return "default";
}

export default function YuqoriPanel() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const moduleKey = getModuleKey(pathname);
  const [bildirishnomalar, setBildirishnomalar] = useState<Bildirishnoma[]>([]);
  const [bildirishnomaOchiq, setBildirishnomaOchiq] = useState(false);
  const [bildirishnomaYuklanmoqda, setBildirishnomaYuklanmoqda] = useState(false);
  const [mahsulotModalOchiq, setMahsulotModalOchiq] = useState(false);
  const [profilOchiq, setProfilOchiq] = useState(false);

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

  const savdoTab = new URLSearchParams(search).get("tab") ?? "barchasi";
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

  if (moduleKey === "default") {
    return (
      <header className="mb-6 flex items-center gap-4">
        <div className="flex h-13 flex-1 items-center rounded-[18px] border border-gold-200/60 bg-white/75 px-5 shadow-gold-soft transition focus-within:border-gold-400 focus-within:shadow-[0_0_0_4px_rgba(200,146,35,0.10)]">
          <Search size={18} className="mr-3 shrink-0 text-[#8F8980]" />
          <input
            placeholder="Qidirish..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[#1C1A17] outline-none placeholder:text-[#8F8980]"
          />
        </div>
        <button
          type="button"
          onClick={() => setMahsulotModalOchiq(true)}
          className="flex h-13 w-13 items-center justify-center rounded-2xl border border-gold-200/60 bg-white text-[#1C1A17] shadow-gold-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-300 hover:bg-gold-100 hover:text-gold-600 hover:shadow-gold-medium active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
          aria-label="Mahsulot qo'shish"
        >
          <PackagePlus size={20} />
        </button>
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
          ochiq={profilOchiq}
          setOchiq={setProfilOchiq}
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
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-100 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-xl"
    >
      <nav
        className={
          moduleKey === "ombor" || moduleKey === "savdo"
            ? "grid min-w-0 flex-1 grid-flow-col auto-cols-[minmax(140px,1fr)] items-center overflow-x-auto"
            : "flex min-w-0 flex-1 items-center gap-5 overflow-x-auto"
        }
      >
        {moduleTabs[moduleKey].map((tab) => {
          const [tabPath, tabQuery = ""] = tab.path.split("?");
          const tabParams = new URLSearchParams(tabQuery);
          const tabKey = tabParams.get("tab") ?? "barchasi";
          const isActive =
            moduleKey === "savdo"
              ? pathname === "/savdo" && savdoTab === tabKey
              : moduleKey === "mijozlar"
                ? pathname === tabPath
              : pathname === tabPath ||
                (tabPath !== "/ombor" && pathname.startsWith(`${tabPath}/`));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`relative shrink-0 text-sm ${
                moduleKey === "ombor" || moduleKey === "savdo"
                  ? "flex h-11 w-full items-center justify-center px-3 text-center"
                  : "pb-2"
              } ${
                isActive
                  ? "font-bold text-gold-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-gold-500"
                  : "font-medium text-gray-500 hover:text-gold-600"
              }`}
            >
              {tab.nom}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
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
        {moduleKey !== "savdo" && moduleKey !== "ombor" && (
          <>
            <button className="hidden h-10 items-center gap-2 rounded-2xl border border-gold-100 bg-white/60 px-3 text-sm text-gray-600 lg:flex">
              <CalendarDays size={17} /> Bugun <ChevronDown size={15} />
            </button>
            <button className="hidden h-10 items-center gap-2 rounded-2xl bg-gold-500 px-3 text-sm font-bold text-white lg:flex">
              <Zap size={17} /> Tezkor amallar
            </button>
          </>
        )}
        <ProfilTugmasi
          profil={profil}
          ochiq={profilOchiq}
          setOchiq={setProfilOchiq}
          onLogout={() => void handleLogout()}
        />
      </div>
    </motion.header>
  );
}

function formatSumma(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString("uz-UZ")} so'm`;
}

function nomniOlish(item?: OmborTanlovi | null) {
  if (!item) return "";
  return item.fullName || item.name || item.id;
}

function qoldiqNomi(item: QoldiqTanlovi) {
  const mahsulot = item.modification?.product?.name;
  const variant = item.modification?.name;
  return [mahsulot, variant && variant !== mahsulot ? variant : ""].filter(Boolean).join(" / ") || item.modificationId;
}

function qoldiqMiqdori(item: QoldiqTanlovi) {
  const raw = item as QoldiqTanlovi & {
    availableQuantity?: number;
    availableQty?: number;
    balanceQty?: number;
    qty?: number;
  };
  return Number(raw.quantity ?? raw.balance ?? raw.availableQuantity ?? raw.availableQty ?? raw.balanceQty ?? raw.qty ?? 0);
}

function qoldiqNarxi(item: QoldiqTanlovi, narxTuri: "chakana" | "ulgurji") {
  const retail = Number(
    item.modification?.price?.retailPrice ??
      item.modification?.price?.sellingPrice ??
      item.sellingPrice ??
      item.price ??
      0
  );
  const wholesale = Number(item.modification?.price?.wholesalePrice ?? 0);
  return narxTuri === "ulgurji" && wholesale > 0 ? wholesale : retail;
}

function qoldiqBirlashtirish(omborQoldiq: QoldiqTanlovi[], katalog: QoldiqTanlovi[]) {
  const xarita = new Map<string, QoldiqTanlovi>();

  katalog.forEach((item) => {
    if (item.modificationId) xarita.set(item.modificationId, item);
  });

  omborQoldiq.forEach((item) => {
    if (!item.modificationId) return;
    const oldingi = xarita.get(item.modificationId);
    xarita.set(item.modificationId, {
      ...oldingi,
      ...item,
      modification: {
        ...oldingi?.modification,
        ...item.modification,
        id: item.modification?.id ?? oldingi?.modification?.id ?? item.modificationId,
        product: item.modification?.product ?? oldingi?.modification?.product,
        price: item.modification?.price ?? oldingi?.modification?.price,
      },
    });
  });

  return Array.from(xarita.values()).sort((a, b) => qoldiqNomi(a).localeCompare(qoldiqNomi(b)));
}

function MahsulotTanlashModal({ onClose }: { onClose: () => void }) {
  const addToCart = usePosStore((state) => state.addToCart);
  const cart = usePosStore((state) => state.cart);
  const [omborlar, setOmborlar] = useState<OmborTanlovi[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [mahsulotlar, setMahsulotlar] = useState<QoldiqTanlovi[]>([]);
  const [qidiruv, setQidiruv] = useState("");
  const [narxTuri, setNarxTuri] = useState<"chakana" | "ulgurji">("chakana");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xabar, setXabar] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [omborDropdownOchiq, setOmborDropdownOchiq] = useState(false);
  const [tanlanganMiqdorlar, setTanlanganMiqdorlar] = useState<Record<string, number>>({});

  const tanlanganOmbor = omborlar.find((ombor) => String(ombor.id) === warehouseId);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setYuklanmoqda(true);
      try {
        const warehouses = await omborlarRoyxatiniOlish();
        if (!active) return;
        setOmborlar(warehouses);
        setWarehouseId(String(warehouses[0]?.id ?? ""));
      } catch {
        if (active) setXabar("Omborlar ro'yxati olinmadi");
      } finally {
        if (active) setYuklanmoqda(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setYuklanmoqda(true);
      setXabar("");
      const [stockResult, catalogResult] = await Promise.allSettled([
          omborQoldiqlariniOlish(warehouseId || undefined),
          katalogModifikatsiyalariniQoldiqTanlovigaOlish(),
        ]);

      if (!active) return;

      const stock = stockResult.status === "fulfilled"
        ? stockResult.value.filter((item) => {
            const itemWarehouseId = item.warehouseId ?? item.warehouse?.id;
            return !warehouseId || !itemWarehouseId || String(itemWarehouseId) === warehouseId;
          })
        : [];
      const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : [];

      setMahsulotlar(qoldiqBirlashtirish(stock, catalog));
      if (stockResult.status === "rejected" && catalogResult.status === "rejected") {
        setXabar("Mahsulot qoldiqlari olinmadi");
      } else if (stockResult.status === "rejected") {
        setXabar("Tanlangan ombor qoldig'i backenddan olinmadi");
      } else if (catalogResult.status === "rejected") {
        setXabar("Katalog olinmadi, ombordagi mavjud qoldiqlar ko'rsatildi");
      }

      setYuklanmoqda(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [warehouseId, reloadKey]);

  const filteredProducts = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    return mahsulotlar
      .filter((item) => {
        if (qoldiqMiqdori(item) <= 0) return false;
        if (!query) return true;
        return [
          qoldiqNomi(item),
          item.modification?.barcode,
          item.modification?.article,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const aHasStock = qoldiqMiqdori(a) > 0 ? 0 : 1;
        const bHasStock = qoldiqMiqdori(b) > 0 ? 0 : 1;
        if (aHasStock !== bHasStock) return aHasStock - bHasStock;
        return qoldiqNomi(a).localeCompare(qoldiqNomi(b));
      });
  }, [mahsulotlar, qidiruv]);

  function miqdorniYangilash(item: QoldiqTanlovi, ozgarish: number) {
    const qoldiq = qoldiqMiqdori(item);
    const narx = qoldiqNarxi(item, narxTuri);

    if (qoldiq <= 0) {
      setXabar("Bu mahsulot bo'yicha qoldiq yo'q");
      return;
    }

    if (narx <= 0) {
      setXabar("Bu mahsulot narxi backendda kiritilmagan");
      return;
    }

    setTanlanganMiqdorlar((joriy) => {
      const yangi = Math.min(Math.max((joriy[item.modificationId] ?? 0) + ozgarish, 0), qoldiq);
      const keyingi = { ...joriy };
      if (yangi === 0) delete keyingi[item.modificationId];
      else keyingi[item.modificationId] = yangi;
      return keyingi;
    });
  }

  const tanlanganlar = mahsulotlar.filter((item) => (tanlanganMiqdorlar[item.modificationId] ?? 0) > 0);
  const tanlanganSoni = Object.values(tanlanganMiqdorlar).reduce((sum, quantity) => sum + quantity, 0);
  const tanlanganJami = tanlanganlar.reduce(
    (sum, item) => sum + (tanlanganMiqdorlar[item.modificationId] ?? 0) * qoldiqNarxi(item, narxTuri),
    0
  );

  function savatchagaQoshish() {
    if (tanlanganlar.length === 0) return;
    const boshqaOmborBor = cart.some(
      (item) => item.warehouseId && String(item.warehouseId) !== warehouseId
    );
    if (boshqaOmborBor) {
      setXabar("Savatchada boshqa ombor mahsuloti bor. Bitta sotuv faqat bitta ombordan qilinadi.");
      return;
    }
    tanlanganlar.forEach((item) => {
      addToCart({
        id: item.modificationId,
        modificationId: item.modificationId,
        nom: qoldiqNomi(item),
        narx: qoldiqNarxi(item, narxTuri),
        chakanaNarx: qoldiqNarxi(item, "chakana"),
        ulgurjiNarx: qoldiqNarxi(item, "ulgurji"),
        qoldiq: qoldiqMiqdori(item),
        warehouseId,
        warehouseName: tanlanganOmbor ? nomniOlish(tanlanganOmbor) : undefined,
      }, tanlanganMiqdorlar[item.modificationId]);
    });
    setTanlanganMiqdorlar({});
    onClose();
  }

  return createPortal(
    <div className="app-modal-compact fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm">
      <div className="relative w-full max-w-[1500px]">
        <div className="absolute -left-20 top-7 hidden flex-col gap-3 xl:flex">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500 text-white shadow-lg shadow-gold-200 transition hover:bg-gold-600"
            aria-label="Yopish"
          >
            <X size={24} />
          </button>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-md ring-1 ring-gold-100 transition hover:bg-gold-50"
            aria-label="Yangilash"
          >
            <RefreshCw size={22} className={yuklanmoqda ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setQidiruv("")}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-md ring-1 ring-gold-100 transition hover:bg-gold-50"
            aria-label="Qidiruvni tozalash"
          >
            <Search size={22} />
          </button>
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-md ring-1 ring-gold-100"
            aria-label="Mahsulotlar"
          >
            <PackagePlus size={22} />
          </button>
        </div>

        <section className="flex h-[min(860px,94vh)] w-full flex-col overflow-hidden rounded-[34px] border border-gold-100 bg-white shadow-[0_30px_120px_rgba(15,23,42,.32)]">
        <div className="flex items-center justify-between border-b border-gold-50 bg-[#fff8f1] px-7 py-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold-500">YePost</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Mahsulot tanlash</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-gold-100 transition hover:bg-gold-500 hover:text-white"
            aria-label="Yopish"
          >
            <X size={22} />
          </button>
        </div>

        <div className="grid gap-3 border-b border-gold-50 px-7 py-5 lg:grid-cols-[minmax(0,1fr)_280px_280px]">
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
            <Search size={18} className="text-slate-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              placeholder="Mahsulot, shtrix-kod yoki artikul..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOmborDropdownOchiq((value) => !value)}
              className={`flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
                omborDropdownOchiq ? "border-gold-400 ring-4 ring-gold-50" : "border-slate-200 hover:border-gold-200"
              }`}
            >
              <span className={tanlanganOmbor ? "text-slate-700" : "text-slate-400"}>
                {tanlanganOmbor ? nomniOlish(tanlanganOmbor) : "Omborni tanlang"}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-slate-400 transition ${omborDropdownOchiq ? "rotate-180 text-gold-500" : ""}`}
              />
            </button>

            {omborDropdownOchiq && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[260] max-h-72 overflow-auto rounded-2xl border border-gold-100 bg-white p-2 shadow-[0_18px_55px_rgba(15,23,42,.18)]">
                {omborlar.length === 0 ? (
                  <div className="rounded-xl px-3 py-3 text-sm font-bold text-slate-400">
                    Ombor topilmadi
                  </div>
                ) : (
                  omborlar.map((ombor) => {
                    const active = String(ombor.id) === warehouseId;
                    return (
                      <button
                        key={ombor.id}
                        type="button"
                        onClick={() => {
                          setWarehouseId(String(ombor.id));
                          setTanlanganMiqdorlar({});
                          setOmborDropdownOchiq(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                          active ? "bg-gold-50 text-gold-600" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {nomniOlish(ombor)}
                        {active && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setNarxTuri("chakana")}
              className={`rounded-xl text-sm font-black transition ${
                narxTuri === "chakana" ? "bg-gold-500 text-white shadow-sm" : "text-slate-500"
              }`}
            >
              Chakana
            </button>
            <button
              type="button"
              onClick={() => setNarxTuri("ulgurji")}
              className={`rounded-xl text-sm font-black transition ${
                narxTuri === "ulgurji" ? "bg-gold-500 text-white shadow-sm" : "text-slate-500"
              }`}
            >
              Ulgurji
            </button>
          </div>
        </div>

        {xabar && (
          <div className="mx-7 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {xabar}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-7">
          {yuklanmoqda ? (
            <div className="flex h-full min-h-[360px] items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 animate-spin text-gold-500" size={24} />
              Mahsulotlar yuklanmoqda...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 text-center text-sm font-semibold text-slate-400">
              Tanlangan omborda sotuv uchun mavjud mahsulot yo'q
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredProducts.map((item) => {
                const qoldiq = qoldiqMiqdori(item);
                const narx = qoldiqNarxi(item, narxTuri);
                const sotishMumkin = qoldiq > 0 && narx > 0;

                return (
                  <article
                    key={item.modificationId}
                    className={`rounded-[22px] border bg-white p-4 shadow-sm transition hover:border-gold-200 hover:shadow-md ${
                      sotishMumkin ? "border-slate-100" : "border-slate-100 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-900">
                          {qoldiqNomi(item)}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {item.modification?.barcode || item.modification?.article || "Kod kiritilmagan"}
                        </p>
                      </div>
                      <div className={`flex shrink-0 items-center rounded-2xl p-1 ${tanlanganMiqdorlar[item.modificationId] ? "bg-gold-500 text-white shadow-lg shadow-gold-100" : "bg-slate-100 text-slate-500"}`}>
                        {tanlanganMiqdorlar[item.modificationId] ? (
                          <>
                            <button type="button" onClick={() => miqdorniYangilash(item, -1)} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/15" aria-label="Kamaytirish"><Minus size={16}/></button>
                            <span className="min-w-9 text-center text-sm font-black">{tanlanganMiqdorlar[item.modificationId]}</span>
                            <button type="button" onClick={() => miqdorniYangilash(item, 1)} disabled={!sotishMumkin || tanlanganMiqdorlar[item.modificationId] >= qoldiq} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/15 disabled:opacity-40" aria-label="Ko'paytirish"><Plus size={16}/></button>
                          </>
                        ) : (
                          <button type="button" onClick={() => miqdorniYangilash(item, 1)} disabled={!sotishMumkin} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500 text-white disabled:bg-slate-200 disabled:text-slate-400" aria-label="Tanlash"><Plus size={19}/></button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-[11px] font-black uppercase text-slate-400">Qoldiq</p>
                        <p className={`mt-1 text-base font-black ${qoldiq > 0 ? "text-slate-800" : "text-red-500"}`}>
                          {qoldiq.toLocaleString("uz-UZ")}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gold-50 px-3 py-3">
                        <p className="text-[11px] font-black uppercase text-gold-400">Narx</p>
                        <p className="mt-1 text-base font-black text-gold-600">{formatSumma(narx)}</p>
                      </div>
                    </div>

                    {!sotishMumkin && (
                      <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-500">
                        {qoldiq <= 0 ? "Bu omborda qoldiq yo'q" : "Narx kiritilmagan"}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <footer className="flex flex-col gap-4 border-t border-gold-100 bg-[#fff8f1] px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 text-gold-600"><ShoppingCart size={22}/></span>
            <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Tanlangan mahsulotlar</p><p className="mt-1 font-black text-slate-900">{tanlanganSoni} dona · {formatSumma(tanlanganJami)}</p></div>
          </div>
          <button type="button" onClick={savatchagaQoshish} disabled={tanlanganSoni === 0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-7 text-sm font-black text-white shadow-lg shadow-gold-200 transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"><ShoppingCart size={18}/> Savatchaga qo'shish {tanlanganSoni > 0 ? `(${tanlanganSoni})` : ""}</button>
        </footer>
      </section>
      </div>
    </div>,
    document.body
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
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gold-100 bg-white/60 text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-200 hover:bg-gold-50 hover:text-gold-600 hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
        aria-label="Bildirishnomalar"
      >
        <Bell size={18} />
        {oqilmaganSoni > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-black text-white">
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
              aria-label="Bildirishnomalarni yopish"
              onClick={() => setOchiq(false)}
            />
            <div
              className="fixed z-[200] w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-gold-100 bg-white shadow-[0_24px_90px_rgba(15,23,42,.22)]"
              style={{ top: position.top, right: position.right }}
            >
          <div className="flex items-center justify-between border-b border-gold-50 px-4 py-3">
            <div>
              <p className="font-black text-gray-900">Bildirishnomalar</p>
              <p className="text-xs text-gray-400">{oqilmaganSoni} ta o'qilmagan</p>
            </div>
            <button
              type="button"
              onClick={onReadAll}
              className="rounded-xl bg-gold-50 px-3 py-2 text-xs font-bold text-gold-600"
            >
              Hammasi o'qildi
            </button>
          </div>

          <div className="max-h-[380px] overflow-auto p-2">
            {yuklanmoqda ? (
              <div className="flex h-28 items-center justify-center">
                <LoaderCircle className="animate-spin text-gold-500" size={24} />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm font-medium text-gray-400">
                Bildirishnomalar yo'q
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
                        {item.title ?? "Bildirishnoma"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                        {item.text ?? item.message ?? "Yangi CRM hodisasi"}
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
  ochiq,
  setOchiq,
  onLogout,
}: {
  profil: JoriyFoydalanuvchi | null;
  ochiq: boolean;
  setOchiq: (value: boolean) => void;
  onLogout: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState({ top: 0, right: 24 });

  useEffect(() => {
    if (!ochiq) return;

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 10,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [ochiq]);

  const ism = profil?.fullName?.trim() || profil?.username || "";
  const rolNomi = profil ? rolMatni[profil.role as FoydalanuvchiRoli] ?? profil.role : "";
  const rasmUrl = profil?.avatarUrl || "";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOchiq(!ochiq)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white/60 text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-200 hover:bg-gold-50 hover:text-gold-600 hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
        aria-label="Profil menyusi"
      >
        {rasmUrl ? (
          <img src={rasmUrl} alt={ism || "Profil"} className="h-full w-full object-cover" />
        ) : (
          <UserRound size={18} />
        )}
      </button>

      {ochiq &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[190] cursor-default bg-transparent"
              aria-label="Profil menyusini yopish"
              onClick={() => setOchiq(false)}
            />
            <div
              className="fixed z-[200] w-[260px] overflow-hidden rounded-[24px] border border-gold-100 bg-white shadow-[0_24px_90px_rgba(15,23,42,.22)]"
              style={{ top: position.top, right: position.right }}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/70 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm">
                  {rasmUrl ? (
                    <img src={rasmUrl} alt={ism || "Profil"} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={20} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">{ism || "Foydalanuvchi"}</p>
                  <p className="truncate text-xs font-bold text-gray-500">{rolNomi || "..."}</p>
                </div>
              </div>
              <div className="p-2">
                <Link
                  to="/sozlamalar"
                  onClick={() => setOchiq(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gold-50 hover:text-gold-600"
                >
                  <UserRound size={17} /> Mening profilim
                </Link>
                <Link
                  to="/sozlamalar"
                  onClick={() => setOchiq(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gold-50 hover:text-gold-600"
                >
                  <Settings size={17} /> Sozlamalar
                </Link>
              </div>
              <div className="border-t border-gold-100 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOchiq(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50"
                >
                  <LogOut size={17} /> Tizimdan chiqish
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
