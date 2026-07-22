import { CalendarDays, MessageSquare, PenLine, ShieldCheck } from "lucide-react";
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

  return (
    <div className="space-y-5 px-9 py-7">
      <p className="rounded-2xl bg-white/92 px-5 py-4 text-sm font-semibold text-slate-500 ring-1 ring-orange-100/80">
        <span className="font-black text-slate-700">{lavozim?.nomi ?? "Lavozim biriktirilmagan"}</span>{" "}
        lavozimidan kelgan vakolatlar va shaxsan biriktirilgan qo'shimcha vakolatlar. O'zgartirish
        uchun "Ma'lumotni o'zgartirish" oynasidan foydalaning.
      </p>

      {guruhlar.map((guruh) => (
        <section
          key={guruh}
          className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80"
        >
          <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
            {guruh}
          </h2>
          <ul className="mt-4 space-y-3">
            {backendVakolatlar
              .filter((vakolat) => vakolat.guruh === guruh)
              .map((vakolat) => {
                const lavozimda = lavozimdan.has(vakolat.kod);
                const shaxsiyda = shaxsiy.has(vakolat.kod);
                const bor = lavozimda || shaxsiyda;
                return (
                  <li key={vakolat.kod} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`text-sm font-black ${bor ? "text-slate-800" : "text-slate-400"}`}>
                        {vakolat.nom}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">{vakolat.izoh}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${
                        shaxsiyda
                          ? "bg-orange-50 text-[#FF6A00]"
                          : lavozimda
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {shaxsiyda ? "Shaxsiy" : lavozimda ? "Lavozimdan" : "Yo'q"}
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
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
              className="flex gap-4 rounded-[22px] bg-white/92 p-5 shadow-[0_14px_36px_rgba(255,106,0,.06)] ring-1 ring-orange-100/80"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E2] text-[#FF6A00]">
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
