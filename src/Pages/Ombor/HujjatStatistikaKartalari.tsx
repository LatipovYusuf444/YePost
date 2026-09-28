import { CheckCircle2, CircleX, Clock3, FileText } from "lucide-react";

type Props = {
  labels: [string, string, string, string];
  values: [number, number, number, number];
  selected: string;
  onSelect: (status: string) => void;
  ariaLabel?: string;
};

const filters = ["ALL", "CONFIRMED", "DRAFT", "CANCELLED"];
const icons = [FileText, CheckCircle2, Clock3, CircleX];
const tones = [
  { icon: "bg-blue-600 shadow-blue-200", text: "text-blue-700", bar: "bg-blue-500", ring: "ring-blue-300" },
  { icon: "bg-emerald-500 shadow-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500", ring: "ring-emerald-300" },
  { icon: "bg-amber-500 shadow-amber-200", text: "text-amber-700", bar: "bg-amber-500", ring: "ring-amber-300" },
  { icon: "bg-rose-500 shadow-rose-200", text: "text-rose-700", bar: "bg-rose-500", ring: "ring-rose-300" },
];

export default function HujjatStatistikaKartalari({ labels, values, selected, onSelect, ariaLabel }: Props) {
  const total = values[0];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={ariaLabel ?? "Hujjatlar statistikasi"}>
      {labels.map((label, index) => {
        const Icon = icons[index];
        const tone = tones[index];
        const percent = total ? Math.round((values[index] / total) * 100) : 0;
        const active = selected === filters[index];
        return (
          <button
            key={filters[index]}
            type="button"
            onClick={() => onSelect(filters[index])}
            aria-pressed={active}
            className={`group relative isolate flex min-h-[126px] flex-col justify-between overflow-hidden rounded-[22px] border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-4 text-left shadow-[0_5px_18px_rgba(37,99,235,.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_14px_30px_rgba(37,99,235,.13)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:p-5 ${active ? `ring-2 ${tone.ring}` : ""}`}
          >
            <span className="pointer-events-none absolute -right-7 -top-8 -z-10 h-28 w-28 rounded-full bg-blue-200/40 blur-2xl transition duration-500 group-hover:scale-150" />
            <span className="flex w-full items-center gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-105 ${tone.icon}`}>
                <Icon size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-500">{label}</span>
                <span className="mt-1 block text-3xl font-black leading-none tracking-tight text-slate-900 tabular-nums transition duration-300 group-hover:translate-x-0.5">{values[index]}</span>
              </span>
              <span className={`rounded-full bg-white/80 px-2.5 py-1 text-xs font-black shadow-sm ring-1 ring-white/90 ${tone.text}`}>{percent}%</span>
            </span>
            <span className="mt-4 block h-1.5 w-full overflow-hidden rounded-full bg-white/90 shadow-inner">
              <span className={`block h-full rounded-full transition-[width] duration-700 ease-out ${tone.bar}`} style={{ width: `${percent}%` }} />
            </span>
          </button>
        );
      })}
    </section>
  );
}
