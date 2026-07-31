import { useMemo, useState } from "react";
import { Ban, RefreshCw, Search, ShieldX, UserRound } from "lucide-react";
import type { Sotuv } from "@/types/savdo";
import { masulNomi, mijozNomi, pulniFormatlash, sananiFormatlash, sotuvHolati, sotuvRaqami, sotuvSummasi } from "./savdoYordamchilari";
import DateRangePicker from "@/Components/ui/DateRangePicker";

type Props = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
  onYangilash: () => Promise<void> | void;
};

function telefon(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || "Telefon kiritilmagan";
}

function bekorSana(sotuv: Sotuv) {
  return sotuv.cancelledAt || sotuv.updatedAt || sotuv.createdAt;
}

export default function BekorQilinganlar({ sotuvlar, onSotuvniOchish, onYangilash }: Props) {
  const [qidiruv, setQidiruv] = useState("");
  const [sanaDan, setSanaDan] = useState("");
  const [sanaGacha, setSanaGacha] = useState("");
  const [yangilanmoqda, setYangilanmoqda] = useState(false);

  const bekorQilinganlar = useMemo(() => sotuvlar
    .filter((sotuv) => sotuvHolati(sotuv) === "CANCELLED")
    .sort((a, b) => new Date(bekorSana(b) ?? 0).getTime() - new Date(bekorSana(a) ?? 0).getTime()), [sotuvlar]);

  const rows = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    return bekorQilinganlar.filter((sotuv) => {
      const date = new Date(bekorSana(sotuv) ?? 0);
      const sanaKaliti = Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const sanaMos = (!sanaDan && !sanaGacha) || Boolean(sanaKaliti && (!sanaDan || sanaKaliti >= sanaDan) && (!sanaGacha || sanaKaliti <= sanaGacha));
      const qMos = !q || [sotuvRaqami(sotuv), mijozNomi(sotuv), telefon(sotuv), masulNomi(sotuv), sotuv.note].join(" ").toLowerCase().includes(q);
      return sanaMos && qMos;
    });
  }, [bekorQilinganlar, qidiruv, sanaDan, sanaGacha]);

  async function yangilash() {
    setYangilanmoqda(true);
    try { await onYangilash(); } finally { setYangilanmoqda(false); }
  }

  return <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-gradient-to-br from-[#fff8ef] via-white to-[#fff1e3] shadow-[0_28px_90px_rgba(120,53,15,.12)] ring-1 ring-white/80">
    <div className="relative overflow-hidden border-b border-orange-100 px-6 py-8 sm:px-9">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-orange-500"><ShieldX size={17}/> Savdo nazorati</p><h1 className="savdo-section-title mt-2">Bekor qilingan sotuvlar</h1></div>
        <button onClick={() => void yangilash()} disabled={yangilanmoqda} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:opacity-60"><RefreshCw size={17} className={yangilanmoqda ? "animate-spin" : ""}/> Yangilash</button>
      </div>
    </div>

    <div className="flex flex-col gap-3 border-b border-orange-100 bg-white/55 px-6 py-5 backdrop-blur sm:px-9 lg:flex-row lg:items-center lg:justify-between">
      <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-50 lg:max-w-xl"><Search size={18} className="text-orange-400"/><input value={qidiruv} onChange={(e) => setQidiruv(e.target.value)} placeholder="Sotuv raqami, mijoz, telefon yoki mas'ul..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"/></label>
      <DateRangePicker from={sanaDan} to={sanaGacha} onChange={(from, to) => { setSanaDan(from); setSanaGacha(to); }} compact className="w-full lg:w-[260px]" />
    </div>

    <div className="overflow-x-auto bg-white/70"><table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-[#fff7ed] text-xs font-black uppercase tracking-wide text-orange-700/65"><tr><th className="px-8 py-4">Sotuv</th><th className="px-5 py-4">Mijoz</th><th className="px-5 py-4">Summa</th><th className="px-5 py-4">Bekor qilingan sana</th><th className="px-5 py-4">Mas'ul</th><th className="px-8 py-4">Holati</th></tr></thead>
      <tbody className="divide-y divide-orange-100/70">{rows.map((sotuv) => <tr key={sotuv.id} onClick={() => onSotuvniOchish(sotuv)} className="group cursor-pointer transition hover:bg-orange-50/65">
        <td className="px-8 py-5"><p className="font-black text-orange-600">#{sotuvRaqami(sotuv)}</p><p className="mt-1 text-xs font-semibold text-slate-400">{sotuv.note || "Izoh mavjud emas"}</p></td>
        <td className="px-5 py-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 ring-1 ring-orange-100"><UserRound size={18}/></span><div><p className="font-black text-slate-900">{mijozNomi(sotuv)}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{telefon(sotuv)}</p></div></div></td>
        <td className="px-5 py-5 font-black text-slate-900">{pulniFormatlash(sotuvSummasi(sotuv))}</td><td className="px-5 py-5 font-semibold text-slate-600">{sananiFormatlash(bekorSana(sotuv))}</td><td className="px-5 py-5 font-bold text-slate-700">{masulNomi(sotuv)}</td><td className="px-8 py-5"><span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 ring-1 ring-red-100">Bekor qilingan</span></td>
      </tr>)}</tbody>
    </table></div>
    {rows.length === 0 && <div className="bg-white/70 px-6 py-20 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-orange-50 text-orange-300"><Ban size={31}/></span><h2 className="mt-4 text-lg font-black text-slate-800">Bekor qilingan sotuv topilmadi</h2><p className="mt-1 text-sm font-semibold text-slate-400">Backendda bekor qilingan sotuv paydo bo'lsa, shu yerga avtomatik tushadi.</p></div>}
    <div className="flex justify-between border-t border-orange-100 bg-[#fff8ef] px-8 py-4 text-xs font-bold text-slate-500"><span>{rows.length} ta yozuv ko'rsatildi</span><span>Qatorni bosing — real sotuv tafsilotlari ochiladi</span></div>
  </section>;
}
