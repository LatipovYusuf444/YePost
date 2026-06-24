import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useOmborStore } from "@/store/omborStore";
import { modificationNomi, qoldiqMiqdori } from "./omborYordamchilari";

export default function OmborQoldigi() {
  const { omborlar, qoldiqlar, yuklanmoqda, malumotlarniYuklash, qoldiqlarniYuklash } =
    useOmborStore();
  const [warehouseId, setWarehouseId] = useState("");
  const [qidiruv, setQidiruv] = useState("");

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  const filtered = useMemo(() => {
    const value = qidiruv.toLowerCase().trim();
    return qoldiqlar.filter((qoldiq) =>
      [modificationNomi(qoldiq.modification), qoldiq.modification?.barcode]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [qidiruv, qoldiqlar]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
          Mavjud mahsulotlar
        </p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">Ombor qoldig'i</h1>
      </header>
      <div className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-white p-4 sm:flex-row">
        <select
          value={warehouseId}
          onChange={(event) => {
            setWarehouseId(event.target.value);
            void qoldiqlarniYuklash(event.target.value || undefined);
          }}
          className="h-11 rounded-2xl border border-gray-200 px-4 text-sm font-semibold"
        >
          <option value="">Barcha omborlar</option>
          {omborlar.map((ombor) => (
            <option key={ombor.id} value={ombor.id}>{ombor.name}</option>
          ))}
        </select>
        <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-gray-200 px-4">
          <Search size={17} className="text-gray-400" />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            placeholder="Mahsulot yoki shtrix-kod"
            className="min-w-0 flex-1 outline-none"
          />
        </label>
        <button
          onClick={() => void qoldiqlarniYuklash(warehouseId || undefined)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white"
        >
          <RefreshCw size={16} />
          Yangilash
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-orange-50 text-orange-900/60">
              <tr>
                <th className="px-5 py-4">Mahsulot</th>
                <th className="px-5 py-4">Shtrix-kod</th>
                <th className="px-5 py-4">Ombor</th>
                <th className="px-5 py-4">Qoldiq</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/70">
              {filtered.map((qoldiq, index) => (
                <tr key={qoldiq.id ?? `${qoldiq.warehouseId}-${qoldiq.modificationId}-${index}`}>
                  <td className="px-5 py-4 font-bold text-gray-900">
                    {modificationNomi(qoldiq.modification)}
                  </td>
                  <td className="px-5 py-4">{qoldiq.modification?.barcode ?? "—"}</td>
                  <td className="px-5 py-4">{qoldiq.warehouse?.name ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-orange-50 px-3 py-1 font-black text-orange-600">
                      {qoldiqMiqdori(qoldiq)}
                    </span>
                  </td>
                </tr>
              ))}
              {!yuklanmoqda && filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-14 text-center text-gray-400">Real qoldiq mavjud emas</td></tr>
              )}
              {yuklanmoqda && (
                <tr><td colSpan={4} className="px-6 py-14 text-center"><LoaderCircle className="mx-auto animate-spin text-orange-500" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
