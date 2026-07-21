import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Bitta tanlovli custom dropdown — dizaynga mos (native select o'rniga).
export default function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; nomi: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const joriy = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDown(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="text-xs font-bold text-gray-700">
      {label}
      <div ref={ref} className="relative mt-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-2xl border bg-white px-3.5 text-sm font-semibold text-gray-700 outline-none transition ${
            open ? "border-orange-400 ring-4 ring-orange-100" : "border-slate-200 hover:border-orange-300"
          }`}
        >
          <span className="truncate">{joriy?.nomi ?? "Tanlang"}</span>
          <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-30 mt-2 max-h-52 overflow-auto rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(92,38,8,.16)]">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block min-h-9 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  o.value === value ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                {o.nomi}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
