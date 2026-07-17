import { useState } from "react";
import { Bell, MessageSquare, Package, Wallet } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KirimModal from "./KirimModal";
import XaridorSavdoModal from "./XaridorSavdoModal";
import XaridorTafsilotlariModal from "./XaridorTafsilotlariModal";
import XodimModal from "./XodimModal";
import {
  mockKompaniyalar,
  mockSavdolar,
  mockTarix,
  mockTolovlar,
  xodimTopish,
} from "./mockData";
import type { Kirim, TarixYozuvi, Xaridor, XaridorSavdosi, XaridorTolovi, Xodim } from "./types";
import {
  kirimHolatMatni,
  kirimHolatRangi,
  qisqaVaqt,
  sanaFormat,
  summaFormat,
  tolovTuriMatni,
} from "./yordamchilar";

// Tafsilotlar va yaratish (tahrirlash) modalkalari uchun umumiy jadval tablari.
// Savdolar/To'lovlar ustunlari sudrab kengaytiriladi (resize) va joyi almashtiriladi (reorder).

// Bosiladigan katak — havolaga o'xshab, sichqoncha ostida to'q sariqga aylanadi.
function BosiladiganKatak({
  onClick,
  className = "",
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`max-w-full truncate text-left transition hover:text-[#FF6A00] hover:underline ${className}`}
    >
      {children}
    </button>
  );
}

export function SavdolarTab({
  savdolar,
  xaridorNomi = "—",
  xaridorNomiOlish,
  xaridorOlish,
}: {
  savdolar: XaridorSavdosi[];
  xaridorNomi?: string;
  // Kompaniya kontekstida har savdo boshqa xaridorники — nomni qatorma-qator olamiz.
  xaridorNomiOlish?: (savdo: XaridorSavdosi) => string;
  // "Xaridor" katagini bosganda ochish uchun to'liq xaridor obyektini qaytaradi.
  xaridorOlish?: (savdo: XaridorSavdosi) => Xaridor | undefined;
}) {
  const [korilayotganSavdo, setKorilayotganSavdo] = useState<XaridorSavdosi | null>(null);
  const [korilayotganXaridor, setKorilayotganXaridor] = useState<Xaridor | null>(null);
  const [korilayotganXodim, setKorilayotganXodim] = useState<Xodim | null>(null);

  const nomOlish = (savdo: XaridorSavdosi) =>
    xaridorNomiOlish ? xaridorNomiOlish(savdo) : xaridorNomi;

  if (savdolar.length === 0) return <BoshHolat matn="Savdolar yo'q" />;

  const ustunlar: Ustun<XaridorSavdosi>[] = [
    {
      id: "nomi",
      nom: "Nomi",
      kenglik: 200,
      katak: (savdo) => (
        <BosiladiganKatak
          onClick={() => setKorilayotganSavdo(savdo)}
          className="font-black text-slate-900"
        >
          {savdo.nomi}
        </BosiladiganKatak>
      ),
    },
    {
      id: "xaridor",
      nom: "Xaridor",
      kenglik: 170,
      katak: (savdo) => (
        <BosiladiganKatak
          onClick={() => {
            const xaridor = xaridorOlish?.(savdo);
            if (xaridor) setKorilayotganXaridor(xaridor);
          }}
          className="text-slate-500"
        >
          {nomOlish(savdo)}
        </BosiladiganKatak>
      ),
    },
    {
      id: "masul",
      nom: "Mas'ul shaxs",
      kenglik: 170,
      katak: (savdo) => (
        <BosiladiganKatak
          onClick={() => setKorilayotganXodim(xodimTopish(savdo.masul))}
          className="text-slate-500"
        >
          {savdo.masul}
        </BosiladiganKatak>
      ),
    },
    {
      id: "sana",
      nom: "Yaratilgan sana",
      kenglik: 150,
      katak: (savdo) => <span className="text-slate-500">{sanaFormat(savdo.sana)}</span>,
    },
    {
      id: "summa",
      nom: "Summa",
      kenglik: 140,
      katak: (savdo) => <span className="font-bold text-slate-700">{summaFormat(savdo.summa)}</span>,
    },
  ];

  return (
    <div className="px-9 py-7">
      <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={savdolar} kengaytir sozlamaBor />

      {korilayotganSavdo && (
        <XaridorSavdoModal
          savdo={korilayotganSavdo}
          xaridorNomi={nomOlish(korilayotganSavdo)}
          onYopish={() => setKorilayotganSavdo(null)}
        />
      )}

      {korilayotganXaridor && (
        <XaridorTafsilotlariModal
          xaridor={korilayotganXaridor}
          kompaniyalar={mockKompaniyalar}
          savdolar={mockSavdolar}
          tolovlar={mockTolovlar}
          tarix={mockTarix}
          onTahrirlash={() => {}}
          onYopish={() => setKorilayotganXaridor(null)}
        />
      )}

      {korilayotganXodim && (
        <XodimModal xodim={korilayotganXodim} onYopish={() => setKorilayotganXodim(null)} />
      )}
    </div>
  );
}

export function KirimTab({
  kirimlar,
  beruvchiNomi = "—",
}: {
  kirimlar: Kirim[];
  beruvchiNomi?: string;
}) {
  const [korilayotganKirim, setKorilayotganKirim] = useState<Kirim | null>(null);
  const [korilayotganXodim, setKorilayotganXodim] = useState<Xodim | null>(null);

  if (kirimlar.length === 0) return <BoshHolat matn="Kirimlar yo'q" />;

  const ustunlar: Ustun<Kirim>[] = [
    {
      id: "nomi",
      nom: "Nomi",
      kenglik: 200,
      katak: (kirim) => (
        <BosiladiganKatak
          onClick={() => setKorilayotganKirim(kirim)}
          className="font-black text-slate-900"
        >
          {kirim.nomi}
        </BosiladiganKatak>
      ),
    },
    {
      id: "ombor",
      nom: "Ombor",
      kenglik: 170,
      katak: (kirim) => <span className="text-slate-500">{kirim.ombor}</span>,
    },
    {
      id: "masul",
      nom: "Mas'ul shaxs",
      kenglik: 170,
      katak: (kirim) => (
        <BosiladiganKatak
          onClick={() => setKorilayotganXodim(xodimTopish(kirim.masul))}
          className="text-slate-500"
        >
          {kirim.masul}
        </BosiladiganKatak>
      ),
    },
    {
      id: "holat",
      nom: "Holat",
      kenglik: 150,
      katak: (kirim) => (
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${kirimHolatRangi[kirim.holat]}`}
        >
          {kirimHolatMatni[kirim.holat]}
        </span>
      ),
    },
    {
      id: "sana",
      nom: "Yaratilgan sana",
      kenglik: 150,
      katak: (kirim) => <span className="text-slate-500">{sanaFormat(kirim.sana)}</span>,
    },
    {
      id: "summa",
      nom: "Summa",
      kenglik: 140,
      katak: (kirim) => <span className="font-bold text-slate-700">{summaFormat(kirim.summa)}</span>,
    },
  ];

  return (
    <div className="px-9 py-7">
      <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={kirimlar} kengaytir sozlamaBor />

      {korilayotganKirim && (
        <KirimModal
          kirim={korilayotganKirim}
          beruvchiNomi={beruvchiNomi}
          onYopish={() => setKorilayotganKirim(null)}
        />
      )}

      {korilayotganXodim && (
        <XodimModal xodim={korilayotganXodim} onYopish={() => setKorilayotganXodim(null)} />
      )}
    </div>
  );
}

export function TolovlarTab({ tolovlar }: { tolovlar: XaridorTolovi[] }) {
  if (tolovlar.length === 0) return <BoshHolat matn="Bu xaridorda to'lovlar yo'q" />;

  const ustunlar: Ustun<XaridorTolovi>[] = [
    {
      id: "sana",
      nom: "Sana",
      kenglik: 120,
      katak: (tolov) => <span className="text-slate-500">{sanaFormat(tolov.sana)}</span>,
    },
    {
      id: "savdo",
      nom: "Savdo",
      kenglik: 130,
      katak: (tolov) => <span className="font-black text-slate-900">{tolov.savdoRaqami}</span>,
    },
    {
      id: "turi",
      nom: "Turi",
      kenglik: 160,
      katak: (tolov) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#FF6A00]">
          <Wallet size={13} />
          {tolovTuriMatni[tolov.turi]}
        </span>
      ),
    },
    {
      id: "izoh",
      nom: "Izoh",
      kenglik: 190,
      katak: (tolov) => <span className="text-slate-500">{tolov.izoh || "—"}</span>,
    },
    {
      id: "summa",
      nom: "Summa",
      kenglik: 140,
      katak: (tolov) => (
        <span className="font-black text-emerald-600">{summaFormat(tolov.summa)}</span>
      ),
    },
  ];

  return (
    <div className="px-9 py-7">
      <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={tolovlar} kengaytir sozlamaBor />
    </div>
  );
}

export function TarixTab({ tarix }: { tarix: TarixYozuvi[] }) {
  if (tarix.length === 0) return <BoshHolat matn="Tarix bo'sh" />;

  return (
    <div className="px-9 py-7">
      <ol className="relative space-y-5 border-l-2 border-orange-100 pl-8">
        {tarix.map((yozuv) => (
          <li key={yozuv.id} className="relative">
            <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#FF6A00] ring-2 ring-orange-100">
              <TarixIkonka turi={yozuv.turi} />
            </span>
            <div className="rounded-[22px] bg-white/92 p-5 shadow-[0_14px_36px_rgba(255,106,0,.07)] ring-1 ring-orange-100/70">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-black text-slate-900">{yozuv.sarlavha}</h3>
                <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-bold text-[#FF6A00]">
                  {sanaFormat(yozuv.sana)} · {qisqaVaqt(yozuv.sana)}
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-6 text-slate-600">{yozuv.matn}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">{yozuv.muallif}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TarixIkonka({ turi }: { turi: TarixYozuvi["turi"] }) {
  if (turi === "savdo") return <Package size={15} />;
  if (turi === "tolov") return <Wallet size={15} />;
  if (turi === "izoh") return <MessageSquare size={15} />;
  return <Bell size={15} />;
}

export function BoshHolat({ matn }: { matn: string }) {
  return (
    <div className="px-9 py-7">
      <p className="rounded-[26px] border border-dashed border-orange-200 bg-white/60 p-16 text-center font-bold text-slate-400">
        {matn}
      </p>
    </div>
  );
}
