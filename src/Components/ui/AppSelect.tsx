import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type OptionProps = {
  value?: string | number;
  disabled?: boolean;
  children?: ReactNode;
};

type AppSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & {
  children?: ReactNode;
};

type SelectOption = {
  value: string;
  label: ReactNode;
  disabled: boolean;
};

function optionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return Children.toArray(node).map(optionText).join("");
}

function optionsFromChildren(children: ReactNode): SelectOption[] {
  const result: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      const props = (child as ReactElement<OptionProps>).props;
      result.push({
        value: String(props.value ?? optionText(props.children)),
        label: props.children,
        disabled: Boolean(props.disabled),
      });
      return;
    }
    if (child.type === "optgroup") {
      const props = child.props as { children?: ReactNode };
      result.push(...optionsFromChildren(props.children));
    }
  });
  return result;
}

export default function AppSelect({
  children,
  value,
  defaultValue,
  onChange,
  className = "",
  disabled,
  required,
  name,
  id,
  "aria-label": ariaLabel,
  ...rest
}: AppSelectProps) {
  const options = optionsFromChildren(children);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const currentValue = controlled ? String(value ?? "") : internalValue;
  const selected = options.find((option) => option.value === currentValue);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const positionMenu = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const gap = 6;
    const padding = 10;
    const width = Math.min(rect.width, window.innerWidth - padding * 2);
    const desiredHeight = Math.min(256, options.length * 40 + 10);
    const below = window.innerHeight - rect.bottom - gap - padding;
    const above = rect.top - gap - padding;
    const opensUp = below < Math.min(desiredHeight, 150) && above > below;
    const maxHeight = Math.max(80, Math.min(desiredHeight, opensUp ? above : below));
    setMenuStyle({
      position: "fixed",
      zIndex: 100000,
      left: Math.min(Math.max(padding, rect.left), window.innerWidth - width - padding),
      top: opensUp ? Math.max(padding, rect.top - gap - maxHeight) : rect.bottom + gap,
      width,
      maxHeight,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function choose(nextValue: string) {
    if (!controlled) setInternalValue(nextValue);
    if (onChange) {
      onChange({ target: { value: nextValue, name }, currentTarget: { value: nextValue, name } } as ChangeEvent<HTMLSelectElement>);
    }
    setOpen(false);
  }

  return (
    <div
      className={`relative ${className} !border-transparent !bg-transparent !shadow-none !ring-0`}
      data-app-select="true"
    >
      <select
        {...rest}
        id={id}
        name={name}
        value={currentValue}
        required={required}
        disabled={disabled}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      >
        {children}
      </select>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((state) => !state);
          requestAnimationFrame(positionMenu);
        }}
        className="flex h-full min-h-[inherit] w-full items-center justify-between gap-2 rounded-[inherit] border border-slate-200 bg-white px-[inherit] py-[inherit] text-left font-inherit text-inherit outline-none transition hover:border-orange-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50"
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-slate-400"}`}>
          {selected?.label ?? "Tanlang"}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180 text-orange-500" : ""}`} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
          className="overflow-y-auto rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.18)] ring-1 ring-white/80"
        >
          {options.map((option, index) => {
            const active = option.value === currentValue;
            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                onClick={() => choose(option.value)}
                className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  active ? "bg-orange-500 text-white" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {active && <Check size={15} className="shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
