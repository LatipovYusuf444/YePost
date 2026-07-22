import { useMemo, useState } from "react";
import { Check, Lock, Search } from "lucide-react";
import { backendVakolatlar } from "./backendMetadata";
import type { Lavozim, Xodim } from "./types";
import { lavozimNomi, xodimNomi } from "./yordamchilar";

type Props = {
  xodimlar: Xodim[];
  lavozimlar: Lavozim[];
  onSaqlash: (xodim: Xodim) => void;
  embedded?: boolean; // true — o'z sarlavhasini ko'rsatmaydi (Sozlamalarga joylanganда)
};

// Xodim × vakolat matritsasi. Yashil qulf — lavozimdan kelgan (o'zgarmaydi),
// to'q sariq belgi — shaxsan biriktirilgan (shu yerdan yoqiladi/o'chiriladi).
export default function Vakolatlar({ xodimlar, lavozimlar, onSaqlash, embedded = false }: Props) {
  const [qidiruv, setQidiruv] = useState("");
  const [guruh, setGuruh] = useState("Barchasi");

  const guruhlar = ["Barchasi", ...new Set(backendVakolatlar.map((vakolat) => vakolat.guruh))];

  const korsatiladiganVakolatlar = useMemo(
    () => (guruh === "Barchasi" ? backendVakolatlar : backendVakolatlar.filter((v) => v.guruh === guruh)),
    [guruh]
  );

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    const faollar = xodimlar.filter((xodim) => xodim.holat !== "ishdan-ketgan");
    if (!soz) return faollar;
    return faollar.filter((xodim) =>
      [xodimNomi(xodim), xodim.login, lavozimNomi(lavozimlar, xodim.lavozimId)]
        .join(" ")
        .toLowerCase()
        .includes(soz)
    );
  }, [lavozimlar, qidiruv, xodimlar]);

  function toggle(xodim: Xodim, kod: string) {
    const bor = xodim.vakolatlar.includes(kod);
    onSaqlash({
      ...xodim,
      vakolatlar: bor
        ? xodim.vakolatlar.filter((item) => item !== kod)
        : [...xodim.vakolatlar, kod],
      ozgartirilganSana: new Date().toISOString().slice(0, 10),
      ozgartirganMasul: "Administrator",
    });
  }

  return (
    <div className="space-y-5">
      {!embedded && (
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Xodim uchoti
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Vakolatlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Lavozimdan kelgan vakolatlar qulflangan; qo'shimcha vakolatni katakni bosib yoqing.
          </p>
        </header>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm">
          <Search size={17} className="text-gray-400" />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            className="min-w-0 flex-1 text-sm font-semibold outline-none"
            placeholder="Xodim, login yoki lavozim..."
          />
        </label>

        <div className="flex gap-2 overflow-x-auto">
          {guruhlar.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGuruh(item)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                guruh === item
                  ? "bg-orange-500 text-white"
                  : "border border-orange-100 bg-white text-gray-500 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-orange-100 bg-white px-5 py-3 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
            <Lock size={11} />
          </span>
          Lavozimdan kelgan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#FF6A00] text-white">
            <Check size={12} />
          </span>
          Shaxsiy vakolat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-md border border-slate-200 bg-white" />
          Ruxsat yo'q
        </span>
      </div>

      <div className="scrollbar-orange overflow-x-auto rounded-2xl border border-orange-100 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-orange-50/70">
              <th className="sticky left-0 z-10 min-w-[220px] bg-orange-50/95 px-5 py-4 font-black text-slate-600">
                Xodim
              </th>
              {korsatiladiganVakolatlar.map((vakolat) => (
                <th
                  key={vakolat.kod}
                  className="min-w-[112px] px-3 py-4 text-center align-bottom text-xs font-black text-slate-500"
                  title={vakolat.izoh}
                >
                  {vakolat.nom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100">
            {royxat.map((xodim) => {
              const lavozim = lavozimlar.find((item) => item.id === xodim.lavozimId);
              const lavozimdan = new Set(lavozim?.vakolatlar ?? []);
              return (
                <tr key={xodim.id} className="transition hover:bg-orange-50/40">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3">
                    <p className="font-black text-slate-800">{xodimNomi(xodim)}</p>
                    <p className="text-xs font-bold text-slate-400">
                      {lavozim?.nomi ?? "Lavozim biriktirilmagan"}
                    </p>
                  </td>
                  {korsatiladiganVakolatlar.map((vakolat) => {
                    const lavozimda = lavozimdan.has(vakolat.kod);
                    const shaxsiy = xodim.vakolatlar.includes(vakolat.kod);
                    return (
                      <td key={vakolat.kod} className="px-3 py-3 text-center">
                        <button
                          type="button"
                          disabled={lavozimda}
                          onClick={() => toggle(xodim, vakolat.kod)}
                          title={
                            lavozimda
                              ? `${lavozim?.nomi} lavozimidan kelgan`
                              : shaxsiy
                                ? "Shaxsiy vakolatni olib tashlash"
                                : "Shaxsiy vakolat berish"
                          }
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition ${
                            lavozimda
                              ? "cursor-not-allowed bg-emerald-100 text-emerald-600"
                              : shaxsiy
                                ? "bg-[#FF6A00] text-white hover:bg-[#EA580C]"
                                : "border border-slate-200 bg-white text-transparent hover:border-orange-300 hover:bg-orange-50"
                          }`}
                        >
                          {lavozimda ? <Lock size={12} /> : <Check size={14} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {royxat.length === 0 && (
        <p className="rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center font-bold text-gray-400">
          Xodim topilmadi
        </p>
      )}
    </div>
  );
}
