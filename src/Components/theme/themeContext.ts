import { createContext, useContext } from "react";

export type ThemeName = "default" | "green" | "purple";

export const ThemeContext = createContext<{ theme: ThemeName; setTheme: (theme: ThemeName) => void } | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
