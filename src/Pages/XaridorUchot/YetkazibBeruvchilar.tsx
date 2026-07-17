import { useMemo, useState } from "react";
import { Hash, Phone, Plus, Search, Settings, Trash2, Truck, UserRound } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import IjtimoiyIkonlar from "./IjtimoiyIkonlar";
import KorinishTanlov, { type Korinish } from "./KorinishTanlov";
import XodimModal from "./XodimModal";
import YetkazibBeruvchiModal from "./YetkazibBeruvchiModal";
import YetkazibTafsilotlariModal from "./YetkazibTafsilotlariModal";
import { xodimTopish } from "./mockData";
import type { Xodim, YetkazibBeruvchi } from "./types";
import { sanaFormat } from "./yordamchilar";

type Props = {
  yetkazibBeruvchilar: YetkazibBeruvchi[];
  onSaqlash: (yetkazibBeruvchi: YetkazibBeruvchi) => void;
  onOchirish: (id: string) => void;
};

export default function YetkazibBeruvchilar({
  yetkazibBeruvchilar,
  onSaqlash,
  onOchirish,
}: Props) {
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("karta");
  const [korilayotganXodim, setKorilayotganXodim] = useState<Xodim | null>(null);
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirBeruvchi, setTahrirBeruvchi] = useState<YetkazibBeruvchi | null>(null);
  const [tafsilotBeruvchi, setTafsilotBeruvchi] = useState<YetkazibBeruvchi | null>(null);

  const ustunlar: Ustun<YetkazibBeruvchi>[] = [
    { id: "nomi", nom: "Nomi", kenglik: 180, katak: (b) => <span className="font-black text-slate-900">{b.nomi}</span> },
    { id: "stir", nom: "STIR", kenglik: 130, katak: (b) => <span className="text-slate-500">{b.stir || "—"}</span> },
    { id: "aloqa", nom: "Aloqa shaxs", kenglik: 160, katak: (b) => <span className="text-slate-600">{b.aloqaShaxsi || "—"}</span> },
    { id: "tel", nom: "Tel nomer", kenglik: 150, katak: (b) => <span className="text-slate-500">{b.telefon || "—"}</span> },
    { id: "ijtimoiy", nom: "Ijtimoiy tarmoq", kenglik: 140, katak: (b) => <IjtimoiyIkonlar ijtimoiy={b.ijtimoiy} /> },
    {
      id: "yaratgan",
      nom: "Mas'ul shaxs yaratgan",
      kenglik: 170,
      katak: (b) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setKorilayotganXodim(xodimTopish(b.yaratganMasul));
          }}
          className="max-w-full truncate text-left text-slate-500 transition hover:text-[#FF6A00] hover:underline"
        >
          {b.yaratganMasul}
        </button>
      ),
    },
    { id: "yaratilgan", nom: "Sana yaratilgan", kenglik: 140, katak: (b) => <span className="text-slate-500">{sanaFormat(b.yaratilganSana)}</span> },
    { id: "ozgartirilgan", nom: "O'zgartirilgan sana", kenglik: 150, katak: (b) => <span className="text-slate-500">{sanaFormat(b.ozgartirilganSana)}</span> },
    { id: "ozgartgan", nom: "O'zgartirgan mas'ul shaxs", kenglik: 180, katak: (b) => <span className="text-slate-500">{b.ozgartirganMasul}</span> },
  ];

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return yetkazibBeruvchilar;
    return yetkazibBeruvchilar.filter((beruvchi) =>
      [beruvchi.nomi, beruvchi.telefon].join(" ").toLowerCase().includes(soz)
    );
  }, [qidiruv, yetkazibBeruvchilar]);

  function modalniOchish(beruvchi?: YetkazibBeruvchi) {
    setTahrirBeruvchi(beruvchi ?? null);
    setModalOchiq(true);
  }

  function ochirish(beruvchi: YetkazibBeruvchi) {
    if (!window.confirm(`${beruvchi.nomi} ma'lumotini o'chirasizmi?`)) return;
    onOchirish(beruvchi.id);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Xaridor uchoti
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Yetkazib beruvchilar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Mahsulot yetkazib beruvchi hamkorlarni yaratish va tahrirlash.
          </p>
        </div>
      </header>

      {/* Chapda: qidiruv + yonida Ko'rinish. O'ngda: qo'shish tugmasi. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm">
            <Search size={17} className="text-gray-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              className="min-w-0 flex-1 text-sm font-semibold outline-none"
              placeholder="Nomi yoki telefon..."
            />
          </label>
          <KorinishTanlov qiymat={korinish} onChange={setKorinish} />
        </div>

        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Yetkazib beruvchi qo'shish
        </button>
      </div>

      {korinish === "jadval" && (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={setTafsilotBeruvchi}
          onQatorOchirish={ochirish}
        />
      )}

      {korinish === "karta" && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {royxat.map((beruvchi) => (
          <article
            key={beruvchi.id}
            onClick={() => setTafsilotBeruvchi(beruvchi)}
            className="cursor-pointer rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <Truck size={22} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    modalniOchish(beruvchi);
                  }}
                  title="Sozlamalar"
                  aria-label="Sozlamalar"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF3E2] text-[#FF6A00] transition hover:bg-orange-500 hover:text-white"
                >
                  <Settings size={16} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    ochirish(beruvchi);
                  }}
                  title="O'chirish"
                  aria-label="O'chirish"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* 1 Nomi */}
            <h2 className="mt-5 text-xl font-black text-gray-950">{beruvchi.nomi}</h2>

            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
              <Hash size={14} className="text-orange-400" />
              STIR: {beruvchi.stir || "—"}
            </p>

            {/* 2 Tel nomer */}
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
              <Phone size={14} className="text-orange-400" />
              {beruvchi.telefon || "—"}
            </p>

            {/* 3 Ijtimoiy tarmoq */}
            <div className="mt-3">
              <IjtimoiyIkonlar ijtimoiy={beruvchi.ijtimoiy} />
            </div>

            {/* 4 Aloqa shaxsi (bo'lsa) */}
            {beruvchi.aloqaShaxsi && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                <UserRound size={14} className="text-orange-400" />
                {beruvchi.aloqaShaxsi}
              </p>
            )}

            {/* 5 Yaratilgan sana · 6 Yaratgan mas'ul shaxs */}
            <div className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-sm">
              <p className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Yaratilgan sana</span>
                <span className="font-semibold text-gray-600">
                  {sanaFormat(beruvchi.yaratilganSana)}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Yaratgan</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setKorilayotganXodim(xodimTopish(beruvchi.yaratganMasul));
                  }}
                  className="truncate font-semibold text-gray-600 transition hover:text-[#FF6A00] hover:underline"
                >
                  {beruvchi.yaratganMasul}
                </button>
              </p>
            </div>
          </article>
        ))}

        {royxat.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center">
            <Truck className="mx-auto text-orange-200" size={42} />
            <p className="mt-3 font-bold text-gray-500">Yetkazib beruvchi mavjud emas</p>
          </div>
        )}
      </div>
      )}

      {tafsilotBeruvchi && (
        <YetkazibTafsilotlariModal
          beruvchi={tafsilotBeruvchi}
          onTahrirlash={() => modalniOchish(tafsilotBeruvchi)}
          onOchirish={() => {
            ochirish(tafsilotBeruvchi);
            setTafsilotBeruvchi(null);
          }}
          onYopish={() => setTafsilotBeruvchi(null)}
        />
      )}

      {modalOchiq && (
        <YetkazibBeruvchiModal
          boshlangich={tahrirBeruvchi}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={(beruvchi) => {
            onSaqlash(beruvchi);
            setTafsilotBeruvchi((joriy) => (joriy?.id === beruvchi.id ? beruvchi : joriy));
            setModalOchiq(false);
          }}
        />
      )}

      {korilayotganXodim && (
        <XodimModal xodim={korilayotganXodim} onYopish={() => setKorilayotganXodim(null)} />
      )}
    </div>
  );
}
