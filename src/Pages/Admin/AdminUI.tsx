import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Inbox, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Super admin sahifalari uchun umumiy kichik komponentlar.

export const inputKlass =
  "h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-50 disabled:bg-slate-50 disabled:text-slate-400";

export function SahifaSarlavhasi({ eyebrow, sarlavha, tavsif, amallar }: { eyebrow?: string; sarlavha: string; tavsif?: string; amallar?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-black uppercase tracking-[.18em] text-orange-500">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{sarlavha}</h1>
        {tavsif && <p className="mt-1 max-w-2xl text-sm text-slate-500">{tavsif}</p>}
      </div>
      {amallar && <div className="flex flex-wrap items-center gap-2">{amallar}</div>}
    </header>
  );
}

export function Maydon({ nom, children, izoh }: { nom: string; children: ReactNode; izoh?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{nom}</span>
      {children}
      {izoh && <span className="mt-1 block text-xs font-medium text-slate-400">{izoh}</span>}
    </label>
  );
}

export function AdminModal({ sarlavha, tavsif, onYopish, children, kenglik = "max-w-lg" }: { sarlavha: string; tavsif?: string; onYopish: () => void; children: ReactNode; kenglik?: string }) {
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
      className="fixed inset-0 z-[100050] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className={cn("w-full rounded-[28px] bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,.32)]", kenglik)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{sarlavha}</h2>
            {tavsif && <p className="mt-1 text-sm text-slate-500">{tavsif}</p>}
          </div>
          <button type="button" onClick={onYopish} aria-label="×" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200">
            <X size={17} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ShakldaTugmalar({ ortga, bajarilmoqda, saqlashMatni }: { ortga: { matn: string; onClick: () => void }; bajarilmoqda: boolean; saqlashMatni: string }) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button type="button" onClick={ortga.onClick} disabled={bajarilmoqda} className="h-11 rounded-2xl bg-slate-100 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50">
        {ortga.matn}
      </button>
      <button type="submit" disabled={bajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-60">
        {bajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
        {saqlashMatni}
      </button>
    </div>
  );
}

export function BoshHolat({ matn }: { matn: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-orange-200 bg-white/70 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-300">
        <Inbox size={26} />
      </span>
      <p className="text-sm font-bold text-slate-400">{matn}</p>
    </div>
  );
}

export function Belgi({ rang, children }: { rang: "yashil" | "qizil" | "sariq" | "kok" | "kulrang"; children: ReactNode }) {
  const klasslar = {
    yashil: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    qizil: "bg-red-50 text-red-600 ring-red-100",
    sariq: "bg-amber-50 text-amber-700 ring-amber-100",
    kok: "bg-blue-50 text-blue-700 ring-blue-100",
    kulrang: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-black ring-1", klasslar[rang])}>{children}</span>;
}

// Jadval qatoridagi kichik amal tugmasi.
export function AmalTugmasi({ matn, ikonka, onClick, ohang = "kulrang", disabled }: { matn: string; ikonka: ReactNode; onClick: () => void; ohang?: "kulrang" | "qizil" | "yashil" | "sariq"; disabled?: boolean }) {
  const klasslar = {
    kulrang: "bg-slate-50 text-slate-600 hover:bg-slate-100",
    qizil: "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white",
    yashil: "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white",
    sariq: "bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white",
  };
  return (
    <button
      type="button"
      title={matn}
      aria-label={matn}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40", klasslar[ohang])}
    >
      {ikonka}
    </button>
  );
}

export const jadvalKlass = "overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_3px_14px_rgba(15,23,42,.05)]";
export const thKlass = "px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500";
export const tdKlass = "px-5 py-4 text-sm text-slate-600";
