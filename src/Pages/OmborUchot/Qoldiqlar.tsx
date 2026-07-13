import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { mockMahsulotlar, mockOmborlar } from "./mockData";
import { pul, qoldiqlarniHisoblash } from "./yordamchilar";

export default function Qoldiqlar() {
  const [qidiruv, setQidiruv] = useState("");
  const [omborFiltri, setOmborFiltri] = useState("hammasi");
  const qoldiq = useMemo(() => qoldiqlarniHisoblash(), []);

  const korinadiganOmborlar =
    omborFiltri === "hammasi" ? mockOmborlar : mockOmborlar.filter((ombor) => ombor.id === omborFiltri);

  const korinadiganMahsulotlar = mockMahsulotlar.filter((mahsulot) =>
    mahsulot.nomi.toLowerCase().includes(qidiruv.trim().toLowerCase())
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor uchoti</p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">Ombordagi qoldiqlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kirim, chiqim va ko'chirma hujjatlari asosida hisoblangan joriy qoldiqlar.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            placeholder="Mahsulot nomi bo'yicha qidirish"
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"
          />
        </div>
        <select
          value={omborFiltri}
          onChange={(event) => setOmborFiltri(event.target.value)}
          className="h-11 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 outline-none focus:border-orange-400"
        >
          <option value="hammasi">Barcha omborlar</option>
          {mockOmborlar.map((ombor) => (
            <option key={ombor.id} value={ombor.id}>
              {ombor.nomi}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-orange-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-orange-50/60 text-left text-xs font-bold uppercase tracking-wide text-orange-500">
            <tr>
              <th className="px-5 py-3">Mahsulot</th>
              <th className="px-5 py-3">Birlik</th>
              {korinadiganOmborlar.map((ombor) => (
                <th key={ombor.id} className="px-5 py-3">
                  {ombor.nomi}
                </th>
              ))}
              <th className="px-5 py-3">Jami qiymat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {korinadiganMahsulotlar.map((mahsulot) => {
              const jamiMiqdor = korinadiganOmborlar.reduce(
                (yigindi, ombor) => yigindi + (qoldiq.get(`${ombor.id}::${mahsulot.id}`) ?? 0),
                0
              );
              return (
                <tr key={mahsulot.id} className="hover:bg-orange-50/30">
                  <td className="px-5 py-3 font-black text-gray-950">{mahsulot.nomi}</td>
                  <td className="px-5 py-3 text-gray-500">{mahsulot.birlik}</td>
                  {korinadiganOmborlar.map((ombor) => {
                    const miqdor = qoldiq.get(`${ombor.id}::${mahsulot.id}`) ?? 0;
                    return (
                      <td
                        key={ombor.id}
                        className={`px-5 py-3 font-bold ${miqdor < 0 ? "text-red-500" : "text-gray-700"}`}
                      >
                        {miqdor} {mahsulot.birlik}
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 font-bold text-gray-700">{pul(jamiMiqdor * mahsulot.narx)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {korinadiganMahsulotlar.length === 0 && (
          <div className="p-14 text-center text-gray-400">Mahsulot topilmadi</div>
        )}
      </div>
    </div>
  );
}
