import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Filter,
  Plus,
  Printer,
  Search,
  Settings,
  X,
} from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import { useOmborStore, type PurchaseProduct } from "@/store/omborStore";

type ModalMode = "product" | "group";

type SavedGroup = {
  id: number;
  nomi: string;
  kodi: string;
};

type TableRow =
  | {
      type: "product";
      id: number;
      nomi: string;
      kodi: string;
      qoldiq: number;
      olchovBirligi: string;
      tanNarxi: number;
      sotishNarxi: number;
    }
  | {
      type: "group";
      id: number;
      nomi: string;
      kodi: string;
      qoldiq: string;
      olchovBirligi: string;
      tanNarxi: string;
      sotishNarxi: string;
    };

const defaultGroups: SavedGroup[] = [
  { id: 1, nomi: "Tovar va xizmatlar", kodi: "TVH" },
  { id: 2, nomi: "Parfumeriya", kodi: "PARF" },
];

const savedGroupsKey = "yepost-ombor-mahsulot-groups";

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

function emptyProductForm(): Omit<PurchaseProduct, "id"> & {
  malumot: string;
  guruh: string;
  davlat: string;
  ogirligi: string;
  hajmi: string;
  nds: string;
} {
  return {
    malumot: "",
    guruh: "",
    davlat: "",
    purchaseId: undefined,
    nomi: "",
    soni: 1,
    kodi: "",
    shtrixKodi: "",
    olchovBirligi: "dona",
    narxi: 150000,
    ogirligi: "",
    hajmi: "",
    nds: "",
  };
}

function emptyGroupForm() {
  return {
    malumot: "",
    guruh: "",
    davlat: "",
    artikul: "",
    kod: "",
    olchovBirligi: "dona",
    ogirligi: "",
    hajmi: "",
    nds: "",
    guruhNomi: "",
    guruhKodi: "",
  };
}

export default function OmborMahsulotlar() {
  const products = useOmborStore((state) => state.products);
  const addProduct = useOmborStore((state) => state.addProduct);
  const [search, setSearch] = useState("");
  const [activeGroupId, setActiveGroupId] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>("product");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [groups, setGroups] = useState<SavedGroup[]>(() => {
    try {
      const savedGroups = window.localStorage.getItem(savedGroupsKey);
      return savedGroups ? JSON.parse(savedGroups) : defaultGroups;
    } catch {
      return defaultGroups;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(savedGroupsKey, JSON.stringify(groups));
  }, [groups]);

  const filteredProducts = useMemo(() => {
    const value = search.toLowerCase().trim();
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
          formatSumma(product.narxi + 50000),
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
  }, [activeGroupId, onlyAvailable, products, search]);

  const filteredGroups = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (onlyAvailable || activeGroupId !== "all") return [];

    return groups.filter((group) =>
      !value || [group.nomi, group.kodi, "guruh"].join(" ").toLowerCase().includes(value)
    );
  }, [activeGroupId, groups, onlyAvailable, search]);

  const tableRows = useMemo<TableRow[]>(
    () => [
      ...filteredGroups.map((group) => ({
        type: "group" as const,
        id: group.id,
        nomi: group.nomi,
        kodi: group.kodi,
        qoldiq: "-",
        olchovBirligi: "guruh",
        tanNarxi: "-",
        sotishNarxi: "-",
      })),
      ...filteredProducts.map((product) => ({
        type: "product" as const,
        id: product.id,
        nomi: product.nomi,
        kodi: product.kodi,
        qoldiq: product.soni,
        olchovBirligi: product.olchovBirligi,
        tanNarxi: product.narxi,
        sotishNarxi: product.narxi + 50000,
      })),
    ],
    [filteredGroups, filteredProducts]
  );
  const safePage = Math.min(page, Math.max(1, Math.ceil(tableRows.length / 10)));
  const paginatedRows = tableRows.slice((safePage - 1) * 10, safePage * 10);

  function openProductModal() {
    setModalMode("product");
    setProductForm(emptyProductForm());
    setIsAddMenuOpen(false);
    setIsModalOpen(true);
  }

  function openGroupModal() {
    setModalMode("group");
    setGroupForm(emptyGroupForm());
    setIsAddMenuOpen(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setProductForm(emptyProductForm());
    setGroupForm(emptyGroupForm());
  }

  function saveProduct() {
    addProduct({
      purchaseId: productForm.purchaseId,
      nomi: productForm.nomi || productForm.malumot || "Yangi tovar",
      soni: Number(productForm.soni) || 1,
      kodi: productForm.kodi || "4282123",
      shtrixKodi: productForm.shtrixKodi || "981638",
      olchovBirligi: productForm.olchovBirligi || "dona",
      narxi: Number(productForm.narxi) || 150000,
    });
    closeModal();
  }

  function saveGroup() {
    setGroups((prev) => [
      {
        id: Date.now(),
        nomi: groupForm.guruhNomi || groupForm.guruh || "Yangi guruh",
        kodi: groupForm.guruhKodi || groupForm.kod || "GR",
      },
      ...prev,
    ]);
    closeModal();
  }

  function printProducts() {
    window.print();
  }

  return (
    <div className="relative min-h-[calc(100vh-190px)] rounded-2xl bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <button
              onClick={() => setIsAddMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600 sm:w-auto"
            >
              <Plus size={16} />
              Qo'shish
            </button>

            {isAddMenuOpen && (
              <div className="absolute left-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-orange-100 bg-white p-1 shadow-xl">
                <button
                  onClick={openProductModal}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-gray-700 transition hover:bg-orange-50 hover:text-orange-600"
                >
                  Mahsulot
                </button>
                <button
                  onClick={openGroupModal}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-gray-700 transition hover:bg-orange-50 hover:text-orange-600"
                >
                  Guruh
                </button>
              </div>
            )}
          </div>

          <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 sm:w-[360px] lg:w-[430px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Qidirish"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            <Search size={18} className="text-gray-300" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={printProducts}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
          >
            Chop etish
            <Printer size={15} />
          </button>
          <button
            onClick={() => setOnlyAvailable((prev) => !prev)}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold shadow-sm transition",
              onlyAvailable
                ? "bg-orange-600 text-white shadow-orange-200"
                : "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600",
            ].join(" ")}
          >
            Filtr
            <Filter size={15} />
          </button>
        </div>
      </div>

      <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[170px_minmax(0,1fr)]">
        <aside className="border-b border-gray-100 p-4 lg:border-b-0 lg:border-r">
          <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-3">
            {productGroups.map((group) => {
              const isActive = activeGroupId === group.id;

              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className={[
                    "shrink-0 rounded-lg px-3 py-2 text-left text-sm font-semibold transition lg:block lg:w-full",
                    isActive
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-700 hover:bg-orange-50 hover:text-orange-600",
                  ].join(" ")}
                >
                  {group.nom}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 p-4 lg:p-6">
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-orange-500">
                  <tr>
                    <th className="px-4 py-3">Mahsulot nomi</th>
                    <th className="px-4 py-3">Kodi</th>
                    <th className="px-4 py-3">Qoldiq</th>
                    <th className="px-4 py-3">O'lchov birligi</th>
                    <th className="px-4 py-3">Tan narxi</th>
                    <th className="px-4 py-3">Sotish narxi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  {paginatedRows.map((row) => (
                    <tr key={`${row.type}-${row.id}`} className="transition hover:bg-orange-50/40">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                        {row.nomi}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{row.kodi}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.qoldiq}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.olchovBirligi}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {typeof row.tanNarxi === "number" ? formatSumma(row.tanNarxi) : row.tanNarxi}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {typeof row.sotishNarxi === "number"
                          ? formatSumma(row.sotishNarxi)
                          : row.sotishNarxi}
                      </td>
                    </tr>
                  ))}

                  {tableRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        Mahsulot topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={safePage}
              totalItems={tableRows.length}
              onPageChange={setPage}
            />
          </div>
        </main>

      </div>

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/55 p-4 backdrop-blur-[2px] sm:p-6 lg:pl-[120px]">
            <div className="relative mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden rounded-2xl bg-[#E2E2E2] shadow-2xl">
              <div className="absolute -left-10 top-10 hidden flex-col gap-2 lg:flex">
                <button
                  onClick={closeModal}
                  className="flex h-9 w-12 items-center justify-center rounded-l-xl bg-orange-500 text-white shadow-lg transition hover:bg-orange-600"
                  aria-label="Yopish"
                >
                  <X size={20} />
                </button>
                <button
                  onClick={printProducts}
                  className="flex h-9 w-12 items-center justify-center rounded-l-xl bg-orange-500 text-white shadow-lg transition hover:bg-orange-600"
                  aria-label="Chop etish"
                >
                  <Printer size={17} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#D8D8D8] px-5 py-5 sm:px-8">
                <h2 className="text-xl font-bold text-orange-500">
                  {modalMode === "product" ? "Yangi tovar" : "Yangi guruh"}
                </h2>
                <button
                  onClick={closeModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-gray-600 transition hover:bg-orange-500 hover:text-white lg:hidden"
                  aria-label="Yopish"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 sm:p-5 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <section className="rounded-lg bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-bold text-gray-800">Umumiy malumotlar</h3>
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-gray-500">
                        Malumot
                        <input
                          value={modalMode === "product" ? productForm.malumot : groupForm.malumot}
                          onChange={(event) =>
                            modalMode === "product"
                              ? setProductForm((prev) => ({ ...prev, malumot: event.target.value }))
                              : setGroupForm((prev) => ({ ...prev, malumot: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-md border border-gray-100 px-3 text-sm outline-none focus:border-orange-300"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-gray-500">
                        Guruh
                        <select
                          value={modalMode === "product" ? productForm.guruh : groupForm.guruh}
                          onChange={(event) =>
                            modalMode === "product"
                              ? setProductForm((prev) => ({ ...prev, guruh: event.target.value }))
                              : setGroupForm((prev) => ({ ...prev, guruh: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-md border border-gray-100 px-3 text-sm outline-none focus:border-orange-300"
                        >
                          <option value="">Tanlang</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.nomi}>
                              {group.nomi}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-semibold text-gray-500">
                        Davlat
                        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_28px] gap-2">
                          <select
                            value={modalMode === "product" ? productForm.davlat : groupForm.davlat}
                            onChange={(event) =>
                              modalMode === "product"
                                ? setProductForm((prev) => ({
                                    ...prev,
                                    davlat: event.target.value,
                                  }))
                                : setGroupForm((prev) => ({ ...prev, davlat: event.target.value }))
                            }
                            className="h-9 rounded-md border border-gray-100 px-3 text-sm outline-none focus:border-orange-300"
                          >
                            <option value="">Tanlang</option>
                            <option>Uzbekistan</option>
                            <option>Turkey</option>
                            <option>France</option>
                          </select>
                          <button
                            type="button"
                            className="h-9 rounded-md bg-green-50 text-lg font-bold text-green-600"
                          >
                            +
                          </button>
                        </div>
                      </label>
                    </div>
                  </section>

                  <section className="rounded-lg bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-bold text-gray-800">Guruh</h3>
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-gray-500">
                        Artikul
                        <input
                          value={modalMode === "product" ? productForm.shtrixKodi : groupForm.artikul}
                          onChange={(event) =>
                            modalMode === "product"
                              ? setProductForm((prev) => ({
                                  ...prev,
                                  shtrixKodi: event.target.value,
                                }))
                              : setGroupForm((prev) => ({ ...prev, artikul: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-md border border-gray-100 px-3 text-sm outline-none focus:border-orange-300"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-gray-500">
                        Kod
                        <input
                          value={modalMode === "product" ? productForm.kodi : groupForm.kod}
                          onChange={(event) =>
                            modalMode === "product"
                              ? setProductForm((prev) => ({ ...prev, kodi: event.target.value }))
                              : setGroupForm((prev) => ({ ...prev, kod: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-md border border-gray-100 px-3 text-sm outline-none focus:border-orange-300"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-gray-500">
                        O'lchov birligi
                        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_28px] gap-2">
                          <select
                            value={
                              modalMode === "product"
                                ? productForm.olchovBirligi
                                : groupForm.olchovBirligi
                            }
                            onChange={(event) =>
                              modalMode === "product"
                                ? setProductForm((prev) => ({
                                    ...prev,
                                    olchovBirligi: event.target.value,
                                  }))
                                : setGroupForm((prev) => ({
                                    ...prev,
                                    olchovBirligi: event.target.value,
                                  }))
                            }
                            className="h-9 rounded-md border border-gray-100 px-3 text-sm outline-none focus:border-orange-300"
                          >
                            <option>dona</option>
                            <option>ml</option>
                            <option>kg</option>
                          </select>
                          <button
                            type="button"
                            className="h-9 rounded-md bg-green-50 text-lg font-bold text-green-600"
                          >
                            +
                          </button>
                        </div>
                      </label>
                    </div>
                  </section>

                  <section className="rounded-lg bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-bold text-gray-800">Harakteristika</h3>
                    <div className="space-y-3">
                      {[
                        ["ogirligi", "Og'irligi"],
                        ["hajmi", "Hajmi"],
                        ["nds", "NDS"],
                      ].map(([key, label]) => (
                        <label key={key} className="block text-xs font-semibold text-gray-500">
                          {label}
                          <input
                            value={
                              modalMode === "product"
                                ? String(productForm[key as "ogirligi" | "hajmi" | "nds"])
                                : String(groupForm[key as "ogirligi" | "hajmi" | "nds"])
                            }
                            onChange={(event) =>
                              modalMode === "product"
                                ? setProductForm((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                : setGroupForm((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                            }
                            className="mt-1 h-9 w-full rounded-md border border-gray-100 px-3 text-sm outline-none focus:border-orange-300"
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                </div>

                <main className="min-w-0 space-y-3">
                  <div className="rounded-lg bg-white px-4 py-3 text-lg font-semibold text-gray-600">
                    <button className="inline-flex items-center gap-2 text-left">
                      <Plus size={16} className="text-green-600" />
                      O'zgarish qo'shish
                    </button>
                  </div>

                  <section className="overflow-hidden rounded-lg bg-white shadow-sm">
                    <div className="grid min-w-[560px] grid-cols-[34px_34px_minmax(0,1fr)_120px_120px_100px] items-center border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-600">
                      <Check size={17} className="text-gray-300" />
                      <Settings size={16} className="text-gray-400" />
                      <span>{modalMode === "product" ? "Rasm" : "Guruh nomi"}</span>
                      {modalMode === "product" ? (
                        <>
                          <span>O'lchov birligi</span>
                          <span>Chakana narx</span>
                          <span>Qoldiq</span>
                        </>
                      ) : (
                        <>
                          <span />
                          <span />
                          <span>Guruh</span>
                        </>
                      )}
                    </div>

                    <div className="grid min-w-[560px] grid-cols-[34px_34px_minmax(0,1fr)_120px_120px_100px] items-start px-4 py-5">
                      <Check size={17} className="mt-2 text-gray-300" />
                      <span />
                      {modalMode === "product" ? (
                        <>
                          <div className="h-24 w-24 border border-dashed border-blue-400 bg-blue-50/20" />
                          <select
                            value={productForm.olchovBirligi}
                            onChange={(event) =>
                              setProductForm((prev) => ({
                                ...prev,
                                olchovBirligi: event.target.value,
                              }))
                            }
                            className="h-9 w-24 rounded-md border border-gray-100 px-2 text-sm outline-none"
                          >
                            <option>dona</option>
                            <option>ml</option>
                            <option>kg</option>
                          </select>
                          <input
                            type="number"
                            value={productForm.narxi || ""}
                            onChange={(event) =>
                              setProductForm((prev) => ({
                                ...prev,
                                narxi: Number(event.target.value),
                              }))
                            }
                            className="h-9 w-24 rounded-md border border-gray-100 px-2 text-sm outline-none"
                          />
                          <input
                            type="number"
                            value={productForm.soni || ""}
                            onChange={(event) =>
                              setProductForm((prev) => ({
                                ...prev,
                                soni: Number(event.target.value),
                              }))
                            }
                            className="h-9 w-20 rounded-md border border-gray-100 px-2 text-sm outline-none"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            value={groupForm.guruhNomi}
                            onChange={(event) =>
                              setGroupForm((prev) => ({ ...prev, guruhNomi: event.target.value }))
                            }
                            className="h-9 w-full max-w-[260px] rounded-md border border-gray-100 px-3 text-sm outline-none"
                          />
                          <span />
                          <span />
                          <input
                            value={groupForm.guruhKodi}
                            onChange={(event) =>
                              setGroupForm((prev) => ({ ...prev, guruhKodi: event.target.value }))
                            }
                            className="h-9 w-20 rounded-md border border-gray-100 px-3 text-sm outline-none"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                      <span>Belgilangan: 1/1</span>
                      <span>Barchasi: {modalMode === "product" ? products.length : groups.length}</span>
                      <label className="flex items-center gap-2">
                        Sahifa
                        <select className="h-8 rounded-md border border-gray-100 px-2">
                          <option>21</option>
                          <option>50</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
                      <button type="button" className="font-semibold">
                        x O'chirish
                      </button>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-200" />
                        Barchasi uchun
                      </label>
                    </div>
                  </section>
                </main>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-300 bg-[#E2E2E2] p-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  onClick={modalMode === "product" ? saveProduct : saveGroup}
                  className="h-10 rounded-md bg-green-500 px-12 text-sm font-bold text-white transition hover:bg-green-600"
                >
                  Saqlash
                </button>
                <button
                  onClick={closeModal}
                  className="h-10 rounded-md bg-gray-200 px-10 text-sm font-bold text-gray-600 transition hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
