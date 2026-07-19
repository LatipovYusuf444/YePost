import { useMemo, useState } from "react";
import { Plus, Search, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KorinishTanlov, { type Korinish } from "../XaridorUchot/KorinishTanlov";
import LavozimModal from "./LavozimModal";
import { mockVakolatlar } from "./mockData";
import type { Lavozim, Xodim } from "./types";
import { sanaFormat } from "./yordamchilar";

type Props = {
  lavozimlar: Lavozim[];
  xodimlar: Xodim[];
  onSaqlash: (lavozim: Lavozim) => void;
  onOchirish: (id: string) => void;
};

export default function Lavozimlar({ lavozimlar, xodimlar, onSaqlash, onOchirish }: Props) {
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("karta");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirLavozim, setTahrirLavozim] = useState<Lavozim | null>(null);

  const xodimSoni = (lavozimId: string) =>
    xodimlar.filter((xodim) => xodim.lavozimId === lavozimId).length;

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return lavozimlar;
    return lavozimlar.filter((lavozim) =>
      [lavozim.nomi, lavozim.izoh].join(" ").toLowerCase().includes(soz)
    );
  }, [lavozimlar, qidiruv]);

  function modalniOchish(lavozim?: Lavozim) {
    setTahrirLavozim(lavozim ?? null);
    setModalOchiq(true);
  }

  function ochirish(lavozim: Lavozim) {
    const soni = xodimSoni(lavozim.id);
    const savol = soni
      ? `"${lavozim.nomi}" lavozimini o'chirasizmi? ${soni} ta xodimdan biriktirish olib tashlanadi.`
      : `"${lavozim.nomi}" lavozimini o'chirasizmi?`;
    if (!window.confirm(savol)) return;
    onOchirish(lavozim.id);
  }

  const ustunlar: Ustun<Lavozim>[] = [
    { id: "nomi", nom: "Lavozim", kenglik: 180, katak: (l) => <span className="font-black text-slate-900">{l.nomi}</span> },
    { id: "izoh", nom: "Izoh", kenglik: 240, katak: (l) => <span className="text-slate-500">{l.izoh || "—"}</span> },
    {
      id: "vakolat",
      nom: "Vakolatlar",
      kenglik: 130,
      hizalash: "right",
      katak: (l) => (
        <span className="font-bold text-slate-600">
          {l.vakolatlar.length} / {mockVakolatlar.length}
        </span>
      ),
    },
    {
      id: "xodim",
      nom: "Xodimlar",
      kenglik: 110,
      hizalash: "right",
      katak: (l) => <span className="font-bold text-slate-600">{xodimSoni(l.id)}</span>,
    },
    { id: "yaratgan", nom: "Yaratgan mas'ul shaxs", kenglik: 170, katak: (l) => <span className="text-slate-500">{l.yaratganMasul}</span> },
    { id: "yaratilgan", nom: "Yaratilgan sana", kenglik: 140, katak: (l) => <span className="text-slate-500">{sanaFormat(l.yaratilganSana)}</span> },
    {
      id: "ozgartirilgan",
      nom: "O'zgartirilgan sana",
      kenglik: 150,
      katak: (l) => <span className="text-slate-500">{sanaFormat(l.ozgartirilganSana)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Xodim uchoti
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Lavozimlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Lavozim vakolatlari o'sha lavozimdagi barcha xodimlarga tarqaladi.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm">
            <Search size={17} className="text-gray-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              className="min-w-0 flex-1 text-sm font-semibold outline-none"
              placeholder="Lavozim nomi yoki izohi..."
            />
          </label>
          <KorinishTanlov qiymat={korinish} onChange={setKorinish} />
        </div>

        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Lavozim qo'shish
        </button>
      </div>

      {korinish === "jadval" && (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={(lavozim) => modalniOchish(lavozim)}
          onQatorOchirish={ochirish}
        />
      )}

      {korinish === "karta" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {royxat.map((lavozim) => (
            <article
              key={lavozim.id}
              onClick={() => modalniOchish(lavozim)}
              className="cursor-pointer rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <ShieldCheck size={22} />
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    ochirish(lavozim);
                  }}
                  title="O'chirish"
                  aria-label="O'chirish"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h2 className="mt-5 text-xl font-black text-gray-950">{lavozim.nomi}</h2>
              <p className="mt-1 min-h-10 text-sm font-semibold text-gray-500">
                {lavozim.izoh || "Izoh kiritilmagan"}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {lavozim.vakolatlar.slice(0, 4).map((kod) => (
                  <span
                    key={kod}
                    className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-[#FF6A00]"
                  >
                    {mockVakolatlar.find((vakolat) => vakolat.kod === kod)?.nom ?? kod}
                  </span>
                ))}
                {lavozim.vakolatlar.length > 4 && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
                    +{lavozim.vakolatlar.length - 4}
                  </span>
                )}
                {lavozim.vakolatlar.length === 0 && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-400">
                    Vakolat yo'q
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <UsersRound size={14} className="text-orange-400" />
                    Xodimlar
                  </span>
                  <span className="font-semibold text-gray-600">{xodimSoni(lavozim.id)} ta</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="text-gray-400">O'zgartirilgan</span>
                  <span className="font-semibold text-gray-600">
                    {sanaFormat(lavozim.ozgartirilganSana)}
                  </span>
                </p>
              </div>
            </article>
          ))}

          {royxat.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center">
              <ShieldCheck className="mx-auto text-orange-200" size={42} />
              <p className="mt-3 font-bold text-gray-500">Lavozim mavjud emas</p>
            </div>
          )}
        </div>
      )}

      {modalOchiq && (
        <LavozimModal
          boshlangich={tahrirLavozim}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={(lavozim) => {
            onSaqlash(lavozim);
            setModalOchiq(false);
          }}
        />
      )}
    </div>
  );
}
