import { createContext, useContext } from "react";

// "default" — asosiy (to'q ko'k panel, sutli kontent). "shisha" — ikkinchi rejim: fon rasmi ustida tutunli suyuq shisha, shisha yon
// panel va oq tugmalar. Shisha ranglari asosiy layout sahifalarida (html[data-shisha-sahifa], useShishaSahifa — AsosiyPanel)
// qo'llanadi; login va admin qismlari asosiy ko'rinishda qoladi. Eski "green"/"purple" tanlovlari asosiyga qaytadi.
export type ThemeName = "default" | "shisha";

/** Rejim almashish animatsiyasi boshlanadigan nuqta (viewport, px) — odatda bosilgan tugma markazi. */
export type MavzuNuqtasi = { x: number; y: number };

export const ThemeContext = createContext<{ theme: ThemeName; setTheme: (theme: ThemeName, nuqta?: MavzuNuqtasi) => void } | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
