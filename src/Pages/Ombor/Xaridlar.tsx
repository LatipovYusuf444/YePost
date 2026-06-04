import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

function formatSumma(value: number) {
  return `${value.toLocaleString("ru-RU")} uzs`;
}

function emptyForm(): Omit<Purchase, "id"> {
  return {
    ismi: "",
    sana: "",
    ozgartirilganSana: "",
    masul: "",
    yetkazibBeruvchi: "",
    summa: 0,
    ombor: "",
  };
}

export default function Xaridlar() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"xaridlar" | "xujatlar">("xaridlar");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const purchases = useOmborStore((state) => state.purchases);
  const purchaseProducts = useOmborStore((state) => state.products);
  const addPurchase = useOmborStore((state) => state.addPurchase);
  const addProduct = useOmborStore((state) => state.addProduct);
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
    addPurchase({
      ismi: form.ismi || "Yangi xarid",
      sana: form.sana || "04.06.2026",
      ozgartirilganSana: form.ozgartirilganSana || "04.06.2026",
      masul: form.masul || "Mas'ul shaxs",
      yetkazibBeruvchi: form.yetkazibBeruvchi || "Yetkazib beruvchi",
      summa: Number(form.summa) || 0,
      ombor: form.ombor || "Ombor nomi",
    });
    setForm(emptyForm());
    setIsModalOpen(false);
  }

  return (
    <div className="min-h-[calc(100vh-190px)] rounded-2xl bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => setIsModalOpen(true)}
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
                {filteredPurchases.map((purchase) => (
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
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-14 text-center text-sm text-gray-400">
          Xujatlar hozircha mavjud emas
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Yangi xarid</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:text-orange-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["ismi", "Ismi"],
                ["sana", "Sana"],
                ["ozgartirilganSana", "O'zgartirilgan sana"],
                ["masul", "Mas'ul shaxs"],
                ["yetkazibBeruvchi", "Yetkazib beruvchi"],
                ["ombor", "Ombor"],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-gray-500">
                  {label}
                  <input
                    value={String(form[key as keyof Omit<Purchase, "id">])}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-orange-300"
                  />
                </label>
              ))}

              <label className="text-xs font-bold text-gray-500">
                Summa
                <input
                  type="number"
                  value={form.summa || ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, summa: Number(event.target.value) }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-orange-300"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                onClick={createPurchase}
                className="h-10 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPurchase &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-[2px]" />

            <section className="scrollbar-hidden fixed bottom-3 left-3 right-3 top-3 z-[9999] overflow-y-auto rounded-[28px] bg-[#D8D8D8] p-3 shadow-2xl sm:bottom-5 sm:left-5 sm:right-5 sm:top-5 sm:p-5 lg:bottom-6 lg:left-[120px] lg:right-6 lg:top-6 2xl:left-[140px]">
            <div className="mb-4 flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <p className="text-xs font-medium text-gray-500 sm:text-sm">Xarid spisok ichi</p>
                <h2 className="mt-0.5 text-2xl font-bold text-gray-950 sm:text-3xl">
                  {selectedPurchase.ismi}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsPaid(false)}
                  className="h-10 rounded-xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:text-orange-600"
                >
                  To'lovga qaytish
                </button>

                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className="h-10 rounded-xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition hover:border-orange-300"
                >
                  <option>Hujjatlar</option>
                  <option>Chek</option>
                  <option>Nakladnoy</option>
                  <option>PDF</option>
                </select>

                <button
                  onClick={closeDetail}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                  aria-label="Yopish"
                >
                  <X size={23} />
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                {detailTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={[
                      "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
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
                <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition hover:bg-orange-500 hover:text-white">
                  <Settings size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1">
              {detailTab === "Asosiyisi" && (
                <div className="grid items-start gap-4 xl:grid-cols-[330px_minmax(0,1fr)] 2xl:grid-cols-[350px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
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
                          "mb-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition",
                          isPaid ? "bg-green-700" : "bg-green-600 hover:bg-green-700",
                        ].join(" ")}
                      >
                        {isPaid ? "To'lov qabul qilindi" : "To'lov qabul qilish"}
                      </button>

                      <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                        <p className="font-bold text-gray-800">To'lov va yetkazib berish</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Xarid to'lovi, yetkazib beruvchi va ombor holati haqida ma'lumot.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {[
                          ["Yetkazib beruvchi", selectedPurchase.yetkazibBeruvchi],
                          ["Ombor", selectedPurchase.ombor],
                          ["Sana", selectedPurchase.sana],
                          ["Mas'ul shaxs", selectedPurchase.masul],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-sm text-gray-500">{label}</p>
                            <div className="mt-1.5 rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-800">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
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

                  <main className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {activityTabs.map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActivityTab(tab)}
                            className={[
                              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
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
                        className="h-11 min-w-0 flex-1 rounded-xl border border-gray-100 bg-white px-4 text-sm text-gray-700 outline-none"
                      >
                        <option>Nima qilish kerak</option>
                        <option>Qo'ng'iroq qilish</option>
                        <option>Hujjat tekshirish</option>
                        <option>Yetkazib beruvchiga yozish</option>
                      </select>
                      <button
                        onClick={addActivity}
                        className="h-11 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600"
                      >
                        Qo'shish
                      </button>
                    </div>

                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="rounded-full border border-green-300 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-600">
                        Bugun
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                      <button className="inline-flex h-9 items-center gap-2 rounded-full bg-gray-50 px-3.5 text-sm font-semibold text-gray-500">
                        Filtr
                        <Filter size={14} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <article
                          key={comment.id}
                          className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                            <MessageSquare size={19} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-700">
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
                <div className="rounded-2xl bg-[#D8D8D8]">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        onClick={addPurchaseProduct}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
                      >
                        <Plus size={16} />
                        Mahsulot qo'shish
                      </button>

                      <div className="flex h-10 w-full items-center gap-2 rounded-lg bg-white px-3 sm:w-[340px] lg:w-[420px]">
                        <input
                          value={productSearch}
                          onChange={(event) => setProductSearch(event.target.value)}
                          placeholder="Qidirish"
                          className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                        />
                        <Search size={18} className="text-gray-300" />
                      </div>
                    </div>

                    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-gray-500 transition hover:text-orange-600">
                      Filtr
                      <Filter size={15} />
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl bg-white">
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
                          {filteredProducts.map((product) => (
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
