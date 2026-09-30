import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type ThemeName } from "./themeContext";

const STORAGE_KEY = "yepost-theme";

function readTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "green" || saved === "purple" ? saved : "default";
  } catch {
    return "default";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(readTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme still works for this session when browser storage is unavailable.
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
