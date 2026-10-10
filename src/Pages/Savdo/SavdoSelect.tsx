import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SavdoSelectOption = {
  value: string;
  label: ReactNode;
  searchLabel?: string;
  disabled?: boolean;
  // Qizil (masalan, qoldiq yo'q) o'chirilgan variant: xiralashtirilmaydi, qizil fonda ko'rinadi.
  xavf?: boolean;
  // Faqat `klaviatura` rejimida: shtrix-kod / artikul (qidiruvda ham, aniq moslikda ham ishlatiladi) va aniq mos keladigan nomlar.
  kodlar?: string[];
  nomlar?: string[];
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
  // Ixtiyoriy klaviatura rejimi (Excel kabi tez kiritish): qidiruv, ↑/↓ bilan yurish, Enter — tanlash, Escape — yopish.
  // Aniq mos kelgan (shtrix-kod/artikul, keyin nom) variant ro'yxat boshiga chiqadi. O'chiq bo'lsa komponent avvalgidek ishlaydi.
  klaviatura?: boolean;
  // O'zgargan har bir musbat qiymat ro'yxatni dasturiy ochadi (masalan, yangi qator qo'shilganda).
  ochishSorovi?: number;
};

function labelToText(label: ReactNode) {
  if (typeof label === "string" || typeof label === "number") return String(label);
  return "";
}

// Backend qidiruvi bilan bir xil tartib: avval shtrix-kod/artikul to'liq mos, keyin nomi to'liq mos, keyin qolganlari (joriy tartibda).
function aniqMoslikTartibi(options: SavdoSelectOption[], qidiruv: string) {
  const daraja = (option: SavdoSelectOption) => {
    if ((option.kodlar ?? []).some((kod) => kod.trim().toLowerCase() === qidiruv)) return 0;
    const nomlar = option.nomlar ?? [option.searchLabel ?? labelToText(option.label)];
    return nomlar.some((nom) => nom.trim().toLowerCase() === qidiruv) ? 1 : 2;
  };
  return options
    .map((option, index) => ({ option, index, daraja: daraja(option) }))
    .sort((a, b) => a.daraja - b.daraja || a.index - b.index)
    .map((item) => item.option);
}

export default function SavdoSelect({
  value,
  options,
  onChange,
  placeholder,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  disabled = false,
  portal = false,
  selectedLabel,
  hideChevron = false,
  qidirish = false,
  qidiruvPlaceholder,
  klaviatura = false,
  ochishSorovi = 0,
}: SavdoSelectProps) {
  const { t } = useTranslation("savdo_kichik");
  const effectivePlaceholder = placeholder ?? t("savdoSelect.tanlang");
  const effectiveQidiruvPlaceholder = qidiruvPlaceholder ?? t("savdoSelect.qidirish");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const [qidiruvMatni, setQidiruvMatni] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const qidiruvInputRef = useRef<HTMLInputElement | null>(null);
  const [faolIndeks, setFaolIndeks] = useState(-1);
  const royxatId = useId();
  const qidirishFaol = qidirish || klaviatura;
  const selected = options.find((option) => option.value === value);
  const qidiruv = qidiruvMatni.trim().toLowerCase();
  let korinadiganOptions = options;
  if (qidirishFaol) {
    korinadiganOptions = options.filter((option) => {
      const matn = (option.searchLabel ?? labelToText(option.label)).toLowerCase();
      if (matn.includes(qidiruv)) return true;
      return klaviatura && Boolean(qidiruv) && (option.kodlar ?? []).some((kod) => kod.toLowerCase().includes(qidiruv));
    });
    if (klaviatura && qidiruv) korinadiganOptions = aniqMoslikTartibi(korinadiganOptions, qidiruv);
  }

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
    if (open && qidirishFaol) {
      setQidiruvMatni("");
      setFaolIndeks(-1);
      window.requestAnimationFrame(() => qidiruvInputRef.current?.focus());
    }
  }, [open, qidirishFaol]);

  useEffect(() => {
    if (!klaviatura || !ochishSorovi) return;
    setOpen(true);
    window.requestAnimationFrame(updateDropdownPosition);
  }, [klaviatura, ochishSorovi, updateDropdownPosition]);

  function variantniTanlash(option: SavdoSelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    // Fokus tugmaga qaytadi; ota komponent fokusni keyingi maydonga ko'chirishi mumkin.
    if (klaviatura) buttonRef.current?.focus();
  }

  function qidiruvKlavishi(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (!klaviatura || event.nativeEvent.isComposing) return;
    const soni = korinadiganOptions.length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (soni === 0) return;
      const keyingi =
        event.key === "ArrowDown"
          ? (faolIndeks + 1) % soni
          : faolIndeks <= 0
            ? soni - 1
            : faolIndeks - 1;
      setFaolIndeks(keyingi);
      window.requestAnimationFrame(() => {
        document.getElementById(`${royxatId}-variant-${keyingi}`)?.scrollIntoView({ block: "nearest" });
      });
    } else if (event.key === "Enter") {
      // Forma yuborilmasin va Enter faqat tanlangan variantni qo'shsin.
      event.preventDefault();
      const faol = korinadiganOptions[faolIndeks];
      if (faol) variantniTanlash(faol);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      // Ro'yxat yopiladi, fokus keyingi maydonga odatdagidek o'tadi.
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

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
      {qidirishFaol && (
        <div className="shrink-0 border-b border-orange-100 p-1.5">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={qidiruvInputRef}
              value={qidiruvMatni}
              onChange={(event) => {
                setQidiruvMatni(event.target.value);
                // Yozilganda birinchi (eng mos) variant faol bo'ladi.
                setFaolIndeks(event.target.value.trim() ? 0 : -1);
              }}
              onKeyDown={qidiruvKlavishi}
              {...(klaviatura
                ? {
                    autoComplete: "off",
                    role: "combobox",
                    "aria-expanded": true,
                    "aria-controls": royxatId,
                    "aria-autocomplete": "list" as const,
                    "aria-activedescendant": faolIndeks >= 0 ? `${royxatId}-variant-${faolIndeks}` : undefined,
                  }
                : {})}
              placeholder={effectiveQidiruvPlaceholder}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-sm font-semibold outline-none focus:border-orange-400"
            />
          </div>
        </div>
      )}
      <div className="overflow-y-auto p-1" {...(klaviatura ? { id: royxatId, role: "listbox" } : {})}>
        {korinadiganOptions.length === 0 ? (
          <div className="px-4 py-3 text-sm font-semibold text-slate-400">
            {t("savdoSelect.malumotTopilmadi")}
          </div>
        ) : (
          korinadiganOptions.map((option, optionIndex) => {
          const active = option.value === value;
          const klavishFaol = klaviatura && optionIndex === faolIndeks && !active;

          return (
            <button
              key={`${option.value}-${option.searchLabel ?? labelToText(option.label)}`}
              type="button"
              disabled={option.disabled}
              onClick={() => variantniTanlash(option)}
              {...(klaviatura
                ? {
                    id: `${royxatId}-variant-${optionIndex}`,
                    role: "option",
                    "aria-selected": optionIndex === faolIndeks,
                    tabIndex: -1,
                    // Sichqoncha bosilganda qidiruv maydoni fokusi yo'qolmasin.
                    onMouseDown: (event: ReactMouseEvent) => event.preventDefault(),
                    onMouseMove: () => {
                      if (optionIndex !== faolIndeks) setFaolIndeks(optionIndex);
                    },
                  }
                : {})}
              className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                active
                  ? "bg-orange-500 text-white shadow-[0_8px_18px_rgba(37,99,235,.20)]"
                  : klavishFaol
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
              } ${option.disabled ? (option.xavf ? "cursor-not-allowed bg-red-50/70 hover:bg-red-50/70" : "cursor-not-allowed opacity-40") : ""}`}
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
        onKeyDown={
          klaviatura
            ? (event) => {
                if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                  event.preventDefault();
                  setOpen(true);
                  window.requestAnimationFrame(updateDropdownPosition);
                }
              }
            : undefined
        }
        className={cn(
          "group flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 text-left text-base font-medium text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,.04)] outline-none transition hover:border-orange-200 hover:shadow-[0_12px_28px_rgba(37,99,235,.08)] focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          buttonClassName
        )}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-slate-400"}`}>
          {selectedLabel ?? selected?.label ?? effectivePlaceholder}
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
