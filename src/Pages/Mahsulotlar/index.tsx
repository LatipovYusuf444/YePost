import { useMemo, useState } from "react";
import { Filter, Package, Plus, Search } from "lucide-react";
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

  function handleAddProduct() {
    addProduct({
      nomi: "Yangi mahsulot",
      soni: 1,
      kodi: "10300",
      shtrixKodi: "981640",
      olchovBirligi: "dona",
      narxi: 150000,
    });
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
            onClick={handleAddProduct}
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
                <th className="w-14 px-4 py-3" />
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
                  <td className="px-4 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                      <Package size={15} />
                    </div>
                  </td>
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
                    {formatSumma(product.narxi + 50000)}
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
          page={safePage}
          totalItems={filteredProducts.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
