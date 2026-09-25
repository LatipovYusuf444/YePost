import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Bell, ChevronDown, LoaderCircle, LogOut, Menu, Minus, PackagePlus, Plus, RefreshCw, Search, Settings, ShoppingCart, UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/Components/common/LanguageSwitcher";
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
        <div className="flex h-13 flex-1 items-center rounded-[18px] border border-gold-200/60 bg-white/75 px-5 shadow-gold-soft transition focus-within:border-gold-400 focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.10)]">
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
        ochiq={profilOchiq}
        setOchiq={setProfilOchiq}
        onLogout={() => void handleLogout()}
        bosHarfBilan
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
  const { t } = useTranslation("topbar");
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
        if (active) setXabar("posModal.errors.warehousesLoadFailed");
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
        setXabar("posModal.errors.stockLoadFailed");
      } else if (stockResult.status === "rejected") {
        setXabar("posModal.errors.warehouseStockLoadFailed");
      } else if (catalogResult.status === "rejected") {
        setXabar("posModal.errors.catalogLoadFailed");
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
      setXabar("posModal.errors.noStock");
      return;
    }

    if (narx <= 0) {
      setXabar("posModal.errors.noPrice");
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
      setXabar("posModal.errors.mixedWarehouse");
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
            aria-label={t("posModal.closeAria")}
          >
            <X size={24} />
          </button>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-md ring-1 ring-gold-100 transition hover:bg-gold-50"
            aria-label={t("posModal.refreshAria")}
          >
            <RefreshCw size={22} className={yuklanmoqda ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setQidiruv("")}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-md ring-1 ring-gold-100 transition hover:bg-gold-50"
            aria-label={t("posModal.clearSearchAria")}
          >
            <Search size={22} />
          </button>
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-md ring-1 ring-gold-100"
            aria-label={t("posModal.productsAria")}
          >
            <PackagePlus size={22} />
          </button>
        </div>

        <section className="flex h-[min(860px,94vh)] w-full flex-col overflow-hidden rounded-[34px] border border-gold-100 bg-white shadow-[0_30px_120px_rgba(15,23,42,.32)]">
        <div className="flex items-center justify-between border-b border-gold-50 bg-[#F8FAFC] px-7 py-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold-500">YePost</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{t("posModal.title")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-gold-100 transition hover:bg-gold-500 hover:text-white"
            aria-label={t("posModal.closeAria")}
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
              placeholder={t("posModal.searchPlaceholder")}
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
                {tanlanganOmbor ? nomniOlish(tanlanganOmbor) : t("posModal.selectWarehouse")}
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
                    {t("posModal.warehouseNotFound")}
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
              {t("posModal.retail")}
            </button>
            <button
              type="button"
              onClick={() => setNarxTuri("ulgurji")}
              className={`rounded-xl text-sm font-black transition ${
                narxTuri === "ulgurji" ? "bg-gold-500 text-white shadow-sm" : "text-slate-500"
              }`}
            >
              {t("posModal.wholesale")}
            </button>
          </div>
        </div>

        {xabar && (
          <div className="mx-7 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {t(xabar)}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-7">
          {yuklanmoqda ? (
            <div className="flex h-full min-h-[360px] items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 animate-spin text-gold-500" size={24} />
              {t("posModal.loading")}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 text-center text-sm font-semibold text-slate-400">
              {t("posModal.noProducts")}
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
                          {item.modification?.barcode || item.modification?.article || t("posModal.noCode")}
                        </p>
                      </div>
                      <div className={`flex shrink-0 items-center rounded-2xl p-1 ${tanlanganMiqdorlar[item.modificationId] ? "bg-gold-500 text-white shadow-lg shadow-gold-100" : "bg-slate-100 text-slate-500"}`}>
                        {tanlanganMiqdorlar[item.modificationId] ? (
                          <>
                            <button type="button" onClick={() => miqdorniYangilash(item, -1)} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/15" aria-label={t("posModal.decreaseAria")}><Minus size={16}/></button>
                            <span className="min-w-9 text-center text-sm font-black">{tanlanganMiqdorlar[item.modificationId]}</span>
                            <button type="button" onClick={() => miqdorniYangilash(item, 1)} disabled={!sotishMumkin || tanlanganMiqdorlar[item.modificationId] >= qoldiq} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/15 disabled:opacity-40" aria-label={t("posModal.increaseAria")}><Plus size={16}/></button>
                          </>
                        ) : (
                          <button type="button" onClick={() => miqdorniYangilash(item, 1)} disabled={!sotishMumkin} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500 text-white disabled:bg-slate-200 disabled:text-slate-400" aria-label={t("posModal.selectAria")}><Plus size={19}/></button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-[11px] font-black uppercase text-slate-400">{t("posModal.stock")}</p>
                        <p className={`mt-1 text-base font-black ${qoldiq > 0 ? "text-slate-800" : "text-red-500"}`}>
                          {qoldiq.toLocaleString("uz-UZ")}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gold-50 px-3 py-3">
                        <p className="text-[11px] font-black uppercase text-gold-400">{t("posModal.price")}</p>
                        <p className="mt-1 text-base font-black text-gold-600">{formatSumma(narx)}</p>
                      </div>
                    </div>

                    {!sotishMumkin && (
                      <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-500">
                        {qoldiq <= 0 ? t("posModal.noStock") : t("posModal.noPrice")}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <footer className="flex flex-col gap-4 border-t border-gold-100 bg-[#F8FAFC] px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 text-gold-600"><ShoppingCart size={22}/></span>
            <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("posModal.selectedProducts")}</p><p className="mt-1 font-black text-slate-900">{tanlanganSoni} {t("posModal.unit")} · {formatSumma(tanlanganJami)}</p></div>
          </div>
          <button type="button" onClick={savatchagaQoshish} disabled={tanlanganSoni === 0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-7 text-sm font-black text-white shadow-lg shadow-gold-200 transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"><ShoppingCart size={18}/> {t("posModal.addToCart")} {tanlanganSoni > 0 ? `(${tanlanganSoni})` : ""}</button>
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
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gold-100 bg-white/60 text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-200 hover:bg-gold-50 hover:text-gold-600 hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
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
  ochiq,
  setOchiq,
  onLogout,
  bosHarfBilan = false,
}: {
  profil: JoriyFoydalanuvchi | null;
  ochiq: boolean;
  setOchiq: (value: boolean) => void;
  onLogout: () => void;
  bosHarfBilan?: boolean;
}) {
  const { t } = useTranslation(["topbar", "nav"]);
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
  const rolNomi = profil ? t(`roles.${profil.role}`, { ns: "nav", defaultValue: profil.role }) : "";
  const rasmUrl = profil?.avatarUrl || "";
  // Rasm bo'lmasa ism bosh harfi (faqat bosHarfBilan berilgan navbarda); ism yo'q bo'lsa avvalgi ikonka.
  const bosHarf = bosHarfBilan && ism ? ism.charAt(0).toUpperCase() : "";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOchiq(!ochiq)}
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

      {ochiq &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[190] cursor-default bg-transparent"
              aria-label={t("profile.closeAria")}
              onClick={() => setOchiq(false)}
            />
            <div
              className="fixed z-[200] w-[260px] overflow-hidden rounded-[24px] border border-gold-100 bg-white shadow-[0_24px_90px_rgba(15,23,42,.22)]"
              style={{ top: position.top, right: position.right }}
            >
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
                <Link
                  to="/sozlamalar"
                  onClick={() => setOchiq(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gold-50 hover:text-gold-600"
                >
                  <UserRound size={17} /> {t("profile.myProfile")}
                </Link>
                <Link
                  to="/sozlamalar"
                  onClick={() => setOchiq(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gold-50 hover:text-gold-600"
                >
                  <Settings size={17} /> {t("profile.settings")}
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
                  <LogOut size={17} /> {t("profile.logout")}
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
