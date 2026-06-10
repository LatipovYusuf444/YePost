import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Plus,
  Search,
  Square,
  X,
} from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";

type TransferTab = "kirim" | "xujatlar";
type DateFilter = "all" | "today";

type Transfer = {
  id: number;
  ismi: string;
  sana: string;
  ozgartirilganSana: string;
  masul: string;
  qayerdan: string;
  summa: number;
  qayerga: string;
};

const todayDate = "05.06.2026";

const demoTransfers: Transfer[] = [
  {
    id: 1,
    ismi: "Ali Ashurmatov",
    sana: "20.11.2025",
    ozgartirilganSana: "14.04.2026",
    masul: "Dilorom Kosimova",
    qayerdan: "Xasanboy",
    summa: 150000,
    qayerga: "Xasanboy",
  },
  {
    id: 2,
    ismi: "Sardor Textile",
    sana: "21.11.2025",
    ozgartirilganSana: "15.04.2026",
    masul: "Javohir Karimov",
    qayerdan: "Asosiy ombor",
    summa: 820000,
    qayerga: "Filial ombor",
  },
  {
    id: 3,
    ismi: "Madina Market",
    sana: "22.11.2025",
    ozgartirilganSana: "16.04.2026",
    masul: "Sevara Azimova",
    qayerdan: "Zaxira ombor",
    summa: 430000,
    qayerga: "Asosiy ombor",
  },
  {
    id: 4,
    ismi: "Ali Ashurmatov",
    sana: "24.11.2025",
    ozgartirilganSana: "18.04.2026",
    masul: "Dilorom Kosimova",
    qayerdan: "Xasanboy",
    summa: 150000,
    qayerga: "Xasanboy",
  },
  {
    id: 5,
    ismi: "Bekzod Optom",
    sana: "25.11.2025",
    ozgartirilganSana: "20.04.2026",
    masul: "Akmal Mirzaev",
    qayerdan: "Filial ombor",
    summa: 1250000,
    qayerga: "Zaxira ombor",
  },
  {
    id: 6,
    ismi: "Ali Ashurmatov",
    sana: "26.11.2025",
    ozgartirilganSana: "21.04.2026",
    masul: "Dilorom Kosimova",
    qayerdan: "Xasanboy",
    summa: 150000,
    qayerga: "Xasanboy",
  },
  {
    id: 7,
    ismi: "Madina Market",
    sana: todayDate,
    ozgartirilganSana: todayDate,
    masul: "Sevara Azimova",
    qayerdan: "Asosiy ombor",
    summa: 430000,
    qayerga: "Filial ombor",
  },
  {
    id: 8,
    ismi: "Ali Ashurmatov",
    sana: "28.11.2025",
    ozgartirilganSana: "23.04.2026",
    masul: "Dilorom Kosimova",
    qayerdan: "Xasanboy",
    summa: 150000,
    qayerga: "Asosiy ombor",
  },
  {
    id: 9,
    ismi: "Bekzod Optom",
    sana: "29.11.2025",
    ozgartirilganSana: "24.04.2026",
    masul: "Akmal Mirzaev",
    qayerdan: "Zaxira ombor",
    summa: 1250000,
    qayerga: "Filial ombor",
  },
  {
    id: 10,
    ismi: "Sardor Textile",
    sana: "30.11.2025",
    ozgartirilganSana: "25.04.2026",
    masul: "Javohir Karimov",
    qayerdan: "Asosiy ombor",
    summa: 820000,
    qayerga: "Zaxira ombor",
  },
  {
    id: 11,
    ismi: "Madina Market",
    sana: "01.12.2025",
    ozgartirilganSana: "26.04.2026",
    masul: "Sevara Azimova",
    qayerdan: "Filial ombor",
    summa: 430000,
    qayerga: "Asosiy ombor",
  },
  {
    id: 12,
    ismi: "Ali Ashurmatov",
    sana: todayDate,
    ozgartirilganSana: todayDate,
    masul: "Dilorom Kosimova",
    qayerdan: "Xasanboy",
    summa: 150000,
    qayerga: "Filial ombor",
  },
];

function formatSumma(value: number) {
  return `${value.toLocaleString("ru-RU")} uzs`;
}

function emptyTransfer(): Omit<Transfer, "id"> {
  return {
    ismi: "",
    sana: "",
    ozgartirilganSana: "",
    masul: "",
    qayerdan: "",
    summa: 0,
    qayerga: "",
  };
}

export default function Kochirishlar() {
  const [transfers, setTransfers] = useState(demoTransfers);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TransferTab>("kirim");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransferId, setEditingTransferId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyTransfer);

  const filteredTransfers = useMemo(() => {
    const value = search.toLowerCase().trim();

    return transfers.filter((transfer) => {
      const matchesDate = dateFilter === "all" || transfer.sana === todayDate;
      const matchesSearch =
        !value ||
        [
          transfer.ismi,
          transfer.sana,
          transfer.ozgartirilganSana,
          transfer.masul,
          transfer.qayerdan,
          transfer.qayerga,
          formatSumma(transfer.summa),
        ]
          .join(" ")
          .toLowerCase()
          .includes(value);

      return matchesDate && matchesSearch;
    });
  }, [dateFilter, search, transfers]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredTransfers.length / 10)));
  const paginatedTransfers = filteredTransfers.slice((safePage - 1) * 10, safePage * 10);

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function openCreateModal() {
    setEditingTransferId(null);
    setForm(emptyTransfer());
    setIsModalOpen(true);
  }

  function openEditModal(transfer: Transfer) {
    setEditingTransferId(transfer.id);
    setForm({
      ismi: transfer.ismi,
      sana: transfer.sana,
      ozgartirilganSana: transfer.ozgartirilganSana,
      masul: transfer.masul,
      qayerdan: transfer.qayerdan,
      summa: transfer.summa,
      qayerga: transfer.qayerga,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setEditingTransferId(null);
    setForm(emptyTransfer());
    setIsModalOpen(false);
  }

  function saveTransfer() {
    const nextTransfer = {
      ismi: form.ismi || "Yangi ko'chirish",
      sana: form.sana || todayDate,
      ozgartirilganSana: form.ozgartirilganSana || todayDate,
      masul: form.masul || "Mas'ul shaxs",
      qayerdan: form.qayerdan || "Asosiy ombor",
      summa: Number(form.summa) || 150000,
      qayerga: form.qayerga || "Filial ombor",
    };

    if (editingTransferId) {
      setTransfers((prev) =>
        prev.map((transfer) =>
          transfer.id === editingTransferId ? { ...nextTransfer, id: editingTransferId } : transfer
        )
      );
    } else {
      setTransfers((prev) => [{ ...nextTransfer, id: Date.now() }, ...prev]);
    }

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
          Ko'chirishlar
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
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-orange-500">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3">Ismi</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">O'zgartirilgan sana</th>
                  <th className="px-4 py-3">Mas'ul shaxs</th>
                  <th className="px-4 py-3">Qayerdan</th>
                  <th className="px-4 py-3">Summa</th>
                  <th className="px-4 py-3">Qayerga</th>
                  <th className="w-28 px-4 py-3">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {paginatedTransfers.map((transfer) => (
                  <tr key={transfer.id} className="transition hover:bg-orange-50/40">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleSelect(transfer.id)}
                        className={[
                          "flex h-4 w-4 items-center justify-center rounded border transition",
                          selectedIds.includes(transfer.id)
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-gray-300 bg-white text-transparent",
                        ].join(" ")}
                        aria-label="Tanlash"
                      >
                        <Square size={8} fill="currentColor" />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {transfer.ismi}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{transfer.sana}</td>
                    <td className="whitespace-nowrap px-4 py-4">{transfer.ozgartirilganSana}</td>
                    <td className="whitespace-nowrap px-4 py-4">{transfer.masul}</td>
                    <td className="whitespace-nowrap px-4 py-4">{transfer.qayerdan}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatSumma(transfer.summa)}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {transfer.qayerga}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openEditModal(transfer)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                      >
                        Tahrirlash
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      Ko'chirish topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={safePage}
            totalItems={filteredTransfers.length}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-14 text-center text-sm text-gray-400">
          Xujatlar demo holatda. Ko'chirishlar tanlanganda jadval ko'rinadi.
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          {selectedIds.length} ta ko'chirish tanlandi
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm lg:pl-[120px]">
          <div className="max-h-[calc(100dvh-48px)] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingTransferId ? "Ko'chirishni tahrirlash" : "Yangi ko'chirish"}
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
                ["qayerdan", "Qayerdan"],
                ["qayerga", "Qayerga"],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-gray-500">
                  {label}
                  <input
                    value={String(form[key as keyof Omit<Transfer, "id">])}
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
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none transition focus:border-orange-300"
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
                onClick={saveTransfer}
                className="h-10 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                {editingTransferId ? "Yangilash" : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
