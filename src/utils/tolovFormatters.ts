import type { TolovUsuliKeng } from "@/types/tolov";

export function tolovSummasiniFormatlash(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toLocaleString("uz-UZ") : "0"} so'm`;
}

export function tolovSanasiniFormatlash(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function tolovUsuliMatni(value?: TolovUsuliKeng | null) {
  const normalized = String(value ?? "OTHER").toUpperCase();
  const labels: Record<string, string> = {
    CASH: "Naqd",
    CARD: "Karta",
    CLICK: "Click",
    PAYME: "Payme",
    BANK: "Bank",
    DEBT: "Qarz",
    OTHER: "Boshqa",
  };

  return labels[normalized] ?? "Boshqa";
}
