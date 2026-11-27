import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, SunMedium, type LucideIcon } from "lucide-react";
import { useTheme, type ThemeName } from "./themeContext";

// Ikki rejim: asosiy (quyosh — yorug' sutli ko'rinish) va "Shisha" (uchqunlar — suyuq shisha). Nomi aria-label/title da.
const choices: Array<{ id: ThemeName; kalit: string; Ikonka: LucideIcon; rang: string }> = [
  { id: "default", kalit: "theme.default", Ikonka: SunMedium, rang: "text-sky-300" },
  { id: "shisha", kalit: "theme.glass", Ikonka: Sparkles, rang: "text-amber-200" },
];

export default function ThemeSwitcher({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation("common");

  const tanlash = (id: ThemeName, event: MouseEvent<HTMLButtonElement>) => {
    if (id === theme) return;
    const r = event.currentTarget.getBoundingClientRect();
    setTheme(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.label")}
      data-mavzu-tanlash=""
      className={`flex shrink-0 items-center gap-1 rounded-xl border p-1 ${
        variant === "dark" ? "border-white/10 bg-white/10" : "border-gray-200 bg-gray-100 shadow-sm"
      }`}
    >
      {choices.map(({ id, kalit, Ikonka, rang }) => {
        const active = theme === id;
        const nom = t(kalit);
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={nom}
            title={id === "shisha" ? t("theme.glassHint") : nom}
            data-mavzu={id}
            onClick={(event) => tanlash(id, event)}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 ${
              active
                ? variant === "dark"
                  ? "bg-white/25 shadow-sm ring-1 ring-white/30"
                  : "bg-white shadow-sm ring-1 ring-black/5"
                : variant === "dark"
                  ? "opacity-70 hover:bg-white/15 hover:opacity-100"
                  : "opacity-60 hover:bg-white/60 hover:opacity-100"
            }`}
          >
            <Ikonka size={17} strokeWidth={2.2} aria-hidden="true" className={active ? rang : variant === "dark" ? "text-white" : "text-slate-600"} />
          </button>
        );
      })}
    </div>
  );
}
