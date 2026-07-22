export type ApiTili = "uz" | "ru" | "en";

export function apiTiliniOlish(): ApiTili {
  if (typeof window === "undefined") return "uz";

  const saqlangan = window.localStorage.getItem("lang");
  if (saqlangan === "uz" || saqlangan === "ru" || saqlangan === "en") return saqlangan;

  const hujjatTili = document.documentElement.lang.toLowerCase().slice(0, 2);
  return hujjatTili === "ru" || hujjatTili === "en" ? hujjatTili : "uz";
}

export function apiTilHeaderi() {
  return { "x-lang": apiTiliniOlish() };
}
