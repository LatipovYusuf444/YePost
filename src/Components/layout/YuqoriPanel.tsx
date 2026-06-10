import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Filter,
  Package,
  Plus,
  ScanBarcode,
  Search,
  X,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useOmborStore } from "@/store/omborStore";
import { usePosStore } from "@/store/posStore";

// Qaysi page/module ochilganini aniqlash uchun type
type ModuleKey = "savdo" | "mahsulotlar" | "mijozlar" | "ombor" | "default";

// Har bir module uchun tepa navbar tablari
const moduleTabs: Record<ModuleKey, string[]> = {
  savdo: [
    "Savdo",
    "Qaytarish",
    "Bekor qilinganlar",
    "Mahsulotlar va ombor",
    "Mijozlar",
    "Analitika",
    "Smena yopish",
  ],

  mahsulotlar: [
    "Mahsulotlar",
    "Kategoriyalar",
    "Narxlar",
    "Qoldiqlar",
    "Import",
    "Analitika",
  ],

  mijozlar: ["Mijoz", "Kompaniya", "Yetkazib beruvchi"],

  // Omborga kirganda tepa navbar shu tablarni ko‘rsatadi
  ombor: [
    "Xaridlar",
    "Amalga oshirilganlar",
    "Chiqimlar",
    "Ko‘chirishlar",
    "Mahsulotlar",
    "Analitika",
    "Mijozlar",
  ],

  // Bosh sahifa yoki boshqa oddiy sahifalarda chiqadigan default tablar
  default: ["Bosh sahifa", "Savdo holati", "Kassa", "Hisobotlar"],
};

// Har bir module uchun asosiy path
const moduleBasePath: Record<ModuleKey, string> = {
  savdo: "/savdo",
  mahsulotlar: "/mahsulotlar",
  mijozlar: "/mijozlar",
  ombor: "/ombor",
  default: "/",
};

// Bosh sahifadagi icon buttonlar uchun umumiy class
const homeIconButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white/60 text-gray-700 shadow-sm backdrop-blur-xl transition hover:bg-orange-500 hover:text-white";

const productGroups = [
  { id: "all", nom: "Tovar va xizmatlar" },
  { id: "3-6", nom: "3,6" },
  { id: "4-2", nom: "4,2" },
  { id: "4-5", nom: "4,5" },
  { id: "5", nom: "5" },
  { id: "6", nom: "6" },
  { id: "8-4", nom: "8,4" },
];

function formatSumma(value: number) {
  return `${value.toLocaleString("ru-RU")} uzs`;
}

// URL pathname orqali qaysi module ochilganini aniqlaydi
function getModuleKey(pathname: string): ModuleKey {
  if (pathname.startsWith("/savdo")) return "savdo";
  if (pathname.startsWith("/mahsulotlar")) return "mahsulotlar";
  if (pathname.startsWith("/mijozlar")) return "mijozlar";
  if (pathname.startsWith("/ombor")) return "ombor";

  return "default";
}

// Tab nomidan hash link yasaydi
// Masalan: "Amalga oshirilganlar" => "amalga-oshirilganlar"
function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/‘/g, "")
    .replace(/’/g, "")
    .replace(/\s+/g, "-");
}

function getTabPath(moduleKey: ModuleKey, basePath: string, tab: string, index: number) {
  if (moduleKey === "ombor") {
    if (tab === "Xaridlar") return "/ombor";
    if (tab === "Amalga oshirilganlar") return "/ombor/amalga-oshirilganlar";
    if (tab === "Chiqimlar") return "/ombor/chiqimlar";
    if (tab === "Ko‘chirishlar") return "/ombor/kochirishlar";
    if (tab === "Mahsulotlar") return "/ombor/mahsulotlar";
  }

  return index === 0 ? basePath : `${basePath}#${slugify(tab)}`;
}

function isTabActive(
  moduleKey: ModuleKey,
  pathname: string,
  hash: string,
  tab: string,
  index: number
) {
  if (moduleKey === "ombor") {
    if (tab === "Xaridlar") return pathname === "/ombor";
    if (tab === "Amalga oshirilganlar") return pathname === "/ombor/amalga-oshirilganlar";
    if (tab === "Chiqimlar") return pathname === "/ombor/chiqimlar";
    if (tab === "Ko‘chirishlar") return pathname === "/ombor/kochirishlar";
    if (tab === "Mahsulotlar") return pathname === "/ombor/mahsulotlar";
  }

  const activeHash = hash.replace("#", "");

  if (index === 0) return activeHash.length === 0;

  return activeHash === slugify(tab);
}

export default function YuqoriPanel() {
  // Hozirgi URL ni oladi
  const { pathname, hash } = useLocation();
  const products = useOmborStore((state) => state.products);
  const addProduct = useOmborStore((state) => state.addProduct);
  const decreaseProductStock = useOmborStore((state) => state.decreaseProductStock);
  const ensureMinimumStock = useOmborStore((state) => state.ensureMinimumStock);
  const addToCart = usePosStore((state) => state.addToCart);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [activeGroupId, setActiveGroupId] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    if (isProductsOpen) ensureMinimumStock(20);
  }, [ensureMinimumStock, isProductsOpen]);

  // Hozir qaysi module ochilganini aniqlaydi
  const moduleKey = getModuleKey(pathname);

  // Aniqlangan modulega qarab tablarni oladi
  const tabs = moduleTabs[moduleKey];

  // Aniqlangan modulega qarab asosiy pathni oladi
  const basePath = moduleBasePath[moduleKey];

  const filteredProducts = useMemo(() => {
    const value = productSearch.toLowerCase().trim();
    const activeIndex = productGroups.findIndex((group) => group.id === activeGroupId);

    return products.filter((product, index) => {
      const matchesSearch =
        !value ||
        [
          product.nomi,
          product.soni,
          product.kodi,
          product.shtrixKodi,
          product.olchovBirligi,
          formatSumma(product.narxi),
        ]
          .join(" ")
          .toLowerCase()
          .includes(value);
      const matchesGroup =
        activeGroupId === "all" ||
        index % Math.max(productGroups.length - 1, 1) === activeIndex - 1;
      const matchesAvailable = !onlyAvailable || product.soni > 0;

      return matchesSearch && matchesGroup && matchesAvailable;
    });
  }, [activeGroupId, onlyAvailable, productSearch, products]);

  function handleAddProduct() {
    addProduct({
      nomi: "Parfume",
      soni: 30,
      kodi: "4282123",
      shtrixKodi: "981638",
      olchovBirligi: "dona",
      narxi: 150000,
    });
  }

  function selectProduct(productId: number) {
    const product = products.find((item) => item.id === productId);

    if (!product || product.soni <= 0) return;

    setSelectedQuantities((prev) => ({
      ...prev,
      [productId]: prev[productId] ?? 1,
    }));
  }

  function cancelProductSelection() {
    setSelectedQuantities({});
  }

  function openProductsModal() {
    setSelectedQuantities({});
    setIsProductsOpen(true);
  }

  function closeProductsModal() {
    setSelectedQuantities({});
    setToastText("");
    setIsProductsOpen(false);
  }

  function showToast(text: string) {
    setToastText(text);
    window.setTimeout(() => setToastText(""), 2200);
  }

  function updateSelectedQuantity(productId: number, nextQuantity: number) {
    const product = products.find((item) => item.id === productId);

    if (!product) return;

    setSelectedQuantities((prev) => {
      const next = { ...prev };
      const safeQuantity = Math.min(Math.max(nextQuantity, 0), product.soni);

      if (safeQuantity <= 0) {
        delete next[productId];
        return next;
      }

      next[productId] = safeQuantity;
      return next;
    });
  }

  function addSelectedProductsToCart() {
    const selectedEntries = Object.entries(selectedQuantities);

    if (selectedEntries.length === 0) return;

    let addedCount = 0;

    selectedEntries.forEach(([productId, quantity]) => {
      const product = products.find((item) => item.id === Number(productId));
      const safeQuantity = product ? Math.min(quantity, product.soni) : 0;

      if (!product || safeQuantity <= 0) return;

      addToCart(
        {
          id: product.id,
          nom: product.nomi,
          narx: product.narxi + 50000,
        },
        safeQuantity
      );
      decreaseProductStock(product.id, safeQuantity);
      addedCount += 1;
    });

    showToast(`${addedCount} ta mahsulot savatga qo'shildi`);
    cancelProductSelection();
  }

  const productsModal =
    isProductsOpen &&
    createPortal(
      <>
        <div className="fixed inset-0 z-[9998] bg-black/45 backdrop-blur-[2px]" />
        <section className="fixed bottom-5 left-3 right-3 top-12 z-[9999] overflow-hidden rounded-[28px] bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-14 sm:h-[min(820px,calc(100vh-96px))] sm:w-[min(920px,calc(100vw-64px))] sm:-translate-x-1/2 lg:left-[calc(50%+56px)] xl:w-[min(1040px,calc(100vw-120px))]">
          <div className="flex h-full flex-col">
            <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleAddProduct}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                >
                  <Plus size={16} />
                  Qo'shish
                </button>

                <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 shadow-sm sm:w-[400px] lg:w-[470px]">
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Qidirish"
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-gray-700 outline-none placeholder:text-gray-400"
                  />
                  <Search size={20} className="text-gray-300" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOnlyAvailable((prev) => !prev)}
                  className={[
                    "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-lg transition",
                    onlyAvailable
                      ? "bg-orange-600 text-white shadow-orange-200"
                      : "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600",
                  ].join(" ")}
                >
                  Filtr
                  <Filter size={16} />
                </button>
                <button
                  onClick={closeProductsModal}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-orange-500 hover:text-white"
                  aria-label="Yopish"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[210px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="border-b border-gray-100 bg-gray-50/60 p-4 sm:border-b-0 sm:border-r sm:p-5">
                <nav className="flex gap-2 overflow-x-auto sm:block sm:space-y-3 sm:overflow-visible">
                  {productGroups.map((group) => {
                    const isActive = activeGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => setActiveGroupId(group.id)}
                        className={[
                          "shrink-0 rounded-xl px-4 py-3 text-left text-[15px] font-bold transition sm:block sm:w-full",
                          isActive
                            ? "bg-white text-orange-600 shadow-sm ring-1 ring-orange-100"
                            : "text-gray-700 hover:bg-white hover:text-orange-600",
                        ].join(" ")}
                      >
                        {group.nom}
                      </button>
                    );
                  })}
                </nav>
              </aside>

              <main className="min-w-0 overflow-auto px-4 py-5 sm:px-5 lg:px-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_140px_70px] items-center gap-3 px-4 pb-2 text-sm font-bold text-orange-500 sm:grid-cols-[minmax(0,1fr)_160px_90px] lg:grid-cols-[minmax(0,1fr)_180px_100px]">
                    <span>Mahsulot nomi</span>
                    <span />
                    <span className="text-right">Qoldiq</span>
                  </div>

                  {filteredProducts.map((product) => {
                    const selectedQuantity = selectedQuantities[product.id] ?? 0;
                    const isSelected = selectedQuantity > 0;

                    return (
                      <div
                        key={product.id}
                        onClick={() => selectProduct(product.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            selectProduct(product.id);
                          }
                        }}
                        role="button"
                        tabIndex={product.soni > 0 ? 0 : -1}
                        className={[
                          "grid min-h-16 w-full grid-cols-[minmax(0,1fr)_140px_70px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition sm:grid-cols-[minmax(0,1fr)_160px_90px] lg:grid-cols-[minmax(0,1fr)_180px_100px]",
                          isSelected
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-100 bg-white shadow-sm hover:bg-orange-50 hover:shadow-md",
                          product.soni <= 0 ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <span className="truncate text-base font-bold text-gray-800">
                          {product.nomi}
                        </span>
                        <span className="flex justify-center">
                          <span
                            onClick={(event) => event.stopPropagation()}
                            className="flex h-11 items-center rounded-xl border border-gray-100 bg-white px-1.5 shadow-sm"
                          >
                            <button
                              onClick={() =>
                                updateSelectedQuantity(product.id, selectedQuantity - 1)
                              }
                              disabled={selectedQuantity <= 0}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                            >
                              -
                            </button>
                            <span className="w-10 text-center text-base font-bold text-gray-900">
                              {selectedQuantity}
                            </span>
                            <button
                              onClick={() =>
                                updateSelectedQuantity(product.id, selectedQuantity + 1)
                              }
                              disabled={product.soni <= 0 || selectedQuantity >= product.soni}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                            >
                              +
                            </button>
                          </span>
                        </span>
                        <span className="flex justify-end">
                          <span className="min-w-12 rounded-full bg-orange-50 px-3 py-1.5 text-center text-sm font-bold text-orange-600">
                            {product.soni}
                          </span>
                        </span>
                      </div>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                      Mahsulot topilmadi
                    </div>
                  )}
                </div>
              </main>
            </div>

            {Object.keys(selectedQuantities).length > 0 && (
              <div className="grid grid-cols-1 gap-3 border-t border-orange-100 bg-white p-4 sm:grid-cols-2 sm:px-6">
                <button
                  onClick={addSelectedProductsToCart}
                  className="h-12 rounded-xl bg-orange-500 text-sm font-bold text-white shadow-lg shadow-orange-100 transition hover:bg-orange-600"
                >
                  Savatga qo'shish
                </button>
                <button
                  onClick={cancelProductSelection}
                  className="h-12 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 transition hover:text-orange-600"
                >
                  Bekor qilish
                </button>
              </div>
            )}
          </div>
        </section>
        {toastText && (
          <div className="fixed right-6 top-6 z-[10000] rounded-2xl border border-green-100 bg-white px-5 py-4 text-sm font-bold text-green-700 shadow-2xl">
            {toastText}
          </div>
        )}
      </>,
      document.body
    );

  // Bosh sahifa/default holatda search + icon navbar chiqadi
  if (moduleKey === "default") {
    return (
      <header className="mb-6 flex items-center justify-between gap-4">
        {/* Qidiruv inputi */}
        <div className="flex h-11 flex-1 items-center rounded-2xl border border-orange-100 bg-white/60 px-4 shadow-sm backdrop-blur-xl">
          <input
            type="text"
            placeholder="Artikul, shtrix-kod, nomi"
            className="h-full flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-orange-900/35"
          />

          <button
            title="Qidirish"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-700 transition hover:bg-white/80 hover:text-orange-600"
          >
            <Search size={18} />
          </button>
        </div>

        {/* O‘ngdagi tezkor iconlar */}
        <div className="flex items-center gap-2">
          <button title="Shtrix kod" className={homeIconButtonClass}>
            <ScanBarcode size={18} />
          </button>
          <button
            title="Mahsulotlar"
            onClick={openProductsModal}
            className={homeIconButtonClass}
          >
            <Package size={18} />
          </button>
        </div>
        {productsModal}
      </header>
    );
  }

  // Savdo, Mahsulotlar, Mijozlar, Ombor page’larida tab navbar chiqadi
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-xl">
      {/* Module tablari */}
      <nav className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
        {tabs.map((tab, index) => {
          // Ombor ichida real route, qolgan modulelarda hozircha birinchi tab active.
          const isActive = isTabActive(moduleKey, pathname, hash, tab, index);

          // Ombor tablari alohida page ochadi, qolgan tablar eski hash linkda qoladi.
          const to = getTabPath(moduleKey, basePath, tab, index);

          return (
            <Link
              key={tab}
              to={to}
              className={[
                "relative shrink-0 pb-2 text-sm transition-colors",
                isActive
                  ? "font-semibold text-orange-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500"
                  : "font-medium text-gray-500 hover:text-orange-600",
              ].join(" ")}
            >
              {tab}
            </Link>
          );
        })}
      </nav>

      {/* Navbar o‘ng tomoni */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Bildirishnomalar */}
        <button
          title="Bildirishnomalar"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white/60 text-gray-700 shadow-sm transition hover:bg-orange-500 hover:text-white"
        >
          <Bell size={18} />
        </button>

        {/* Sana filteri */}
        <button className="flex h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white/60 px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:text-orange-600">
          <CalendarDays size={17} />
          Sana filteri
        </button>

        {/* Bugun dropdown ko‘rinishi */}
        <button className="flex h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white/60 px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:text-orange-600">
          Bugun
          <ChevronDown size={16} />
        </button>

        {/* Tezkor amallar */}
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-orange-500 px-3 text-sm font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600">
          <Zap size={17} />
          Tezkor amallar
        </button>
      </div>
    </header>
  );
}
