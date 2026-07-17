import { useMemo, useState } from "react";
import { Building2, Phone, Plus, Search, Settings, Trash2, UserRound } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import IjtimoiyIkonlar from "./IjtimoiyIkonlar";
import KorinishTanlov, { type Korinish } from "./KorinishTanlov";
import XaridorModal from "./XaridorModal";
import XaridorTafsilotlariModal from "./XaridorTafsilotlariModal";
import XodimModal from "./XodimModal";
import { mockSavdolar, mockTarix, mockTolovlar, xodimTopish } from "./mockData";
import type { Xaridor, XaridorKompaniyasi, Xodim } from "./types";
import { asosiyTelefon, kompaniyaNomi, sanaFormat, xaridorNomi } from "./yordamchilar";

type Props = {
  xaridorlar: Xaridor[];
  kompaniyalar: XaridorKompaniyasi[];
  onSaqlash: (xaridor: Xaridor) => void;
  onOchirish: (id: string) => void;
};

export default function Xaridorlar({ xaridorlar, kompaniyalar, onSaqlash, onOchirish }: Props) {
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("karta");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirXaridor, setTahrirXaridor] = useState<Xaridor | null>(null);
  const [tafsilotXaridor, setTafsilotXaridor] = useState<Xaridor | null>(null);
  const [korilayotganXodim, setKorilayotganXodim] = useState<Xodim | null>(null);

  const ustunlar: Ustun<Xaridor>[] = [
    { id: "ism", nom: "Ismi", kenglik: 130, katak: (x) => <span className="font-black text-slate-900">{x.ism}</span> },
    { id: "familiya", nom: "Familiya", kenglik: 140, katak: (x) => <span className="text-slate-600">{x.familiya}</span> },
    { id: "tel", nom: "Tel nomer", kenglik: 160, katak: (x) => <span className="text-slate-500">{asosiyTelefon(x) || "—"}</span> },
    { id: "lavozim", nom: "Lavozim", kenglik: 150, katak: (x) => <span className="text-slate-500">{x.lavozim || "—"}</span> },
    { id: "ijtimoiy", nom: "Ijtimoiy tarmoq", kenglik: 130, katak: (x) => <IjtimoiyIkonlar ijtimoiy={x.ijtimoiy} /> },
    {
      id: "yaratgan",
      nom: "Mas'ul shaxs yaratgan",
      kenglik: 170,
      katak: (x) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setKorilayotganXodim(xodimTopish(x.yaratganMasul));
          }}
          className="max-w-full truncate text-left text-slate-500 transition hover:text-[#FF6A00] hover:underline"
        >
          {x.yaratganMasul}
        </button>
      ),
    },
    { id: "yaratilgan", nom: "Sana yaratilgan", kenglik: 140, katak: (x) => <span className="text-slate-500">{sanaFormat(x.yaratilganSana)}</span> },
    { id: "ozgartirilgan", nom: "O'zgartirilgan sana", kenglik: 150, katak: (x) => <span className="text-slate-500">{sanaFormat(x.ozgartirilganSana)}</span> },
    { id: "kompaniya", nom: "Kompaniya", kenglik: 180, katak: (x) => <span className="text-slate-500">{kompaniyaNomi(kompaniyalar, x.kompaniyaId) || "—"}</span> },
  ];

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return xaridorlar;
    return xaridorlar.filter((xaridor) =>
      [
        xaridorNomi(xaridor),
        xaridor.telefonlar.join(" "),
        xaridor.manzil,
        xaridor.lavozim,
        xaridor.ijtimoiy.telegram,
        xaridor.ijtimoiy.whatsapp,
        xaridor.ijtimoiy.instagram,
        kompaniyaNomi(kompaniyalar, xaridor.kompaniyaId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(soz)
    );
  }, [kompaniyalar, qidiruv, xaridorlar]);

  function modalniOchish(xaridor?: Xaridor) {
    setTahrirXaridor(xaridor ?? null);
    setModalOchiq(true);
  }

  function ochirish(xaridor: Xaridor) {
    if (!window.confirm(`${xaridorNomi(xaridor)} ma'lumotini o'chirasizmi?`)) return;
    onOchirish(xaridor.id);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Xaridor uchoti
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Xaridorlar</h1>
          <p className="mt-1 text-sm text-gray-500">Jismoniy xaridorlarni yaratish va tahrirlash.</p>
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
              placeholder="Ism, telefon, kompaniya yoki manzil..."
            />
          </label>
          <KorinishTanlov qiymat={korinish} onChange={setKorinish} />
        </div>

        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Xaridor qo'shish
        </button>
      </div>

      {korinish === "jadval" && (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={setTafsilotXaridor}
          onQatorOchirish={ochirish}
        />
      )}

      {korinish === "karta" && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {royxat.map((xaridor) => (
          <article
            key={xaridor.id}
            onClick={() => setTafsilotXaridor(xaridor)}
            className="cursor-pointer rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <UserRound size={22} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    modalniOchish(xaridor);
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
                    ochirish(xaridor);
                  }}
                  title="O'chirish"
                  aria-label="O'chirish"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* 1 Ism Familiya */}
            <h2 className="mt-5 text-xl font-black text-gray-950">{xaridorNomi(xaridor)}</h2>

            {/* 2 Tel nomer */}
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
              <Phone size={14} className="text-orange-400" />
              {asosiyTelefon(xaridor) || "—"}
              {xaridor.telefonlar.length > 1 && (
                <span className="rounded-lg bg-orange-50 px-1.5 py-0.5 text-xs font-black text-orange-500">
                  +{xaridor.telefonlar.length - 1}
                </span>
              )}
            </p>

            {/* 3 Ijtimoiy tarmoq */}
            <div className="mt-3">
              <IjtimoiyIkonlar ijtimoiy={xaridor.ijtimoiy} />
            </div>

            {/* 4 Kompaniya aloqasi (bo'lsa) */}
            {kompaniyaNomi(kompaniyalar, xaridor.kompaniyaId) && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                <Building2 size={14} className="text-orange-400" />
                {kompaniyaNomi(kompaniyalar, xaridor.kompaniyaId)}
              </p>
            )}

            {/* 5 Yaratilgan sana · 6 Yaratgan mas'ul shaxs */}
            <div className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-sm">
              <p className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Yaratilgan sana</span>
                <span className="font-semibold text-gray-600">
                  {sanaFormat(xaridor.yaratilganSana)}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Yaratgan</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setKorilayotganXodim(xodimTopish(xaridor.yaratganMasul));
                  }}
                  className="truncate font-semibold text-gray-600 transition hover:text-[#FF6A00] hover:underline"
                >
                  {xaridor.yaratganMasul}
                </button>
              </p>
            </div>
          </article>
        ))}

        {royxat.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center">
            <UserRound className="mx-auto text-orange-200" size={42} />
            <p className="mt-3 font-bold text-gray-500">Xaridor mavjud emas</p>
          </div>
        )}
      </div>
      )}

      {tafsilotXaridor && (
        <XaridorTafsilotlariModal
          xaridor={tafsilotXaridor}
          kompaniyalar={kompaniyalar}
          savdolar={mockSavdolar}
          tolovlar={mockTolovlar}
          tarix={mockTarix}
          onTahrirlash={() => modalniOchish(tafsilotXaridor)}
          onOchirish={() => {
            ochirish(tafsilotXaridor);
            setTafsilotXaridor(null);
          }}
          onYopish={() => setTafsilotXaridor(null)}
        />
      )}

      {modalOchiq && (
        <XaridorModal
          boshlangich={tahrirXaridor}
          kompaniyalar={kompaniyalar}
          savdolar={mockSavdolar}
          tolovlar={mockTolovlar}
          tarix={mockTarix}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={(xaridor) => {
            onSaqlash(xaridor);
            setTafsilotXaridor((joriy) => (joriy?.id === xaridor.id ? xaridor : joriy));
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
