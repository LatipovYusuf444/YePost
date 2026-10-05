import { pulMatni } from "@/lib/valyuta";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, LoaderCircle, Minus, PackageOpen, PackagePlus, Plus, RefreshCw, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  katalogModifikatsiyalariniQoldiqTanlovigaOlish,
  omborlarRoyxatiniOlish,
  omborQoldiqlariniOlish,
  qoldiqNomlariniBoyitish,
} from "@/api/savdoApi";
import { usePosStore } from "@/store/posStore";
import type { OmborTanlovi, QoldiqTanlovi } from "@/types/savdo";

// Topbar'dagi "Mahsulot tanlash" oynasi: ombor qoldig'i + katalog narxlari birlashtirilib,
// tanlangan mahsulotlar savatchaga qo'shiladi.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KAM_QOLDIQ = 10;

function formatSumma(value: number) {
  return pulMatni(Number(value) || 0, "UZS", true);
}

function nomniOlish(item?: OmborTanlovi | null) {
  if (!item) return "";
  return item.fullName || item.name || item.id;
}

// Birinchi musbat qiymatni qaytaradi (backend ba'zan 0 yoki bo'sh yuboradi).
function musbat(...qiymatlar: unknown[]) {
  for (const qiymat of qiymatlar) {
    const son = Number(qiymat);
    if (Number.isFinite(son) && son > 0) return son;
  }
  return 0;
}

// UUID ko'rinishidagi "nom" haqiqiy nom emas — bo'sh deb hisoblanadi.
function toza(nom?: string | null) {
  const qiymat = nom?.trim() ?? "";
  return qiymat && !UUID.test(qiymat) ? qiymat : "";
}

function mahsulotNomi(item: QoldiqTanlovi) {
  return toza(item.modification?.product?.name);
}

function variantNomi(item: QoldiqTanlovi) {
  const variant = toza(item.modification?.name);
  return variant && variant !== "Asosiy variant" && variant !== mahsulotNomi(item) ? variant : "";
}

function savatNomi(item: QoldiqTanlovi) {
  return [mahsulotNomi(item), variantNomi(item)].filter(Boolean).join(" / ") || toza(item.modification?.name);
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
  const narx = item.modification?.price;
  const chakana = musbat(narx?.retailPrice, narx?.sellingPrice, item.sellingPrice, item.price, narx?.wholesalePrice);
  const ulgurji = musbat(narx?.wholesalePrice);
  return narxTuri === "ulgurji" && ulgurji > 0 ? ulgurji : chakana;
}

function narxlarniBirlashtirish(a?: QoldiqTanlovi["modification"], b?: QoldiqTanlovi["modification"]) {
  const narx = {
    costPrice: musbat(a?.price?.costPrice, b?.price?.costPrice),
    retailPrice: musbat(a?.price?.retailPrice, b?.price?.retailPrice),
    wholesalePrice: musbat(a?.price?.wholesalePrice, b?.price?.wholesalePrice),
    sellingPrice: musbat(a?.price?.sellingPrice, b?.price?.sellingPrice, a?.price?.retailPrice, b?.price?.retailPrice),
  };
  // Hech qanday narx yo'q bo'lsa, keyingi bosqichda katalogdan to'ldirish uchun undefined qoldiriladi.
  return narx.retailPrice || narx.wholesalePrice || narx.sellingPrice ? narx : undefined;
}

// Ombor qoldig'ini (miqdor) katalog ma'lumotlari (nom, narx) bilan birlashtiradi.
// Ikkala manbadan ham bo'sh/0 qiymatlar haqiqiy qiymatni bosib ketmaydi.
function qoldiqBirlashtirish(omborQoldiq: QoldiqTanlovi[], katalog: QoldiqTanlovi[]) {
  const xarita = new Map<string, QoldiqTanlovi>();

  katalog.forEach((item) => {
    if (item.modificationId) xarita.set(item.modificationId, item);
  });

  omborQoldiq.forEach((item) => {
    if (!item.modificationId) return;
    const katalogdagi = xarita.get(item.modificationId);
    const mod = item.modification;
    const katMod = katalogdagi?.modification;
    const mahsulotNom = toza(mod?.product?.name) || toza(katMod?.product?.name);

    xarita.set(item.modificationId, {
      ...katalogdagi,
      ...item,
      sellingPrice: musbat(item.sellingPrice, item.price, katalogdagi?.sellingPrice, katalogdagi?.price),
      price: musbat(item.price, item.sellingPrice, katalogdagi?.price, katalogdagi?.sellingPrice),
      modification: {
        ...katMod,
        ...mod,
        id: mod?.id ?? katMod?.id ?? item.modificationId,
        name: toza(mod?.name) || toza(katMod?.name) || undefined,
        barcode: mod?.barcode || katMod?.barcode,
        article: mod?.article || katMod?.article,
        product: {
          id: mod?.product?.id || katMod?.product?.id || item.productId || "",
          name: mahsulotNom,
        },
        price: narxlarniBirlashtirish(mod, katMod),
      },
    });
  });

  return Array.from(xarita.values());
}

function qisqartma(nom: string) {
  const sozlar = nom.split(/\s+/).filter(Boolean);
  return (sozlar.length > 1 ? sozlar[0][0] + sozlar[1][0] : nom.slice(0, 2)).toUpperCase();
}

type TanlovMalumoti = { item: QoldiqTanlovi; warehouseId: string; warehouseName: string };

function tanlovKaliti(modificationId: string, warehouseId: string) {
  return `${modificationId}::${warehouseId}`;
}

export default function MahsulotTanlashModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("topbar");
  const addToCart = usePosStore((state) => state.addToCart);
  const [omborlar, setOmborlar] = useState<OmborTanlovi[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [mahsulotlar, setMahsulotlar] = useState<QoldiqTanlovi[]>([]);
  const [qidiruv, setQidiruv] = useState("");
  const [narxTuri, setNarxTuri] = useState<"chakana" | "ulgurji">("chakana");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xabar, setXabar] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [omborDropdownOchiq, setOmborDropdownOchiq] = useState(false);
  // Tanlovlar (modificationId + ombor) kaliti bo'yicha saqlanadi — omborlar almashganda yo'qolmaydi.
  const [tanlanganMiqdorlar, setTanlanganMiqdorlar] = useState<Record<string, number>>({});
  const [tanlanganMalumot, setTanlanganMalumot] = useState<Record<string, TanlovMalumoti>>({});

  const tanlanganOmbor = omborlar.find((ombor) => String(ombor.id) === warehouseId);
  const nomsiz = t("posModal.unnamed");

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

      const stock =
        stockResult.status === "fulfilled"
          ? stockResult.value.filter((item) => {
              const itemWarehouseId = item.warehouseId ?? item.warehouse?.id;
              return !warehouseId || !itemWarehouseId || String(itemWarehouseId) === warehouseId;
            })
          : [];
      const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : [];

      const birlashgan = qoldiqBirlashtirish(stock, catalog);
      setMahsulotlar(birlashgan);
      if (stockResult.status === "rejected" && catalogResult.status === "rejected") {
        setXabar("posModal.errors.stockLoadFailed");
      } else if (stockResult.status === "rejected") {
        setXabar("posModal.errors.warehouseStockLoadFailed");
      } else if (catalogResult.status === "rejected") {
        setXabar("posModal.errors.catalogLoadFailed");
      }
      setYuklanmoqda(false);

      // Nomi yoki narxi hali topilmagan mahsulotlar katalogdan to'ldiriladi (faqat qoldig'i borlari).
      const toldirish = birlashgan.filter((item) => qoldiqMiqdori(item) > 0 && (!mahsulotNomi(item) || !qoldiqNarxi(item, "chakana")));
      if (toldirish.length) {
        try {
          const boyitilgan = await qoldiqNomlariniBoyitish(toldirish);
          if (!active) return;
          const xaritasi = new Map(boyitilgan.map((item) => [item.modificationId, item]));
          setMahsulotlar((joriy) =>
            joriy.map((item) => {
              const yangi = xaritasi.get(item.modificationId);
              if (!yangi) return item;
              return qoldiqBirlashtirish([item], [yangi])[0] ?? item;
            })
          );
        } catch {
          // to'ldirish muvaffaqiyatsiz bo'lsa, mavjud ma'lumot bilan davom etiladi
        }
      }
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
        return [savatNomi(item), item.modification?.barcode, item.modification?.article].join(" ").toLowerCase().includes(query);
      })
      .sort((a, b) => (savatNomi(a) || "￿").localeCompare(savatNomi(b) || "￿", "uz"));
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

    setXabar("");
    const kalit = tanlovKaliti(item.modificationId, warehouseId);
    const yangi = Math.min(Math.max((tanlanganMiqdorlar[kalit] ?? 0) + ozgarish, 0), qoldiq);
    setTanlanganMiqdorlar((joriy) => {
      const keyingi = { ...joriy };
      if (yangi === 0) delete keyingi[kalit];
      else keyingi[kalit] = yangi;
      return keyingi;
    });
    setTanlanganMalumot((joriy) => {
      const keyingi = { ...joriy };
      if (yangi === 0) delete keyingi[kalit];
      else keyingi[kalit] = { item, warehouseId, warehouseName: tanlanganOmbor ? nomniOlish(tanlanganOmbor) : warehouseId };
      return keyingi;
    });
  }

  const tanlovlar = useMemo(
    () => Object.entries(tanlanganMalumot).map(([kalit, malumot]) => ({ kalit, ...malumot, soni: tanlanganMiqdorlar[kalit] ?? 0 })),
    [tanlanganMalumot, tanlanganMiqdorlar]
  );
  const tanlanganSoni = tanlovlar.reduce((sum, tanlov) => sum + tanlov.soni, 0);
  const tanlanganJami = tanlovlar.reduce((sum, tanlov) => sum + tanlov.soni * qoldiqNarxi(tanlov.item, narxTuri), 0);
  // Ombor bo'yicha: nechta dona tanlangan
  const omborBoyicha = useMemo(() => {
    const xarita = new Map<string, { nom: string; soni: number }>();
    tanlovlar.forEach((tanlov) => {
      const joriy = xarita.get(tanlov.warehouseId) ?? { nom: tanlov.warehouseName, soni: 0 };
      joriy.soni += tanlov.soni;
      xarita.set(tanlov.warehouseId, joriy);
    });
    return xarita;
  }, [tanlovlar]);

  function savatchagaQoshish() {
    if (tanlovlar.length === 0) return;
    // Har bir mahsulot o'z omborining ma'lumoti bilan saqlanadi — sotuv tasdiqlanganda
    // qoldiq aynan shu ombordan chiqariladi.
    tanlovlar.forEach((tanlov) => {
      addToCart(
        {
          id: tanlov.kalit,
          modificationId: tanlov.item.modificationId,
          nom: savatNomi(tanlov.item) || nomsiz,
          narx: qoldiqNarxi(tanlov.item, narxTuri),
          chakanaNarx: qoldiqNarxi(tanlov.item, "chakana"),
          ulgurjiNarx: qoldiqNarxi(tanlov.item, "ulgurji"),
          qoldiq: qoldiqMiqdori(tanlov.item),
          warehouseId: tanlov.warehouseId,
          warehouseName: tanlov.warehouseName,
        },
        tanlov.soni
      );
    });
    setTanlanganMiqdorlar({});
    setTanlanganMalumot({});
    onClose();
  }

  return createPortal(
    <div className="app-modal-compact fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/55 px-5 backdrop-blur-md">
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

        <section className="flex h-[min(880px,94vh)] w-full flex-col overflow-hidden rounded-[36px] border border-white/60 bg-white shadow-[0_40px_140px_rgba(15,23,42,.45)]">
          {/* Sarlavha */}
          <header className="relative flex shrink-0 items-center justify-between gap-4 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-8 py-6">
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold-500/20 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/3 bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/30">
                <PackagePlus size={26} />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gold-300">YePost</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{t("posModal.title")}</h2>
              </div>
            </div>
            <div className="relative flex items-center gap-3">
              {!yuklanmoqda && (
                <span className="hidden rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white/80 ring-1 ring-white/15 sm:inline-flex">
                  {t("posModal.results", { count: filteredProducts.length })}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/80 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
                aria-label={t("posModal.closeAria")}
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Asboblar paneli */}
          <div className="grid shrink-0 gap-3 border-b border-slate-100 bg-slate-50/60 px-8 py-5 lg:grid-cols-[minmax(0,1fr)_280px_260px]">
            <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-gold-400 focus-within:ring-4 focus-within:ring-gold-50">
              <Search size={18} className="text-slate-400" />
              <input
                value={qidiruv}
                onChange={(event) => setQidiruv(event.target.value)}
                placeholder={t("posModal.searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
              {qidiruv && (
                <button type="button" onClick={() => setQidiruv("")} aria-label={t("posModal.clearSearchAria")} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              )}
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOmborDropdownOchiq((value) => !value)}
                className={`flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold shadow-sm outline-none transition ${
                  omborDropdownOchiq ? "border-gold-400 ring-4 ring-gold-50" : "border-slate-200 hover:border-gold-200"
                }`}
              >
                <span className={tanlanganOmbor ? "text-slate-700" : "text-slate-400"}>
                  {tanlanganOmbor ? nomniOlish(tanlanganOmbor) : t("posModal.selectWarehouse")}
                </span>
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${omborDropdownOchiq ? "rotate-180 text-gold-500" : ""}`} />
              </button>

              {omborDropdownOchiq && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[260] max-h-72 overflow-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_18px_55px_rgba(15,23,42,.18)]">
                  {omborlar.length === 0 ? (
                    <div className="rounded-xl px-3 py-3 text-sm font-bold text-slate-400">{t("posModal.warehouseNotFound")}</div>
                  ) : (
                    omborlar.map((ombor) => {
                      const active = String(ombor.id) === warehouseId;
                      return (
                        <button
                          key={ombor.id}
                          type="button"
                          onClick={() => {
                            setWarehouseId(String(ombor.id));
                            setOmborDropdownOchiq(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                            active ? "bg-gold-50 text-gold-600" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{nomniOlish(ombor)}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            {(omborBoyicha.get(String(ombor.id))?.soni ?? 0) > 0 && (
                              <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-black text-white">
                                {omborBoyicha.get(String(ombor.id))?.soni}
                              </span>
                            )}
                            {active && <Check size={16} />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1">
              {(["chakana", "ulgurji"] as const).map((tur) => (
                <button
                  key={tur}
                  type="button"
                  onClick={() => setNarxTuri(tur)}
                  className={`rounded-xl text-sm font-black transition ${
                    narxTuri === tur ? "bg-gold-500 text-white shadow-md shadow-gold-200" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t(tur === "chakana" ? "posModal.retail" : "posModal.wholesale")}
                </button>
              ))}
            </div>
          </div>

          {xabar && (
            <div className="mx-8 mt-4 shrink-0 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{t(xabar)}</div>
          )}

          {/* Mahsulotlar */}
          <div className="min-h-0 flex-1 overflow-auto p-8">
            {yuklanmoqda ? (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-sm font-semibold text-slate-500">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 ring-1 ring-gold-100">
                  <LoaderCircle className="animate-spin text-gold-500" size={28} />
                </span>
                {t("posModal.loading")}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-slate-200 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400"><PackageOpen size={30} /></span>
                <p className="max-w-sm text-sm font-semibold text-slate-400">{t("posModal.noProducts")}</p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredProducts.map((item) => {
                  const qoldiq = qoldiqMiqdori(item);
                  const narx = qoldiqNarxi(item, narxTuri);
                  const sotishMumkin = qoldiq > 0 && narx > 0;
                  const nom = mahsulotNomi(item) || variantNomi(item) || nomsiz;
                  const variant = mahsulotNomi(item) ? variantNomi(item) : "";
                  const tanlangan = tanlanganMiqdorlar[tanlovKaliti(item.modificationId, warehouseId)] ?? 0;
                  const kod = item.modification?.barcode || item.modification?.article;
                  const qoldiqRangi = qoldiq <= 0 ? "bg-red-500" : qoldiq <= KAM_QOLDIQ ? "bg-amber-500" : "bg-emerald-500";

                  return (
                    <article
                      key={item.modificationId}
                      className={`group relative flex flex-col gap-4 rounded-[26px] border bg-white p-5 transition duration-300 ${
                        tanlangan
                          ? "border-gold-400 shadow-[0_14px_36px_rgba(37,99,235,.16)] ring-2 ring-gold-200"
                          : "border-slate-100 shadow-[0_6px_20px_rgba(15,23,42,.05)] hover:-translate-y-0.5 hover:border-gold-200 hover:shadow-[0_16px_36px_rgba(15,23,42,.10)]"
                      } ${sotishMumkin ? "" : "opacity-75"}`}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-black tracking-wide ${
                            tanlangan ? "bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-md shadow-gold-200" : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"
                          }`}
                        >
                          {tanlangan ? <Check size={24} strokeWidth={3} /> : qisqartma(nom)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-[15px] font-black leading-5 text-slate-900" title={nom}>{nom}</h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {variant && <span className="rounded-md bg-gold-50 px-2 py-0.5 text-[11px] font-bold text-gold-600">{variant}</span>}
                            <span className="truncate text-[11px] font-semibold text-slate-400">{kod || t("posModal.noCode")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("posModal.stock")}</p>
                          <p className="mt-1 flex items-center gap-2 text-lg font-black text-slate-800">
                            <span className={`h-2 w-2 rounded-full ${qoldiqRangi}`} />
                            {qoldiq.toLocaleString("uz-UZ")}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gold-50 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gold-400">{t("posModal.price")}</p>
                          <p className={`mt-1 text-lg font-black ${narx > 0 ? "text-gold-600" : "text-slate-300"}`}>{narx > 0 ? formatSumma(narx) : "—"}</p>
                        </div>
                      </div>

                      {!sotishMumkin ? (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-500">
                          {qoldiq <= 0 ? t("posModal.noStock") : t("posModal.noPrice")}
                        </p>
                      ) : tanlangan ? (
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gold-500 p-1.5 text-white shadow-lg shadow-gold-100">
                          <button type="button" onClick={() => miqdorniYangilash(item, -1)} className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/15" aria-label={t("posModal.decreaseAria")}>
                            {tanlangan === 1 ? <Trash2 size={17} /> : <Minus size={18} />}
                          </button>
                          <div className="text-center leading-tight">
                            <p className="text-base font-black">{tanlangan}</p>
                            <p className="text-[10px] font-semibold text-white/80">{formatSumma(tanlangan * narx)}</p>
                          </div>
                          <button type="button" onClick={() => miqdorniYangilash(item, 1)} disabled={tanlangan >= qoldiq} className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/15 disabled:opacity-40" aria-label={t("posModal.increaseAria")}>
                            <Plus size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => miqdorniYangilash(item, 1)}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gold-200 bg-white text-sm font-black text-gold-600 transition hover:bg-gold-500 hover:text-white"
                          aria-label={t("posModal.selectAria")}
                        >
                          <Plus size={18} />
                          {t("posModal.add")}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pastki panel */}
          <footer className="flex shrink-0 flex-col gap-4 border-t border-slate-100 bg-white px-8 py-5 shadow-[0_-12px_30px_rgba(15,23,42,.04)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-50 text-gold-600 ring-1 ring-gold-100">
                <ShoppingCart size={24} />
                {tanlanganSoni > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gold-500 px-1.5 text-[11px] font-black text-white ring-2 ring-white">{tanlanganSoni}</span>
                )}
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t("posModal.selectedProducts")}</p>
                <p className="mt-0.5 text-lg font-black text-slate-900">
                  {tanlanganSoni} {t("posModal.unit")} <span className="mx-1 text-slate-300">·</span> <span className="text-gold-600">{formatSumma(tanlanganJami)}</span>
                </p>
                {omborBoyicha.size > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Array.from(omborBoyicha.entries()).map(([id, malumot]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setWarehouseId(id)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                          id === warehouseId ? "bg-gold-500 text-white" : "bg-gold-50 text-gold-600 hover:bg-gold-100"
                        }`}
                      >
                        {malumot.nom}: {malumot.soni} {t("posModal.unit")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {tanlanganSoni > 0 && (
                <button type="button" onClick={() => { setTanlanganMiqdorlar({}); setTanlanganMalumot({}); }} className="h-12 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-500 transition hover:bg-slate-50">
                  {t("posModal.clearSelection")}
                </button>
              )}
              <button
                type="button"
                onClick={savatchagaQoshish}
                disabled={tanlanganSoni === 0}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 px-8 text-sm font-black text-white shadow-lg shadow-gold-200 transition hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <ShoppingCart size={18} /> {t("posModal.addToCart")} {tanlanganSoni > 0 ? `(${tanlanganSoni})` : ""}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>,
    document.body
  );
}
