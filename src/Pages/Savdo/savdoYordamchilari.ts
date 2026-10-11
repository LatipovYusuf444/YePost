import { pulMatni, useValyutaStore, valyutaKodi, type Valyuta } from "@/lib/valyuta";
import type { Qaytarish, QaytarishMahsuloti, Sotuv, SotuvHolati, SotuvMahsuloti, SotuvTolovi, TolovTuri } from "@/types/savdo";

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

/**
 * Summani matnga aylantiradi. `valyuta` berilsa va u dollar bo'lsa, summa o'z valyutasida ($) ko'rsatiladi — kursga o'girilmaydi
 * (aralash sotuvda dollar qatori tasdiqlangan kundagi kursga bog'langan, bugungi kurs bilan qayta hisoblash noto'g'ri bo'lardi).
 * Aks holda (so'm yoki valyuta berilmagan) avvalgidek: tanlangan ko'rinish valyutasida.
 */
export function pulniFormatlash(value: number | string | null | undefined, valyuta?: Valyuta) {
  const son = raqamgaAylantirish(value);
  if (valyuta === "USD") return `$${son.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}`;
  return pulMatni(son);
}

/** Sotuv jami / qarz / foyda hisoblanadigan valyuta (backend `currency`; belgilanmagan bo'lsa — so'm). */
export function sotuvValyutasi(sotuv: Pick<Sotuv, "currency">): Valyuta {
  return valyutaKodi(sotuv.currency);
}

/** Qator o'z valyutasi (aralash sotuvda dollar qatori); belgilanmagan bo'lsa — sotuv valyutasi. */
export function qatorValyutasi(item: Pick<SotuvMahsuloti, "currency">, sotuv: Pick<Sotuv, "currency">): Valyuta {
  return item.currency ? valyutaKodi(item.currency) : sotuvValyutasi(sotuv);
}

/** To'lov o'z valyutasi; belgilanmagan bo'lsa — sotuv valyutasi. */
export function tolovValyutasi(tolov: Pick<SotuvTolovi, "currency">, sotuv: Pick<Sotuv, "currency">): Valyuta {
  return tolov.currency ? valyutaKodi(tolov.currency) : sotuvValyutasi(sotuv);
}

// Sotuvdagi so'm/dollar kursi (1 USD = necha so'm): avval boshqa valyutadagi to'lovdan (`amount` va `settledAmount` nisbati —
// tasdiqlangan kundagi kurs), bo'lmasa bugungi kursdan. Topilmasa 0.
function sotuvKursi(sotuv: Pick<Sotuv, "currency" | "payments">) {
  const sotuvVal = sotuvValyutasi(sotuv);
  for (const tolov of sotuv.payments ?? []) {
    const summa = raqamgaAylantirish(tolov.amount);
    const hisoblangan = raqamgaAylantirish(tolov.settledAmount);
    const tolovVal = tolov.currency ? valyutaKodi(tolov.currency) : sotuvVal;
    if (tolovVal === sotuvVal || !(summa > 0) || !(hisoblangan > 0)) continue;
    return tolovVal === "USD" ? hisoblangan / summa : summa / hisoblangan;
  }
  const { kurs, kursBor } = useValyutaStore.getState();
  return kursBor && kurs > 0 ? kurs : 0;
}

/** Summani so'mga o'giradi (dollar bo'lsa bugungi kurs bilan; kurs yo'q bo'lsa — o'zgarishsiz). Turli valyutadagi hujjatlar yig'indisi uchun. */
export function summaniSomga(summa: number, valyuta: Valyuta) {
  if (valyuta !== "USD") return summa;
  const { kurs, kursBor } = useValyutaStore.getState();
  return kursBor && kurs > 0 ? summa * kurs : summa;
}

export function sotuvSummasiniSomga(summa: number, sotuv: Pick<Sotuv, "currency">) {
  return summaniSomga(summa, sotuvValyutasi(sotuv));
}

/** Qaytarish hujjati summalari valyutasi: hujjatning o'zi, bo'lmasa bog'langan sotuv, bo'lmasa so'm. */
export function qaytarishValyutasi(qaytarish: Pick<Qaytarish, "currency" | "sale">): Valyuta {
  return valyutaKodi(qaytarish.currency ?? qaytarish.sale?.currency);
}

/** Qaytarish hujjati qatori valyutasi: qatorning o'zi, bo'lmasa hujjat valyutasi. */
export function qaytarishQatoriValyutasi(item: Pick<QaytarishMahsuloti, "currency">, qaytarish: Pick<Qaytarish, "currency" | "sale">): Valyuta {
  return item.currency ? valyutaKodi(item.currency) : qaytarishValyutasi(qaytarish);
}

/** Qator summasini sotuv valyutasiga o'giradi; kurs topilmasa `null`. */
export function sotuvValyutasigaOgirish(summa: number, manba: Valyuta, sotuv: Pick<Sotuv, "currency" | "payments">) {
  const nishon = sotuvValyutasi(sotuv);
  if (manba === nishon) return summa;
  const kurs = sotuvKursi(sotuv);
  if (!(kurs > 0)) return null;
  return manba === "USD" ? summa * kurs : summa / kurs;
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
        (sotuvValyutasigaOgirish(
          sotuvMahsulotiMiqdori(mahsulot) * sotuvMahsulotiNarxi(mahsulot) - raqamgaAylantirish(mahsulot.discount),
          qatorValyutasi(mahsulot, sotuv),
          sotuv
        ) ?? 0),
      0
    ) ?? 0;
  const backendJami = raqamgaAylantirish(sotuv.totalAmount ?? sotuv.total);

  return backendJami > 0 || itemsJami === 0 ? backendJami : itemsJami;
}

// Qatorlardagi chegirmalar yig'indisi; ro'yxat javobida qatorlar bo'lmasa backend `discountAmount` olinadi.
export function sotuvChegirmaSummasi(sotuv: Sotuv) {
  const qatorlarChegirmasi =
    sotuv.items?.reduce(
      (jami, mahsulot) =>
        jami + (sotuvValyutasigaOgirish(raqamgaAylantirish(mahsulot.discount), qatorValyutasi(mahsulot, sotuv), sotuv) ?? 0),
      0
    ) ?? 0;

  return qatorlarChegirmasi > 0 ? qatorlarChegirmasi : raqamgaAylantirish(sotuv.discountAmount);
}

// To'lov sotuv valyutasidagi qiymati: boshqa valyutadagi to'lovda backend hisoblab saqlagan `settledAmount`.
export function tolovSotuvValyutasida(tolov: SotuvTolovi, sotuv: Pick<Sotuv, "currency" | "payments">) {
  const summa = raqamgaAylantirish(tolov.amount);
  if (tolovValyutasi(tolov, sotuv) === sotuvValyutasi(sotuv)) return summa;
  const hisoblangan = raqamgaAylantirish(tolov.settledAmount);
  return hisoblangan > 0 ? hisoblangan : (sotuvValyutasigaOgirish(summa, tolovValyutasi(tolov, sotuv), sotuv) ?? 0);
}

export function sotuvTolanganSummasi(sotuv: Sotuv) {
  const paymentsJami = sotuv.payments?.reduce((jami, tolov) => jami + tolovSotuvValyutasida(tolov, sotuv), 0) ?? 0;
  const holat = String(sotuv.status ?? "DRAFT").toUpperCase();
  if (
    holat !== "DRAFT" &&
    sotuv.paidAmount !== undefined &&
    sotuv.paidAmount !== null
  ) {
    return raqamgaAylantirish(sotuv.paidAmount);
  }
  return paymentsJami;
}

export function sotuvQarzdorlikSummasi(sotuv: Sotuv) {
  const holat = String(sotuv.status ?? "DRAFT").toUpperCase();
  // Backend bekor qilingan sotuvda paidAmount/debtAmount ni tarix sifatida saqlaydi — bu qarz emas.
  if (holat === "CANCELLED" || holat === "CANCELED") return 0;
  if (
    holat !== "DRAFT" &&
    sotuv.debtAmount !== undefined &&
    sotuv.debtAmount !== null
  ) {
    return Math.max(raqamgaAylantirish(sotuv.debtAmount), 0);
  }
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

// Donalik savdoda kassir yozgan mijoz ismi backendda alohida maydonda (walkInCustomerName) saqlanadi.
// Eski sotuvlarda bu maydon yo'q edi: ism izohga "Mijoz: <ism> | <izoh>" ko'rinishida yozilgan — zaxira sifatida shundan o'qiladi.
// Sotuvga ro'yxatdagi mijoz yoki kompaniya biriktirilmagan bo'lsagina ishlatiladi.
const DONALIK_MIJOZ_IZOHI = /^\s*Mijoz:\s*([^|\n]+?)\s*(?:\||$|\n)/;

export function donalikMijozNomi(
  sotuv: Pick<Sotuv, "note" | "customer" | "customerId" | "clientCompany" | "clientCompanyId" | "walkInCustomerName">
) {
  if (sotuv.customer || sotuv.customerId || sotuv.clientCompany || sotuv.clientCompanyId) return "";
  const nom = sotuv.walkInCustomerName?.trim();
  if (nom) return nom;
  return DONALIK_MIJOZ_IZOHI.exec(sotuv.note ?? "")?.[1]?.trim() ?? "";
}

export function mijozNomi(sotuv: Sotuv) {
  const mijoz = sotuv.customer;
  const jismoniyMijoz = [mijoz?.firstName, mijoz?.lastName].filter(Boolean).join(" ");

  return (
    jismoniyMijoz ||
    mijoz?.fullName ||
    mijoz?.name ||
    sotuv.clientCompany?.name ||
    donalikMijozNomi(sotuv) ||
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

