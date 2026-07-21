import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  portal?: boolean;
  selectedLabel?: ReactNode;
  hideChevron?: boolean;
  qidirish?: boolean;
  qidiruvPlaceholder?: string;
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
  portal = false,
  selectedLabel,
  hideChevron = false,
  qidirish = false,
  qidiruvPlaceholder = "Qidirish...",
}: SavdoSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const [qidiruvMatni, setQidiruvMatni] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const qidiruvInputRef = useRef<HTMLInputElement | null>(null);
  const selected = options.find((option) => option.value === value);
  const korinadiganOptions = qidirish
    ? options.filter((option) => {
        const matn = (option.searchLabel ?? labelToText(option.label)).toLowerCase();
        return matn.includes(qidiruvMatni.trim().toLowerCase());
      })
    : options;

  const updateDropdownPosition = useCallback(() => {
    if (!portal || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    // Portal birinchi marta style'siz render bo'lganda uning auto-width'i butun
    // viewportgacha cho'zilishi mumkin. O'sha o'lchamni qayta ishlatish dropdownni
    // ekran bo'ylab yoyib yuborardi. Menyu har doim trigger kengligida qoladi.
    const dropdownWidth = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const belowSpace = window.innerHeight - rect.bottom - gap - viewportPadding;
    const aboveSpace = rect.top - gap - viewportPadding;
    const preferredHeight = Math.min(224, options.length * 40 + 8);
    const opensUp = belowSpace < preferredHeight && aboveSpace > belowSpace;
    const maxHeight = Math.max(
      112,
      Math.min(224, opensUp ? aboveSpace : belowSpace)
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - dropdownWidth - viewportPadding
    );

    setDropdownStyle({
      position: "fixed",
      left,
      top: opensUp ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
      width: dropdownWidth,
      minWidth: 0,
      maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
      maxHeight,
    });
  }, [options.length, portal]);

  useEffect(() => {
    function close(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    updateDropdownPosition();

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, portal, updateDropdownPosition]);

  useEffect(() => {
    if (open && qidirish) {
      setQidiruvMatni("");
      window.requestAnimationFrame(() => qidiruvInputRef.current?.focus());
    }
  }, [open, qidirish]);

  const dropdown = open && (
    <div
      ref={dropdownRef}
      style={portal ? dropdownStyle : undefined}
      className={cn(
        portal
          ? "z-[100010] flex flex-col overflow-hidden rounded-xl border border-orange-100 bg-white shadow-[0_18px_44px_rgba(15,23,42,.18)] ring-1 ring-white/70"
          : "absolute left-0 right-0 z-[80] mt-2 flex max-h-56 flex-col overflow-hidden rounded-xl border border-orange-100 bg-white shadow-[0_18px_44px_rgba(15,23,42,.14)] ring-1 ring-white/70",
        dropdownClassName
      )}
    >
      {qidirish && (
        <div className="shrink-0 border-b border-orange-100 p-1.5">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={qidiruvInputRef}
              value={qidiruvMatni}
              onChange={(event) => setQidiruvMatni(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={qidiruvPlaceholder}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-sm font-semibold outline-none focus:border-orange-400"
            />
          </div>
        </div>
      )}
      <div className="overflow-y-auto p-1">
        {korinadiganOptions.length === 0 ? (
          <div className="px-4 py-3 text-sm font-semibold text-slate-400">
            Ma'lumot topilmadi
          </div>
        ) : (
          korinadiganOptions.map((option) => {
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
              className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                active
                  ? "bg-orange-500 text-white shadow-[0_8px_18px_rgba(249,115,22,.20)]"
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
    </div>
  );

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          window.requestAnimationFrame(updateDropdownPosition);
        }}
        className={cn(
          "group flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 text-left text-base font-medium text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,.04)] outline-none transition hover:border-orange-200 hover:shadow-[0_12px_28px_rgba(249,115,22,.08)] focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          buttonClassName
        )}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-slate-400"}`}>
          {selectedLabel ?? selected?.label ?? placeholder}
        </span>
        {!hideChevron && (
          <ChevronDown
            size={18}
            className={cn(
              "shrink-0 text-current opacity-50 transition group-hover:opacity-80",
              open && "rotate-180 opacity-100"
            )}
          />
        )}
      </button>

      {portal && typeof document !== "undefined"
        ? createPortal(dropdown, document.body)
        : dropdown}
    </div>
  );
}
