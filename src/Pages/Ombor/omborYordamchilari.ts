import type { MahsulotModifikatsiyasi, OmborQoldigi } from "@/types/ombor";

export function sana(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function pul(value?: number) {
  return `${Number(value ?? 0).toLocaleString("uz-UZ")} so'm`;
}

export function modificationNomi(modification?: MahsulotModifikatsiyasi) {
  return modification?.product?.name ?? modification?.name ?? modification?.barcode ?? "Noma'lum";
}

export function qoldiqMiqdori(qoldiq: OmborQoldigi) {
  return qoldiq.availableQuantity ?? qoldiq.quantity ?? qoldiq.balance ?? 0;
}

export function hujjatRaqami(hujjat: { id: string; documentNumber?: string; number?: string }) {
  return hujjat.documentNumber ?? hujjat.number ?? hujjat.id.slice(0, 8).toUpperCase();
}

export function holat(value?: string) {
  const status = String(value ?? "DRAFT").toUpperCase();
  const labels: Record<string, string> = {
    DRAFT: "Qoralama",
    CONFIRMED: "Tasdiqlangan",
    CANCELLED: "Bekor qilingan",
    CANCELED: "Bekor qilingan",
    SENT: "Jo'natilgan",
    RECEIVED: "Qabul qilingan",
  };
  return labels[status] ?? status;
}
