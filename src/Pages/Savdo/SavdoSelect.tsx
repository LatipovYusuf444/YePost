import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SavdoSelectOption = {
  value: string;
  label: ReactNode;
  searchLabel?: string;
  disabled?: boolean;
};

type SavdoSelectProps = {
  value: string;
  options: SavdoSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
};

function labelToText(label: ReactNode) {
  if (typeof label === "string" || typeof label === "number") return String(label);
  return "";
}

export default function SavdoSelect({
  value,
  options,
  onChange,
  placeholder = "Tanlang",
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  disabled = false,
}: SavdoSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`group flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 text-left text-base font-medium text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,.04)] outline-none transition hover:border-orange-200 hover:shadow-[0_12px_28px_rgba(249,115,22,.08)] focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${buttonClassName}`}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-slate-400"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition group-hover:text-orange-500 ${open ? "rotate-180 text-orange-500" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-[80] mt-2 max-h-72 overflow-y-auto rounded-[22px] border border-orange-100 bg-white p-2 shadow-[0_22px_60px_rgba(15,23,42,.16)] ring-1 ring-white/70 ${dropdownClassName}`}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm font-semibold text-slate-400">
              Ma'lumot topilmadi
            </div>
          ) : (
            options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={`${option.value}-${option.searchLabel ?? labelToText(option.label)}`}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-orange-500 text-white shadow-[0_10px_22px_rgba(249,115,22,.22)]"
                      : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                  } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active && <Check size={16} className="shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
