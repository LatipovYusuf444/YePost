import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { useTheme, type ThemeName } from "./ThemeProvider";

const choices: Array<{ id: ThemeName; label: string; swatch: string }> = [
  { id: "default", label: "Default", swatch: "bg-blue-600" },
  { id: "green", label: "Yashil", swatch: "bg-emerald-500" },
  { id: "purple", label: "Binafsha", swatch: "bg-violet-500" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = choices.find((item) => item.id === theme) ?? choices[0];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Rang mavzusi: ${selected.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Rang mavzusi: ${selected.label}`}
        className="theme-control flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
      >
        <Palette size={18} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Mavzu tanlash oynasini yopish" className="fixed inset-0 z-[100] cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" aria-label="Rang mavzusi" className="theme-menu absolute right-0 top-12 z-[101] w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                role="menuitemradio"
                aria-checked={theme === choice.id}
                onClick={() => { setTheme(choice.id); setOpen(false); }}
                className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className={`h-3 w-3 rounded-full ${choice.swatch}`} />
                <span className="flex-1 text-left">{choice.label}</span>
                {theme === choice.id && <Check size={15} className="text-[var(--theme-primary)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
