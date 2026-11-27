import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ThemeContext, type MavzuNuqtasi, type ThemeName } from "./themeContext";

const STORAGE_KEY = "yepost-theme";

function readTheme(): ThemeName {
  try {
    // Eski "green"/"purple" tanlovlari (olib tashlangan) — asosiy mavzuga qaytadi.
    return localStorage.getItem(STORAGE_KEY) === "shisha" ? "shisha" : "default";
  } catch {
    return "default";
  }
}

type ViewTransitionHujjati = Document & { startViewTransition?: (yangilash: () => void) => { finished: Promise<void> } };

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

  // Rejim almashishi: View Transitions bilan bosilgan nuqtadan aylana bo'lib silliq ochiladi (sahifa "qotmaydi" — brauzer eski va
  // yangi ko'rinish rasmlarini GPU'da almashtiradi). Qo'llab-quvvatlanmasa yoki "kamroq harakat" yoqilgan bo'lsa — darhol.
  const setTheme = useCallback((yangi: ThemeName, nuqta?: MavzuNuqtasi) => {
    const hujjat = document as ViewTransitionHujjati;
    const kamHarakat = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hujjat.startViewTransition || kamHarakat) {
      setThemeState(yangi);
      return;
    }
    const html = document.documentElement;
    html.style.setProperty("--mavzu-x", nuqta ? `${Math.round(nuqta.x)}px` : "50%");
    html.style.setProperty("--mavzu-y", nuqta ? `${Math.round(nuqta.y)}px` : "0px");
    html.dataset.mavzuOtish = "";
    const otish = hujjat.startViewTransition(() => {
      flushSync(() => setThemeState(yangi));
    });
    void otish.finished.finally(() => {
      delete html.dataset.mavzuOtish;
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
