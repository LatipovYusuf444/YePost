import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle,
  Filter,
  LoaderCircle,
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
import {
  mijozlarRoyxatiniOlish,
  omborlarRoyxatiniOlish,
  omborQoldiqlariniOlish,
  sotuvniTasdiqlash,
  sotuvYaratish,
} from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { usePosStore } from "@/store/posStore";
import type { MijozTanlovi, OmborTanlovi, TolovTuri } from "@/types/savdo";

type CustomerType = "donalik" | "doimiy";
type CustomerDetailTab = "Asosiyisi" | "Savatcha" | "Tarix";
type CustomerActivityTab = "Vazifa" | "Kommentariya" | "Habarnoma" | "Qo'shimcha";
type NarxTuri = "chakana" | "ulgurji";

type PaymentType = {
  label: string;
  apiTuri: TolovTuri;
};

const quickDiscounts = [15, 30, 50, 75];
const paymentTypes: PaymentType[] = [
  { label: "Payme", apiTuri: "CARD" },
  { label: "Click", apiTuri: "CARD" },
  { label: "Naqd", apiTuri: "CASH" },
  { label: "Bank", apiTuri: "BANK" },
];
const customerDetailTabs: CustomerDetailTab[] = ["Asosiyisi", "Savatcha", "Tarix"];
const customerActivityTabs: CustomerActivityTab[] = [
  "Vazifa",
  "Kommentariya",
  "Habarnoma",
  "Qo'shimcha",
];

function formatSumma(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString("ru-RU")} uzs`;
}

function readNumber(value: unknown, fallback = 0) {
  const numberValue =
    typeof value === "number" ? value : Number(String(value ?? "").replace(/\s/g, ""));

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function mijozNomi(mijoz?: MijozTanlovi | null) {
  if (!mijoz) return "";
  const ism = [mijoz.firstName, mijoz.lastName].filter(Boolean).join(" ").trim();
  return mijoz.fullName || ism || mijoz.name || mijoz.phone || mijoz.id;
}

function xatoMatni(error: unknown, fallback: string) {
  return getApiErrorMessage(error) || fallback;
}

export default function BoshSahifa() {
  const cart = usePosStore((state) => state.cart);
  const updateCartQuantity = usePosStore((state) => state.updateQuantity);
  const updatePriceType = usePosStore((state) => state.updatePriceType);
  const removeFromCart = usePosStore((state) => state.removeFromCart);
  const clearPosCart = usePosStore((state) => state.clearCart);

  const [omborlar, setOmborlar] = useState<OmborTanlovi[]>([]);
  const [mijozlar, setMijozlar] = useState<MijozTanlovi[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("Payme");
  const [customerName, setCustomerName] = useState("");
  const [mijozTuri, setMijozTuri] = useState<CustomerType>("donalik");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [narxTuri, setNarxTuri] = useState<NarxTuri>("chakana");
  const [selectedCustomerModal, setSelectedCustomerModal] = useState<MijozTanlovi | null>(null);
  const [customerDetailTab, setCustomerDetailTab] = useState<CustomerDetailTab>("Asosiyisi");
  const [customerActivityTab, setCustomerActivityTab] = useState<CustomerActivityTab>("Vazifa");
  const [customerActionType, setCustomerActionType] = useState("Nima qilish kerak");
  const [customerDocumentType, setCustomerDocumentType] = useState("Hujjatlar");
  const [customerPaymentAccepted, setCustomerPaymentAccepted] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tolovModalOchiq, setTolovModalOchiq] = useState(false);
  const [tolovSummasi, setTolovSummasi] = useState("");

  useEffect(() => {
    let active = true;
    const loadBase = async () => {
      setLoading(true);
      try {
        const [warehouses, customers] = await Promise.all([
          omborlarRoyxatiniOlish(),
          mijozlarRoyxatiniOlish(),
        ]);
        if (!active) return;
        setOmborlar(warehouses);
        setMijozlar(customers);
        setWarehouseId((oldValue) => oldValue || String(warehouses[0]?.id ?? ""));
      } catch (error) {
        if (active) setMessage({ type: "error", text: xatoMatni(error, "Bosh sahifa ma'lumotlari olinmadi") });
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBase();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    updatePriceType(narxTuri);
  }, [narxTuri, updatePriceType]);

  useEffect(() => {
    const cartWarehouseId = cart.find((item) => item.warehouseId)?.warehouseId;
    if (cartWarehouseId && cartWarehouseId !== warehouseId) setWarehouseId(cartWarehouseId);
  }, [cart, warehouseId]);

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
  const payableTotal = Math.max(total - discountSum, 0);
  const selectedPayment = paymentTypes.find((item) => item.label === paymentType) ?? paymentTypes[0];

  const filteredCustomers = useMemo(() => {
    const value = customerSearch.toLowerCase().trim();

    if (!value) return [];

    return mijozlar.filter((customer) =>
      [mijozNomi(customer), customer.phone, customer.email, customer.address]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [customerSearch, mijozlar]);

  function updateQuantity(productId: string, nextQuantity: number) {
    updateCartQuantity(productId, nextQuantity);
  }

  function clearCart() {
    clearPosCart();
    setDiscountPercent(0);
    setDiscountAmount(0);
    setCustomerName("");
    setSelectedCustomerId("");
    setNote("");
    setMessage(null);
  }

  function handlePay() {
    setMessage(null);
    if (!warehouseId) {
      setMessage({ type: "error", text: "Sotuv uchun ombor topilmadi" });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: "error", text: "Savatcha bo'sh" });
      return;
    }
    if (cart.some((item) => item.warehouseId && item.warehouseId !== warehouseId)) {
      setMessage({ type: "error", text: "Savatchadagi mahsulotlar boshqa omborga tegishli. Omborni tekshiring." });
      return;
    }
    setTolovSummasi(String(payableTotal));
    setTolovModalOchiq(true);
  }

  async function tolovniTasdiqlash() {
    const qabulQilinadiganSumma = readNumber(tolovSummasi);
    if (qabulQilinadiganSumma <= 0 || qabulQilinadiganSumma > payableTotal) {
      setMessage({ type: "error", text: `To'lov summasi 1 dan ${formatSumma(payableTotal)} gacha bo'lishi kerak` });
      return;
    }

    const rawTotal = cart.reduce((sum, item) => sum + item.narx * item.soni, 0);
    let remainingDiscount = Math.min(discountSum, rawTotal);
    const items = cart.map((item, index) => {
      const lineTotal = item.narx * item.soni;
      const lineDiscount =
        index === cart.length - 1
          ? remainingDiscount
          : Math.min(Math.round((discountSum * lineTotal) / rawTotal), remainingDiscount);
      remainingDiscount -= lineDiscount;

      return {
        modificationId: item.modificationId || item.id,
        quantity: item.soni,
        price: item.narx,
        discount: lineDiscount,
      };
    });

    setSaving(true);
    setMessage(null);
    try {
      const sale = await sotuvYaratish({
        warehouseId,
        customerId: mijozTuri === "doimiy" && selectedCustomerId ? selectedCustomerId : undefined,
        saleType: mijozTuri === "doimiy" ? "CLIENT" : "QUICK",
        note: [customerName ? `Mijoz: ${customerName}` : "", note].filter(Boolean).join(" | ") || undefined,
        items,
        payments: [{ paymentType: selectedPayment.apiTuri, amount: qabulQilinadiganSumma }],
      });
      await sotuvniTasdiqlash(sale.id);
      if (warehouseId) await omborQoldiqlariniOlish(warehouseId);
      clearCart();
      setTolovModalOchiq(false);
      setMessage({ type: "success", text: "To'lov muvaffaqiyatli amalga oshirildi" });
    } catch (error) {
      setMessage({ type: "error", text: xatoMatni(error, "Sotuvni yakunlab bo'lmadi") });
    } finally {
      setSaving(false);
    }
  }

  function handleNextCustomer() {
    if (!selectedCustomerId) {
      setMessage({ type: "error", text: "Avval mijoz tanlang" });
      return;
    }

    const customer = mijozlar.find((item) => String(item.id) === selectedCustomerId);

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

          {omborlar.length > 1 && (
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="h-10 rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm font-semibold text-gray-600 outline-none focus:border-orange-200"
            >
              {omborlar.map((ombor) => (
                <option key={ombor.id} value={ombor.id}>
                  {mijozNomi(ombor)}
                </option>
              ))}
            </select>
          )}
        </div>

        {message && (
          <div
            className={[
              "mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold",
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-600",
            ].join(" ")}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold">
              Yopish
            </button>
          </div>
        )}

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

            <button
              onClick={() => setNoteOpen((value) => !value)}
              className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 text-xs font-bold text-green-700"
            >
              <Paperclip size={14} />
              Eslatma qo'shish
            </button>

            {noteOpen && (
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Eslatma..."
                className="mb-4 h-20 w-full resize-none rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            )}

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
                  key={item.label}
                  onClick={() => setPaymentType(item.label)}
                  className={[
                    "flex h-10 items-center justify-center rounded-lg border bg-white text-sm font-bold transition",
                    paymentType === item.label
                      ? "border-green-300 text-gray-900 shadow-sm"
                      : "border-gray-200 text-gray-700 hover:border-orange-200",
                  ].join(" ")}
                >
                  <WalletCards
                    size={15}
                    className={[
                      "mr-2",
                      item.label === "Payme"
                        ? "text-cyan-500"
                        : item.label === "Click"
                          ? "text-blue-600"
                          : item.label === "Uzum"
                            ? "text-violet-600"
                            : "text-green-600",
                    ].join(" ")}
                  />
                  {item.label}
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
                disabled={saving || loading || cart.length === 0}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 text-xs font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving && <LoaderCircle size={15} className="animate-spin" />}
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
                const isActive = selectedCustomerId === String(customer.id);

                return (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(String(customer.id))}
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
                          {mijozNomi(customer)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {customer.phone || "Telefon kiritilmagan"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-600">
                        Mijoz
                      </span>
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
                  {mijozNomi(selectedCustomerModal)}
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
                      onClick={handlePay}
                      disabled={saving || cart.length === 0}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:bg-gray-300"
                    >
                      {saving && <LoaderCircle size={16} className="animate-spin" />}
                      {customerPaymentAccepted ? "To'lov qabul qilindi" : "To'lov qabul qilish"}
                    </button>

                    <div className="mt-6 rounded-3xl bg-gray-50 p-5">
                      <p className="font-bold text-gray-800">To'lov va yetkazib berish</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Doimiy mijoz savdosi real backend orqali saqlanadi.
                      </p>
                    </div>

                    <div className="mt-6 space-y-5">
                      {[
                        ["Kontragent", mijozNomi(selectedCustomerModal)],
                        ["Telefon", selectedCustomerModal.phone || "Telefon kiritilmagan"],
                        ["Email", selectedCustomerModal.email || "Kiritilmagan"],
                        ["Manzil", selectedCustomerModal.address || "Kiritilmagan"],
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
                        text: `${mijozNomi(selectedCustomerModal)} bilan keyingi xarid bo'yicha bog'lanish.`,
                        icon: CheckCircle,
                        className: "bg-yellow-400",
                      },
                      {
                        title: "Kommentariya",
                        time: "14:00",
                        text: `${selectedCustomerModal.phone || "Mijoz"} bo'yicha izoh qo'shish mumkin.`,
                        icon: MessageSquare,
                        className: "bg-blue-600",
                      },
                      {
                        title: "Habarnoma",
                        time: "14:00",
                        text: "Sotuv yakunlanganda hujjat backendda tasdiqlanadi.",
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
      {tolovModalOchiq && (
        <AppModal className="bg-slate-950/60 backdrop-blur-md">
          <section className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[38px] border border-orange-100 bg-gradient-to-br from-[#fff8ef] via-white to-[#ffe9d4] shadow-[0_35px_120px_rgba(15,23,42,.38)]">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-orange-100 bg-white/85 px-9 py-7 backdrop-blur-xl">
              <div><p className="text-xs font-black uppercase tracking-[.22em] text-orange-500">To'lovni tasdiqlash</p><h2 className="mt-1 text-2xl font-black text-slate-950">Sotuv uchun to'lov</h2><p className="mt-1 text-sm font-semibold text-slate-400">To'lov tasdiqlangandan keyin sotuv backendda yakunlanadi.</p></div>
              <button type="button" onClick={() => setTolovModalOchiq(false)} disabled={saving} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-orange-100 hover:bg-orange-500 hover:text-white disabled:opacity-50"><X size={20}/></button>
            </header>

            <div className="grid gap-8 p-9 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div>
                <div className="mb-4 flex items-center justify-between"><h3 className="font-black text-slate-900">Mahsulotlar</h3><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">{cart.reduce((sum, item) => sum + item.soni, 0)} dona</span></div>
                <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {cart.map((item) => <article key={item.id} className="flex items-center justify-between gap-5 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_12px_35px_rgba(249,115,22,.07)]"><div className="min-w-0"><p className="truncate text-base font-black text-slate-900">{item.nom}</p><p className="mt-1.5 text-sm font-semibold text-slate-400">{item.soni} × {formatSumma(item.narx)} · {item.warehouseName || "Tanlangan ombor"}</p></div><p className="shrink-0 text-base font-black text-orange-600">{formatSumma(item.soni * item.narx)}</p></article>)}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm"><Summary label="Oraliq jami" value={formatSumma(total)}/><Summary label="Chegirma" value={formatSumma(discountSum)}/><Summary label="To'lanadi" value={formatSumma(payableTotal)} accent/></div>
              </div>

              <aside className="flex flex-col rounded-[30px] border border-orange-100 bg-white p-7 shadow-[0_18px_50px_rgba(249,115,22,.10)]">
                <div className="rounded-[24px] bg-[#fff8ef] p-5 ring-1 ring-orange-100"><p className="text-xs font-black uppercase tracking-wide text-slate-400">To'lanadigan jami</p><p className="mt-2 text-3xl font-black text-slate-950">{formatSumma(payableTotal)}</p><p className="mt-2 text-sm font-bold text-orange-500">Tanlangan: {paymentType}</p></div>
                <label className="mt-6 block"><span className="text-xs font-black uppercase tracking-wide text-slate-400">Qabul qilinadigan summa</span><div className="mt-2 flex h-16 items-center rounded-2xl border border-orange-200 bg-[#fffaf5] px-5 focus-within:ring-4 focus-within:ring-orange-50"><input type="number" min="1" max={payableTotal} value={tolovSummasi} onChange={(e) => setTolovSummasi(e.target.value)} className="min-w-0 flex-1 bg-transparent text-2xl font-black text-slate-900 outline-none"/><span className="text-sm font-black text-orange-500">UZS</span></div></label>
                <div className="mt-4 flex gap-3"><button type="button" onClick={() => setTolovSummasi(String(payableTotal))} className="flex-1 rounded-2xl bg-orange-50 px-3 py-3 text-xs font-black text-orange-600">To'liq summa</button><button type="button" onClick={() => setTolovSummasi(String(Math.round(payableTotal / 2)))} className="flex-1 rounded-2xl bg-slate-100 px-3 py-3 text-xs font-black text-slate-600">50%</button></div>
                {message?.type === "error" && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-600">{message.text}</div>}
                <button type="button" onClick={() => void tolovniTasdiqlash()} disabled={saving || readNumber(tolovSummasi) <= 0 || readNumber(tolovSummasi) > payableTotal} className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">{saving && <LoaderCircle size={17} className="animate-spin"/>} To'lovni tasdiqlash</button>
                <p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-400">Tasdiqlashda `/sales` yaratiladi va `/sales/id/confirm` orqali ombor qoldig'i kamayadi.</p>
              </aside>
            </div>
          </section>
        </AppModal>
      )}
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl p-3 ${accent ? "bg-orange-500 text-white" : "bg-white text-slate-700 ring-1 ring-orange-100"}`}><p className={`text-[10px] font-black uppercase ${accent ? "text-white/70" : "text-slate-400"}`}>{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
