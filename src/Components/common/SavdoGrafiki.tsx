import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type Davr = "kunlik" | "haftalik" | "oylik" | "yillik";
type SavdoNuqtasi = { nom: string; savdo: number; reja?: number };

const savdoMalumotlari: Record<Davr, SavdoNuqtasi[]> = {
  kunlik: [
    { nom: "09:00", savdo: 1_200_000, reja: 1_000_000 }, { nom: "11:00", savdo: 2_800_000, reja: 2_200_000 },
    { nom: "13:00", savdo: 2_100_000, reja: 2_800_000 }, { nom: "15:00", savdo: 3_900_000, reja: 3_200_000 },
    { nom: "17:00", savdo: 5_200_000, reja: 3_900_000 }, { nom: "19:00", savdo: 4_700_000, reja: 4_200_000 },
  ],
  haftalik: [
    { nom: "Du", savdo: 4_500_000 }, { nom: "Se", savdo: 7_000_000 }, { nom: "Ch", savdo: 5_500_000 },
    { nom: "Pa", savdo: 9_000_000 }, { nom: "Ju", savdo: 6_800_000 }, { nom: "Sh", savdo: 7_800_000 }, { nom: "Ya", savdo: 10_000_000 },
  ],
  oylik: [
    { nom: "1-hafta", savdo: 28_000_000, reja: 26_000_000 }, { nom: "2-hafta", savdo: 36_000_000, reja: 31_000_000 },
    { nom: "3-hafta", savdo: 31_000_000, reja: 35_000_000 }, { nom: "4-hafta", savdo: 47_000_000, reja: 39_000_000 },
  ],
  yillik: [
    { nom: "Yan", savdo: 120_000_000 }, { nom: "Fev", savdo: 145_000_000 }, { nom: "Mar", savdo: 132_000_000 },
    { nom: "Apr", savdo: 168_000_000 }, { nom: "May", savdo: 190_000_000 }, { nom: "Iyun", savdo: 210_000_000 },
  ],
};

const davrMatni: Record<Davr, string> = { kunlik: "Bugun", haftalik: "Bu hafta", oylik: "Bu oy", yillik: "Bu yil" };
const taqsimot = [
  { nom: "Naqd", qiymat: 38, rang: "#2563eb" }, { nom: "Karta", qiymat: 34, rang: "#7c3aed" }, { nom: "Onlayn", qiymat: 28, rang: "#14b8a6" },
];

function formatSumma(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mlrd`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mln`;
  return `${value.toLocaleString("ru-RU")} so‘m`;
}

function qisqaSumma(value: number) {
  return value >= 1_000_000 ? `${Math.round(value / 1_000_000)} mln` : value.toLocaleString("ru-RU");
}

function GrafikTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-5 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name === "savdo" ? "Savdo" : "Reja"}</span>
          <strong className="text-slate-900">{formatSumma(Number(item.value ?? 0))}</strong>
        </div>
      ))}
    </div>
  );
}

function GrafikTavsifi({ davr }: { davr: Davr }) {
  const tavsiflar: Record<Davr, { icon: typeof ChartNoAxesCombined; title: string; text: string }> = {
    kunlik: { icon: ChartNoAxesCombined, title: "Jonli oqim", text: "Soatlik savdo va reja dinamikasi" },
    haftalik: { icon: BarChart3, title: "Haftalik natija", text: "Kunlar kesimidagi savdo hajmi" },
    oylik: { icon: TrendingUp, title: "Reja bajarilishi", text: "Haftalik natija va belgilangan reja" },
    yillik: { icon: CircleDollarSign, title: "To‘lovlar tarkibi", text: "Savdo kanallari bo‘yicha taqsimot" },
  };
  const { icon: Icon, title, text } = tavsiflar[davr];
  return <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={20} /></span><div><h2 className="font-black text-slate-950">{title}</h2><p className="text-xs font-medium text-slate-500">{text}</p></div></div>;
}

export default function SavdoGrafiki() {
  const [davr, setDavr] = useState<Davr>("haftalik");
  const activeData = useMemo(() => savdoMalumotlari[davr], [davr]);
  const jamiSavdo = useMemo(() => activeData.reduce((jami, item) => jami + item.savdo, 0), [activeData]);
  const engYuqori = useMemo(() => activeData.reduce((top, item) => (item.savdo > top.savdo ? item : top)), [activeData]);

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_18px_55px_-32px_rgba(15,23,42,0.28)]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <GrafikTavsifi davr={davr} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="Savdo davri">
              {(["kunlik", "haftalik", "oylik", "yillik"] as Davr[]).map((item) => <button key={item} type="button" role="tab" aria-selected={davr === item} onClick={() => setDavr(item)} className={`rounded-xl px-3 py-2 text-xs font-extrabold capitalize transition sm:px-4 sm:text-sm ${davr === item ? "bg-slate-900 text-white shadow-lg shadow-slate-300" : "text-slate-500 hover:bg-white hover:text-slate-900"}`}>{item}</button>)}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700"><ArrowUpRight size={16} />24.8%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative min-h-[330px] rounded-[26px] border border-slate-100 bg-[radial-gradient(circle_at_80%_0%,#eff6ff_0%,transparent_34%),linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-4 sm:p-5">
          <div className="mb-2 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{davrMatni[davr]}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{formatSumma(jamiSavdo)}</p></div><span className="hidden items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm sm:inline-flex"><CalendarDays size={15} className="text-blue-500" />Yangilandi hozir</span></div>
          <div className="h-[245px]" aria-label={`${davrMatni[davr]} savdo grafigi`}>
            <ResponsiveContainer width="100%" height="100%">
              {davr === "kunlik" ? (
                <AreaChart data={activeData} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="savdo-area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.34} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 5" /><XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={qisqaSumma} width={45} /><Tooltip content={<GrafikTooltip />} cursor={{ stroke: "#bfdbfe", strokeWidth: 2 }} /><Area type="monotone" dataKey="reja" name="reja" stroke="#94a3b8" strokeDasharray="6 6" strokeWidth={2} fill="transparent" /><Area type="monotone" dataKey="savdo" name="savdo" stroke="#2563eb" strokeWidth={3.5} fill="url(#savdo-area-gradient)" activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff" }} /></AreaChart>
              ) : davr === "haftalik" ? (
                <BarChart data={activeData} margin={{ top: 16, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%"><defs><linearGradient id="savdo-bar-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#2563eb" /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 5" /><XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={qisqaSumma} width={45} /><Tooltip content={<GrafikTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} /><Bar dataKey="savdo" name="savdo" fill="url(#savdo-bar-gradient)" radius={[10, 10, 3, 3]} maxBarSize={46} /></BarChart>
              ) : davr === "oylik" ? (
                <ComposedChart data={activeData} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="savdo-composed-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 5" /><XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={qisqaSumma} width={45} /><Tooltip content={<GrafikTooltip />} cursor={{ fill: "rgba(124,58,237,0.05)" }} /><Bar dataKey="savdo" name="savdo" fill="url(#savdo-composed-gradient)" radius={[10, 10, 3, 3]} maxBarSize={58} /><Line type="monotone" dataKey="reja" name="reja" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} /></ComposedChart>
              ) : (
                <PieChart><Tooltip formatter={(value) => [`${value}%`, "Ulush"]} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 12px 32px rgba(15,23,42,0.12)" }} /><Pie data={taqsimot} dataKey="qiymat" nameKey="nom" cx="50%" cy="50%" innerRadius={66} outerRadius={101} paddingAngle={5} stroke="none">{taqsimot.map((item) => <Cell key={item.nom} fill={item.rang} />)}</Pie><text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-950 text-[26px] font-black">100%</text><text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[11px] font-bold">TO‘LOVLAR</text></PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <aside className="flex flex-col justify-between rounded-[26px] bg-slate-950 p-5 text-white"><div><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-300"><Sparkles size={19} /></span><p className="mt-5 text-sm font-medium text-slate-400">Eng yuqori natija</p><p className="mt-1 text-2xl font-black">{formatSumma(engYuqori.savdo)}</p><p className="mt-1 text-sm font-bold text-cyan-300">{engYuqori.nom} da qayd etildi</p></div>{davr === "yillik" ? <div className="mt-8 space-y-3">{taqsimot.map((item) => <div key={item.nom}><div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300"><span>{item.nom}</span><span>{item.qiymat}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${item.qiymat}%`, backgroundColor: item.rang }} /></div></div>)}</div> : <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-xs font-medium text-slate-400">O‘tgan davrga nisbatan</p><p className="mt-1 flex items-center gap-1 text-lg font-black text-emerald-300"><TrendingUp size={18} />+24.8%</p></div>}</aside>
      </div>
    </section>
  );
}
