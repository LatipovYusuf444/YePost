import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Briefcase, Building2, CalendarDays, Phone, Plus, Search, Trash2, UserRound, Wallet } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KartaSozlama, { type Maydon } from "../XaridorUchot/KartaSozlama";
import KorinishTanlov, { type Korinish } from "../XaridorUchot/KorinishTanlov";
import XodimFormaModal from "./XodimFormaModal";
import XodimTafsilotlariModal from "./XodimTafsilotlariModal";
import type { Bolim, Lavozim, Xodim } from "./types";
import AvatarRasm from "@/Components/common/AvatarRasm";
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
  filiallar?: Array<{ id: string; nomi: string }>;
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

// Karta bannerining rangi xodim holatiga qarab o'zgaradi.
const BANNER_RANGI: Record<string, string> = {
  faol: "from-gold-500 via-gold-600 to-slate-900",
  tatilda: "from-sky-400 via-sky-500 to-slate-800",
  "ishdan-ketgan": "from-slate-400 via-slate-500 to-slate-800",
};

export default function Xodimlar({ xodimlar, lavozimlar, bolimlar, filiallar = [], onSaqlash, onOchirish }: Props) {
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
      katak: (x) => <span className="text-slate-500">{lavozimNomi(lavozimlar, x.lavozimId, x.izoh) || "—"}</span>,
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
      katak: (x) => (
        <span className="font-bold text-slate-600">
          {x.oylik !== null ? summaFormat(x.oylik) : "—"}
        </span>
      ),
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
        lavozimNomi(lavozimlar, xodim.lavozimId, xodim.izoh),
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
          {royxat.map((xodim, index) => (
            <motion.article
              key={xodim.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setTafsilotXodim(xodim)}
              className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-gold-200 hover:shadow-[0_22px_48px_rgba(37,99,235,.14)]"
            >
              {/* Yuqori qism: gradient fon, holat va amallar */}
              <div className={`relative h-24 bg-gradient-to-br ${BANNER_RANGI[xodim.holat] ?? BANNER_RANGI.faol}`}>
                <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
                <span aria-hidden className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-white/5" />
                <div className="relative flex items-start justify-between gap-2 p-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black shadow-sm ${holatRangi[xodim.holat]}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {holatMatni[xodim.holat]}
                  </span>
                  <div className="flex items-center gap-1.5">
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
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-red-500 shadow-sm transition hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <div className="relative z-10 -mt-10 flex items-end justify-between gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,.18)] transition duration-300 group-hover:scale-105 group-hover:-rotate-3">
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-gold-400 to-gold-600 text-2xl font-black tracking-wide text-white">
                      <AvatarRasm userId={xodim.id} url={xodim.rasmUrl}>
                        {bosHarflar(xodim) || <UserRound size={28} />}
                      </AvatarRasm>
                    </span>
                  </div>
                </div>

                {korinadi("ism") && (
                  <h2 className="mt-3 truncate text-xl font-black tracking-tight text-slate-900">{xodimNomi(xodim)}</h2>
                )}

                {korinadi("lavozim") && (
                  <p className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1 text-xs font-bold text-gold-600">
                    <Briefcase size={13} className="shrink-0" />
                    <span className="truncate">
                      {lavozimNomi(lavozimlar, xodim.lavozimId, xodim.izoh) || "Lavozim biriktirilmagan"}
                    </span>
                  </p>
                )}

                {(korinadi("tel") || (korinadi("filial") && xodim.filial)) && (
                  <ul className="mt-4 space-y-2.5 text-sm">
                    {korinadi("tel") && (
                      <li className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition duration-300 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white">
                          <Phone size={16} />
                        </span>
                        <span className="font-bold text-slate-700">{asosiyTelefon(xodim) || "—"}</span>
                        {xodim.telefonlar.length > 1 && (
                          <span className="rounded-lg bg-gold-50 px-1.5 py-0.5 text-xs font-black text-gold-600">
                            +{xodim.telefonlar.length - 1}
                          </span>
                        )}
                      </li>
                    )}
                    {korinadi("filial") && xodim.filial && (
                      <li className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition duration-300 group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white">
                          <Building2 size={16} />
                        </span>
                        <span className="truncate font-semibold text-slate-600">{xodim.filial}</span>
                      </li>
                    )}
                  </ul>
                )}

                {(korinadi("oylik") || korinadi("ishBoshlagan")) && (
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {korinadi("oylik") && (
                      <div className="rounded-2xl bg-emerald-50/70 px-3.5 py-3 ring-1 ring-emerald-100 transition group-hover:bg-emerald-50">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                          <Wallet size={12} />
                          Oylik
                        </p>
                        <p className="mt-1 truncate text-sm font-black text-slate-800">
                          {xodim.oylik !== null ? summaFormat(xodim.oylik) : "—"}
                        </p>
                      </div>
                    )}
                    {korinadi("ishBoshlagan") && (
                      <div className="rounded-2xl bg-sky-50/70 px-3.5 py-3 ring-1 ring-sky-100 transition group-hover:bg-sky-50">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-600">
                          <CalendarDays size={12} />
                          Ishga kirgan
                        </p>
                        <p className="mt-1 truncate text-sm font-black text-slate-800">
                          {sanaFormat(xodim.ishBoshlaganSana)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.article>
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
          tarix={[]}
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
          filiallar={filiallar}
          tarix={[]}
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
