import type { Qaytarish, Sotuv, SotuvHolati, SotuvMahsuloti, TolovTuri } from "@/types/savdo";

type MoslashuvchanSotuvMahsuloti = SotuvMahsuloti &
  Record<string, unknown> & {
    saleItem?: { id?: string };
    modification?: SotuvMahsuloti["modification"] & {
      price?: {
        sellingPrice?: number | string;
        retailPrice?: number | string;
        wholesalePrice?: number | string;
      };
    };
  };

function raqamgaAylantirish(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const compact = value.replace(/\s/g, "");
    const normalized = /,\d{3}(\D|$)/.test(compact) && !compact.includes(".")
      ? compact.replace(/,/g, "")
      : compact.replace(",", ".");
    const cleaned = normalized.replace(/[^\d.-]/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

export function sotuvMahsulotiId(item: SotuvMahsuloti) {
  const mosItem = item as MoslashuvchanSotuvMahsuloti;
  return item.id ?? item.saleItemId ?? mosItem.saleItem?.id ?? "";
}

export function sotuvMahsulotiModifikatsiyaId(item: SotuvMahsuloti) {
  return item.modificationId ?? item.modification?.id ?? "";
}

export function sotuvMahsulotiMiqdori(item: SotuvMahsuloti) {
  const mosItem = item as MoslashuvchanSotuvMahsuloti;
  return raqamgaAylantirish(
    item.quantity ??
      mosItem.qty ??
      mosItem.qtySold ??
      mosItem.soldQuantity ??
      mosItem.amount
  );
}

export function sotuvMahsulotiNarxi(item: SotuvMahsuloti) {
  const mosItem = item as MoslashuvchanSotuvMahsuloti;
  const narx = raqamgaAylantirish(
    item.price ??
      mosItem.unitPrice ??
      mosItem.salePrice ??
      mosItem.sellingPrice ??
      mosItem.modification?.price?.sellingPrice ??
      mosItem.modification?.price?.retailPrice ??
      mosItem.modification?.price?.wholesalePrice
  );

  if (narx > 0) return narx;

  const miqdor = sotuvMahsulotiMiqdori(item);
  const jami = raqamgaAylantirish(mosItem.total ?? mosItem.totalAmount ?? mosItem.sum);
  return miqdor > 0 && jami > 0 ? jami / miqdor : 0;
}

export function pulniFormatlash(value: number | string | null | undefined) {
  const raqam = raqamgaAylantirish(value);
  return `${Number.isFinite(raqam) ? raqam.toLocaleString("uz-UZ") : "0"} so'm`;
}

export function sananiFormatlash(value?: string) {
  if (!value) return "-";

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
  const itemsJami =
    sotuv.items?.reduce(
      (jami, mahsulot) =>
        jami +
        sotuvMahsulotiMiqdori(mahsulot) * sotuvMahsulotiNarxi(mahsulot) -
        raqamgaAylantirish(mahsulot.discount),
      0
    ) ?? 0;
  const backendJami = raqamgaAylantirish(sotuv.totalAmount ?? sotuv.total);

  return backendJami > 0 || itemsJami === 0 ? backendJami : itemsJami;
}

export function sotuvChegirmaSummasi(sotuv: Sotuv) {
  return (
    sotuv.items?.reduce(
      (jami, mahsulot) => jami + raqamgaAylantirish(mahsulot.discount),
      0
    ) ?? 0
  );
}

export function sotuvTolanganSummasi(sotuv: Sotuv) {
  const paymentsJami = sotuv.payments?.reduce((jami, tolov) => jami + raqamgaAylantirish(tolov.amount), 0) ?? 0;
  const backendJami = raqamgaAylantirish(sotuv.paidAmount);
  return backendJami > 0 || paymentsJami === 0 ? backendJami : paymentsJami;
}

export function sotuvQarzdorlikSummasi(sotuv: Sotuv) {
  const backendQarz = raqamgaAylantirish(sotuv.debtAmount);
  if (backendQarz > 0) return backendQarz;
  return Math.max(sotuvSummasi(sotuv) - sotuvTolanganSummasi(sotuv), 0);
}

export function sotuvOrtiqchaTolovSummasi(sotuv: Sotuv) {
  return Math.max(sotuvTolanganSummasi(sotuv) - sotuvSummasi(sotuv), 0);
}

export function qaytarishSummasi(qaytarish: Qaytarish) {
  const itemsJami =
    qaytarish.items?.reduce(
      (jami, mahsulot) => jami + raqamgaAylantirish(mahsulot.quantity) * raqamgaAylantirish(mahsulot.price),
      0
    ) ?? 0;
  const backendJami = raqamgaAylantirish(qaytarish.totalAmount ?? qaytarish.total);
  return backendJami > 0 || itemsJami === 0 ? backendJami : itemsJami;
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
  return sotuv.responsible?.fullName || sotuv.responsible?.name || "-";
}

export function sotuvJadvalId(sotuv: Sotuv) {
  const id = sotuv.documentNumber || sotuv.number || sotuv.id || "SOTUV";
  const onlyDigits = id.replace(/\D/g, "");

  if (onlyDigits.length >= 8) return onlyDigits.slice(0, 8);
  if (onlyDigits.length > 0) return onlyDigits.padEnd(8, "0");

  let hash = 0;
  for (const belgi of id) {
    hash = (hash * 31 + belgi.charCodeAt(0)) % 100_000_000;
  }

  return String(hash).padStart(8, "0");
}

export function sotuvRaqami(sotuv: Sotuv) {
  return sotuvJadvalId(sotuv);
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
