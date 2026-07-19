import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ChevronDown,
  Landmark,
  Plus,
  Search,
  Smartphone,
} from "lucide-react";
import { useUchotStore } from "@/store/uchotStore";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KassaAmaliyotModal from "./KassaAmaliyotModal";
import type { KassaAmaliyoti, KassaAmaliyotTuri, KassaKanali, KassaYonalishi } from "./types";
import { amaliyotTuriMatni, sanaFormat, summaFormat } from "./yordamchilar";

type Bolim = { yonalish: KassaYonalishi; nom: string };
type Guruh = { kanal: KassaKanali; nom: string; icon: typeof Banknote; bolimlar: Bolim[] };

// 3 ta guruh, har birining ichida 2 bo'lim (tushum/chiqim).
const guruhlar: Guruh[] = [
  {
    kanal: "naqd",
    nom: "Naqd",
    icon: Banknote,
    bolimlar: [
      { yonalish: "tushum", nom: "Naqd tushumlari" },
      { yonalish: "chiqim", nom: "Naqd chiqimlari" },
    ],
  },
  {
    kanal: "bank",
    nom: "Bank",
    icon: Landmark,
    bolimlar: [
      { yonalish: "tushum", nom: "Kiruvchi bank to'lovlari" },
      { yonalish: "chiqim", nom: "Chiquvchi bank to'lovlari" },
    ],
  },
  {
    kanal: "ilova",
    nom: "Ilova orqali",
    icon: Smartphone,
    bolimlar: [
      { yonalish: "tushum", nom: "Ilova orqali tushumlar" },
      { yonalish: "chiqim", nom: "Ilova orqali chiqimlar" },
    ],
  },
];

// Kassa uchoti — mock modul (backendsiz). 3 kanal × 2 yo'nalish.
export default function KassaUchot() {
  // Amaliyotlar umumiy store'da — xaridordan to'lov xaridor qarzini kamaytiradi.
  const amaliyotlar = useUchotStore((s) => s.amaliyotlar);
  const amaliyotSaqlash = useUchotStore((s) => s.amaliyotSaqlash);
  const amaliyotOchirish = useUchotStore((s) => s.amaliyotOchirish);
  const [kanal, setKanal] = useState<KassaKanali>("naqd");
  const [yonalish, setYonalish] = useState<KassaYonalishi>("tushum");
  const [ochiqMenyu, setOchiqMenyu] = useState<KassaKanali | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirAmaliyot, setTahrirAmaliyot] = useState<KassaAmaliyoti | null>(null);

  function modalniOchish(amaliyot?: KassaAmaliyoti) {
    setTahrirAmaliyot(amaliyot ?? null);
    setModalOchiq(true);
  }

  function saqlash(amaliyot: KassaAmaliyoti) {
    amaliyotSaqlash(amaliyot);
    // Yangi yozuv o'z bo'limiga tushib, o'sha bo'lim ochiladi.
    setKanal(amaliyot.kanal);
    setYonalish(amaliyot.yonalish);
    setModalOchiq(false);
  }

  function ochirish(amaliyot: KassaAmaliyoti) {
    if (!window.confirm(`${amaliyot.raqam} amaliyotini o'chirasizmi?`)) return;
    amaliyotOchirish(amaliyot.id);
  }

  // Bo'limga qarab modalning boshlang'ich turi.
  const boshlangichTuri: KassaAmaliyotTuri = yonalish === "tushum" ? "xaridor_tolovi" : "xarajat";

  const tushum = yonalish === "tushum";
  const joriyGuruh = guruhlar.find((g) => g.kanal === kanal) ?? guruhlar[0];
  const joriyBolim =
    joriyGuruh.bolimlar.find((b) => b.yonalish === yonalish) ?? joriyGuruh.bolimlar[0];

  function bolimniTanlash(yangiKanal: KassaKanali, yangiYonalish: KassaYonalishi) {
    setKanal(yangiKanal);
    setYonalish(yangiYonalish);
    setOchiqMenyu(null);
  }

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    return amaliyotlar.filter((amaliyot) => {
      if (amaliyot.kanal !== kanal) return false;
      if (amaliyot.yonalish !== yonalish) return false;
      if (!soz) return true;
      return [amaliyot.raqam, amaliyot.nomi, amaliyot.kontragent, amaliyot.masul, amaliyot.izoh]
        .join(" ")
        .toLowerCase()
        .includes(soz);
    });
  }, [amaliyotlar, kanal, yonalish, qidiruv]);

  const jami = royxat.reduce((sum, amaliyot) => sum + amaliyot.summa, 0);

  const ustunlar: Ustun<KassaAmaliyoti>[] = [
    {
      id: "raqam",
      nom: "Raqam",
      kenglik: 130,
      katak: (a) => <span className="font-black text-slate-900">{a.raqam}</span>,
    },
    {
      id: "nomi",
      nom: "Nomi",
      kenglik: 200,
      katak: (a) => <span className="font-semibold text-slate-700">{a.nomi}</span>,
    },
    {
      id: "kontragent",
      nom: tushum ? "Kimdan" : "Kimga",
      kenglik: 180,
      katak: (a) => <span className="text-slate-500">{a.kontragent}</span>,
    },
    {
      id: "tur",
      nom: "Tur",
      kenglik: 160,
      katak: (a) => (
        <span className="inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#FF6A00]">
          {amaliyotTuriMatni[a.turi]}
        </span>
      ),
    },
    {
      id: "masul",
      nom: "Mas'ul shaxs",
      kenglik: 160,
      katak: (a) => <span className="text-slate-500">{a.masul}</span>,
    },
    {
      id: "izoh",
      nom: "Izoh",
      kenglik: 180,
      katak: (a) => <span className="text-slate-500">{a.izoh || "—"}</span>,
    },
    {
      id: "sana",
      nom: "Sana",
      kenglik: 130,
      katak: (a) => <span className="text-slate-500">{sanaFormat(a.sana)}</span>,
    },
    {
      id: "summa",
      nom: "Summa",
      kenglik: 150,
      katak: (a) => (
        <span className={`font-black ${tushum ? "text-emerald-600" : "text-red-500"}`}>
          {tushum ? "+" : "−"} {summaFormat(a.summa)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Kassa uchoti</p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">Kassa</h1>
        <p className="mt-1 text-sm text-gray-500">
          Naqd, bank va ilova orqali tushum va chiqimlar nazorati.
        </p>
      </header>

      {/* 3 guruh — har biri ochiladi (Tushumlar / Chiqimlar) */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-sm">
        {guruhlar.map((guruh) => {
          const Ikonka = guruh.icon;
          const faolGuruh = kanal === guruh.kanal;
          const ochiq = ochiqMenyu === guruh.kanal;
          return (
            <div key={guruh.kanal} className="relative">
              <button
                type="button"
                onClick={() => setOchiqMenyu(ochiq ? null : guruh.kanal)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  faolGuruh
                    ? "bg-orange-500 text-white"
                    : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                <Ikonka size={15} />
                {guruh.nom}
                <ChevronDown size={14} className={`transition ${ochiq ? "rotate-180" : ""}`} />
              </button>

              {ochiq && (
                <>
                  <button
                    type="button"
                    aria-label="Yopish"
                    onClick={() => setOchiqMenyu(null)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute left-0 top-12 z-50 w-60 rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(92,38,8,.16)]">
                    {guruh.bolimlar.map((bolim) => {
                      const faolBolim = faolGuruh && yonalish === bolim.yonalish;
                      return (
                        <button
                          key={bolim.yonalish}
                          type="button"
                          onClick={() => bolimniTanlash(guruh.kanal, bolim.yonalish)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                            faolBolim
                              ? "bg-orange-50 text-[#FF6A00]"
                              : "text-slate-600 hover:bg-orange-50 hover:text-[#FF6A00]"
                          }`}
                        >
                          {bolim.yonalish === "tushum" ? (
                            <ArrowDownLeft size={15} className="text-emerald-500" />
                          ) : (
                            <ArrowUpRight size={15} className="text-red-500" />
                          )}
                          {bolim.nom}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Chapda: qidiruv + jami. O'ngda: yaratish tugmasi. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm">
            <Search size={17} className="text-gray-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              className="min-w-0 flex-1 text-sm font-semibold outline-none"
              placeholder="Raqam, nomi, kontragent yoki mas'ul..."
            />
          </label>

          <div
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-black ${
              tushum ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}
          >
            {tushum ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            Jami: {summaFormat(jami)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => modalniOchish()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Amaliyot yaratish
        </button>
      </div>

      {/* Joriy bo'lim nomi */}
      <h2 className="text-lg font-black text-gray-800">{joriyBolim.nom}</h2>

      {royxat.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center font-bold text-gray-400">
          {joriyBolim.nom} bo'yicha yozuv yo'q
        </p>
      ) : (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={modalniOchish}
          onQatorOchirish={ochirish}
        />
      )}

      {modalOchiq && (
        <KassaAmaliyotModal
          boshlangich={tahrirAmaliyot}
          boshlangichKanal={kanal}
          boshlangichTuri={boshlangichTuri}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={saqlash}
        />
      )}
    </div>
  );
}
