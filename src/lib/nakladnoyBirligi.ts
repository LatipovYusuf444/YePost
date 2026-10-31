import { qatorBirligida, type BirlikliQator } from "./kopBirlik.ts";

// Quantity and price must be from the same saved unit snapshot. Totals remain server/base values.
export function nakladnoyQatori(item: BirlikliQator & { baseUnitName?: string | null }, baseFallback = "dona") {
  const row = qatorBirligida(item);
  return { ...row, birlik: row.unitId ? row.birlik?.trim() || "—" : item.baseUnitName?.trim() || baseFallback };
}

export function nakladnoyHtmlMatni(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
