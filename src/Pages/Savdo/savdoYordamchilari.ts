import type { Qaytarish, Sotuv, SotuvHolati, TolovTuri } from "@/types/savdo";

export function pulniFormatlash(value: number | string | null | undefined) {
  const raqam = Number(value ?? 0);
  return `${Number.isFinite(raqam) ? raqam.toLocaleString("uz-UZ") : "0"} so'm`;
}

export function sananiFormatlash(value?: string) {
  if (!value) return "—";

  const sana = new Date(value);
  return Number.isNaN(sana.getTime())
    ? value
    : new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(sana);
}

export function sotuvSummasi(sotuv: Sotuv) {
  return (
    sotuv.totalAmount ??
    sotuv.total ??
    sotuv.items?.reduce(
      (jami, mahsulot) =>
        jami + mahsulot.quantity * mahsulot.price - Number(mahsulot.discount ?? 0),
      0
    ) ??
    0
  );
}

export function sotuvTolanganSummasi(sotuv: Sotuv) {
  return (
    sotuv.paidAmount ??
    sotuv.payments?.reduce((jami, tolov) => jami + Number(tolov.amount ?? 0), 0) ??
    0
  );
}

export function sotuvQarzdorlikSummasi(sotuv: Sotuv) {
  if (typeof sotuv.debtAmount === "number") return Math.max(sotuv.debtAmount, 0);
  return Math.max(sotuvSummasi(sotuv) - sotuvTolanganSummasi(sotuv), 0);
}

export function sotuvOrtiqchaTolovSummasi(sotuv: Sotuv) {
  return Math.max(sotuvTolanganSummasi(sotuv) - sotuvSummasi(sotuv), 0);
}

export function qaytarishSummasi(qaytarish: Qaytarish) {
  return (
    qaytarish.totalAmount ??
    qaytarish.total ??
    qaytarish.items?.reduce(
      (jami, mahsulot) => jami + mahsulot.quantity * mahsulot.price,
      0
    ) ??
    0
  );
}

export function mijozNomi(sotuv: Sotuv) {
  const mijoz = sotuv.customer;
  const jismoniyMijoz = [mijoz?.firstName, mijoz?.lastName].filter(Boolean).join(" ");

  return (
    jismoniyMijoz ||
    mijoz?.fullName ||
    mijoz?.name ||
    sotuv.clientCompany?.name ||
    "Donalik mijoz"
  );
}

export function masulNomi(sotuv: Sotuv) {
  return sotuv.responsible?.fullName || sotuv.responsible?.name || "—";
}

export function sotuvJadvalId(sotuv: Sotuv) {
  const onlyDigits = sotuv.id.replace(/\D/g, "");

  if (onlyDigits.length >= 8) return onlyDigits.slice(0, 8);
  if (onlyDigits.length > 0) return onlyDigits.padEnd(8, "0");

  let hash = 0;
  for (const belgi of sotuv.id) {
    hash = (hash * 31 + belgi.charCodeAt(0)) % 100_000_000;
  }

  return String(hash).padStart(8, "0");
}

export function sotuvRaqami(sotuv: Sotuv) {
  return sotuv.documentNumber || sotuv.number || sotuv.id.slice(0, 8).toUpperCase();
}

export function sotuvHolati(sotuv: Sotuv): SotuvHolati {
  const holat = String(sotuv.status ?? "DRAFT").toUpperCase();

  if (holat === "CONFIRMED") return "CONFIRMED";
  if (holat === "CANCELLED" || holat === "CANCELED") return "CANCELLED";
  return "DRAFT";
}

export const sotuvHolatiMatni: Record<SotuvHolati, string> = {
  DRAFT: "Qoralama",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor qilingan",
};

export const tolovTuriMatni: Record<TolovTuri, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  BANK: "Bank o'tkazmasi",
  DEBT: "Qarz",
};
