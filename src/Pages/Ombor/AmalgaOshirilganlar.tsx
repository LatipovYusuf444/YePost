import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Plus,
  Search,
  Square,
  X,
} from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import { useOmborStore, type Purchase } from "@/store/omborStore";

type DoneTab = "kirim" | "xujatlar";
type DateFilter = "all" | "today";

const todayDate = "05.06.2026";

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

export default function AmalgaOshirilganlar() {
  const purchases = useOmborStore((state) => state.purchases);
  const addPurchase = useOmborStore((state) => state.addPurchase);
  const updatePurchase = useOmborStore((state) => state.updatePurchase);
  const ensureMinimumPurchases = useOmborStore((state) => state.ensureMinimumPurchases);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<DoneTab>("kirim");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    ensureMinimumPurchases(12);
  }, [ensureMinimumPurchases]);

  const completedRows = useMemo(
    () =>
      purchases.map((purchase, index) => ({
        ...purchase,
        status: index % 3 === 0 ? "Tasdiqlangan" : index % 3 === 1 ? "Qabul qilingan" : "Yopilgan",
        klient: purchase.yetkazibBeruvchi,
      })),
    [purchases]
  );

  const filteredRows = useMemo(() => {
    const value = search.toLowerCase().trim();

    return completedRows.filter((row) => {
      const matchesDate = dateFilter === "all" || row.sana === todayDate;
      const matchesSearch =
        !value ||
        [
          row.ismi,
          row.sana,
          row.ozgartirilganSana,
          row.masul,
          row.klient,
          row.ombor,
          row.status,
          formatSumma(row.summa),
        ]
          .join(" ")
          .toLowerCase()
          .includes(value);

      return matchesDate && matchesSearch;
    });
  }, [completedRows, dateFilter, search]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredRows.length / 10)));
  const paginatedRows = filteredRows.slice((safePage - 1) * 10, safePage * 10);

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function openCreateModal() {
    setEditingPurchaseId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  }

  function openEditModal(purchase: Purchase) {
    setEditingPurchaseId(purchase.id);
    setForm({
      ismi: purchase.ismi,
      sana: purchase.sana,
      ozgartirilganSana: purchase.ozgartirilganSana,
      masul: purchase.masul,
      yetkazibBeruvchi: purchase.yetkazibBeruvchi,
      summa: purchase.summa,
      ombor: purchase.ombor,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setEditingPurchaseId(null);
    setForm(emptyForm());
    setIsModalOpen(false);
  }

  function saveCompletedPurchase() {
    const nextPurchase = {
      ismi: form.ismi || "Yangi kirim",
      sana: form.sana || todayDate,
      ozgartirilganSana: form.ozgartirilganSana || todayDate,
      masul: form.masul || "Mas'ul shaxs",
      yetkazibBeruvchi: form.yetkazibBeruvchi || "Demo klient",
      summa: Number(form.summa) || 150000,
      ombor: form.ombor || "Asosiy ombor",
    };

    if (editingPurchaseId) updatePurchase(editingPurchaseId, nextPurchase);
    else addPurchase(nextPurchase);

    closeModal();
  }

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

        <div className="relative">
          <button
            onClick={() => setIsDateMenuOpen((prev) => !prev)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
          >
            <CalendarDays size={16} />
            {dateFilter === "today" ? "Bugun" : "Barchasi"}
            <ChevronDown size={15} />
          </button>
          {isDateMenuOpen && (
            <div className="absolute right-0 top-12 z-20 w-40 overflow-hidden rounded-xl border border-orange-100 bg-white p-1 shadow-xl">
              {[
                ["all", "Barchasi"],
                ["today", "Bugun"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setDateFilter(value as DateFilter);
                    setIsDateMenuOpen(false);
                  }}
                  className={[
                    "block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                    dateFilter === value
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-600 hover:bg-orange-50 hover:text-orange-600",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-7">
        <button
          onClick={() => setActiveTab("kirim")}
          className={[
            "text-base font-semibold transition",
            activeTab === "kirim" ? "text-gray-900" : "text-gray-400 hover:text-gray-700",
          ].join(" ")}
        >
          Amalga oshirilganlar
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

      {activeTab === "kirim" ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-orange-500">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3">Ismi</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">O'zgartirilgan sana</th>
                  <th className="px-4 py-3">Mas'ul shaxs</th>
                  <th className="px-4 py-3">Klient</th>
                  <th className="px-4 py-3">Summa</th>
                  <th className="px-4 py-3">Ombor</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="w-28 px-4 py-3">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-orange-50/40">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleSelect(row.id)}
                        className={[
                          "flex h-4 w-4 items-center justify-center rounded border transition",
                          selectedIds.includes(row.id)
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-gray-300 bg-white text-transparent",
                        ].join(" ")}
                        aria-label="Tanlash"
                      >
                        <Square size={8} fill="currentColor" />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {row.ismi}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{row.sana}</td>
                    <td className="whitespace-nowrap px-4 py-4">{row.ozgartirilganSana}</td>
                    <td className="whitespace-nowrap px-4 py-4">{row.masul}</td>
                    <td className="whitespace-nowrap px-4 py-4">{row.klient}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatSumma(row.summa)}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {row.ombor}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openEditModal(row)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                      >
                        Tahrirlash
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                      Amalga oshirilgan kirim topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={safePage}
            totalItems={filteredRows.length}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-14 text-center text-sm text-gray-400">
          Xujatlar demo holatda. Amalga oshirilganlar tanlanganda asosiy jadval ko'rinadi.
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          {selectedIds.length} ta hujjat tanlandi
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm lg:pl-[120px]">
          <div className="max-h-[calc(100dvh-48px)] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingPurchaseId ? "Amalga oshirilganni tahrirlash" : "Yangi amalga oshirilgan"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-orange-500 hover:text-white"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ["ismi", "Ismi"],
                ["sana", "Sana"],
                ["ozgartirilganSana", "O'zgartirilgan sana"],
                ["masul", "Mas'ul shaxs"],
                ["yetkazibBeruvchi", "Klient"],
                ["ombor", "Ombor"],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-gray-500">
                  {label}
                  <input
                    value={String(form[key as keyof Omit<Purchase, "id">])}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="mt-1 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300"
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
                  className="mt-1 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                onClick={saveCompletedPurchase}
                className="h-10 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                {editingPurchaseId ? "Yangilash" : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
