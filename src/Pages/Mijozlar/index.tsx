import { useMemo, useState } from "react";
import {
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Square,
  UserRound,
  X,
} from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import {
  useMijozlarStore,
  type Customer,
  type CustomerKind,
} from "@/store/mijozlarStore";

type CustomerTab = {
  id: CustomerKind;
  label: string;
};

const customerTabs: CustomerTab[] = [
  { id: "mijoz", label: "Mijoz" },
  { id: "kompaniya", label: "Kompaniya" },
  { id: "yetkazib", label: "Yetkazib beruvchi" },
];

function emptyForm(kind: CustomerKind): Omit<Customer, "id"> {
  return {
    kind,
    kontakt: "",
    telefon: "",
    dela: "",
    masul: "",
    yaratilganSana: "",
  };
}

export default function Mijozlar() {
  const customers = useMijozlarStore((state) => state.customers);
  const addCustomer = useMijozlarStore((state) => state.addCustomer);
  const updateCustomer = useMijozlarStore((state) => state.updateCustomer);
  const removeCustomers = useMijozlarStore((state) => state.removeCustomers);
  const [activeTab, setActiveTab] = useState<CustomerKind>("mijoz");
  const [search, setSearch] = useState("");
  const [onlyWithTask, setOnlyWithTask] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [form, setForm] = useState(() => emptyForm("mijoz"));
  const [page, setPage] = useState(1);

  const filteredCustomers = useMemo(() => {
    const value = search.toLowerCase().trim();

    return customers.filter((customer) => {
      const matchesTab = customer.kind === activeTab;
      const matchesTask = !onlyWithTask || customer.dela.trim().length > 0;
      const matchesSearch =
        !value ||
        [
          customer.kontakt,
          customer.telefon,
          customer.dela,
          customer.masul,
          customer.yaratilganSana,
        ]
          .join(" ")
          .toLowerCase()
          .includes(value);

      return matchesTab && matchesTask && matchesSearch;
    });
  }, [activeTab, customers, onlyWithTask, search]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredCustomers.length / 10)));
  const paginatedCustomers = filteredCustomers.slice((safePage - 1) * 10, safePage * 10);

  function openCreateModal() {
    setEditingCustomerId(null);
    setForm(emptyForm(activeTab));
    setIsModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomerId(customer.id);
    setForm({
      kind: customer.kind,
      kontakt: customer.kontakt,
      telefon: customer.telefon,
      dela: customer.dela,
      masul: customer.masul,
      yaratilganSana: customer.yaratilganSana,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setEditingCustomerId(null);
    setForm(emptyForm(activeTab));
    setIsModalOpen(false);
  }

  function saveCustomer() {
    const nextCustomer = {
      kind: form.kind,
      kontakt: form.kontakt || "Yangi mijoz",
      telefon: form.telefon || "+998 90 000 00 00",
      dela: form.dela || "Bog'lanish kerak",
      masul: form.masul || "Mas'ul shaxs",
      yaratilganSana: form.yaratilganSana || "05.06.2026",
    };

    if (editingCustomerId) updateCustomer(editingCustomerId, nextCustomer);
    else addCustomer(nextCustomer);

    closeModal();
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    removeCustomers(selectedIds);
    setSelectedIds([]);
  }

  const selectedCustomer = customers.find((customer) => customer.id === selectedIds[0]);

  return (
    <div className="min-h-[calc(100vh-190px)] rounded-2xl bg-white">
      <div className="flex flex-col gap-5 border-b border-gray-100 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6 overflow-x-auto">
            {customerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedIds([]);
                  setPage(1);
                }}
                className={[
                  "shrink-0 pb-2 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "border-b-2 border-orange-500 text-orange-600"
                    : "text-gray-500 hover:text-orange-600",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
            {filteredCustomers.length} ta
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
            >
              <Plus size={16} />
              Qo'shish
            </button>

            <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 sm:w-[360px] lg:w-[430px]">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Qidirish"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              <Search size={18} className="text-gray-300" />
            </div>
          </div>

          <button
            onClick={() => setOnlyWithTask((prev) => !prev)}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold shadow-sm transition",
              onlyWithTask
                ? "bg-orange-600 text-white shadow-orange-200"
                : "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600",
            ].join(" ")}
          >
            Filtr
            <Filter size={15} />
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Dela</th>
                <th className="px-4 py-3">Mas'ul shaxs</th>
                <th className="px-4 py-3">Yaratilgan sana</th>
                <th className="w-28 px-4 py-3">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="transition hover:bg-orange-50/40">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleSelect(customer.id)}
                      className={[
                        "flex h-4 w-4 items-center justify-center rounded border transition",
                        selectedIds.includes(customer.id)
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-gray-300 bg-white text-transparent",
                      ].join(" ")}
                      aria-label="Tanlash"
                    >
                      <Square size={8} fill="currentColor" />
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                        <UserRound size={17} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{customer.kontakt}</p>
                        <p className="text-xs text-gray-400">{customer.telefon}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">{customer.dela}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                    {customer.masul}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">{customer.yaratilganSana}</td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => openEditModal(customer)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      <MoreHorizontal size={16} />
                      Tahrirlash
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    Hozircha mijoz yo'q. Qo'shish tugmasi orqali birinchi mijozni kiriting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={safePage}
          totalItems={filteredCustomers.length}
          onPageChange={setPage}
        />

        <div className="grid gap-3 border-t border-gray-100 bg-white px-4 py-3 text-sm text-gray-600 lg:grid-cols-[170px_1fr_auto] lg:items-center">
          <div>Belgilangan: {selectedIds.length}/{filteredCustomers.length}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
              className="h-9 rounded-lg px-3 font-semibold transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              x O'chirish
            </button>
            <button
              onClick={() => selectedCustomer && openEditModal(selectedCustomer)}
              disabled={selectedIds.length !== 1}
              className="h-9 rounded-lg px-3 font-semibold transition hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Tahrirlash
            </button>
            <button className="h-9 rounded-lg border border-gray-100 px-4 font-semibold transition hover:border-orange-200 hover:text-orange-600">
              Qo'ng'iroq qilish
            </button>
            <button className="h-9 rounded-lg border border-gray-100 px-4 font-semibold transition hover:border-green-200 hover:text-green-600">
              Whatsappdan yozish
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-200" />
            Barchasi uchun
          </label>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCustomerId ? "Mijozni tahrirlash" : "Yangi mijoz"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition hover:text-orange-600"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-gray-500">
                Turi
                <select
                  value={form.kind}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, kind: event.target.value as CustomerKind }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-orange-300"
                >
                  {customerTabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </label>

              {[
                ["kontakt", "Kontakt"],
                ["telefon", "Telefon"],
                ["dela", "Dela"],
                ["masul", "Mas'ul shaxs"],
                ["yaratilganSana", "Yaratilgan sana"],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-gray-500">
                  {label}
                  <input
                    value={String(form[key as keyof Omit<Customer, "id">])}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-orange-300"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                onClick={saveCustomer}
                className="h-10 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                {editingCustomerId ? "Yangilash" : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
