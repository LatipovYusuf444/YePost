import { useMemo, useState } from "react";
import { CalendarDays, Clock, TriangleAlert, UserCheck } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import { mockDavomat } from "./mockData";
import type { Davomat as DavomatYozuvi, DavomatHolati, Xodim } from "./types";
import {
  davomatMatni,
  davomatRangi,
  ishSoati,
  maydonKlass,
  sanaFormat,
  xodimNomi,
} from "./yordamchilar";

type Props = { xodimlar: Xodim[] };

const holatlar: Array<DavomatHolati | "barchasi"> = ["barchasi", "keldi", "kechikdi", "kelmadi", "tatil"];

function sanaMinus(kun: number) {
  const sana = new Date();
  sana.setDate(sana.getDate() - kun);
  return sana.toISOString().slice(0, 10);
}

export default function Davomat({ xodimlar }: Props) {
  const [sanadan, setSanadan] = useState(sanaMinus(13));
  const [sanagacha, setSanagacha] = useState(sanaMinus(0));
  const [xodimId, setXodimId] = useState("");
  const [holat, setHolat] = useState<DavomatHolati | "barchasi">("barchasi");

  const nomOlish = (id: string) => {
    const xodim = xodimlar.find((item) => item.id === id);
    return xodim ? xodimNomi(xodim) : "—";
  };

  const royxat = useMemo(
    () =>
      mockDavomat.filter((yozuv) => {
        if (sanadan && yozuv.sana < sanadan) return false;
        if (sanagacha && yozuv.sana > sanagacha) return false;
        if (xodimId && yozuv.xodimId !== xodimId) return false;
        if (holat !== "barchasi" && yozuv.holat !== holat) return false;
        return true;
      }),
    [holat, sanadan, sanagacha, xodimId]
  );

  const statistika = useMemo(() => {
    const soatlar = royxat.reduce((sum, yozuv) => sum + ishSoati(yozuv.kelgan, yozuv.ketgan), 0);
    return {
      keldi: royxat.filter((yozuv) => yozuv.holat === "keldi").length,
      kechikdi: royxat.filter((yozuv) => yozuv.holat === "kechikdi").length,
      kelmadi: royxat.filter((yozuv) => yozuv.holat === "kelmadi").length,
      soat: Math.round(soatlar * 10) / 10,
    };
  }, [royxat]);

  const ustunlar: Ustun<DavomatYozuvi>[] = [
    {
      id: "xodim",
      nom: "Xodim",
      kenglik: 190,
      katak: (d) => <span className="font-black text-slate-900">{nomOlish(d.xodimId)}</span>,
    },
    { id: "sana", nom: "Sana", kenglik: 130, katak: (d) => <span className="text-slate-500">{sanaFormat(d.sana)}</span> },
    {
      id: "holat",
      nom: "Holat",
      kenglik: 130,
      katak: (d) => (
        <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${davomatRangi[d.holat]}`}>
          {davomatMatni[d.holat]}
        </span>
      ),
    },
    { id: "kelgan", nom: "Kelgan", kenglik: 110, katak: (d) => <span className="text-slate-500">{d.kelgan || "—"}</span> },
    { id: "ketgan", nom: "Ketgan", kenglik: 110, katak: (d) => <span className="text-slate-500">{d.ketgan || "—"}</span> },
    {
      id: "soat",
      nom: "Ish soati",
      kenglik: 110,
      hizalash: "right",
      katak: (d) => {
        const soat = ishSoati(d.kelgan, d.ketgan);
        return <span className="font-bold text-slate-600">{soat ? `${soat}` : "—"}</span>;
      },
      jami: () => <span className="font-black text-slate-900">{statistika.soat}</span>,
    },
    { id: "izoh", nom: "Izoh", kenglik: 170, katak: (d) => <span className="text-slate-500">{d.izoh || "—"}</span> },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Xodim uchoti</p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">Davomat</h1>
        <p className="mt-1 text-sm text-gray-500">Kelish-ketish vaqti va ish soatlari nazorati.</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
            <CalendarDays size={14} className="text-[#FF6A00]" />
            Muddat
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={sanadan}
              onChange={(event) => setSanadan(event.target.value)}
              className={maydonKlass}
            />
            <span className="text-slate-300">—</span>
            <input
              type="date"
              value={sanagacha}
              onChange={(event) => setSanagacha(event.target.value)}
              className={maydonKlass}
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-400">Xodim</span>
          <select
            value={xodimId}
            onChange={(event) => setXodimId(event.target.value)}
            className={maydonKlass}
          >
            <option value="">Barcha xodimlar</option>
            {xodimlar.map((xodim) => (
              <option key={xodim.id} value={xodim.id}>
                {xodimNomi(xodim)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-400">Holat</span>
          <select
            value={holat}
            onChange={(event) => setHolat(event.target.value as DavomatHolati | "barchasi")}
            className={maydonKlass}
          >
            {holatlar.map((item) => (
              <option key={item} value={item}>
                {item === "barchasi" ? "Barchasi" : davomatMatni[item]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSanadan(sanaMinus(13));
              setSanagacha(sanaMinus(0));
              setXodimId("");
              setHolat("barchasi");
            }}
            className="h-11 w-full rounded-xl border border-orange-100 bg-orange-50 text-sm font-black text-[#FF6A00] transition hover:bg-orange-100"
          >
            Filterni tozalash
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Karta ikonka={<UserCheck size={18} />} nom="Keldi" qiymat={`${statistika.keldi} kun`} rang="text-emerald-600 bg-emerald-50" />
        <Karta ikonka={<Clock size={18} />} nom="Kechikdi" qiymat={`${statistika.kechikdi} kun`} rang="text-orange-600 bg-orange-50" />
        <Karta ikonka={<TriangleAlert size={18} />} nom="Kelmadi" qiymat={`${statistika.kelmadi} kun`} rang="text-red-500 bg-red-50" />
        <Karta ikonka={<Clock size={18} />} nom="Jami ish soati" qiymat={`${statistika.soat} soat`} rang="text-sky-600 bg-sky-50" />
      </section>

      {royxat.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center font-bold text-gray-400">
          Tanlangan filter bo'yicha davomat yozuvi yo'q
        </p>
      ) : (
        <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={royxat} kengaytir sozlamaBor jamiBor />
      )}
    </div>
  );
}

function Karta({
  ikonka,
  nom,
  qiymat,
  rang,
}: {
  ikonka: React.ReactNode;
  nom: string;
  qiymat: string;
  rang: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${rang}`}>{ikonka}</span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{nom}</p>
        <p className="text-xl font-black text-slate-900">{qiymat}</p>
      </div>
    </div>
  );
}
