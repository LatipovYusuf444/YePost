import { useMemo, useState } from "react";
import { Building2, CircleDollarSign, RefreshCw, Search, UserRound } from "lucide-react";
import type { Sotuv } from "@/types/savdo";
import { mijozNomi, pulniFormatlash, sananiFormatlash, sotuvHolati, sotuvQarzdorlikSummasi, sotuvRaqami, sotuvSummasi, sotuvTolanganSummasi } from "@/Pages/Savdo/savdoYordamchilari";

type Props = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => Promise<void> | void;
  onYangilash: () => Promise<void> | void;
};
type Tur = "BARCHASI" | "MIJOZ" | "KOMPANIYA";

const kompaniyami = (sotuv: Sotuv) => Boolean(sotuv.clientCompanyId || sotuv.clientCompany);
const telefon = (sotuv: Sotuv) => sotuv.customer?.phone || sotuv.clientCompany?.phone || "Telefon kiritilmagan";

export default function Qarzdorliklar({ sotuvlar, onSotuvniOchish, onYangilash }: Props) {
  const [qidiruv, setQidiruv] = useState("");
  const [tur, setTur] = useState<Tur>("BARCHASI");
  const [yangilanmoqda, setYangilanmoqda] = useState(false);
  const qarzlar = useMemo(() => sotuvlar
    .filter((sotuv) => sotuvHolati(sotuv) === "CONFIRMED" && sotuvQarzdorlikSummasi(sotuv) > 0)
    .sort((a, b) => sotuvQarzdorlikSummasi(b) - sotuvQarzdorlikSummasi(a)), [sotuvlar]);
  const rows = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    return qarzlar.filter((sotuv) => {
      const turMos = tur === "BARCHASI" || (tur === "KOMPANIYA" ? kompaniyami(sotuv) : !kompaniyami(sotuv));
      return turMos && (!q || [mijozNomi(sotuv), telefon(sotuv), sotuvRaqami(sotuv)].join(" ").toLowerCase().includes(q));
    });
  }, [qarzlar, qidiruv, tur]);
  async function yangilash() {
    setYangilanmoqda(true);
    try { await onYangilash(); } finally { setYangilanmoqda(false); }
  }

  return <section className="overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_24px_70px_rgba(249,115,22,.08)]">
    <div className="bg-gradient-to-br from-[#fff8ef] via-white to-orange-50/60 px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-orange-500"><CircleDollarSign size={17}/> Savdo nazorati</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Qarzdorliklar</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Tasdiqlangan savdolardagi to'lanmagan qoldiqlar real backenddan olinadi.</p>
        </div>
        <button onClick={() => void yangilash()} disabled={yangilanmoqda} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:opacity-60">
          <RefreshCw size={17} className={yangilanmoqda ? "animate-spin" : ""}/> Yangilash
        </button>
      </div>
    </div>
    <div className="flex flex-col gap-3 border-y border-orange-100 px-6 py-5 lg:flex-row lg:justify-between sm:px-8">
      <label className="flex h-11 w-full items-center gap-3 rounded-2xl border border-orange-100 bg-[#fffaf5] px-4 focus-within:border-orange-300 lg:max-w-lg">
        <Search size={18} className="text-orange-400"/><input value={qidiruv} onChange={(e) => setQidiruv(e.target.value)} placeholder="Mijoz, telefon yoki sotuv raqami..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/>
      </label>
      <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
        {(["BARCHASI", "MIJOZ", "KOMPANIYA"] as Tur[]).map((item) => <button key={item} onClick={() => setTur(item)} className={`rounded-xl px-3 py-2 text-xs font-black sm:px-5 ${tur === item ? "bg-white text-orange-600 shadow-sm" : "text-slate-500"}`}>{item === "BARCHASI" ? "Barchasi" : item === "MIJOZ" ? "Mijozlar" : "Kompaniyalar"}</button>)}
      </div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
      <thead className="bg-[#fffaf5] text-xs font-black uppercase text-slate-400"><tr><th className="px-8 py-4">Mijoz</th><th className="px-5 py-4">Sotuv</th><th className="px-5 py-4">Jami</th><th className="px-5 py-4">To'langan</th><th className="px-5 py-4">Qarz qoldig'i</th><th className="px-5 py-4">Sana</th></tr></thead>
      <tbody className="divide-y divide-orange-100/70">{rows.map((sotuv) => <tr key={sotuv.id} onClick={() => void onSotuvniOchish(sotuv)} className="cursor-pointer hover:bg-orange-50/50">
        <td className="px-8 py-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 ring-1 ring-orange-100">{kompaniyami(sotuv) ? <Building2 size={18}/> : <UserRound size={18}/>}</span><div><p className="font-black text-slate-900">{mijozNomi(sotuv)}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{telefon(sotuv)}</p></div></div></td>
        <td className="px-5 py-5 font-black text-orange-600">{sotuvRaqami(sotuv)}</td><td className="px-5 py-5 font-bold text-slate-700">{pulniFormatlash(sotuvSummasi(sotuv))}</td><td className="px-5 py-5 font-bold text-emerald-600">{pulniFormatlash(sotuvTolanganSummasi(sotuv))}</td><td className="px-5 py-5"><span className="rounded-xl bg-red-50 px-3 py-2 font-black text-red-600 ring-1 ring-red-100">{pulniFormatlash(sotuvQarzdorlikSummasi(sotuv))}</span></td><td className="px-5 py-5 font-semibold text-slate-500">{sananiFormatlash(sotuv.confirmedAt ?? sotuv.createdAt ?? sotuv.date)}</td>
      </tr>)}</tbody>
    </table></div>
    {rows.length === 0 && <div className="px-6 py-20 text-center"><CircleDollarSign className="mx-auto text-orange-200" size={42}/><h2 className="mt-3 text-lg font-black text-slate-800">Qarzdorlik topilmadi</h2><p className="mt-1 text-sm font-semibold text-slate-400">Qidiruvni o'zgartiring yoki barcha qarzlar yopilgan.</p></div>}
    <div className="flex justify-between border-t border-orange-100 bg-[#fffaf5] px-8 py-4 text-xs font-bold text-slate-500"><span>{rows.length} ta qarzdor savdo</span><span>Qatorni bosing — sotuv tafsilotlari ochiladi</span></div>
  </section>;
}
