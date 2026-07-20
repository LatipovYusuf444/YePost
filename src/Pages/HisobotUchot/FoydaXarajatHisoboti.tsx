import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import MuddatTanlov from "./MuddatTanlov";
import KopTanlovli from "./KopTanlovli";
import { mockFiliallar, mockFoydaXarajat } from "./mockData";
import { bugun, bugunMinus, pul, sanadaMi } from "./yordamchilar";

// Foyda va xarajat (P&L) hisoboti — Daromad − Tannarx = Yalpi foyda − Xarajat = Sof foyda.
// Muddat/Filial bo'yicha filtrlanadi. Backendsiz mock.
type SatrModeli = { kategoriya: string; summa: number };

function guruhla(rows: typeof mockFoydaXarajat, tur: "daromad" | "tannarx" | "xarajat"): SatrModeli[] {
  const map = new Map<string, number>();
  rows.filter((r) => r.tur === tur).forEach((r) => map.set(r.kategoriya, (map.get(r.kategoriya) ?? 0) + r.summa));
  return [...map.entries()].map(([kategoriya, summa]) => ({ kategoriya, summa })).sort((a, b) => b.summa - a.summa);
}

function foiz(qism: number, butun: number) {
  return butun ? `${((qism / butun) * 100).toFixed(1)}%` : "—";
}

function csvYuklash(qatorlar: (string | number)[][]) {
  const satrlar = qatorlar.map((qator) =>
    qator.map((katak) => `"${String(katak).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + satrlar.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "foyda-xarajat.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function FoydaXarajatHisoboti() {
  const [dateFrom, setDateFrom] = useState(bugunMinus(30));
  const [dateTo, setDateTo] = useState(bugun());
  const [filiallar, setFiliallar] = useState<string[]>([]);

  const hisob = useMemo(() => {
    const rows = mockFoydaXarajat.filter(
      (r) => sanadaMi(r.sana, dateFrom, dateTo) && (filiallar.length === 0 || filiallar.includes(r.filialId))
    );
    const daromadlar = guruhla(rows, "daromad");
    const tannarxlar = guruhla(rows, "tannarx");
    const xarajatlar = guruhla(rows, "xarajat");
    const jam = (s: SatrModeli[]) => s.reduce((a, b) => a + b.summa, 0);
    const daromad = jam(daromadlar);
    const tannarx = jam(tannarxlar);
    const xarajat = jam(xarajatlar);
    const yalpi = daromad - tannarx;
    const sof = yalpi - xarajat;
    return { daromadlar, tannarxlar, xarajatlar, daromad, tannarx, xarajat, yalpi, sof };
  }, [dateFrom, dateTo, filiallar]);

  function eksport() {
    const q: (string | number)[][] = [["Bo'lim", "Kategoriya", "Summa"]];
    hisob.daromadlar.forEach((r) => q.push(["Daromad", r.kategoriya, r.summa]));
    q.push(["", "Jami daromad", hisob.daromad]);
    hisob.tannarxlar.forEach((r) => q.push(["Tannarx", r.kategoriya, r.summa]));
    q.push(["", "Yalpi foyda", hisob.yalpi]);
    hisob.xarajatlar.forEach((r) => q.push(["Xarajat", r.kategoriya, r.summa]));
    q.push(["", "Jami xarajat", hisob.xarajat]);
    q.push(["", "Sof foyda", hisob.sof]);
    csvYuklash(q);
  }

  return (
    <div className="space-y-5">
      {/* Filter paneli */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <MuddatTanlov
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />
          <KopTanlovli label="Filial" options={mockFiliallar} selected={filiallar} onChange={setFiliallar} />
        </div>
      </section>

      <button
        onClick={eksport}
        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
      >
        <Download size={16} />
        Excel (CSV)
      </button>

      {/* Hisobot (statement) */}
      <section className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm">
        <Bolim nom="Daromad" />
        {hisob.daromadlar.length === 0 ? (
          <BoshQator matn="Daromad yozuvlari yo'q" />
        ) : (
          hisob.daromadlar.map((r) => <Satr key={r.kategoriya} nom={r.kategoriya} summa={r.summa} rang="text-emerald-600" />)
        )}
        <Satr nom="Jami daromad" summa={hisob.daromad} rang="text-emerald-600" jami />

        <Bolim nom="Sotilgan tovar tannarxi" />
        {hisob.tannarxlar.map((r) => (
          <Satr key={r.kategoriya} nom={r.kategoriya} summa={-r.summa} rang="text-red-500" />
        ))}

        <Yakun nom="Yalpi foyda" summa={hisob.yalpi} izoh={`Rentabellik ${foiz(hisob.yalpi, hisob.daromad)}`} />

        <Bolim nom="Operatsion xarajatlar" />
        {hisob.xarajatlar.length === 0 ? (
          <BoshQator matn="Xarajat yozuvlari yo'q" />
        ) : (
          hisob.xarajatlar.map((r) => <Satr key={r.kategoriya} nom={r.kategoriya} summa={-r.summa} rang="text-red-500" />)
        )}
        <Satr nom="Jami xarajatlar" summa={-hisob.xarajat} rang="text-red-500" jami />

        <Yakun nom="Sof foyda" summa={hisob.sof} izoh={`Rentabellik ${foiz(hisob.sof, hisob.daromad)}`} asosiy />
      </section>
    </div>
  );
}

function Bolim({ nom }: { nom: string }) {
  return (
    <div className="border-b border-orange-100 bg-orange-50/50 px-6 py-3 text-xs font-black uppercase tracking-wide text-orange-500">
      {nom}
    </div>
  );
}

function Satr({ nom, summa, rang, jami }: { nom: string; summa: number; rang: string; jami?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-orange-50 px-6 py-3 ${
        jami ? "bg-orange-50/30" : ""
      }`}
    >
      <span className={`${jami ? "font-black text-gray-800" : "pl-3 font-semibold text-gray-600"}`}>{nom}</span>
      <span className={`tabular-nums ${jami ? "font-black" : "font-bold"} ${rang}`}>{pul(summa)}</span>
    </div>
  );
}

function Yakun({ nom, summa, izoh, asosiy }: { nom: string; summa: number; izoh?: string; asosiy?: boolean }) {
  const rang = summa >= 0 ? "text-emerald-600" : "text-red-500";
  return (
    <div
      className={`flex items-center justify-between border-b border-orange-100 px-6 ${
        asosiy ? "bg-orange-500/95 py-5" : "bg-orange-50/70 py-4"
      }`}
    >
      <div>
        <p className={`font-black ${asosiy ? "text-lg text-white" : "text-gray-900"}`}>{nom}</p>
        {izoh && <p className={`text-xs font-semibold ${asosiy ? "text-orange-100" : "text-gray-400"}`}>{izoh}</p>}
      </div>
      <span className={`tabular-nums text-xl font-black ${asosiy ? "text-white" : rang}`}>{pul(summa)}</span>
    </div>
  );
}

function BoshQator({ matn }: { matn: string }) {
  return <div className="px-6 py-4 text-sm font-semibold text-gray-400">{matn}</div>;
}
