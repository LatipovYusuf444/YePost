import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  Bell,
  Camera,
  Check,
  Edit3,
  Filter,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Settings,
  Square,
  Trash2,
  Upload,
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

type DetailActivityTab = "Vazifa" | "Kommentariya" | "Habarnoma" | "Qo'shimcha";

const customerTabs: CustomerTab[] = [
  { id: "mijoz", label: "Mijoz" },
  { id: "kompaniya", label: "Kompaniya" },
  { id: "yetkazib", label: "Yetkazib beruvchi" },
];

const hashToCustomerKind: Record<string, CustomerKind> = {
  kompaniya: "kompaniya",
  "yetkazib-beruvchi": "yetkazib",
};

const statusOptions = ["Faol", "Kutilmoqda", "Qayta bog'lanish", "Bloklangan"];
const sourceOptions = ["Do'kon", "Telegram", "Instagram", "Tavsiya", "Telefon"];
const paymentOptions = ["Naqd", "Karta", "Click", "Payme", "Bank o'tkazmasi"];
const detailTabs = ["Umumiy", "Bitimlar", "Takliflar", "Aloqalar", "Tarix", "Hisoblar"];
const detailActivityTabs: DetailActivityTab[] = [
  "Vazifa",
  "Kommentariya",
  "Habarnoma",
  "Qo'shimcha",
];

function getCustomerKindLabel(kind: CustomerKind) {
  return customerTabs.find((tab) => tab.id === kind)?.label ?? "Mijoz";
}

function formatSumma(value: number) {
  return `${value.toLocaleString("ru-RU")} so'm`;
}

function getCustomerStats(customer: Customer) {
  const fallbackSumma =
    ((customer.id % 97) + customer.kontakt.length + customer.telefon.length) * 125_000;

  return {
    summa: customer.summa ?? fallbackSumma,
    savdolarSoni: customer.savdolarSoni ?? Math.max(1, (customer.id % 8) + 1),
  };
}

function emptyForm(kind: CustomerKind): Omit<Customer, "id"> {
  return {
    kind,
    kontakt: "",
    telefon: "",
    dela: "",
    masul: "",
    yaratilganSana: "",
    avatar: "",
    status: "Faol",
    manba: "Do'kon",
    tolovTuri: "Naqd",
    manzil: "",
    izoh: "",
    summa: 0,
    savdolarSoni: 1,
  };
}

export default function Mijozlar() {
  const { hash } = useLocation();
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
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState("Umumiy");
  const [detailActivityTab, setDetailActivityTab] = useState<DetailActivityTab>("Vazifa");
  const [detailAction, setDetailAction] = useState("Nima qilish kerak");
  const [form, setForm] = useState(() => emptyForm("mijoz"));
  const [page, setPage] = useState(1);

  useEffect(() => {
    const nextTab = hashToCustomerKind[hash.replace("#", "")] ?? "mijoz";

    setActiveTab(nextTab);
    setSelectedIds([]);
    setPage(1);
  }, [hash]);

  useEffect(() => {
    if (isModalOpen || detailCustomer) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [detailCustomer, isModalOpen]);

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
          customer.status,
          customer.manba,
          customer.tolovTuri,
          customer.manzil,
          customer.izoh,
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
      avatar: customer.avatar || "",
      status: customer.status || "Faol",
      manba: customer.manba || "Do'kon",
      tolovTuri: customer.tolovTuri || "Naqd",
      manzil: customer.manzil || "",
      izoh: customer.izoh || "",
      summa: customer.summa ?? getCustomerStats(customer).summa,
      savdolarSoni: customer.savdolarSoni ?? getCustomerStats(customer).savdolarSoni,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setEditingCustomerId(null);
    setForm(emptyForm(activeTab));
    setIsModalOpen(false);
  }

  function saveCustomer() {
    const generatedSumma =
      ((Date.now() % 97) + (form.kontakt || "Yangi mijoz").length + form.telefon.length) *
      125_000;

    const nextCustomer = {
      kind: form.kind,
      kontakt: form.kontakt || "Yangi mijoz",
      telefon: form.telefon || "+998 90 000 00 00",
      dela: form.dela || "Bog'lanish kerak",
      masul: form.masul || "Mas'ul shaxs",
      yaratilganSana: form.yaratilganSana || new Date().toLocaleDateString("ru-RU"),
      avatar: form.avatar,
      status: form.status || "Faol",
      manba: form.manba || "Do'kon",
      tolovTuri: form.tolovTuri || "Naqd",
      manzil: form.manzil,
      izoh: form.izoh,
      summa: form.summa && form.summa > 0 ? form.summa : generatedSumma,
      savdolarSoni: form.savdolarSoni && form.savdolarSoni > 0 ? form.savdolarSoni : 1,
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

  function deleteCustomer(customerId: number) {
    removeCustomers([customerId]);
    setSelectedIds((prev) => prev.filter((id) => id !== customerId));
    if (detailCustomer?.id === customerId) setDetailCustomer(null);
  }

  function openDetailModal(customer: Customer) {
    setDetailCustomer(customer);
    setDetailTab("Umumiy");
    setDetailActivityTab("Vazifa");
    setDetailAction("Nima qilish kerak");
  }

  function closeDetailModal() {
    setDetailCustomer(null);
    setDetailTab("Umumiy");
    setDetailActivityTab("Vazifa");
  }

  function handleAvatarChange(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setForm((prev) => ({ ...prev, avatar: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  const selectedCustomer = customers.find((customer) => customer.id === selectedIds[0]);
  const activeDetailCustomer = detailCustomer
    ? customers.find((customer) => customer.id === detailCustomer.id) ?? detailCustomer
    : null;
  const activeDetailStats = activeDetailCustomer ? getCustomerStats(activeDetailCustomer) : null;

  return (
    <div className="min-h-[calc(100vh-190px)] rounded-2xl bg-white">
      <div className="flex flex-col gap-5 border-b border-gray-100 pb-5">
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

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
              {filteredCustomers.length} ta
            </span>
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
                <tr
                  key={customer.id}
                  onClick={() => openDetailModal(customer)}
                  className="cursor-pointer transition hover:bg-orange-50/40"
                >
                  <td className="px-4 py-4">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSelect(customer.id);
                      }}
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
                      {customer.avatar ? (
                        <img
                          src={customer.avatar}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-orange-50"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                          <UserRound size={17} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-800">{customer.kontakt}</p>
                        <p className="text-xs text-gray-400">
                          {customer.telefon} - {customer.status || "Faol"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">{customer.dela}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                    {customer.masul}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">{customer.yaratilganSana}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(customer);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                      >
                        Tahrirlash
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteCustomer(customer.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                        aria-label="O'chirish"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 font-semibold transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={15} />
              O'chirish
            </button>
            <button
              onClick={() => selectedCustomer && openEditModal(selectedCustomer)}
              disabled={selectedIds.length !== 1}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 font-semibold transition hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Edit3 size={15} />
              Tahrirlash
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-100 px-4 font-semibold transition hover:border-orange-200 hover:text-orange-600">
              <Phone size={15} />
              Qo'ng'iroq qilish
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-100 px-4 font-semibold transition hover:border-green-200 hover:text-green-600">
              <MessageCircle size={15} />
              Whatsappdan yozish
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-200" />
            Barchasi uchun
          </label>
        </div>
      </div>

      {activeDetailCustomer &&
        activeDetailStats &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-[2px]" />

            <section className="scrollbar-hidden fixed bottom-4 left-4 right-4 top-4 z-[9999] overflow-y-auto rounded-[34px] bg-[#D8D8D8] p-5 shadow-2xl sm:bottom-6 sm:left-6 sm:right-6 sm:top-6 lg:bottom-[32px] lg:left-[120px] lg:right-[32px] lg:top-[32px] lg:p-6 2xl:left-[140px]">
              <div className="mb-7 flex flex-col items-start justify-between gap-5 xl:flex-row">
                <div className="flex items-center gap-4">
                  {activeDetailCustomer.avatar ? (
                    <img
                      src={activeDetailCustomer.avatar}
                      alt=""
                      className="h-[72px] w-[72px] rounded-3xl object-cover ring-4 ring-white/70"
                    />
                  ) : (
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-white text-orange-500 shadow-sm">
                      <UserRound size={30} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Mijozlar spisok ichi
                    </p>
                    <h2 className="mt-1 text-4xl font-bold text-gray-950">
                      {activeDetailCustomer.kontakt}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-700 transition hover:bg-orange-500 hover:text-white">
                    <Phone size={18} />
                  </button>
                  <button
                    onClick={() => {
                      closeDetailModal();
                      openEditModal(activeDetailCustomer);
                    }}
                    className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:text-orange-600"
                  >
                    Tahrirlash
                  </button>
                  <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-700 transition hover:bg-orange-500 hover:text-white">
                    <Settings size={18} />
                  </button>
                  <button
                    onClick={closeDetailModal}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A00] text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                    aria-label="Yopish"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-orange-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {detailTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={[
                        "rounded-full px-4 py-2 text-sm font-semibold transition",
                        detailTab === tab
                          ? "border border-orange-400 bg-orange-50 text-[#FF5A00]"
                          : "text-gray-500 hover:bg-orange-50 hover:text-[#FF5A00]",
                      ].join(" ")}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-600">
                  {activeDetailCustomer.status || "Faol"}
                </span>
              </div>

              <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[460px_minmax(0,1fr)] 2xl:grid-cols-[500px_minmax(0,1fr)]">
                <aside className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-lg font-bold text-gray-950">Kontakt haqida</h3>
                    <button
                      onClick={() => {
                        closeDetailModal();
                        openEditModal(activeDetailCustomer);
                      }}
                      className="text-sm font-semibold text-gray-400 transition hover:text-[#FF5A00]"
                    >
                      Tahrirlash
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Kontakt</p>
                      <p className="mt-1 text-lg font-bold text-gray-950">
                        {activeDetailCustomer.kontakt}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <a
                        href={`tel:${activeDetailCustomer.telefon}`}
                        className="mt-1 block text-sm font-bold text-blue-600 underline-offset-2 hover:underline"
                      >
                        {activeDetailCustomer.telefon}
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-orange-50 px-3 py-2.5">
                        <p className="text-xs font-bold text-orange-500">Jami summa</p>
                        <p className="mt-1 text-sm font-black text-gray-950">
                          {formatSumma(activeDetailStats.summa)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
                        <p className="text-xs font-bold text-gray-400">Savdolar</p>
                        <p className="mt-1 text-sm font-black text-gray-950">
                          {activeDetailStats.savdolarSoni} ta
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-400">
                      <button className="rounded-xl bg-gray-50 px-3 py-2 text-center transition hover:text-orange-600">
                        Maydon tanlash
                      </button>
                      <button className="rounded-xl bg-gray-50 px-3 py-2 text-center transition hover:text-orange-600">
                        Maydon yaratish
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-gray-100 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-gray-800">Qo'shimcha ma'lumot</h3>
                      <button
                        onClick={() => {
                          closeDetailModal();
                          openEditModal(activeDetailCustomer);
                        }}
                        className="text-xs font-bold text-gray-400 transition hover:text-orange-600"
                      >
                        Tahrirlash
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      {[
                        ["Kontakt", activeDetailCustomer.kontakt],
                        ["Kontakt turi", getCustomerKindLabel(activeDetailCustomer.kind)],
                        ["Manba", activeDetailCustomer.manba || "Do'kon"],
                        ["To'lov turi", activeDetailCustomer.tolovTuri || "Naqd"],
                        ["Jami summa", formatSumma(activeDetailStats.summa)],
                        ["Savdolar soni", `${activeDetailStats.savdolarSoni} ta`],
                        ["Barchasi uchun ochiq", "Ha"],
                        ["Yaratilgan sana", activeDetailCustomer.yaratilganSana],
                        ["Manzil", activeDetailCustomer.manzil || "Kiritilmagan"],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <p className="text-gray-400">{label}</p>
                          <p className="truncate font-bold text-gray-800">{value}</p>
                        </div>
                      ))}

                      <div className="col-span-2">
                        <p className="text-gray-400">Mas'ul shaxs</p>
                        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 font-bold text-blue-600">
                          <UserRound size={17} className="text-gray-400" />
                          {activeDetailCustomer.masul}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <p className="text-gray-400">Izoh</p>
                        <p className="font-semibold text-gray-700">
                          {activeDetailCustomer.izoh || "Izoh kiritilmagan"}
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                <main className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {detailActivityTabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDetailActivityTab(tab)}
                          className={[
                            "rounded-full px-4 py-2 text-sm font-semibold transition",
                            detailActivityTab === tab
                              ? "border border-orange-400 bg-orange-50 text-[#FF5A00]"
                              : "text-gray-600 hover:bg-orange-50 hover:text-[#FF5A00]",
                          ].join(" ")}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      value={detailAction}
                      onChange={(event) => setDetailAction(event.target.value)}
                      className="h-12 flex-1 rounded-2xl border border-gray-100 px-4 text-gray-700 outline-none"
                    >
                      <option>Nima qilish kerak</option>
                      <option>Qo'ng'iroq qilish</option>
                      <option>Whatsappdan yozish</option>
                      <option>To'lovni eslatish</option>
                    </select>

                    <button className="rounded-2xl bg-[#FF5A00] px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
                      Qo'shish
                    </button>
                  </div>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="rounded-full border border-green-300 bg-green-50 px-5 py-1.5 text-sm font-medium text-green-600">
                      Bugun
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        title: "Vazifa",
                        time: "18:37",
                        text: activeDetailCustomer.dela || "Mijoz bilan bog'lanish kerak.",
                        icon: Check,
                        color: "bg-yellow-400",
                      },
                      {
                        title: "Kommentariya",
                        time: "14:00",
                        text: `${activeDetailCustomer.kontakt} bilan ${formatSumma(
                          activeDetailStats.summa
                        )} savdo bo'yicha izoh qoldirildi.`,
                        icon: MessageCircle,
                        color: "bg-blue-600",
                      },
                      {
                        title: "Habarnoma",
                        time: "12:24",
                        text: `${activeDetailCustomer.status || "Faol"} statusidagi kontakt. Telefon: ${activeDetailCustomer.telefon}.`,
                        icon: Bell,
                        color: "bg-green-500",
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <article
                          key={item.title}
                          className="flex gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
                        >
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${item.color}`}
                          >
                            <Icon size={22} />
                          </div>

                          <div>
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
            </section>
          </>,
          document.body
        )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm sm:px-6 lg:pl-[120px]">
          <div className="flex h-[min(840px,calc(100dvh-48px))] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingCustomerId ? "Mijozni tahrirlash" : "Yangi mijoz"}
                </h2>
                <p className="text-sm text-gray-400">
                  Kontakt, rasm va savdo ma'lumotlarini kiriting
                </p>
              </div>
              <button
                onClick={closeModal}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-orange-500 hover:text-white"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                <div className="rounded-[24px] border border-orange-100 bg-orange-50/50 p-5 xl:min-h-[460px]">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white text-orange-500 shadow-sm">
                    {form.avatar ? (
                      <img src={form.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Camera size={34} />
                    )}
                  </div>
                  <label className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-500 hover:text-white">
                    <Upload size={16} />
                    Rasm qo'shish
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  {form.avatar && (
                    <button
                      onClick={() => setForm((prev) => ({ ...prev, avatar: "" }))}
                      className="mt-2 h-9 w-full rounded-lg text-sm font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-500"
                    >
                      Rasmni o'chirish
                    </button>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="text-xs font-bold text-gray-500">
                    Turi
                    <select
                      value={form.kind}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, kind: event.target.value as CustomerKind }))
                      }
                      className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-orange-300"
                    >
                      {customerTabs.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                          {tab.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-bold text-gray-500">
                    Status
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                      className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-orange-300"
                    >
                      {statusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  {[
                    ["kontakt", "Kontakt"],
                    ["telefon", "Telefon"],
                    ["dela", "Dela"],
                    ["masul", "Mas'ul shaxs"],
                    ["yaratilganSana", "Yaratilgan sana"],
                    ["manzil", "Manzil"],
                  ].map(([key, label]) => (
                    <label key={key} className="text-xs font-bold text-gray-500">
                      {label}
                      <input
                        value={String(form[key as keyof Omit<Customer, "id">] || "")}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                        className="mt-1 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none focus:border-orange-300"
                      />
                    </label>
                  ))}

                  <label className="text-xs font-bold text-gray-500">
                    Manba
                    <select
                      value={form.manba}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, manba: event.target.value }))
                      }
                      className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-orange-300"
                    >
                      {sourceOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-bold text-gray-500">
                    To'lov turi
                    <select
                      value={form.tolovTuri}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, tolovTuri: event.target.value }))
                      }
                      className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-orange-300"
                    >
                      {paymentOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-bold text-gray-500 md:col-span-2">
                    Izoh
                    <textarea
                      value={form.izoh || ""}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, izoh: event.target.value }))
                      }
                      className="mt-1 min-h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-300"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 bg-white px-6 py-5 sm:flex-row sm:justify-between">
              {editingCustomerId ? (
                <button
                  onClick={() => {
                    deleteCustomer(editingCustomerId);
                    closeModal();
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  O'chirish
                </button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={closeModal}
                className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                onClick={saveCustomer}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                <Check size={16} />
                {editingCustomerId ? "Yangilash" : "Saqlash"}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
