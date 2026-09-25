import type { SVGProps } from "react";
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

const LANGUAGE_META: Record<AppLanguage, { label: string; Flag: (props: SVGProps<SVGSVGElement>) => React.JSX.Element }> = {
  uz: { label: "UZ", Flag: UzFlagIcon },
  ru: { label: "RU", Flag: RuFlagIcon },
};

type LanguageSwitcherProps = {
  className?: string;
  variant?: "dark" | "light";
};

export default function LanguageSwitcher({ className = "", variant = "dark" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language) as AppLanguage;

  const containerClass =
    variant === "dark"
      ? "border-white/15 bg-slate-900/70 backdrop-blur-md"
      : "border-gray-200 bg-white";

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border p-1 shadow-lg ${containerClass} ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((code) => {
        const { label, Flag } = LANGUAGE_META[code];
        const active = current === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => void i18n.changeLanguage(code)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
              active
                ? "bg-orange-500 text-white shadow"
                : variant === "dark"
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-500 hover:text-slate-900"
            }`}
            aria-pressed={active}
          >
            <span className="inline-block h-3.5 w-5 overflow-hidden rounded-[3px] ring-1 ring-black/10">
              <Flag className="h-full w-full" />
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
