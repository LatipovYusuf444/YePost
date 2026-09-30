import { LoaderCircle } from "lucide-react";

// Hisobot sahifalari uchun umumiy yuklanish holati: markazda spinner va matn.
export default function YuklanmoqdaHolati({ matn = "Ma’lumot yuklanmoqda...", className = "h-72" }: { matn?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex w-full flex-col items-center justify-center gap-3 ${className}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100">
        <LoaderCircle size={28} className="animate-spin text-blue-600" />
      </span>
      <p className="text-sm font-bold text-slate-500">{matn}</p>
    </div>
  );
}
