import { Check, type LucideIcon } from "lucide-react";

// Filtr kartalarining umumiy bo'laklari (ombor qoldig'i sahifalari): guruh sarlavhasi va tanlanadigan "chip".

export function FiltrGuruhi({ nom, rang }: { nom: string; rang: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${rang}`} />
      {nom}
      <span aria-hidden className="h-px flex-1 bg-slate-100" />
    </h3>
  );
}

// Yoqish/o'chirish belgisi (checkbox): tanlanganda rangi o'zgaradi.
export function FiltrChipi({
  nom,
  ikonka: Ikona,
  belgilangan,
  onOzgarish,
}: {
  nom: string;
  ikonka: LucideIcon;
  belgilangan: boolean;
  onOzgarish: (belgilangan: boolean) => void;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm font-bold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-orange-100 ${
        belgilangan ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      <input type="checkbox" checked={belgilangan} onChange={(event) => onOzgarish(event.target.checked)} className="sr-only" />
      <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${belgilangan ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300 bg-white text-transparent"}`}>
        <Check size={13} strokeWidth={3} />
      </span>
      <Ikona size={15} aria-hidden className={belgilangan ? "text-orange-500" : "text-gray-400"} />
      {nom}
    </label>
  );
}
