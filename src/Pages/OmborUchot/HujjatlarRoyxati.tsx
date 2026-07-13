import { useMemo, useState } from "react";
import { Edit3, FileText, Plus, Search, Trash2 } from "lucide-react";
import HujjatModal from "./HujjatModal";
import { mockMahsulotlar, mockOmborlar } from "./mockData";
import type { Hujjat } from "./types";
import { holatNomi, hujjatJami, pul, sana } from "./yordamchilar";

type Props = {
  prefiks: string;
  sarlavha: string;
  tavsif: string;
  kontragentYorligi: string;
  omborYorligi: string;
  ikkinchiOmborYorligi?: string;
  boshlangichRoyxat: Hujjat[];
};

function omborNomi(omborId: string) {
  return mockOmborlar.find((ombor) => ombor.id === omborId)?.nomi ?? "—";
}

export default function HujjatlarRoyxati({
  prefiks,
  sarlavha,
  tavsif,
  kontragentYorligi,
  omborYorligi,
  ikkinchiOmborYorligi,
  boshlangichRoyxat,
}: Props) {
  const [royxat, setRoyxat] = useState<Hujjat[]>(boshlangichRoyxat);
  const [qidiruv, setQidiruv] = useState("");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirHujjat, setTahrirHujjat] = useState<Hujjat | null>(null);

  const keyingiRaqam = useMemo(
    () => `${prefiks}-${String(royxat.length + 1).padStart(4, "0")}`,
    [prefiks, royxat.length]
  );

  const korinadiganRoyxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return royxat;
    return royxat.filter(
      (hujjat) =>
        hujjat.raqami.toLowerCase().includes(soz) ||
        hujjat.kontragentNomi.toLowerCase().includes(soz)
    );
  }, [royxat, qidiruv]);

  function modalniOchish(hujjat?: Hujjat) {
    setTahrirHujjat(hujjat ?? null);
    setModalOchiq(true);
  }

  function saqlash(hujjat: Hujjat, tasdiqla: boolean) {
    const yakuniyHujjat: Hujjat = { ...hujjat, holati: tasdiqla ? "tasdiqlangan" : "qoralama" };
    setRoyxat((oldRoyxat) => {
      const mavjud = oldRoyxat.some((item) => item.id === yakuniyHujjat.id);
      return mavjud
        ? oldRoyxat.map((item) => (item.id === yakuniyHujjat.id ? yakuniyHujjat : item))
        : [yakuniyHujjat, ...oldRoyxat];
    });
    setModalOchiq(false);
  }

  function ochirish(id: string) {
    if (!window.confirm("Hujjatni o'chirasizmi?")) return;
    setRoyxat((oldRoyxat) => oldRoyxat.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor uchoti</p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">{sarlavha}</h1>
          <p className="mt-1 text-sm text-gray-500">{tavsif}</p>
        </div>
        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Yaratish
        </button>
      </header>

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={qidiruv}
          onChange={(event) => setQidiruv(event.target.value)}
          placeholder="Raqami yoki kontragent bo'yicha qidirish"
          className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"
        />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-orange-50/60 text-left text-xs font-bold uppercase tracking-wide text-orange-500">
            <tr>
              <th className="px-5 py-3">Raqami</th>
              <th className="px-5 py-3">Sana</th>
              <th className="px-5 py-3">{kontragentYorligi}</th>
              <th className="px-5 py-3">{omborYorligi}</th>
              {ikkinchiOmborYorligi && <th className="px-5 py-3">{ikkinchiOmborYorligi}</th>}
              <th className="px-5 py-3">Summa</th>
              <th className="px-5 py-3">Holati</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {korinadiganRoyxat.map((hujjat) => (
              <tr key={hujjat.id} className="hover:bg-orange-50/30">
                <td className="px-5 py-3 font-black text-gray-950">{hujjat.raqami}</td>
                <td className="px-5 py-3 text-gray-500">{sana(hujjat.sana)}</td>
                <td className="px-5 py-3 text-gray-700">{hujjat.kontragentNomi || "—"}</td>
                <td className="px-5 py-3 text-gray-700">{omborNomi(hujjat.omborId)}</td>
                {ikkinchiOmborYorligi && (
                  <td className="px-5 py-3 text-gray-700">
                    {hujjat.omborIdTo ? omborNomi(hujjat.omborIdTo) : "—"}
                  </td>
                )}
                <td className="px-5 py-3 font-bold text-gray-700">{pul(hujjatJami(hujjat))}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      hujjat.holati === "tasdiqlangan"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {holatNomi(hujjat.holati)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => modalniOchish(hujjat)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"
                      aria-label="Tahrirlash"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => ochirish(hujjat.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500"
                      aria-label="O'chirish"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {korinadiganRoyxat.length === 0 && (
          <div className="p-14 text-center">
            <FileText className="mx-auto text-orange-200" size={42} />
            <p className="mt-3 font-bold text-gray-500">Hujjat topilmadi</p>
            <p className="mt-1 text-sm text-gray-400">"Yaratish" tugmasi orqali yangi hujjat qo'shing.</p>
          </div>
        )}
      </div>

      {modalOchiq && (
        <HujjatModal
          sarlavha={tahrirHujjat ? `${sarlavha}ni tahrirlash` : `Yangi ${sarlavha.toLowerCase()}`}
          kontragentYorligi={kontragentYorligi}
          omborYorligi={omborYorligi}
          ikkinchiOmborYorligi={ikkinchiOmborYorligi}
          omborlar={mockOmborlar}
          mahsulotlar={mockMahsulotlar}
          boshlangich={tahrirHujjat}
          keyingiRaqam={keyingiRaqam}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={saqlash}
        />
      )}
    </div>
  );
}
