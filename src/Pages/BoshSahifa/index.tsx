import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle,
  Filter,
  MessageSquare,
  Minus,
  Paperclip,
  Plus,
  Search,
  Settings,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { usePosStore } from "@/store/posStore";

type CustomerType = "donalik" | "doimiy";

type RegularCustomer = {
  id: number;
  ism: string;
  telefon: string;
  qarz: number;
  oxirgiXarid: string;
};

type CustomerDetailTab = "Asosiyisi" | "Savatcha" | "Tarix";
type CustomerActivityTab = "Vazifa" | "Kommentariya" | "Habarnoma" | "Qo'shimcha";

const doimiyMijozlar: RegularCustomer[] = [
  {
    id: 1,
    ism: "Azizbek Karimov",
    telefon: "+998 90 123 45 67",
    qarz: 0,
    oxirgiXarid: "03.06.2026",
  },
  {
    id: 2,
    ism: "Madina Textile",
    telefon: "+998 93 456 78 90",
    qarz: 1280000,
    oxirgiXarid: "02.06.2026",
  },
  {
    id: 3,
    ism: "Bekzod Market",
    telefon: "+998 94 777 12 34",
    qarz: 450000,
    oxirgiXarid: "01.06.2026",
  },
];

const quickDiscounts = [15, 30, 50, 75];
const paymentTypes = ["Payme", "Click", "Uzum", "Paynet"];
const customerDetailTabs: CustomerDetailTab[] = ["Asosiyisi", "Savatcha", "Tarix"];
const customerActivityTabs: CustomerActivityTab[] = [
  "Vazifa",
  "Kommentariya",
  "Habarnoma",
  "Qo'shimcha",
];

function formatSumma(value: number) {
  return `${value.toLocaleString("ru-RU")} uzs`;
}

function readNumber(value: unknown, fallback = 0) {
  const numberValue =
    typeof value === "number" ? value : Number(String(value ?? "").replace(/\s/g, ""));

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export default function BoshSahifa() {
  const cart = usePosStore((state) => state.cart);
  const updateCartQuantity = usePosStore((state) => state.updateQuantity);
  const removeFromCart = usePosStore((state) => state.removeFromCart);
  const clearPosCart = usePosStore((state) => state.clearCart);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("Payme");
  const [customerName, setCustomerName] = useState("");
  const [mijozTuri, setMijozTuri] = useState<CustomerType>("donalik");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [narxTuri, setNarxTuri] = useState<"chakana" | "ulgurji">("chakana");
  const [selectedCustomerModal, setSelectedCustomerModal] = useState<RegularCustomer | null>(null);
  const [customerDetailTab, setCustomerDetailTab] = useState<CustomerDetailTab>("Asosiyisi");
  const [customerActivityTab, setCustomerActivityTab] = useState<CustomerActivityTab>("Vazifa");
  const [customerActionType, setCustomerActionType] = useState("Nima qilish kerak");
  const [customerDocumentType, setCustomerDocumentType] = useState("Hujjatlar");
  const [customerPaymentAccepted, setCustomerPaymentAccepted] = useState(false);

  useEffect(() => {
    if (selectedCustomerModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedCustomerModal]);

  const total = cart.reduce((sum, item) => sum + item.narx * item.soni, 0);
  const percentDiscountSum = Math.round((total * discountPercent) / 100);
  const discountSum = Math.min(total, discountAmount || percentDiscountSum);

  const filteredCustomers = useMemo(() => {
    const value = customerSearch.toLowerCase().trim();

    if (!value) return [];

    return doimiyMijozlar.filter((customer) =>
      [customer.ism, customer.telefon, customer.oxirgiXarid, formatSumma(customer.qarz)]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [customerSearch]);

  function updateQuantity(productId: number, nextQuantity: number) {
    updateCartQuantity(productId, nextQuantity);
  }

  function clearCart() {
    clearPosCart();
    setDiscountPercent(0);
    setDiscountAmount(0);
    setCustomerName("");
  }

  function handlePay() {
    if (cart.length === 0) {
      alert("Savatcha bo'sh");
      return;
    }

    alert("To'lov muvaffaqiyatli amalga oshirildi");
    clearCart();
  }

  function handleNextCustomer() {
    if (!selectedCustomerId) {
      alert("Avval mijoz tanlang");
      return;
    }

    const customer = doimiyMijozlar.find((item) => item.id === selectedCustomerId);

    if (!customer) return;

    setSelectedCustomerModal(customer);
    setCustomerDetailTab("Asosiyisi");
    setCustomerActivityTab("Vazifa");
    setCustomerActionType("Nima qilish kerak");
    setCustomerDocumentType("Hujjatlar");
    setCustomerPaymentAccepted(false);
  }

  function closeCustomerModal() {
    setSelectedCustomerModal(null);
    setCustomerDetailTab("Asosiyisi");
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-214px)] w-full max-w-[1560px] grid-cols-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_310px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-[520px] flex-col border-b border-gray-100 p-4 sm:p-5 lg:border-b-0 lg:border-r xl:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight text-gray-950 sm:text-3xl">
                Savatcha
              </h1>
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                {cart.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:min-h-[430px] xl:min-h-[500px]">
          {cart.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <h2 className="text-xl font-bold text-gray-950 sm:text-2xl">
                  Savatcha bo'sh
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Hozircha hech qanday mahsulot tanlanmagan
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-3 sm:p-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="mb-2 grid gap-3 rounded-xl bg-orange-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_108px_116px_36px] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{item.nom}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatSumma(item.narx)}</p>
                  </div>

                  <div className="flex h-9 items-center justify-between rounded-lg bg-white px-1 shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.id, item.soni - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-gray-800">{item.soni}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.soni + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="text-right text-sm font-bold text-orange-600">
                    {formatSumma(item.narx * item.soni)}
                  </p>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm transition hover:bg-red-50 hover:text-red-500"
                    aria-label="Mahsulotni savatchadan o'chirish"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="flex flex-col bg-[#FAFAFA] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
          {[
            ["donalik", "Donalik mijoz"],
            ["doimiy", "Doimiy mijozlar"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMijozTuri(value as CustomerType)}
              className={[
                "h-10 rounded-xl text-xs font-bold transition sm:text-sm",
                mijozTuri === value
                  ? "bg-orange-500 text-white shadow-sm shadow-orange-100"
                  : "text-gray-500 hover:bg-white/70 hover:text-orange-600",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {mijozTuri === "donalik" ? (
          <>
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">Mijoz</p>
              </div>

              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Ism, Familiya"
                className="h-10 w-full rounded-lg bg-gray-100 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-700">Chegirma</p>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_74px] gap-2">
                <input
                  value={discountAmount || ""}
                  onChange={(event) => {
                    setDiscountAmount(readNumber(event.target.value));
                    setDiscountPercent(0);
                  }}
                  placeholder="Chegirmani kiriting"
                  className="h-10 min-w-0 rounded-lg bg-gray-100 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
                <button className="rounded-lg border border-orange-500 bg-white text-xs font-bold text-orange-600">
                  UZS
                </button>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2">
                {quickDiscounts.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setDiscountPercent(item);
                      setDiscountAmount(0);
                    }}
                    className={[
                      "h-9 rounded-lg text-xs font-bold transition",
                      discountPercent === item
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-orange-50",
                    ].join(" ")}
                  >
                    {item}%
                  </button>
                ))}
              </div>
            </div>

            <button className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 text-xs font-bold text-green-700">
              <Paperclip size={14} />
              Eslatma qo'shish
            </button>

            <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setNarxTuri("chakana")}
                className={[
                  "rounded-md py-2.5 text-xs font-bold transition",
                  narxTuri === "chakana"
                    ? "border border-orange-300 bg-white text-orange-600"
                    : "text-gray-500 hover:text-orange-600",
                ].join(" ")}
              >
                Chakana narx
              </button>
              <button
                onClick={() => setNarxTuri("ulgurji")}
                className={[
                  "rounded-md py-2.5 text-xs font-bold transition",
                  narxTuri === "ulgurji"
                    ? "border border-orange-300 bg-white text-orange-600"
                    : "text-gray-500 hover:text-orange-600",
                ].join(" ")}
              >
                Ulgurji narx
              </button>
            </div>

            <p className="mb-2 text-sm font-bold text-gray-700">To'lov turini tanlang</p>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {paymentTypes.map((item) => (
                <button
                  key={item}
                  onClick={() => setPaymentType(item)}
                  className={[
                    "flex h-10 items-center justify-center rounded-lg border bg-white text-sm font-bold transition",
                    paymentType === item
                      ? "border-green-300 text-gray-900 shadow-sm"
                      : "border-gray-200 text-gray-700 hover:border-orange-200",
                  ].join(" ")}
                >
                  <WalletCards
                    size={15}
                    className={[
                      "mr-2",
                      item === "Payme"
                        ? "text-cyan-500"
                        : item === "Click"
                          ? "text-blue-600"
                          : item === "Uzum"
                            ? "text-violet-600"
                            : "text-green-600",
                    ].join(" ")}
                  />
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-auto rounded-lg bg-gray-100 p-3">
              <div className="mb-2 flex justify-between text-xs text-gray-500">
                <span>Oraliq jami</span>
                <span>{formatSumma(total)}</span>
              </div>

              <div className="mb-3 flex justify-between text-xs text-gray-500">
                <span>Chegirma</span>
                <span>{formatSumma(discountSum)}</span>
              </div>

              <button
                onClick={handlePay}
                className="h-10 w-full rounded-lg bg-orange-500 text-xs font-bold text-white transition hover:bg-orange-600"
              >
                To'lash
              </button>

              <button
                onClick={clearCart}
                className="mt-2 h-10 w-full rounded-lg bg-white text-xs font-bold text-gray-500 transition hover:text-orange-600"
              >
                Kechiktirish
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <p className="mb-2 text-sm font-bold text-gray-700">Doimiy mijozlar</p>
              <div className="flex h-10 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-gray-100">
                <input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Doimiy mijozni qidirish"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
                <Search size={17} className="text-gray-300" />
              </div>
            </div>

            <div className="mb-5 max-h-[420px] space-y-3 overflow-auto pr-1">
              {filteredCustomers.map((customer) => {
                const isActive = selectedCustomerId === customer.id;

                return (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={[
                      "w-full rounded-2xl border bg-white p-4 text-left transition hover:bg-orange-50",
                      isActive
                        ? "border-orange-500 bg-orange-50 shadow-sm shadow-orange-100"
                        : "border-gray-100",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {customer.ism}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {customer.telefon}
                        </p>
                      </div>

                      <span
                        className={[
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                          customer.qarz === 0
                            ? "bg-green-50 text-green-600"
                            : "bg-orange-50 text-orange-600",
                        ].join(" ")}
                      >
                        {customer.qarz === 0 ? "Qarzi yo'q" : `Qarz: ${formatSumma(customer.qarz)}`}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>Oxirgi xarid</span>
                      <span className="font-bold text-gray-700">{customer.oxirgiXarid}</span>
                    </div>
                  </button>
                );
              })}

              {filteredCustomers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                  {customerSearch.trim() ? "Mijoz topilmadi" : "Mijozni qidirish uchun ism yoki familiya kiriting"}
                </div>
              )}
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setNarxTuri("chakana")}
                className={[
                  "rounded-md py-2.5 text-xs font-bold transition",
                  narxTuri === "chakana"
                    ? "border border-orange-300 bg-white text-orange-600"
                    : "text-gray-500 hover:text-orange-600",
                ].join(" ")}
              >
                Chakana narx
              </button>
              <button
                onClick={() => setNarxTuri("ulgurji")}
                className={[
                  "rounded-md py-2.5 text-xs font-bold transition",
                  narxTuri === "ulgurji"
                    ? "border border-orange-300 bg-white text-orange-600"
                    : "text-gray-500 hover:text-orange-600",
                ].join(" ")}
              >
                Ulgurji narx
              </button>
            </div>

            <button
              onClick={handleNextCustomer}
              className="mt-auto h-11 w-full rounded-lg bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Keyingisi
            </button>
          </>
        )}
      </aside>
      {selectedCustomerModal && (
        <AppModal>
            <section className="scrollbar-hidden max-h-[94vh] w-full max-w-[1500px] overflow-y-auto rounded-[34px] bg-[#D8D8D8] p-4 shadow-2xl sm:p-6">
              <div className="mb-6 flex flex-col items-start justify-between gap-5 xl:flex-row xl:items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Doimiy mijoz savdosi</p>
                  <h2 className="mt-1 text-3xl font-bold text-gray-950 sm:text-4xl">
                    {selectedCustomerModal.ism}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCustomerPaymentAccepted(false)}
                    className="h-12 rounded-2xl border border-orange-100 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:text-orange-600"
                  >
                    To'lovga qaytish
                  </button>

                  <select
                    value={customerDocumentType}
                    onChange={(event) => setCustomerDocumentType(event.target.value)}
                    className="h-12 rounded-2xl border border-orange-100 bg-white px-5 text-sm font-semibold text-gray-700 outline-none transition hover:border-orange-300"
                  >
                    <option>Hujjatlar</option>
                    <option>Chek</option>
                    <option>Nakladnoy</option>
                    <option>PDF</option>
                  </select>

                  <button
                    onClick={closeCustomerModal}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                    aria-label="Yopish"
                  >
                    <X size={26} />
                  </button>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-orange-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                  {customerDetailTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCustomerDetailTab(tab)}
                      className={[
                        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                        customerDetailTab === tab
                          ? "border border-orange-400 bg-orange-50 text-orange-600"
                          : "text-gray-500 hover:bg-orange-50 hover:text-orange-600",
                      ].join(" ")}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition hover:bg-orange-500 hover:text-white">
                  <Settings size={18} />
                </button>
              </div>

              {customerDetailTab === "Asosiyisi" && (
                <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
                  <div className="space-y-5">
                    <section className="rounded-[28px] bg-white p-6 shadow-sm">
                      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
                        <h3 className="text-xl font-bold text-gray-950">Savdo</h3>
                        <button className="text-sm font-semibold text-gray-400 transition hover:text-orange-600">
                          Tahrirlash
                        </button>
                      </div>

                      <p className="text-sm text-gray-500">Summa</p>
                      <h4 className="mt-1 text-3xl font-bold text-gray-950">
                        {formatSumma(total)}
                      </h4>

                      <button
                        onClick={() => setCustomerPaymentAccepted(true)}
                        className="mt-5 w-full rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                      >
                        {customerPaymentAccepted ? "To'lov qabul qilindi" : "To'lov qabul qilish"}
                      </button>

                      <div className="mt-6 rounded-3xl bg-gray-50 p-5">
                        <p className="font-bold text-gray-800">To'lov va yetkazib berish</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Doimiy mijoz savdosi, qarzdorlik va oxirgi xarid ma'lumotlari.
                        </p>
                      </div>

                      <div className="mt-6 space-y-5">
                        {[
                          ["Kontragent", selectedCustomerModal.ism],
                          ["Telefon", selectedCustomerModal.telefon],
                          ["Oxirgi xarid", selectedCustomerModal.oxirgiXarid],
                          [
                            "Qarzdorlik",
                            selectedCustomerModal.qarz === 0
                              ? "Qarzi yo'q"
                              : formatSumma(selectedCustomerModal.qarz),
                          ],
                          ["Narx turi", narxTuri === "chakana" ? "Chakana narx" : "Ulgurji narx"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-sm text-gray-500">{label}</p>
                            <div className="mt-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[28px] bg-white p-6 shadow-sm">
                      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
                        <h3 className="text-base font-bold text-gray-950">
                          Qo'shimcha ma'lumotlar
                        </h3>
                        <button className="text-sm font-semibold text-gray-400 transition hover:text-orange-600">
                          Tahrirlash
                        </button>
                      </div>

                      <p className="text-sm text-gray-500">Qaytarilgan savdo</p>
                      <select className="mt-2 h-10 w-full rounded-2xl bg-gray-100 px-4 text-sm font-semibold text-gray-700 outline-none">
                        <option>Tanlang</option>
                        <option>Qaytarilgan</option>
                        <option>Qaytarilmagan</option>
                      </select>

                      <p className="mt-5 text-sm text-gray-500">Qo'shimcha kommentariya</p>
                      <p className="mt-1 text-sm font-bold text-gray-700">Kommentariya...</p>
                    </section>
                  </div>

                  <main className="rounded-[28px] bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-wrap gap-2">
                      {customerActivityTabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setCustomerActivityTab(tab)}
                          className={[
                            "rounded-full px-4 py-2 text-sm font-semibold transition",
                            customerActivityTab === tab
                              ? "border border-orange-400 bg-orange-50 text-orange-600"
                              : "text-gray-600 hover:bg-orange-50 hover:text-orange-600",
                          ].join(" ")}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <select
                      value={customerActionType}
                      onChange={(event) => setCustomerActionType(event.target.value)}
                      className="h-14 w-full rounded-2xl border border-gray-100 bg-white px-4 text-gray-700 outline-none"
                    >
                      <option>Nima qilish kerak</option>
                      <option>Qo'ng'iroq qilish</option>
                      <option>To'lovni eslatish</option>
                      <option>Yangi buyurtma olish</option>
                    </select>

                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="rounded-full border border-green-300 bg-green-50 px-5 py-2 text-sm font-medium text-green-600">
                        Bugun
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                      <button className="inline-flex h-10 items-center gap-2 rounded-full bg-gray-50 px-4 text-sm font-semibold text-gray-500">
                        Filtr
                        <Filter size={14} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {[
                        {
                          title: "Vazifa",
                          time: "18:37",
                          text: `${selectedCustomerModal.ism} bilan keyingi xarid bo'yicha bog'lanish.`,
                          icon: CheckCircle,
                          className: "bg-yellow-400",
                        },
                        {
                          title: "Kommentariya",
                          time: "14:00",
                          text: `${selectedCustomerModal.telefon} raqamiga qo'ng'iroq qilish kerak.`,
                          icon: MessageSquare,
                          className: "bg-blue-600",
                        },
                        {
                          title: "Habarnoma",
                          time: "14:00",
                          text:
                            selectedCustomerModal.qarz === 0
                              ? "Mijozda qarzdorlik mavjud emas."
                              : `Qarzdorlik: ${formatSumma(selectedCustomerModal.qarz)}.`,
                          icon: Bell,
                          className: "bg-green-500",
                        },
                      ].map((item) => {
                        const Icon = item.icon;

                        return (
                          <article
                            key={item.title}
                            className="flex gap-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
                          >
                            <div
                              className={[
                                "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white",
                                item.className,
                              ].join(" ")}
                            >
                              <Icon size={24} />
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-gray-800">
                                {item.title}{" "}
                                <span className="text-sm font-normal text-gray-400">
                                  | {item.time}
                                </span>
                              </h3>
                              <p className="mt-2 text-sm text-gray-500">{item.text}</p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </main>
                </div>
              )}

              {customerDetailTab !== "Asosiyisi" && (
                <div className="rounded-[28px] bg-white p-8 text-center text-sm font-semibold text-gray-400">
                  {customerDetailTab} bo'limi demo holatda
                </div>
              )}
            </section>
        </AppModal>
      )}
    </div>
  );
}
