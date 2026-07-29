import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, X } from "lucide-react";

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  compact?: boolean;
};

const hafta = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

function key(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parse(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function display(value: string) {
  const date = parse(value);
  return date ? new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "short", year: "numeric" }).format(date) : "";
}

function shiftDay(amount: number) {
  const date = new Date();
  date.setDate(date.getDate() + amount);
  return key(date);
}

export default function DateRangePicker({ from, to, onChange, className = "", compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [month, setMonth] = useState(() => {
    const initial = parse(to || from) ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftFrom(from);
    setDraftTo(to);
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, from, to]);

  const days = useMemo(() => {
    const firstWeekday = (month.getDay() + 6) % 7;
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  function selectDate(value: string) {
    if (!draftFrom || draftTo) {
      setDraftFrom(value);
      setDraftTo("");
    } else if (value < draftFrom) {
      setDraftFrom(value);
      setDraftTo(draftFrom);
    } else {
      setDraftTo(value);
    }
  }

  function quick(start: string, end: string) {
    setDraftFrom(start);
    setDraftTo(end);
    const date = parse(end);
    if (date) setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  const label = !from && !to
    ? "Sana: barchasi"
    : from === to
      ? `Sana: ${display(from)}`
      : `${display(from)} — ${display(to || from)}`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-orange-500 bg-orange-500 px-3 font-bold text-white shadow-sm transition hover:bg-orange-600 focus:ring-4 focus:ring-orange-100 ${compact ? "h-10 text-sm" : "h-11 text-sm"}`}
      >
        <span className="flex min-w-0 items-center gap-2"><CalendarDays size={16} className="shrink-0"/><span className="truncate">{label}</span></span>
        <CalendarDays size={16} className="shrink-0 opacity-80" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[1000] w-[min(340px,calc(100vw-24px))] rounded-[24px] border border-orange-100 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,.22)]">
          <div className="flex items-center justify-between px-1 pb-2">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-orange-50 hover:text-orange-600"><ChevronLeft size={18}/></button>
            <strong className="text-sm font-black capitalize text-slate-800">{new Intl.DateTimeFormat("uz-UZ", { month: "long", year: "numeric" }).format(month)}</strong>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-orange-50 hover:text-orange-600"><ChevronRight size={18}/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 pb-1">{hafta.map((day) => <span key={day} className="py-1 text-center text-[11px] font-black text-slate-400">{day}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const value = key(date);
              const edge = value === draftFrom || value === draftTo;
              const between = Boolean(draftFrom && draftTo && value > draftFrom && value < draftTo);
              const muted = date.getMonth() !== month.getMonth();
              return <button key={value} type="button" onClick={() => selectDate(value)} className={`relative grid h-9 place-items-center rounded-xl text-xs font-bold transition ${edge ? "bg-orange-500 text-white shadow-md shadow-orange-200" : between ? "bg-orange-100 text-orange-700" : muted ? "text-slate-300 hover:bg-orange-50" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"}`}>{date.getDate()}</button>;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-orange-100 pt-3 text-xs font-bold">
            <button type="button" onClick={() => quick(shiftDay(0), shiftDay(0))} className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-orange-600">Bugun</button>
            <button type="button" onClick={() => quick(shiftDay(-6), shiftDay(0))} className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-orange-600">7 kun</button>
            <button type="button" onClick={() => quick(shiftDay(-29), shiftDay(0))} className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-orange-600">30 kun</button>
            <button type="button" onClick={() => { setDraftFrom(""); setDraftTo(""); }} className="ml-auto rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-100"><X size={15}/></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">Dan: <span className="text-slate-800">{display(draftFrom) || "—"}</span></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">Gacha: <span className="text-slate-800">{display(draftTo) || "—"}</span></div>
          </div>
          <button type="button" onClick={() => { onChange(draftFrom, draftTo || draftFrom); setOpen(false); }} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black text-white hover:bg-orange-600"><Check size={16}/> Qo‘llash</button>
        </div>
      )}
    </div>
  );
}
