import { useState, type SVGProps } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n";

function UzFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 14" {...props}>
      <rect width="20" height="14" fill="#0099B5" />
      <rect width="20" height="4.4" y="9.6" fill="#1EB53A" />
      <rect width="20" height="4.4" y="4.8" fill="#fff" />
      <rect width="20" height="0.8" y="4.8" fill="#CE1126" />
      <rect width="20" height="0.8" y="9.2" fill="#CE1126" />
    </svg>
  );
}

function RuFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 14" {...props}>
      <rect width="20" height="14" fill="#fff" />
      <rect width="20" height="4.67" y="4.67" fill="#0039A6" />
      <rect width="20" height="4.67" y="9.33" fill="#D52B1E" />
    </svg>
  );
}

const LANGUAGE_META: Record<AppLanguage, { fullLabel: string; Flag: (props: SVGProps<SVGSVGElement>) => React.JSX.Element }> = {
  uz: { fullLabel: "O'zbekcha", Flag: UzFlagIcon },
  ru: { fullLabel: "Русский", Flag: RuFlagIcon },
};

type LanguageSwitcherProps = {
  className?: string;
  variant?: "dark" | "light";
};

export default function LanguageSwitcher({ className = "", variant = "dark" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = (i18n.resolvedLanguage ?? i18n.language) as AppLanguage;
  const { fullLabel, Flag } = LANGUAGE_META[current] ?? LANGUAGE_META.uz;

  const triggerClass =
    variant === "dark"
      ? "border-white/15 bg-slate-900/70 text-slate-100 backdrop-blur-md hover:bg-slate-900/90"
      : "border-gray-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={fullLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold shadow-sm transition-colors ${triggerClass}`}
      >
        <span className="inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10">
          <Flag className="h-full w-full" />
        </span>
        {fullLabel}
        <ChevronDown size={14} className={`shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Tilni yopish" className="fixed inset-0 z-100 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" aria-label="Tilni tanlash" className="absolute right-0 top-12 z-101 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {SUPPORTED_LANGUAGES.map((code) => {
              const meta = LANGUAGE_META[code];
              const active = current === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => { void i18n.changeLanguage(code); setOpen(false); }}
                  className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? "bg-slate-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10">
                    <meta.Flag className="h-full w-full" />
                  </span>
                  <span className="flex-1 text-left">{meta.fullLabel}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
