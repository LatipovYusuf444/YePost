import { CalendarDays, Check, Lock, MessageSquare, PenLine, ShieldCheck } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import { backendVakolatlar } from "./backendMetadata";
import type { Davomat, Lavozim, TarixTuri, Xodim, XodimTarixi } from "./types";
import {
  davomatMatni,
  davomatRangi,
  ishSoati,
  lavozimNomi,
  sanaFormat,
} from "./yordamchilar";

// Xodim modalkalarining ichki tablari (tafsilotlar va forma modalkasi ham ishlatadi).

export function DavomatTab({ davomat }: { davomat: Davomat[] }) {
  const ustunlar: Ustun<Davomat>[] = [
    {
      id: "sana",
      nom: "Sana",
      kenglik: 130,
      katak: (d) => <span className="font-black text-slate-900">{sanaFormat(d.sana)}</span>,
    },
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
        return <span className="font-bold text-slate-600">{soat ? `${soat} soat` : "—"}</span>;
      },
    },
    { id: "izoh", nom: "Izoh", kenglik: 180, katak: (d) => <span className="text-slate-500">{d.izoh || "—"}</span> },
  ];

  if (davomat.length === 0) return <BoshTab matn="Davomat yozuvi yo'q" />;

  return (
    <div className="px-9 py-7">
      <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={davomat} kengaytir sozlamaBor />
    </div>
  );
}

export function VakolatlarTab({ xodim, lavozimlar }: { xodim: Xodim; lavozimlar: Lavozim[] }) {
  const lavozim = lavozimlar.find((item) => item.id === xodim.lavozimId);
  const lavozimdan = new Set(lavozim?.vakolatlar ?? []);
  const shaxsiy = new Set(xodim.vakolatlar);
  const guruhlar = [...new Set(backendVakolatlar.map((vakolat) => vakolat.guruh))];

  const jami = backendVakolatlar.length;
  const berilgan = backendVakolatlar.filter((v) => lavozimdan.has(v.kod) || shaxsiy.has(v.kod)).length;
  const lavozimdanSoni = backendVakolatlar.filter((v) => lavozimdan.has(v.kod) && !shaxsiy.has(v.kod)).length;
  const shaxsiySoni = backendVakolatlar.filter((v) => shaxsiy.has(v.kod)).length;
  const foiz = jami ? Math.round((berilgan / jami) * 100) : 0;

  return (
    <div className="space-y-6 px-9 py-7">
      <section className="grid gap-5 rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
            <ShieldCheck size={26} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Lavozim</p>
            <p className="text-xl font-black text-slate-900">{lavozim?.nomi ?? (xodim.izoh || "Biriktirilmagan")}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              Lavozimdan kelgan va shaxsan biriktirilgan vakolatlar. O'zgartirish uchun "Ma'lumotni o'zgartirish" tugmasidan foydalaning.
            </p>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Statistika qiymat={berilgan} nom="Jami berilgan" rang="text-slate-900" />
            <Statistika qiymat={lavozimdanSoni} nom="Lavozimdan" rang="text-emerald-600" />
            <Statistika qiymat={shaxsiySoni} nom="Shaxsiy" rang="text-[#2563EB]" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${foiz}%` }} />
            </div>
            <span className="text-xs font-black text-slate-500">{berilgan}/{jami}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {guruhlar.map((guruh) => {
          const guruhVakolatlari = backendVakolatlar.filter((vakolat) => vakolat.guruh === guruh);
          const guruhBerilgan = guruhVakolatlari.filter((v) => lavozimdan.has(v.kod) || shaxsiy.has(v.kod)).length;

          return (
            <section
              key={guruh}
              className="overflow-hidden rounded-[26px] bg-white/92 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80"
            >
              <header className="flex items-center justify-between gap-3 border-b-2 border-slate-200 px-6 py-4">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{guruh}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${
                    guruhBerilgan === guruhVakolatlari.length
                      ? "bg-emerald-50 text-emerald-600"
                      : guruhBerilgan > 0
                        ? "bg-blue-50 text-[#2563EB]"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {guruhBerilgan}/{guruhVakolatlari.length}
                </span>
              </header>
              <ul className="divide-y-2 divide-slate-100">
                {guruhVakolatlari.map((vakolat) => {
                  const lavozimda = lavozimdan.has(vakolat.kod);
                  const shaxsiyda = shaxsiy.has(vakolat.kod);
                  const bor = lavozimda || shaxsiyda;
                  return (
                    <li key={vakolat.kod} className="flex items-center gap-4 px-6 py-4">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          bor ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-300"
                        }`}
                      >
                        {bor ? <Check size={17} strokeWidth={3} /> : <Lock size={15} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-black ${bor ? "text-slate-800" : "text-slate-400"}`}>{vakolat.nom}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">{vakolat.izoh}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${
                          shaxsiyda
                            ? "bg-blue-50 text-[#2563EB]"
                            : lavozimda
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {shaxsiyda ? "Shaxsiy" : lavozimda ? "Lavozimdan" : "Berilmagan"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Statistika({ qiymat, nom, rang }: { qiymat: number; nom: string; rang: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className={`text-2xl font-black ${rang}`}>{qiymat}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-400">{nom}</p>
    </div>
  );
}

const tarixIkonkasi: Record<TarixTuri, typeof PenLine> = {
  ozgarish: PenLine,
  izoh: MessageSquare,
  davomat: CalendarDays,
  vakolat: ShieldCheck,
};

export function TarixTab({ tarix }: { tarix: XodimTarixi[] }) {
  if (tarix.length === 0) return <BoshTab matn="Tarix yozuvi yo'q" />;

  return (
    <div className="px-9 py-7">
      <ol className="space-y-3">
        {tarix.map((yozuv) => {
          const Ikonka = tarixIkonkasi[yozuv.turi];
          return (
            <li
              key={yozuv.id}
              className="flex gap-4 rounded-[22px] bg-white/92 p-5 shadow-[0_14px_36px_rgba(37,99,235,.06)] ring-1 ring-orange-100/80"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                <Ikonka size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-slate-800">{yozuv.sarlavha}</h3>
                  <span className="text-xs font-bold text-slate-400">{sanaFormat(yozuv.sana)}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-500">{yozuv.matn}</p>
                <p className="mt-2 text-xs font-bold text-slate-400">{yozuv.muallif}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Lavozim tafsilotlarida shu lavozimdagi xodimlar ro'yxati.
export function LavozimXodimlariTab({
  xodimlar,
  lavozimlar,
}: {
  xodimlar: Xodim[];
  lavozimlar: Lavozim[];
}) {
  if (xodimlar.length === 0) return <BoshTab matn="Bu lavozimda xodim yo'q" />;

  return (
    <ul className="space-y-2">
      {xodimlar.map((xodim) => (
        <li
          key={xodim.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white px-4 py-3"
        >
          <span className="font-bold text-slate-700">
            {xodim.familiya} {xodim.ism}
          </span>
          <span className="text-xs font-bold text-slate-400">
            {lavozimNomi(lavozimlar, xodim.lavozimId)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BoshTab({ matn }: { matn: string }) {
  return (
    <div className="px-9 py-7">
      <p className="rounded-2xl border border-dashed border-orange-200 bg-white/70 p-14 text-center font-bold text-slate-400">
        {matn}
      </p>
    </div>
  );
}
