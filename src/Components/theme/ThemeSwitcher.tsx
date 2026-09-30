import { useTheme, type ThemeName } from "./themeContext";

const choices: Array<{ id: ThemeName; label: string; swatch: string }> = [
  { id: "default", label: "Default", swatch: "bg-blue-600" },
  { id: "green", label: "Yashil", swatch: "bg-emerald-500" },
  { id: "purple", label: "Binafsha", swatch: "bg-violet-500" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Rang mavzusi"
      className="flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 shadow-sm"
    >
      {choices.map((choice) => {
        const active = theme === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={choice.label}
            title={choice.label}
            onClick={() => setTheme(choice.id)}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all ${
              active ? "bg-white shadow-sm ring-1 ring-black/5" : "hover:bg-white/60"
            }`}
          >
            <span className={`h-3.5 w-3.5 rounded-full ${choice.swatch} ${active ? "" : "opacity-50"}`} />
          </button>
        );
      })}
    </div>
  );
}
