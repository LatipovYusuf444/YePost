import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Inbox, LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Super admin sahifalari uchun umumiy kichik komponentlar.
// Ranglar "orange-*" nomi bilan yoziladi, lekin ular tanlangan mavzuga (ko'k / yashil / binafsha) moslashadi.

export const inputKlass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export function SahifaSarlavhasi({ eyebrow, sarlavha, tavsif, amallar, ikonka }: { eyebrow?: string; sarlavha: string; tavsif?: string; amallar?: ReactNode; ikonka?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {ikonka && (
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/25 sm:flex">{ikonka}</span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-black uppercase tracking-[.2em] text-orange-500">{eyebrow}</p>}
          <h1 className="mt-0.5 text-[26px] font-black leading-tight tracking-tight text-slate-900">{sarlavha}</h1>
          {tavsif && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{tavsif}</p>}
        </div>
      </div>
      {amallar && <div className="flex shrink-0 flex-wrap items-center gap-2">{amallar}</div>}
    </header>
  );
}

export function Maydon({ nom, children, izoh }: { nom: string; children: ReactNode; izoh?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{nom}</span>
      {children}
      {izoh && <span className="mt-1.5 block text-xs text-slate-400">{izoh}</span>}
    </label>
  );
}

export function AdminModal({
  sarlavha,
  tavsif,
  onYopish,
  children,
  kenglik = "max-w-lg",
  ikonka,
}: {
  sarlavha: string;
  tavsif?: string;
  onYopish: () => void;
  children: ReactNode;
  kenglik?: string;
  ikonka?: ReactNode;
}) {
  useEffect(() => {
    function tugma(event: KeyboardEvent) {
      if (event.key === "Escape") onYopish();
    }
    document.addEventListener("keydown", tugma);
    const oldingi = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tugma);
      document.body.style.overflow = oldingi;
    };
  }, [onYopish]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onYopish();
      }}
      className="fixed inset-0 z-[100050] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className={cn("w-full overflow-hidden rounded-3xl bg-white shadow-[0_30px_100px_rgba(2,6,23,.4)]", kenglik)}>
        <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-b from-orange-50/80 to-white px-6 py-5">
          {ikonka && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/25">{ikonka}</span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-6 text-slate-900">{sarlavha}</h2>
            {tavsif && <p className="mt-0.5 truncate text-sm text-slate-500">{tavsif}</p>}
          </div>
          <button type="button" onClick={onYopish} aria-label="×" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-6 pt-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ShakldaTugmalar({ ortga, bajarilmoqda, saqlashMatni }: { ortga: { matn: string; onClick: () => void }; bajarilmoqda: boolean; saqlashMatni: string }) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
      <button type="button" onClick={ortga.onClick} disabled={bajarilmoqda} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
        {ortga.matn}
      </button>
      <button type="submit" disabled={bajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-black text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-60">
        {bajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
        {saqlashMatni}
      </button>
    </div>
  );
}

export function BoshHolat({ matn }: { matn: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-400 ring-8 ring-orange-50/60">
        <Inbox size={28} />
      </span>
      <p className="text-sm font-semibold text-slate-500">{matn}</p>
    </div>
  );
}

const BELGI_RANGI = {
  yashil: { klass: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", nuqta: "bg-emerald-500" },
  qizil: { klass: "bg-red-50 text-red-600 ring-red-200/70", nuqta: "bg-red-500" },
  sariq: { klass: "bg-amber-50 text-amber-700 ring-amber-200/70", nuqta: "bg-amber-500" },
  kok: { klass: "bg-sky-50 text-sky-700 ring-sky-200/70", nuqta: "bg-sky-500" },
  kulrang: { klass: "bg-slate-100 text-slate-600 ring-slate-200", nuqta: "bg-slate-400" },
  binafsha: { klass: "bg-violet-50 text-violet-700 ring-violet-200/70", nuqta: "bg-violet-500" },
};

export type BelgiRangi = keyof typeof BELGI_RANGI;

export function Belgi({ rang, children, nuqta = true }: { rang: BelgiRangi; children: ReactNode; nuqta?: boolean }) {
  const ranglar = BELGI_RANGI[rang];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1", ranglar.klass)}>
      {nuqta && <span className={cn("h-1.5 w-1.5 rounded-full", ranglar.nuqta)} />}
      {children}
    </span>
  );
}

// Jadval qatoridagi kichik amal tugmasi.
export function AmalTugmasi({ matn, ikonka, onClick, ohang = "kulrang", disabled }: { matn: string; ikonka: ReactNode; onClick: () => void; ohang?: "kulrang" | "qizil" | "yashil" | "sariq"; disabled?: boolean }) {
  const klasslar = {
    kulrang: "text-slate-500 hover:bg-orange-50 hover:text-orange-600",
    qizil: "text-slate-500 hover:bg-red-50 hover:text-red-600",
    yashil: "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600",
    sariq: "text-slate-500 hover:bg-amber-50 hover:text-amber-600",
  };
  return (
    <button
      type="button"
      title={matn}
      aria-label={matn}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500", klasslar[ohang])}
    >
      {ikonka}
    </button>
  );
}

// Asosiy (to'ldirilgan) tugma — "Yangi ..." kabi amallar uchun.
export const asosiyTugmaKlass =
  "inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 active:scale-[.98] disabled:opacity-60";
// Ikkilamchi (oq) tugma — "Yangilash" kabi amallar uchun.
export const ikkilamchiTugmaKlass =
  "inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-60";

export function QidiruvMaydoni({ qiymat, onOzgarish, placeholder, className }: { qiymat: string; onOzgarish: (qiymat: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn("flex h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100 hover:border-slate-300", className)}>
      <Search size={17} className="shrink-0 text-slate-400" />
      <input value={qiymat} onChange={(event) => onOzgarish(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400" />
      {qiymat && (
        <button type="button" onClick={() => onOzgarish("")} aria-label="×" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={14} />
        </button>
      )}
    </label>
  );
}

export function XatoXabari({ matn, yopish }: { matn: string; yopish?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{matn}</span>
      {yopish && (
        <button type="button" onClick={yopish} aria-label="×" className="shrink-0 text-red-400 hover:text-red-600">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// Ism / nomning bosh harfi bilan yumaloq belgi.
const AVATAR_RANGLARI = [
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
  "from-cyan-400 to-sky-600",
];

export function Avatar({ nom, kattalik = "md" }: { nom: string; kattalik?: "sm" | "md" | "lg" }) {
  const toza = nom.trim();
  let kod = 0;
  for (const belgi of toza) kod += belgi.charCodeAt(0);
  const olcham = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" }[kattalik];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-black uppercase text-white shadow-sm", olcham, AVATAR_RANGLARI[kod % AVATAR_RANGLARI.length])}>
      {toza.charAt(0) || "?"}
    </span>
  );
}

// Sahifa tepasidagi kichik statistika: "Jami 12", "Faol 10" ...
export function MiniKarta({ nom, qiymat, ohang = "orange" }: { nom: string; qiymat: number | string; ohang?: "orange" | "emerald" | "slate" | "red" | "amber" }) {
  const ranglar = {
    orange: "bg-orange-50 text-orange-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
      <span className={cn("flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-base font-black", ranglar[ohang])}>{qiymat}</span>
      <span className="text-sm font-semibold text-slate-500">{nom}</span>
    </div>
  );
}

export const jadvalKlass = "overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_4px_20px_rgba(15,23,42,.05)]";
export const theadKlass = "border-b border-slate-100 bg-slate-50/80";
export const tbodyKlass = "divide-y divide-slate-100";
export const trKlass = "transition-colors hover:bg-orange-50/40";
export const thKlass = "px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-400";
export const tdKlass = "px-5 py-4 text-sm text-slate-600";
