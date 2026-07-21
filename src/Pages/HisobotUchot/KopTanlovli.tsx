import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { Tanlov } from "./types";

// Ko'p tanlovli maydon — yozib qidiriladi (combobox). Hisobot filtrlari uchun umumiy.
export default function KopTanlovli({
  label,
  options,
  selected,
  onChange,
  placeholder = "",
}: {
  label: string;
  options: Tanlov[];
  selected: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [qidiruv, setQidiruv] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const tanlangan = options.filter((o) => selected.includes(o.id));
  const kalit = qidiruv.trim().toLowerCase();
  const qolgan = options.filter(
    (o) => !selected.includes(o.id) && o.nomi.toLowerCase().includes(kalit)
  );

  useEffect(() => {
    if (!open) return;
    function onDown(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQidiruv("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function qoshish(id: string) {
    onChange([...selected, id]);
    setQidiruv("");
    inputRef.current?.focus();
  }

  function tugma(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && qolgan[0]) {
      e.preventDefault();
      qoshish(qolgan[0].id);
    } else if (e.key === "Backspace" && !qidiruv && selected.length) {
      onChange(selected.slice(0, -1));
    }
  }

  return (
    <div className="text-xs font-bold text-gray-700">
      {label}
      <div ref={ref} className="relative mt-1.5">
        <div
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
          className={`flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-2xl border bg-white px-2.5 py-1.5 transition ${
            open ? "border-orange-400 ring-4 ring-orange-100" : "border-slate-200"
          }`}
        >
          {tanlangan.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-600"
            >
              {o.nomi}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selected.filter((id) => id !== o.id));
                }}
                className="text-orange-400 hover:text-orange-600"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={qidiruv}
            onChange={(e) => {
              setQidiruv(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={tugma}
            placeholder={tanlangan.length ? "" : placeholder}
            className="h-6 min-w-16 flex-1 bg-transparent text-sm font-semibold text-gray-700 outline-none placeholder:text-gray-400"
          />
          <ChevronDown
            size={16}
            className={`ml-auto shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 z-30 mt-2 max-h-52 overflow-auto rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(92,38,8,.16)]">
            {qolgan.length === 0 ? (
              <p className="px-3 py-2 text-sm font-semibold text-gray-400">
                {kalit ? "Topilmadi" : "Boshqa variant yo'q"}
              </p>
            ) : (
              qolgan.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => qoshish(o.id)}
                  className="block min-h-9 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                >
                  {o.nomi}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
