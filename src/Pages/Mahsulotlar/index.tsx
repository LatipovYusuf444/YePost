import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Filter, Plus, Search, X } from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import { useOmborStore } from "@/store/omborStore";

function formatSumma(value: number) {
  return `${value.toLocaleString("ru-RU")} uzs`;
}

export default function Mahsulotlar() {
  const products = useOmborStore((state) => state.products);
  const addProduct = useOmborStore((state) => state.addProduct);
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    nomi: "",
    soni: 0,
    olchovBirligi: "dona",
    narxi: 0,
    sotishNarxi: 0,
  });

  useEffect(() => {
    if (isModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const filteredProducts = useMemo(() => {
    const value = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !value ||
        [
          product.nomi,
          product.soni,
          product.kodi,
          product.shtrixKodi,
          product.olchovBirligi,
          formatSumma(product.narxi),
          formatSumma(product.sotishNarxi ?? product.narxi + 50000),
        ]
          .join(" ")
          .toLowerCase()
          .includes(value);
      const matchesAvailable = !onlyAvailable || product.soni > 0;

      return matchesSearch && matchesAvailable;
    });
  }, [onlyAvailable, products, search]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredProducts.length / 10)));
  const paginatedProducts = filteredProducts.slice((safePage - 1) * 10, safePage * 10);

  function openAddModal() {
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm({
      nomi: "",
      soni: 0,
      olchovBirligi: "dona",
      narxi: 0,
      sotishNarxi: 0,
    });
  }

  function saveProduct() {
    const safeName = form.nomi.trim();

    if (!safeName) return;

    const nextCode = String(Date.now()).slice(-6);

    addProduct({
      nomi: safeName,
      soni: Math.max(0, Number(form.soni) || 0),
      kodi: nextCode,
      shtrixKodi: `98${nextCode}`,
      olchovBirligi: form.olchovBirligi,
      narxi: Math.max(0, Number(form.narxi) || 0),
      sotishNarxi: Math.max(0, Number(form.sotishNarxi) || 0),
    });
    setPage(1);
    closeModal();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mahsulotlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ombordagi mahsulotlar, narxlar va qoldiqlar ro'yxati.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={openAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
          >
            <Plus size={16} />
            Mahsulot qo'shish
          </button>

          <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 sm:w-[360px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Qidirish"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            <Search size={18} className="text-gray-300" />
          </div>
        </div>

        <button
          onClick={() => setOnlyAvailable((prev) => !prev)}
          className={[
            "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition",
            onlyAvailable
              ? "bg-orange-500 text-white"
              : "bg-gray-50 text-gray-500 hover:text-orange-600",
          ].join(" ")}
        >
          Filtr
          <Filter size={15} />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-orange-500">
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 font-bold">Mahsulot nomi</th>
                <th className="px-4 py-3 font-bold">Kodi</th>
                <th className="px-4 py-3 font-bold">Qoldiq</th>
                <th className="px-4 py-3 font-bold">O'lchov birligi</th>
                <th className="px-4 py-3 font-bold">Tan narxi</th>
                <th className="px-4 py-3 font-bold">Sotish narxi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="transition hover:bg-orange-50/40">
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-700">
                    {product.nomi}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{product.kodi}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                      {product.soni} qoldiq
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {product.olchovBirligi}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {formatSumma(product.narxi)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {formatSumma(product.sotishNarxi ?? product.narxi + 50000)}
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
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
          totalItems={filteredProducts.length}
          onPageChange={setPage}
        />
      </div>

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm lg:pl-[120px]">
            <div className="flex h-[min(760px,calc(100dvh-48px))] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-950">Mahsulot qo'shish</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Mahsulot nomi, qoldiq va narx ma'lumotlarini kiriting
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-orange-500 hover:text-white"
                  aria-label="Yopish"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#D8D8D8] p-6">
                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="rounded-[28px] bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-950">Asosiy ma'lumot</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Saqlangandan keyin mahsulot jadval boshiga qo'shiladi.
                    </p>

                    <div className="mt-6 rounded-3xl bg-orange-50 p-5">
                      <p className="text-sm font-bold text-orange-600">Sotish narxi</p>
                      <p className="mt-2 text-2xl font-black text-gray-950">
                        {formatSumma(Number(form.sotishNarxi) || 0)}
                      </p>
                    </div>

                    <div className="mt-4 rounded-3xl bg-gray-50 p-5">
                      <p className="text-sm font-bold text-gray-500">Qoldiq</p>
                      <p className="mt-2 text-2xl font-black text-gray-950">
                        {Number(form.soni) || 0} {form.olchovBirligi}
                      </p>
                    </div>
                  </aside>

                  <main className="rounded-[28px] bg-white p-6 shadow-sm">
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="text-xs font-bold text-gray-500 md:col-span-2">
                        Mahsulot ismi
                        <input
                          value={form.nomi}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, nomi: event.target.value }))
                          }
                          placeholder="Masalan: Miss Dior"
                          className="mt-1 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300"
                        />
                      </label>

                      <label className="text-xs font-bold text-gray-500">
                        Qoldiq
                        <input
                          type="number"
                          min={0}
                          value={form.soni || ""}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, soni: Number(event.target.value) }))
                          }
                          placeholder="0"
                          className="mt-1 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300"
                        />
                      </label>

                      <label className="text-xs font-bold text-gray-500">
                        O'lchov birligi
                        <select
                          value={form.olchovBirligi}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, olchovBirligi: event.target.value }))
                          }
                          className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300"
                        >
                          <option>dona</option>
                          <option>ml</option>
                          <option>kg</option>
                          <option>litr</option>
                          <option>quti</option>
                        </select>
                      </label>

                      <label className="text-xs font-bold text-gray-500">
                        Tan narxi
                        <input
                          type="number"
                          min={0}
                          value={form.narxi || ""}
                          onChange={(event) => {
                            const narxi = Number(event.target.value);
                            setForm((prev) => ({
                              ...prev,
                              narxi,
                              sotishNarxi: prev.sotishNarxi || narxi,
                            }));
                          }}
                          placeholder="0"
                          className="mt-1 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300"
                        />
                      </label>

                      <label className="text-xs font-bold text-gray-500">
                        Sotish narxi
                        <input
                          type="number"
                          min={0}
                          value={form.sotishNarxi || ""}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              sotishNarxi: Number(event.target.value),
                            }))
                          }
                          placeholder="0"
                          className="mt-1 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none transition focus:border-orange-300"
                        />
                      </label>
                    </div>
                  </main>
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  onClick={closeModal}
                  className="h-11 rounded-xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:text-orange-600"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={saveProduct}
                  disabled={!form.nomi.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
                >
                  <Check size={17} />
                  Saqlash
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
