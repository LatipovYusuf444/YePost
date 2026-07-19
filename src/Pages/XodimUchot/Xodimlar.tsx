import { useMemo, useState } from "react";
import { Briefcase, Building2, Phone, Plus, Search, Trash2, UserRound } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KartaSozlama, { type Maydon } from "../XaridorUchot/KartaSozlama";
import KorinishTanlov, { type Korinish } from "../XaridorUchot/KorinishTanlov";
import XodimFormaModal from "./XodimFormaModal";
import XodimTafsilotlariModal from "./XodimTafsilotlariModal";
import { mockTarix } from "./mockData";
import type { Bolim, Lavozim, Xodim } from "./types";
import {
  asosiyTelefon,
  bosHarflar,
  holatMatni,
  holatRangi,
  lavozimNomi,
  sanaFormat,
  summaFormat,
  xodimNomi,
} from "./yordamchilar";

type Props = {
  xodimlar: Xodim[];
  lavozimlar: Lavozim[];
  bolimlar: Bolim[];
  onSaqlash: (xodim: Xodim) => void;
  onOchirish: (id: string) => void;
};

const kartaMaydonlari: Maydon[] = [
  { id: "ism", nom: "Ism Familiya" },
  { id: "lavozim", nom: "Lavozim" },
  { id: "tel", nom: "Tel nomer" },
  { id: "filial", nom: "Filial" },
  { id: "oylik", nom: "Oylik" },
  { id: "ishBoshlagan", nom: "Ishga kirgan sana" },
];

export default function Xodimlar({ xodimlar, lavozimlar, bolimlar, onSaqlash, onOchirish }: Props) {
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("karta");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirXodim, setTahrirXodim] = useState<Xodim | null>(null);
  const [tafsilotXodim, setTafsilotXodim] = useState<Xodim | null>(null);
  const [yashirinMaydon, setYashirinMaydon] = useState<Set<string>>(() => new Set());

  function maydonToggle(id: string) {
    setYashirinMaydon((oldingi) => {
      const yangi = new Set(oldingi);
      if (yangi.has(id)) yangi.delete(id);
      else yangi.add(id);
      return yangi;
    });
  }

  const korinadi = (id: string) => !yashirinMaydon.has(id);

  const ustunlar: Ustun<Xodim>[] = [
    { id: "ism", nom: "Ismi", kenglik: 130, katak: (x) => <span className="font-black text-slate-900">{x.ism}</span> },
    { id: "familiya", nom: "Familiya", kenglik: 140, katak: (x) => <span className="text-slate-600">{x.familiya}</span> },
    { id: "login", nom: "Login", kenglik: 140, katak: (x) => <span className="text-slate-500">{x.login}</span> },
    { id: "tel", nom: "Tel nomer", kenglik: 160, katak: (x) => <span className="text-slate-500">{asosiyTelefon(x) || "—"}</span> },
    {
      id: "lavozim",
      nom: "Lavozim",
      kenglik: 150,
      katak: (x) => <span className="text-slate-500">{lavozimNomi(lavozimlar, x.lavozimId) || "—"}</span>,
    },
    {
      id: "bolim",
      nom: "Bo'lim",
      kenglik: 170,
      katak: (x) => (
        <span className="text-slate-500">
          {bolimlar.find((bolim) => bolim.id === x.bolimId)?.nomi ?? "—"}
        </span>
      ),
    },
    { id: "filial", nom: "Filial", kenglik: 160, katak: (x) => <span className="text-slate-500">{x.filial || "—"}</span> },
    {
      id: "holat",
      nom: "Holat",
      kenglik: 130,
      katak: (x) => (
        <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${holatRangi[x.holat]}`}>
          {holatMatni[x.holat]}
        </span>
      ),
    },
    {
      id: "oylik",
      nom: "Oylik",
      kenglik: 150,
      hizalash: "right",
      katak: (x) => <span className="font-bold text-slate-600">{x.oylik ? summaFormat(x.oylik) : "—"}</span>,
    },
    {
      id: "ishBoshlagan",
      nom: "Ishga kirgan sana",
      kenglik: 150,
      katak: (x) => <span className="text-slate-500">{sanaFormat(x.ishBoshlaganSana)}</span>,
    },
    { id: "yaratgan", nom: "Yaratgan mas'ul shaxs", kenglik: 170, katak: (x) => <span className="text-slate-500">{x.yaratganMasul}</span> },
    {
      id: "ozgartirilgan",
      nom: "O'zgartirilgan sana",
      kenglik: 150,
      katak: (x) => <span className="text-slate-500">{sanaFormat(x.ozgartirilganSana)}</span>,
    },
  ];

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return xodimlar;
    return xodimlar.filter((xodim) =>
      [
        xodimNomi(xodim),
        xodim.login,
        xodim.telefonlar.join(" "),
        xodim.filial,
        xodim.manzil,
        lavozimNomi(lavozimlar, xodim.lavozimId),
        holatMatni[xodim.holat],
      ]
        .join(" ")
        .toLowerCase()
        .includes(soz)
    );
  }, [lavozimlar, qidiruv, xodimlar]);

  function modalniOchish(xodim?: Xodim) {
    setTahrirXodim(xodim ?? null);
    setModalOchiq(true);
  }

  function ochirish(xodim: Xodim) {
    if (!window.confirm(`${xodimNomi(xodim)} ma'lumotini o'chirasizmi?`)) return;
    onOchirish(xodim.id);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Xodim uchoti
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Xodimlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Xodimlarni yaratish, lavozim va vakolatlarini biriktirish.
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
              placeholder="Ism, login, telefon, lavozim yoki filial..."
            />
          </label>
          <KorinishTanlov qiymat={korinish} onChange={setKorinish} />
        </div>

        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Xodim qo'shish
        </button>
      </div>

      {korinish === "jadval" && (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={setTafsilotXodim}
          onQatorOchirish={ochirish}
        />
      )}

      {korinish === "karta" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {royxat.map((xodim) => (
            <article
              key={xodim.id}
              onClick={() => setTafsilotXodim(xodim)}
              className="cursor-pointer rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-sm font-black text-orange-500">
                  {bosHarflar(xodim) || <UserRound size={22} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${holatRangi[xodim.holat]}`}>
                    {holatMatni[xodim.holat]}
                  </span>
                  <KartaSozlama
                    maydonlar={kartaMaydonlari}
                    yashirin={yashirinMaydon}
                    onToggle={maydonToggle}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      ochirish(xodim);
                    }}
                    title="O'chirish"
                    aria-label="O'chirish"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {korinadi("ism") && (
                <h2 className="mt-5 text-xl font-black text-gray-950">{xodimNomi(xodim)}</h2>
              )}

              {korinadi("lavozim") && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
                  <Briefcase size={14} className="text-orange-400" />
                  {lavozimNomi(lavozimlar, xodim.lavozimId) || "Lavozim biriktirilmagan"}
                </p>
              )}

              {korinadi("tel") && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
                  <Phone size={14} className="text-orange-400" />
                  {asosiyTelefon(xodim) || "—"}
                  {xodim.telefonlar.length > 1 && (
                    <span className="rounded-lg bg-orange-50 px-1.5 py-0.5 text-xs font-black text-orange-500">
                      +{xodim.telefonlar.length - 1}
                    </span>
                  )}
                </p>
              )}

              {korinadi("filial") && xodim.filial && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                  <Building2 size={14} className="text-orange-400" />
                  {xodim.filial}
                </p>
              )}

              {(korinadi("oylik") || korinadi("ishBoshlagan")) && (
                <div className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-sm">
                  {korinadi("oylik") && (
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-gray-400">Oylik</span>
                      <span className="font-semibold text-gray-600">
                        {xodim.oylik ? summaFormat(xodim.oylik) : "—"}
                      </span>
                    </p>
                  )}
                  {korinadi("ishBoshlagan") && (
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-gray-400">Ishga kirgan</span>
                      <span className="font-semibold text-gray-600">
                        {sanaFormat(xodim.ishBoshlaganSana)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}

          {royxat.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center">
              <UserRound className="mx-auto text-orange-200" size={42} />
              <p className="mt-3 font-bold text-gray-500">Xodim mavjud emas</p>
            </div>
          )}
        </div>
      )}

      {tafsilotXodim && (
        <XodimTafsilotlariModal
          xodim={tafsilotXodim}
          lavozimlar={lavozimlar}
          bolimlar={bolimlar}
          tarix={mockTarix}
          onTahrirlash={() => modalniOchish(tafsilotXodim)}
          onOchirish={() => {
            ochirish(tafsilotXodim);
            setTafsilotXodim(null);
          }}
          onYopish={() => setTafsilotXodim(null)}
        />
      )}

      {modalOchiq && (
        <XodimFormaModal
          boshlangich={tahrirXodim}
          lavozimlar={lavozimlar}
          bolimlar={bolimlar}
          tarix={mockTarix}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={(xodim) => {
            onSaqlash(xodim);
            setTafsilotXodim((joriy) => (joriy?.id === xodim.id ? xodim : joriy));
            setModalOchiq(false);
          }}
        />
      )}
    </div>
  );
}
