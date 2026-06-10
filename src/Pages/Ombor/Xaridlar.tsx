import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import {
  CalendarDays,
  ChevronDown,
  FileUp,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  Square,
  X,
} from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import { useOmborStore, type Purchase } from "@/store/omborStore";

type DetailTab = "Asosiyisi" | "Mahsulotlar" | "Tarix" | "Bekor qilish" | "Qaytarish";
type ActivityTab = "Vazifa" | "Kommentariya" | "Habarnoma" | "Qo'shimcha";

const detailTabs: DetailTab[] = [
  "Asosiyisi",
  "Mahsulotlar",
  "Tarix",
  "Bekor qilish",
  "Qaytarish",
];

const activityTabs: ActivityTab[] = ["Vazifa", "Kommentariya", "Habarnoma", "Qo'shimcha"];
const warehouseOptions = ["Ombor nomi", "Asosiy ombor", "Zaxira ombor"];

const purchaseSchema = z.object({
  ismi: z.string().trim().min(1, "Ismi kiritilishi kerak"),
  sana: z.string().trim().min(1, "Sana kiritilishi kerak"),
  ozgartirilganSana: z.string().trim().min(1, "O'zgartirilgan sana kiritilishi kerak"),
  masul: z.string().trim().min(1, "Mas'ul shaxs kiritilishi kerak"),
  yetkazibBeruvchi: z.string().trim().min(1, "Yetkazib beruvchi kiritilishi kerak"),
  summa: z.number().positive("Summa 0 dan katta bo'lishi kerak"),
  ombor: z.string().trim().min(1, "Ombor tanlanishi kerak"),
});

type PurchaseFormErrors = Partial<Record<keyof Omit<Purchase, "id">, string>>;

function formatSumma(value: number) {
  return `${value.toLocaleString("ru-RU")} uzs`;
}

function formatToday() {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function emptyForm(): Omit<Purchase, "id"> {
  const today = formatToday();

  return {
    ismi: "",
    sana: today,
    ozgartirilganSana: today,
    masul: "",
    yetkazibBeruvchi: "",
    summa: 0,
    ombor: warehouseOptions[0],
  };
}

export default function Xaridlar() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"xaridlar" | "xujatlar">("xaridlar");
  const [purchasePage, setPurchasePage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const purchases = useOmborStore((state) => state.purchases);
  const purchaseProducts = useOmborStore((state) => state.products);
  const addPurchase = useOmborStore((state) => state.addPurchase);
  const addProduct = useOmborStore((state) => state.addProduct);
  const ensureMinimumPurchases = useOmborStore((state) => state.ensureMinimumPurchases);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("Asosiyisi");
  const [activityTab, setActivityTab] = useState<ActivityTab>("Kommentariya");
  const [actionType, setActionType] = useState("Nima qilish kerak");
  const [documentType, setDocumentType] = useState("Hujjatlar");
  const [isPaid, setIsPaid] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [comments, setComments] = useState([
    {
      id: 1,
      time: "14:00",
      text: "Xarid ma'lumotlari tekshirildi, yetkazib beruvchi bilan kelishildi.",
    },
  ]);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<PurchaseFormErrors>({});

  useEffect(() => {
    ensureMinimumPurchases(12);
  }, [ensureMinimumPurchases]);

  useEffect(() => {
    if (selectedPurchase) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPurchase]);

  const filteredPurchases = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return purchases;

    return purchases.filter((purchase) =>
      [
        purchase.ismi,
        purchase.sana,
        purchase.ozgartirilganSana,
        purchase.masul,
        purchase.yetkazibBeruvchi,
        purchase.ombor,
        formatSumma(purchase.summa),
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [purchases, search]);

  const filteredProducts = useMemo(() => {
    const value = productSearch.toLowerCase().trim();

    if (!value) return purchaseProducts;

    return purchaseProducts.filter((product) =>
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
        .includes(value)
    );
  }, [productSearch, purchaseProducts]);
  const safePurchasePage = Math.min(
    purchasePage,
    Math.max(1, Math.ceil(filteredPurchases.length / 10))
  );
  const paginatedPurchases = filteredPurchases.slice(
    (safePurchasePage - 1) * 10,
    safePurchasePage * 10
  );
  const safeProductPage = Math.min(
    productPage,
    Math.max(1, Math.ceil(filteredProducts.length / 10))
  );
  const paginatedProducts = filteredProducts.slice(
    (safeProductPage - 1) * 10,
    safeProductPage * 10
  );

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function openDetail(purchase: Purchase) {
    setSelectedPurchase(purchase);
    setDetailTab("Asosiyisi");
    setActivityTab("Vazifa");
    setActionType("Nima qilish kerak");
    setDocumentType("Hujjatlar");
    setIsPaid(false);
  }

  function closeDetail() {
    setSelectedPurchase(null);
    setDetailTab("Asosiyisi");
  }

  function addActivity() {
    if (actionType === "Nima qilish kerak") return;

    setComments((prev) => [
      {
        id: Date.now(),
        time: "Hozir",
        text:
          activityTab === "Kommentariya"
            ? `${actionType} bo'yicha kommentariya qo'shildi.`
            : `${actionType} bo'yicha qo'shimcha ma'lumot kiritildi.`,
      },
      ...prev,
    ]);
    setActionType("Nima qilish kerak");
  }

  function addPurchaseProduct() {
    addProduct({
      purchaseId: selectedPurchase?.id,
      nomi: "Yangi mahsulot",
      soni: 1,
      kodi: "10300",
      shtrixKodi: "981640",
      olchovBirligi: "dona",
      narxi: 150000,
    });
    setProductSearch("");
  }

  function createPurchase() {
    const today = formatToday();
    const parsed = purchaseSchema.safeParse({
      ...form,
      ismi: form.ismi.trim(),
      sana: form.sana.trim(),
      ozgartirilganSana: form.ozgartirilganSana.trim(),
      masul: form.masul.trim(),
      yetkazibBeruvchi: form.yetkazibBeruvchi.trim(),
      summa: Number(form.summa) || 0,
      ombor: form.ombor.trim(),
    });

    if (!parsed.success) {
      const nextErrors: PurchaseFormErrors = {};

      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof Omit<Purchase, "id"> | undefined;
        if (key) nextErrors[key] = issue.message;
      });
      setFormErrors(nextErrors);
      return;
    }

    addPurchase({
      ismi: parsed.data.ismi,
      sana: parsed.data.sana || today,
      ozgartirilganSana: parsed.data.ozgartirilganSana || today,
      masul: parsed.data.masul,
      yetkazibBeruvchi: parsed.data.yetkazibBeruvchi,
      summa: parsed.data.summa,
      ombor: parsed.data.ombor,
    });
    setForm(emptyForm());
    setFormErrors({});
    setIsModalOpen(false);
  }

  function openCreateModal() {
    setForm(emptyForm());
    setFormErrors({});
    setIsModalOpen(true);
  }

  function closeCreateModal() {
    setForm(emptyForm());
    setFormErrors({});
    setIsModalOpen(false);
  }

  const isCreateFormValid = purchaseSchema.safeParse({
    ...form,
    ismi: form.ismi.trim(),
    sana: form.sana.trim(),
    ozgartirilganSana: form.ozgartirilganSana.trim(),
    masul: form.masul.trim(),
    yetkazibBeruvchi: form.yetkazibBeruvchi.trim(),
    summa: Number(form.summa) || 0,
    ombor: form.ombor.trim(),
  }).success;

  return (
    <div className="min-h-[calc(100vh-190px)] rounded-2xl bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
          >
            <Plus size={16} />
            Qo'shish
          </button>

          <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 sm:w-[320px] lg:w-[420px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Qidirish"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            <Search size={18} className="text-gray-300" />
          </div>
        </div>

        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600">
          <CalendarDays size={16} />
          Bugun
          <ChevronDown size={15} />
        </button>
      </div>

      <div className="mt-6 flex items-center gap-7">
        <button
          onClick={() => setActiveTab("xaridlar")}
          className={[
            "text-base font-semibold transition",
            activeTab === "xaridlar" ? "text-gray-900" : "text-gray-400 hover:text-gray-700",
          ].join(" ")}
        >
          Xaridlar
        </button>
        <button
          onClick={() => setActiveTab("xujatlar")}
          className={[
            "text-base font-semibold transition",
            activeTab === "xujatlar" ? "text-gray-900" : "text-gray-400 hover:text-gray-700",
          ].join(" ")}
        >
          Xujatlar
        </button>
      </div>

      {activeTab === "xaridlar" ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3">Ismi</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">O'zgartirilgan sana</th>
                  <th className="px-4 py-3">Mas'ul shaxs</th>
                  <th className="px-4 py-3">Yetkazib beruvchi</th>
                  <th className="px-4 py-3">Summa</th>
                  <th className="px-4 py-3">Ombor</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {paginatedPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    onClick={() => openDetail(purchase)}
                    className="cursor-pointer transition hover:bg-orange-50/40"
                  >
                    <td className="px-4 py-4">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelect(purchase.id);
                        }}
                        className={[
                          "flex h-4 w-4 items-center justify-center rounded border transition",
                          selectedIds.includes(purchase.id)
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-gray-300 bg-white text-transparent",
                        ].join(" ")}
                        aria-label="Tanlash"
                      >
                        <Square size={8} fill="currentColor" />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {purchase.ismi}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{purchase.sana}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {purchase.ozgartirilganSana}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{purchase.masul}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {purchase.yetkazibBeruvchi}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {formatSumma(purchase.summa)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {purchase.ombor}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-lg p-1 text-gray-400 transition hover:bg-white hover:text-orange-600"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      Xarid topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={safePurchasePage}
            totalItems={filteredPurchases.length}
            onPageChange={setPurchasePage}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-14 text-center text-sm text-gray-400">
          Xujatlar hozircha mavjud emas
        </div>
      )}

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm lg:pl-[120px]">
            <div className="flex h-[min(780px,calc(100dvh-48px))] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-950">Yangi xarid</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Xarid ma'lumotlarini to'liq kiriting va omborni tanlang
                  </p>
                </div>
                <button
                  onClick={closeCreateModal}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-orange-500 hover:text-white"
                  aria-label="Yopish"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#D8D8D8] p-6">
                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="rounded-[28px] bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-950">Xarid holati</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Barcha maydonlar to'ldirilgandan keyin saqlash yoqiladi.
                    </p>

                    <div className="mt-6 rounded-3xl bg-orange-50 p-5">
                      <p className="text-sm font-bold text-orange-600">Summa</p>
                      <p className="mt-2 text-2xl font-black text-gray-950">
                        {formatSumma(Number(form.summa) || 0)}
                      </p>
                    </div>

                    <div className="mt-4 rounded-3xl bg-gray-50 p-5">
                      <p className="text-sm font-bold text-gray-500">Ombor</p>
                      <p className="mt-2 text-xl font-black text-gray-950">{form.ombor}</p>
                    </div>
                  </aside>

                  <main className="rounded-[28px] bg-white p-6 shadow-sm">
                    <div className="grid gap-5 md:grid-cols-2">
                      {[
                        ["ismi", "Ismi"],
                        ["sana", "Sana"],
                        ["ozgartirilganSana", "O'zgartirilgan sana"],
                        ["masul", "Mas'ul shaxs"],
                        ["yetkazibBeruvchi", "Yetkazib beruvchi"],
                      ].map(([key, label]) => {
                        const fieldKey = key as keyof Omit<Purchase, "id">;

                        return (
                          <label key={key} className="text-xs font-bold text-gray-500">
                            {label}
                            <input
                              value={String(form[fieldKey])}
                              onChange={(event) => {
                                setForm((prev) => ({ ...prev, [key]: event.target.value }));
                                setFormErrors((prev) => ({ ...prev, [key]: undefined }));
                              }}
                              className={[
                                "mt-1 h-12 w-full rounded-xl border px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300",
                                formErrors[fieldKey] ? "border-red-300" : "border-gray-200",
                              ].join(" ")}
                            />
                            {formErrors[fieldKey] && (
                              <span className="mt-1 block text-xs font-semibold text-red-500">
                                {formErrors[fieldKey]}
                              </span>
                            )}
                          </label>
                        );
                      })}

                      <label className="text-xs font-bold text-gray-500">
                        Ombor
                        <select
                          value={form.ombor}
                          onChange={(event) => {
                            setForm((prev) => ({ ...prev, ombor: event.target.value }));
                            setFormErrors((prev) => ({ ...prev, ombor: undefined }));
                          }}
                          className={[
                            "mt-1 h-12 w-full rounded-xl border bg-white px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300",
                            formErrors.ombor ? "border-red-300" : "border-gray-200",
                          ].join(" ")}
                        >
                          {warehouseOptions.map((warehouse) => (
                            <option key={warehouse} value={warehouse}>
                              {warehouse}
                            </option>
                          ))}
                        </select>
                        {formErrors.ombor && (
                          <span className="mt-1 block text-xs font-semibold text-red-500">
                            {formErrors.ombor}
                          </span>
                        )}
                      </label>

                      <label className="text-xs font-bold text-gray-500">
                        Summa
                        <input
                          type="number"
                          min={0}
                          value={form.summa || ""}
                          onChange={(event) => {
                            setForm((prev) => ({ ...prev, summa: Number(event.target.value) }));
                            setFormErrors((prev) => ({ ...prev, summa: undefined }));
                          }}
                          className={[
                            "mt-1 h-12 w-full rounded-xl border px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300",
                            formErrors.summa ? "border-red-300" : "border-gray-200",
                          ].join(" ")}
                        />
                        {formErrors.summa && (
                          <span className="mt-1 block text-xs font-semibold text-red-500">
                            {formErrors.summa}
                          </span>
                        )}
                      </label>
                    </div>
                  </main>
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  onClick={closeCreateModal}
                  className="h-11 rounded-xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:text-orange-600"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={createPurchase}
                  disabled={!isCreateFormValid}
                  className="h-11 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {selectedPurchase &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-[2px]" />

            <section className="scrollbar-hidden fixed bottom-4 left-4 right-4 top-4 z-[9999] overflow-y-auto rounded-[34px] bg-[#D8D8D8] p-5 shadow-2xl sm:bottom-6 sm:left-6 sm:right-6 sm:top-6 lg:bottom-[32px] lg:left-[120px] lg:right-[32px] lg:top-[32px] lg:p-6 2xl:left-[140px]">
            <div className="mb-7 flex flex-col items-start justify-between gap-5 xl:flex-row xl:items-center">
              <div>
                <p className="text-sm font-medium text-gray-500">Xarid spisok ichi</p>
                <h2 className="mt-1 text-4xl font-bold text-gray-950">
                  {selectedPurchase.ismi}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsPaid(false)}
                  className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:text-orange-600"
                >
                  To'lovga qaytish
                </button>

                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition hover:border-orange-300"
                >
                  <option>Hujjatlar</option>
                  <option>Chek</option>
                  <option>Nakladnoy</option>
                  <option>PDF</option>
                </select>

                <button
                  onClick={closeDetail}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                  aria-label="Yopish"
                >
                  <X size={23} />
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-orange-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                {detailTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={[
                      "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                      detailTab === tab
                        ? "border border-orange-400 bg-orange-50 text-orange-600"
                        : "text-gray-500 hover:bg-orange-50 hover:text-orange-600",
                    ].join(" ")}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition hover:bg-orange-500 hover:text-white">
                  <Settings size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1">
              {detailTab === "Asosiyisi" && (
                <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[460px_minmax(0,1fr)] 2xl:grid-cols-[500px_minmax(0,1fr)]">
                  <div className="space-y-5">
                    <section className="rounded-[28px] bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-lg font-bold text-gray-950">Xarid</h3>
                        <button className="text-sm font-semibold text-gray-400 hover:text-orange-600">
                          Tahrirlash
                        </button>
                      </div>

                      <div className="mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Summa</p>
                          <p className="mt-1 text-2xl font-bold text-gray-950">
                            {formatSumma(selectedPurchase.summa)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsPaid((prev) => !prev)}
                        className={[
                          "mb-5 w-full rounded-2xl px-4 py-4 text-sm font-bold text-white transition",
                          isPaid ? "bg-green-700" : "bg-green-600 hover:bg-green-700",
                        ].join(" ")}
                      >
                        {isPaid ? "To'lov qabul qilindi" : "To'lov qabul qilish"}
                      </button>

                      <div className="mb-5 rounded-3xl bg-gray-50 p-6">
                        <p className="font-bold text-gray-800">To'lov va yetkazib berish</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Xarid to'lovi, yetkazib beruvchi va ombor holati haqida ma'lumot.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {[
                          ["Yetkazib beruvchi", selectedPurchase.yetkazibBeruvchi],
                          ["Ombor", selectedPurchase.ombor],
                          ["Sana", selectedPurchase.sana],
                          ["Mas'ul shaxs", selectedPurchase.masul],
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
                      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-base font-bold text-gray-950">
                          Qo'shimcha ma'lumotlar
                        </h3>
                        <button className="text-sm font-semibold text-gray-400 hover:text-orange-600">
                          Tahrirlash
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                        <div>
                          <p className="text-sm text-gray-500">O'zgartirilgan sana</p>
                          <p className="mt-1 text-sm font-bold text-gray-700">
                            {selectedPurchase.ozgartirilganSana}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Hujjat turi</p>
                          <p className="mt-1 text-sm font-bold text-gray-700">{documentType}</p>
                        </div>
                      </div>

                      <button className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800">
                        <FileUp size={16} />
                        Hujjat kiritish
                      </button>
                    </section>
                  </div>

                  <main className="rounded-[28px] bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {activityTabs.map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActivityTab(tab)}
                            className={[
                              "rounded-full px-4 py-2 text-sm font-semibold transition",
                              activityTab === tab
                                ? "border border-orange-400 bg-orange-50 text-orange-600"
                                : "text-gray-600 hover:bg-orange-50 hover:text-orange-600",
                            ].join(" ")}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        value={actionType}
                        onChange={(event) => setActionType(event.target.value)}
                        className="h-14 min-w-0 flex-1 rounded-2xl border border-gray-100 bg-white px-4 text-sm text-gray-700 outline-none"
                      >
                        <option>Nima qilish kerak</option>
                        <option>Qo'ng'iroq qilish</option>
                        <option>Hujjat tekshirish</option>
                        <option>Yetkazib beruvchiga yozish</option>
                      </select>
                      <button
                        onClick={addActivity}
                        className="h-14 rounded-2xl bg-orange-500 px-6 text-sm font-bold text-white hover:bg-orange-600"
                      >
                        Qo'shish
                      </button>
                    </div>

                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="rounded-full border border-green-300 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-600">
                        Bugun
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                      <button className="inline-flex h-10 items-center gap-2 rounded-full bg-gray-50 px-4 text-sm font-semibold text-gray-500">
                        Filtr
                        <Filter size={14} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <article
                          key={comment.id}
                          className="flex gap-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                            <MessageSquare size={22} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-800">
                              {activityTab}{" "}
                              <span className="text-sm font-medium text-gray-500">
                                | {comment.time}
                              </span>
                            </h3>
                            <p className="mt-1.5 text-sm text-gray-500">{comment.text}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </main>
                </div>
              )}

              {detailTab === "Mahsulotlar" && (
                <div className="rounded-[28px] bg-[#D8D8D8]">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        onClick={addPurchaseProduct}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                      >
                        <Plus size={16} />
                        Mahsulot qo'shish
                      </button>

                      <div className="flex h-12 w-full items-center gap-3 rounded-xl bg-white px-4 shadow-sm sm:w-[400px] lg:w-[520px]">
                        <input
                          value={productSearch}
                          onChange={(event) => setProductSearch(event.target.value)}
                          placeholder="Qidirish"
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-700 outline-none placeholder:text-gray-400"
                        />
                        <Search size={20} className="text-gray-300" />
                      </div>
                    </div>

                    <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-gray-500 shadow-sm transition hover:text-orange-600">
                      Filtr
                      <Filter size={15} />
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-[24px] bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                        <thead className="text-orange-500">
                          <tr className="border-b border-gray-100">
                            <th className="w-14 px-4 py-3" />
                            <th className="px-4 py-3 font-bold">Mahsulot nomi</th>
                            <th className="px-4 py-3 font-bold">Tovar soni</th>
                            <th className="px-4 py-3 font-bold">Tovar kodi</th>
                            <th className="px-4 py-3 font-bold">Shtrih kodi</th>
                            <th className="px-4 py-3 font-bold">O'lchov birligi</th>
                            <th className="px-4 py-3 text-right font-bold">Narxi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                          {paginatedProducts.map((product) => (
                            <tr key={product.id} className="transition hover:bg-orange-50/40">
                              <td className="px-4 py-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                                  <Package size={15} />
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-700">
                                {product.nomi}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-semibold">
                                {product.soni}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-semibold">
                                {product.kodi}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-semibold">
                                {product.shtrixKodi}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-semibold">
                                {product.olchovBirligi}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                                {product.narxi.toLocaleString("ru-RU")}
                              </td>
                            </tr>
                          ))}

                          {filteredProducts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                Mahsulot topilmadi
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <TablePagination
                      page={safeProductPage}
                      totalItems={filteredProducts.length}
                      onPageChange={setProductPage}
                    />
                  </div>
                </div>
              )}

              {detailTab !== "Asosiyisi" && detailTab !== "Mahsulotlar" && (
                <div className="rounded-[28px] bg-white p-8 text-center text-sm font-semibold text-gray-400">
                  {detailTab} bo'limi demo holatda
                </div>
              )}
            </div>
            </section>
          </>,
          document.body
        )}
    </div>
  );
}
