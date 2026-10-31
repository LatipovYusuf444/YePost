import type { OlchovBirligi } from "../types/catalog.ts";

const donaNomlari = new Set(["dona", "шт", "штука", "штук", "sht", "shtuk", "piece", "pieces", "pc", "pcs"]);
const kalit = (value?: string | null) => (value ?? "").trim().toLowerCase().replace(/\.$/, "");

export function donaBirligimi(unit?: Pick<OlchovBirligi, "code" | "name" | "shortName"> | null) {
  return Boolean(unit && (kalit(unit.code) === "h87" || [unit.name, unit.shortName].some((value) => donaNomlari.has(kalit(value)))));
}

export function donaBirliginiTopish(units: readonly OlchovBirligi[]) {
  return units.find(donaBirligimi);
}
