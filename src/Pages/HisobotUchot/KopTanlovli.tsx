import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Tanlov } from "./types";

// Ko'p tanlovli maydon — yozib qidiriladi (combobox). Hisobot filtrlari uchun umumiy.
export default function KopTanlovli({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Tanlov[];
  selected: string[];
  onChange: (value: string[]) => void;
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
          className={`flex min-h-10 w-full flex-wrap items-center gap-1 rounded-lg border bg-white px-1.5 py-1 transition ${
            open ? "border-orange-400" : "border-gray-200"
          }`}
        >
          {tanlangan.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-bold text-orange-600"
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
            placeholder={tanlangan.length ? "" : "Yozing yoki tanlang"}
            className="h-6 min-w-24 flex-1 bg-transparent text-[11px] font-semibold text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-auto rounded-xl border border-orange-100 bg-white p-1 shadow-xl">
            {qolgan.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-400">
                {kalit ? "Topilmadi" : "Boshqa variant yo'q"}
              </p>
            ) : (
              qolgan.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => qoshish(o.id)}
                  className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-gray-700 hover:bg-orange-50"
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
