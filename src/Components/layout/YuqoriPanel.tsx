import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarDays, ChevronDown, LoaderCircle, PackagePlus, Plus, Search, X, Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { crmApi } from "@/api/crmApi";
import {
  katalogModifikatsiyalariniQoldiqTanlovigaOlish,
  omborlarRoyxatiniOlish,
  omborQoldiqlariniOlish,
} from "@/api/savdoApi";
import { usePosStore } from "@/store/posStore";
import type { Bildirishnoma } from "@/types/crm";
import type { OmborTanlovi, QoldiqTanlovi } from "@/types/savdo";

type ModuleKey = "savdo" | "mahsulotlar" | "mijozlar" | "ombor" | "hisobotlar" | "default";

const moduleTabs: Record<ModuleKey, Array<{ nom: string; path: string }>> = {
  savdo: [
    { nom: "Barcha sotuvlar", path: "/savdo" },
    { nom: "Qoralamalar", path: "/savdo?tab=savatcha" },
    { nom: "Savdo tarixi", path: "/savdo?tab=tarix" },
    { nom: "To'lovlar", path: "/savdo?tab=tolovlar" },
    { nom: "Qaytarish", path: "/savdo?tab=qaytarish" },
    { nom: "Bekor qilinganlar", path: "/savdo?tab=bekor-qilingan" },
  ],
  mahsulotlar: [{ nom: "Mahsulotlar", path: "/mahsulotlar" }],
  mijozlar: [{ nom: "Mijozlar", path: "/mijozlar" }],
  hisobotlar: [{ nom: "Hisobotlar", path: "/hisobotlar" }],
  ombor: [
    { nom: "Omborlar", path: "/ombor" },
    { nom: "Kirim", path: "/ombor/kirimlar" },
    { nom: "Amalga oshirilganlar", path: "/ombor/amalga-oshirilganlar" },
    { nom: "Chiqim", path: "/ombor/chiqimlar" },
    { nom: "Ko'chirish", path: "/ombor/kochirishlar" },
    { nom: "Qoldiq", path: "/ombor/qoldiq" },
    { nom: "Inventarizatsiya", path: "/ombor/inventarizatsiya" },
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
  const { pathname, search } = useLocation();
  const moduleKey = getModuleKey(pathname);
  const [bildirishnomalar, setBildirishnomalar] = useState<Bildirishnoma[]>([]);
  const [bildirishnomaOchiq, setBildirishnomaOchiq] = useState(false);
  const [bildirishnomaYuklanmoqda, setBildirishnomaYuklanmoqda] = useState(false);
  const [mahsulotModalOchiq, setMahsulotModalOchiq] = useState(false);

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
        <div className="flex h-11 flex-1 items-center rounded-2xl border border-orange-100 bg-white/60 px-4 shadow-sm">
          <input
            placeholder="Qidirish"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <Search size={18} className="text-gray-400" />
        </div>
        <button
          type="button"
          onClick={() => setMahsulotModalOchiq(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-500 text-white shadow-sm shadow-orange-100 transition hover:bg-orange-600"
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
        {mahsulotModalOchiq && (
          <MahsulotTanlashModal onClose={() => setMahsulotModalOchiq(false)} />
        )}
      </header>
    );
  }

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-xl">
      <nav className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
        {moduleTabs[moduleKey].map((tab) => {
          const [tabPath, tabQuery = ""] = tab.path.split("?");
          const tabParams = new URLSearchParams(tabQuery);
          const tabKey = tabParams.get("tab") ?? "barchasi";
          const isActive =
            moduleKey === "savdo"
              ? pathname === "/savdo" && savdoTab === tabKey
              : pathname === tabPath ||
                (tabPath !== "/ombor" && pathname.startsWith(`${tabPath}/`));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`relative shrink-0 pb-2 text-sm ${
                isActive
                  ? "font-bold text-orange-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-orange-500"
                  : "font-medium text-gray-500 hover:text-orange-600"
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
        {moduleKey !== "savdo" && (
          <>
            <button className="hidden h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white/60 px-3 text-sm text-gray-600 lg:flex">
              <CalendarDays size={17} /> Bugun <ChevronDown size={15} />
            </button>
            <button className="hidden h-10 items-center gap-2 rounded-2xl bg-orange-500 px-3 text-sm font-bold text-white lg:flex">
              <Zap size={17} /> Tezkor amallar
            </button>
          </>
        )}
      </div>
    </header>
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
  return Number(item.quantity ?? item.balance ?? 0);
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
  const [omborlar, setOmborlar] = useState<OmborTanlovi[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [mahsulotlar, setMahsulotlar] = useState<QoldiqTanlovi[]>([]);
  const [qidiruv, setQidiruv] = useState("");
  const [narxTuri, setNarxTuri] = useState<"chakana" | "ulgurji">("chakana");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xabar, setXabar] = useState("");

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
    if (!warehouseId) return;
    let active = true;
    const load = async () => {
      setYuklanmoqda(true);
      setXabar("");
      try {
        const [stock, catalog] = await Promise.all([
          omborQoldiqlariniOlish(warehouseId),
          katalogModifikatsiyalariniQoldiqTanlovigaOlish(),
        ]);
        if (active) setMahsulotlar(qoldiqBirlashtirish(stock, catalog));
      } catch {
        if (active) setXabar("Mahsulot qoldiqlari olinmadi");
      } finally {
        if (active) setYuklanmoqda(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [warehouseId]);

  const filteredProducts = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    return mahsulotlar
      .filter((item) => {
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

  function addProduct(item: QoldiqTanlovi) {
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

    addToCart({
      id: item.modificationId,
      modificationId: item.modificationId,
      nom: qoldiqNomi(item),
      narx,
      chakanaNarx: qoldiqNarxi(item, "chakana"),
      ulgurjiNarx: qoldiqNarxi(item, "ulgurji"),
      qoldiq,
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <section className="flex h-[min(760px,92vh)] w-full max-w-[980px] flex-col overflow-hidden rounded-[34px] border border-orange-100 bg-white shadow-[0_30px_120px_rgba(15,23,42,.32)]">
        <div className="flex items-center justify-between border-b border-orange-50 bg-[#fff8f1] px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">YePost</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Mahsulot tanlash</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-500 hover:text-white"
            aria-label="Yopish"
          >
            <X size={22} />
          </button>
        </div>

        <div className="grid gap-3 border-b border-orange-50 px-6 py-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
            <Search size={18} className="text-slate-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              placeholder="Mahsulot, shtrix-kod yoki artikul..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-300"
          >
            {omborlar.map((ombor) => (
              <option key={ombor.id} value={ombor.id}>
                {nomniOlish(ombor)}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setNarxTuri("chakana")}
              className={`rounded-xl text-sm font-black transition ${
                narxTuri === "chakana" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500"
              }`}
            >
              Chakana
            </button>
            <button
              type="button"
              onClick={() => setNarxTuri("ulgurji")}
              className={`rounded-xl text-sm font-black transition ${
                narxTuri === "ulgurji" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500"
              }`}
            >
              Ulgurji
            </button>
          </div>
        </div>

        {xabar && (
          <div className="mx-6 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {xabar}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {yuklanmoqda ? (
            <div className="flex h-full min-h-[360px] items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 animate-spin text-orange-500" size={24} />
              Mahsulotlar yuklanmoqda...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 text-center text-sm font-semibold text-slate-400">
              Mahsulot topilmadi
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredProducts.map((item) => {
                const qoldiq = qoldiqMiqdori(item);
                const narx = qoldiqNarxi(item, narxTuri);
                const sotishMumkin = qoldiq > 0 && narx > 0;

                return (
                  <article
                    key={item.modificationId}
                    className={`rounded-[22px] border bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md ${
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
                      <button
                        type="button"
                        onClick={() => addProduct(item)}
                        disabled={!sotishMumkin}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                        aria-label="Savatchaga qo'shish"
                      >
                        <Plus size={19} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-[11px] font-black uppercase text-slate-400">Qoldiq</p>
                        <p className={`mt-1 text-base font-black ${qoldiq > 0 ? "text-slate-800" : "text-red-500"}`}>
                          {qoldiq.toLocaleString("uz-UZ")}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-orange-50 px-3 py-3">
                        <p className="text-[11px] font-black uppercase text-orange-400">Narx</p>
                        <p className="mt-1 text-base font-black text-orange-600">{formatSumma(narx)}</p>
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
      </section>
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
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white/60 text-gray-700"
        aria-label="Bildirishnomalar"
      >
        <Bell size={18} />
        {oqilmaganSoni > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">
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
              className="fixed z-[200] w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_24px_90px_rgba(15,23,42,.22)]"
              style={{ top: position.top, right: position.right }}
            >
          <div className="flex items-center justify-between border-b border-orange-50 px-4 py-3">
            <div>
              <p className="font-black text-gray-900">Bildirishnomalar</p>
              <p className="text-xs text-gray-400">{oqilmaganSoni} ta o'qilmagan</p>
            </div>
            <button
              type="button"
              onClick={onReadAll}
              className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"
            >
              Hammasi o'qildi
            </button>
          </div>

          <div className="max-h-[380px] overflow-auto p-2">
            {yuklanmoqda ? (
              <div className="flex h-28 items-center justify-center">
                <LoaderCircle className="animate-spin text-orange-500" size={24} />
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
                  className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-orange-50"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        item.isRead || item.readAt ? "bg-gray-200" : "bg-orange-500"
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
                        <p className="mt-1 text-[11px] font-bold text-orange-500">
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
