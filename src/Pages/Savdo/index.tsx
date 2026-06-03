import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCircle,
  CircleAlert,
  CircleCheck,
  Info,
  MessageSquare,
  Package,
  Plus,
  Printer,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

type SaleStatus = "To'landi" | "Qarz" | "Bekor qilingan";
type ActivityTab = "Vazifa" | "Kommentariya" | "Habarnoma" | "Qo'shimcha";
type ModalFocus = "tolov" | "faoliyat";
type ToastType = "success" | "warning" | "info";

type Sale = {
  id: string;
  mijozNomi: string;
  summa: number;
  sana: string;
  masul: string;
  telefon: string;
  manzil: string;
  status: SaleStatus;
};

type ToastState = {
  text: string;
  type: ToastType;
};

const savdolar: Sale[] = [
  {
    id: "MIJ-1001",
    mijozNomi: "Azizbek Karimov",
    summa: 4_250_000,
    sana: "03.06.2026",
    masul: "Dilshod",
    telefon: "+998 90 123 45 67",
    manzil: "Sergeli",
    status: "To'landi",
  },
  {
    id: "MIJ-1002",
    mijozNomi: "Madina Textile",
    summa: 12_800_000,
    sana: "03.06.2026",
    masul: "Sevara",
    telefon: "+998 93 456 78 90",
    manzil: "Yunusobod",
    status: "Qarz",
  },
  {
    id: "MIJ-1003",
    mijozNomi: "Bekzod Market",
    summa: 980_000,
    sana: "02.06.2026",
    masul: "Javohir",
    telefon: "+998 94 777 12 34",
    manzil: "Chilonzor",
    status: "To'landi",
  },
  {
    id: "MIJ-1004",
    mijozNomi: "Niso Savdo",
    summa: 6_430_000,
    sana: "02.06.2026",
    masul: "Malika",
    telefon: "+998 97 111 22 33",
    manzil: "Olmazor",
    status: "Qarz",
  },
  {
    id: "MIJ-1005",
    mijozNomi: "Samarqand Optom",
    summa: 21_500_000,
    sana: "01.06.2026",
    masul: "Akmal",
    telefon: "+998 91 555 66 77",
    manzil: "Samarqand",
    status: "To'landi",
  },
  {
    id: "MIJ-1006",
    mijozNomi: "Premium Store",
    summa: 3_120_000,
    sana: "01.06.2026",
    masul: "Zarina",
    telefon: "+998 99 000 45 45",
    manzil: "Yakkasaroy",
    status: "Bekor qilingan",
  },
];

const activityTabs: ActivityTab[] = [
  "Vazifa",
  "Kommentariya",
  "Habarnoma",
  "Qo'shimcha",
];

const activityItems = [
  {
    turi: "Vazifa",
    vaqt: "18:37",
    text: "Mijozga qayta qo'ng'iroq qilish va yangi buyurtmani aniqlash.",
    icon: CheckCircle,
    rang: "bg-yellow-400",
  },
  {
    turi: "Kommentariya",
    vaqt: "14:00",
    text: "Mijoz keyingi haftada yana mahsulot olishini aytdi.",
    icon: MessageSquare,
    rang: "bg-blue-600",
  },
  {
    turi: "Habarnoma",
    vaqt: "12:24",
    text: "To'lov qabul qilindi va savdo yakunlandi.",
    icon: Bell,
    rang: "bg-green-500",
  },
];

const savatchaItems = [
  { nom: "Coca-Cola 1.5L", soni: 12, narx: 15_000 },
  { nom: "Pepsi 1L", soni: 8, narx: 12_000 },
  { nom: "Shakar 1kg", soni: 25, narx: 14_000 },
];

const toastStyles: Record<
  ToastType,
  { icon: typeof CircleCheck; iconClass: string; accentClass: string }
> = {
  success: {
    icon: CircleCheck,
    iconClass: "bg-emerald-500 text-white shadow-emerald-200",
    accentClass: "from-emerald-500",
  },
  warning: {
    icon: CircleAlert,
    iconClass: "bg-amber-400 text-white shadow-amber-200",
    accentClass: "from-amber-400",
  },
  info: {
    icon: Info,
    iconClass: "bg-[#FF5A00] text-white shadow-orange-200",
    accentClass: "from-[#FF5A00]",
  },
};

function getToastType(text: string): ToastType {
  const normalized = text.toLowerCase();

  if (normalized.includes("qabul qilindi") || normalized.includes("qo'shildi")) {
    return "success";
  }

  if (normalized.includes("avval") || normalized.includes("orqaga")) {
    return "warning";
  }

  return "info";
}

function formatSumma(summa: number) {
  return `${summa.toLocaleString("ru-RU")} so'm`;
}

function focusClass(isActive: boolean, isPaymentAccepted: boolean) {
  if (isPaymentAccepted) {
    return "rounded-[28px] bg-white p-6 opacity-100 scale-100 pointer-events-auto transition-all duration-300";
  }

  return [
    "rounded-[28px] p-6 transition-all duration-300",
    isActive
      ? "bg-white opacity-100 scale-100 pointer-events-auto"
      : "bg-white/60 opacity-60 pointer-events-none",
  ].join(" ");
}

export default function Savdo() {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [modalFocus, setModalFocus] = useState<ModalFocus>("tolov");
  const [paymentAccepted, setPaymentAccepted] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("Bugun");
  const [activityTab, setActivityTab] = useState<ActivityTab>("Vazifa");
  const [hujjat, setHujjat] = useState("Hujjatlar");
  const [actionType, setActionType] = useState("Nima qilish kerak");
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (selectedSale) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedSale]);

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase().trim();

    return savdolar.filter((sale) => {
      return (
        sale.id.toLowerCase().includes(q) ||
        sale.mijozNomi.toLowerCase().includes(q) ||
        sale.telefon.toLowerCase().includes(q)
      );
    });
  }, [search]);

  function showToast(text: string) {
    setToast({ text, type: getToastType(text) });
    window.setTimeout(() => setToast(null), 2200);
  }

  function openDetail(sale: Sale) {
    setSelectedSale(sale);
    setModalFocus("tolov");
    setPaymentAccepted(false);
    setActivityTab("Vazifa");
    setHujjat("Hujjatlar");
    setActionType("Nima qilish kerak");
  }

  function closeDetail() {
    setSelectedSale(null);
    setModalFocus("tolov");
    setPaymentAccepted(false);
  }

  function handleDocumentAction(value: string) {
    setHujjat(value);
    if (value !== "Hujjatlar") showToast(`${value} tanlandi`);
  }

  return (
    <div className="space-y-6">
      {toast &&
        createPortal(
          (() => {
            const Icon = toastStyles[toast.type].icon;

            return (
              <div className="fixed right-6 top-6 z-[10000] w-[min(380px,calc(100vw-48px))] animate-in slide-in-from-top-3 fade-in duration-300">
                <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
                  <div
                    className={[
                      "absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b to-transparent",
                      toastStyles[toast.type].accentClass,
                    ].join(" ")}
                  />

                  <div className="flex items-center gap-3 pl-2">
                    <div
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg",
                        toastStyles[toast.type].iconClass,
                      ].join(" ")}
                    >
                      <Icon size={21} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-900/40">
                        Yepost
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">
                        {toast.text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body
        )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Savdo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Savdo operatsiyalari, mijozlar va mas'ul shaxslar bo'yicha ro'yxat.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[26px] border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center">
        <button
          onClick={() => showToast("Yangi savdo oynasi ochiladi")}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] px-5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
        >
          <Plus size={18} />
          Qo'shish
        </button>

        <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-orange-100 bg-white/80 px-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz ID, mijoz nomi yoki telefon raqam"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-orange-900/35"
          />
          <Search size={20} className="text-gray-500" />
        </div>

        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            showToast(`${e.target.value} filter tanlandi`);
          }}
          className="h-12 rounded-2xl border border-orange-100 bg-white/80 px-5 text-sm font-semibold text-gray-600 shadow-sm outline-none"
        >
          <option>Bugun</option>
          <option>Kecha</option>
          <option>Haftalik</option>
          <option>Oylik</option>
          <option>Yillik</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-orange-100 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="max-h-[calc(100vh-310px)] overflow-auto">
          <table className="min-w-[900px] w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-orange-50/95 text-xs uppercase tracking-wide text-orange-900/60 backdrop-blur-xl">
              <tr>
                <th className="px-5 py-4 font-semibold">Mijoz ID</th>
                <th className="px-5 py-4 font-semibold">Mijoz nomi</th>
                <th className="px-5 py-4 font-semibold">Summa</th>
                <th className="px-5 py-4 font-semibold">Sana</th>
                <th className="px-5 py-4 font-semibold">Mas'ul shaxs</th>
                <th className="px-5 py-4 font-semibold">Telefon raqam</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/70 text-gray-700">
              {filteredSales.map((sale, index) => (
                <tr
                  key={sale.id}
                  onClick={() => openDetail(sale)}
                  className={[
                    "cursor-pointer transition hover:bg-orange-50",
                    index % 2 === 0 ? "bg-white/45" : "bg-orange-50/25",
                  ].join(" ")}
                >
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-orange-600">
                    {sale.id}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                    {sale.mijozNomi}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {formatSumma(sale.summa)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">{sale.sana}</td>
                  <td className="whitespace-nowrap px-5 py-4">{sale.masul}</td>
                  <td className="whitespace-nowrap px-5 py-4">{sale.telefon}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        sale.status === "To'landi"
                          ? "bg-green-50 text-green-600"
                          : sale.status === "Qarz"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-red-50 text-red-600",
                      ].join(" ")}
                    >
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Ma'lumot topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale &&
        createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-[2px]" />

          <section
            className={[
              "scrollbar-hidden fixed bottom-4 left-4 right-4 top-4 z-[9999] overflow-y-auto rounded-[34px] p-5 shadow-2xl transition-colors duration-300 sm:bottom-6 sm:left-6 sm:right-6 sm:top-6 lg:bottom-[32px] lg:left-[120px] lg:right-[32px] lg:top-[32px] lg:p-6 2xl:left-[140px]",
              paymentAccepted ? "bg-white" : "bg-[#D8D8D8]",
            ].join(" ")}
          >
            <div className="mb-6 flex flex-col items-start justify-between gap-5 xl:flex-row">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Savdo spisok ichi
                </p>
                <h2 className="mt-1 text-4xl font-bold text-gray-950">
                  {selectedSale.mijozNomi}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setPaymentAccepted(false);
                    setModalFocus("tolov");
                    showToast("To'lov orqaga qaytarildi");
                  }}
                  className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:text-[#FF5A00]"
                >
                  To'lovga qaytish
                </button>

                <select
                  value={hujjat}
                  onChange={(e) => handleDocumentAction(e.target.value)}
                  className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition hover:border-orange-300"
                >
                  <option>Hujjatlar</option>
                  <option>Chek chiqarish</option>
                  <option>Hisob-faktura</option>
                  <option>Nakladnoy</option>
                  <option>PDF yuklash</option>
                </select>

                <button
                  onClick={closeDetail}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A00] text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                  aria-label="Yopish"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
              <aside className={focusClass(modalFocus === "tolov", paymentAccepted)}>
                <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-bold text-gray-950">Savdo</h3>
                  <button
                    onClick={() => showToast("Tahrirlash rejimi ochildi")}
                    className="text-sm font-semibold text-gray-400 transition hover:text-[#FF5A00]"
                  >
                    Tahrirlash
                  </button>
                </div>

                <p className="text-sm text-gray-500">Summa</p>
                <h4 className="mt-1 text-3xl font-bold text-gray-950">
                  {formatSumma(selectedSale.summa)}
                </h4>

                <button
                  onClick={() => {
                    setPaymentAccepted(true);
                    setModalFocus("faoliyat");
                    showToast("To'lov qabul qilindi");
                  }}
                  className="mt-5 w-full rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                >
                  To'lov qabul qilish
                </button>

                <div className="mt-6 rounded-3xl bg-gray-50 p-5">
                  <p className="font-bold text-gray-800">
                    To'lov va yetkazib berish
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    To'lov, yetkazib berish va savdo holati haqida ma'lumot.
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <p className="text-sm text-gray-500">Kontragent</p>
                    <div className="mt-2 rounded-2xl bg-gray-100 px-4 py-3 font-semibold text-gray-800">
                      {selectedSale.mijozNomi}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Manzil</p>
                    <div className="mt-2 rounded-2xl bg-gray-100 px-4 py-3 text-gray-700">
                      {selectedSale.manzil}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Telefon</p>
                    <div className="mt-2 rounded-2xl bg-gray-100 px-4 py-3 text-gray-700">
                      {selectedSale.telefon}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Mas'ul shaxs</p>
                    <div className="mt-2 rounded-2xl bg-gray-100 px-4 py-3 text-gray-700">
                      {selectedSale.masul}
                    </div>
                  </div>
                </div>
              </aside>

              <main className={focusClass(modalFocus === "faoliyat", paymentAccepted)}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {activityTabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActivityTab(tab)}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-semibold transition",
                          activityTab === tab
                            ? "border border-orange-400 bg-orange-50 text-[#FF5A00]"
                            : "text-gray-600 hover:bg-orange-50 hover:text-[#FF5A00]",
                        ].join(" ")}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => showToast("Settings bosildi")}
                      className="rounded-xl bg-gray-100 p-3 text-gray-700 transition hover:bg-[#FF5A00] hover:text-white"
                      aria-label="Settings"
                    >
                      <Settings size={18} />
                    </button>

                    <button
                      onClick={() => showToast("Print oynasi ochildi")}
                      className="rounded-xl bg-gray-100 p-3 text-gray-700 transition hover:bg-[#FF5A00] hover:text-white"
                      aria-label="Print"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="h-14 flex-1 rounded-2xl border border-gray-100 px-4 text-gray-700 outline-none"
                  >
                    <option>Nima qilish kerak</option>
                    <option>Qo'ng'iroq qilish</option>
                    <option>To'lovni eslatish</option>
                    <option>Yangi buyurtma olish</option>
                  </select>

                  <button
                    onClick={() =>
                      actionType === "Nima qilish kerak"
                        ? showToast("Avval amal tanlang")
                        : showToast(`${activityTab} qo'shildi`)
                    }
                    className="rounded-2xl bg-[#FF5A00] px-6 text-sm font-bold text-white transition hover:bg-orange-600"
                  >
                    Qo'shish
                  </button>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="rounded-full border border-green-300 bg-green-50 px-5 py-2 text-sm font-medium text-green-600">
                    Bugun
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="space-y-4">
                  {activityItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <article
                        key={item.turi}
                        className="flex gap-5 rounded-3xl bg-white p-6 shadow-sm"
                      >
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white ${item.rang}`}
                        >
                          <Icon size={24} />
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            {item.turi}{" "}
                            <span className="text-sm font-normal text-gray-400">
                              | {item.vaqt}
                            </span>
                          </h3>
                          <p className="mt-2 text-sm text-gray-500">
                            {item.text}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {savatchaItems.map((item) => (
                    <div key={item.nom} className="rounded-2xl bg-gray-50 p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#FF5A00]">
                        <ShoppingCart size={18} />
                      </div>
                      <p className="font-semibold text-gray-900">{item.nom}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.soni} x {formatSumma(item.narx)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-3xl border border-orange-100 bg-orange-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Package className="text-[#FF5A00]" size={20} />
                    <p className="font-bold text-orange-700">
                      Mahsulot qaytarish
                    </p>
                  </div>
                  <p className="text-sm text-orange-700/75">
                    Qaytarish yoki bekor qilish amallari uchun activity paneldan
                    kerakli vazifani tanlang.
                  </p>
                </div>

                <button
                  onClick={() => showToast("Bekor qilish amali demo holatda")}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-500 hover:text-white"
                >
                  <Trash2 size={17} />
                  Savdoni bekor qilish
                </button>
              </main>
            </div>
          </section>
        </>
        ,
          document.body
        )}
    </div>
  );
}
