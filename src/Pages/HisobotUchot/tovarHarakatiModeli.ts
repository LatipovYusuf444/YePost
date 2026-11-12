import { toshkentKuni } from "../../lib/hujjatSanasi.ts";
import { movementStockTotals } from "../../lib/negativeStock.ts";
import type { Maxsulot, Tanlov, TovarHarakati, TovarHarakatiFilter } from "./types.ts";

const matn = (value: unknown) => typeof value === "string" ? value.trim() : "";
const raqam = (value: unknown) => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const obyekt = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const HARAKAT_TURLARI: Record<string, string> = {
  SALE: "Savdo", PURCHASE: "Kirim", RETURN: "Sotuvdan qaytarish", SALE_RETURN: "Sotuvdan qaytarish",
  PURCHASE_RETURN: "Yetkazib beruvchiga qaytarish", STOCK_TAKE: "Inventarizatsiya", WRITE_OFF: "Hisobdan chiqarish",
  TRANSFER_IN: "Ko'chirish: kirim", TRANSFER_OUT: "Ko'chirish: chiqim", TRANSFER: "Ko'chirish",
  PRODUCTION_IN: "Ishlab chiqarish: kirim", PRODUCTION_OUT: "Ishlab chiqarish: chiqim",
  PRODUCTION_OUTPUT: "Ishlab chiqarish: tayyor mahsulot", PRODUCTION_CONSUMPTION: "Ishlab chiqarish: xomashyo",
  OPENING_BALANCE: "Boshlang'ich qoldiq",
};

export function harakatTuriNomi(row: TovarHarakati) {
  return HARAKAT_TURLARI[row.type ?? ""] ?? row.type ?? "Hujjat";
}

export function harakatSanaMatni(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value || "—" : new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function harakatMiqdori(row: TovarHarakati) {
  return row.harakatMiqdori ?? (["kirim", "inventarizatsiya"].includes(row.hujjatTuri) ? row.miqdor : -row.miqdor);
}

export function harakatlarniMoslash(raw: unknown): TovarHarakati[] {
  const data = obyekt(raw);
  const inner = obyekt(data.data);
  const rows = [raw, data.items, data.data, inner.items].find(Array.isArray) as unknown[] | undefined;
  return (rows ?? []).map((value, index) => {
    const row = obyekt(value);
    const type = matn(row.type).toUpperCase();
    const quantity = raqam(row.quantity) ?? 0;
    const currency = matn(row.priceCurrency ?? row.currency).toUpperCase();
    const valyuta = currency === "USD" || currency === "UZS" ? currency : null;
    const narx = raqam(row.price);
    const summa = raqam(row.total) ?? (narx === null ? null : Math.abs(quantity) * narx);
    const kurs = raqam(row.rate);
    const somga = (amount: number | null) => amount === null ? null : valyuta === "UZS" ? amount : valyuta === "USD" && kurs !== null && kurs > 0 ? amount * kurs : null;
    const refId = matn(row.refId ?? row.documentId);
    return {
      id: matn(row.id) || `${type}:${refId}:${matn(row.warehouseId)}:${matn(row.modificationId)}:${index}`,
      refId, type, sana: matn(row.date),
      hujjatTuri: type === "STOCK_TAKE" ? "inventarizatsiya" : type === "SALE" ? "realizatsiya" : quantity > 0 ? "kirim" : "chiqim",
      hujjatRaqam: matn(row.docNumber ?? row.documentNumber),
      productId: matn(row.productId), productName: matn(row.productName), modificationName: matn(row.modificationName),
      xarakteristikaId: matn(row.modificationId), categoryId: matn(row.categoryId), warehouseId: matn(row.warehouseId),
      warehouseName: matn(row.warehouseName), filialId: matn(row.branchId),
      miqdor: Math.abs(quantity), harakatMiqdori: quantity,
      openingBalance: raqam(row.openingBalance) ?? undefined, closingBalance: raqam(row.closingBalance) ?? undefined,
      customerId: matn(row.customerId), supplierId: matn(row.supplierId), counterpartyName: matn(row.counterpartyName),
      narx, summa, valyuta, kurs,
      narxSom: raqam(row.priceUzs) ?? somga(narx), summaSom: raqam(row.totalUzs) ?? somga(summa),
    };
  });
}

export function harakatKontragenti(row: TovarHarakati, mijozlar: Tanlov[] = [], yetkazib: Tanlov[] = []) {
  return row.counterpartyName || mijozlar.find(item => item.id === row.customerId)?.nomi || yetkazib.find(item => item.id === row.supplierId)?.nomi
    || (row.type === "SALE" ? row.customerId ? "Mijoz nomi ko'rsatilmagan" : "Donalik mijoz" : "—");
}

function raqamKaliti(row: TovarHarakati) {
  const type = row.type?.startsWith("TRANSFER") ? "TRANSFER" : row.type;
  return `${type}:${row.hujjatRaqam}`;
}

/** Bir hujjatning ko'p mahsulot qatori dublikat raqam hisoblanmaydi. */
export function takroriyHujjatRaqamlari(rows: TovarHarakati[]) {
  const ids = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.refId || !row.hujjatRaqam) continue;
    const key = raqamKaliti(row);
    if (!ids.has(key)) ids.set(key, new Set());
    ids.get(key)!.add(row.refId);
  }
  return new Set([...ids].filter(([, values]) => values.size > 1).map(([key]) => key));
}

export function harakatRaqamiTakrormi(row: TovarHarakati, takrorlar: Set<string>) {
  return takrorlar.has(raqamKaliti(row));
}

export type HarakatKorinishQatori = {
  kind: "header" | "detail"; id: string; guruhId: string; nomi: string;
  boshQoldiq: number; kirim: number | null; chiqim: number | null; oxirgiQoldiq: number;
  productId?: string; harakat?: TovarHarakati;
};

export function harakatGuruhlari(rows: TovarHarakati[], products: Maxsulot[], filter: TovarHarakatiFilter, search = "", mijozlar: Tanlov[] = [], yetkazib: Tanlov[] = [], omborlar: Tanlov[] = []) {
  const names = new Map(products.map(product => [product.id, product.nomi]));
  const kalit = search.trim().toLocaleLowerCase();
  const groups = new Map<string, TovarHarakati[]>();
  for (const row of rows) {
    const day = toshkentKuni(row.sana);
    if (day && (day < filter.dateFrom || day > filter.dateTo)) continue;
    const haystack = [row.productName, row.modificationName, names.get(row.productId), row.hujjatRaqam, row.refId,
      harakatTuriNomi(row), harakatKontragenti(row, mijozlar, yetkazib), row.warehouseName, omborlar.find(item => item.id === row.warehouseId)?.nomi].join(" ").toLocaleLowerCase();
    if (kalit && !haystack.includes(kalit)) continue;
    const id = row.productId || `variant:${row.xarakteristikaId || row.productName || row.id}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(row);
  }
  const result: HarakatKorinishQatori[] = [];
  for (const [id, group] of groups) {
    group.sort((a, b) => a.sana.localeCompare(b.sana));
    const stock = movementStockTotals(group.map(row => ({ key: `${row.warehouseId}:${row.xarakteristikaId}`, movement: harakatMiqdori(row), openingBalance: row.openingBalance, closingBalance: row.closingBalance })));
    const details = group.map((row, index): HarakatKorinishQatori => ({
      kind: "detail", id: row.id, guruhId: id, nomi: row.productName || names.get(row.productId) || row.modificationName || "Mahsulot nomi ko'rsatilmagan",
      boshQoldiq: stock.lines[index].opening, kirim: harakatMiqdori(row) > 0 ? row.miqdor : null,
      chiqim: harakatMiqdori(row) < 0 ? row.miqdor : null, oxirgiQoldiq: stock.lines[index].closing, harakat: row,
    }));
    result.push({ kind: "header", id: `header:${id}`, guruhId: id, nomi: group[0].productName || names.get(group[0].productId) || group[0].modificationName || "Mahsulot nomi ko'rsatilmagan", productId: group[0].productId,
      boshQoldiq: stock.opening, kirim: details.reduce((sum, row) => sum + (row.kirim ?? 0), 0), chiqim: details.reduce((sum, row) => sum + (row.chiqim ?? 0), 0), oxirgiQoldiq: stock.closing });
    result.push(...details);
  }
  return result;
}

const pul = (amount: number) => amount.toLocaleString("uz-UZ", { maximumFractionDigits: 2 });
export function harakatPulMatni(row: TovarHarakati, maydon: "narx" | "summa") {
  const original = row[maydon];
  const som = maydon === "narx" ? row.narxSom : row.summaSom;
  const own = original == null ? null : row.valyuta === "USD" ? `$${pul(original)}` : row.valyuta === "UZS" ? `${pul(original)} so'm` : `${pul(original)} (valyuta noma'lum)`;
  if (som != null) return `${pul(som)} so'm${row.valyuta === "USD" && own ? ` (${own})` : ""}`;
  return own ?? "—";
}

/**
 * Pul jami. Standart — so'mda (`summaSom`, kurs bilan o'girilgan). "Faqat dollar" rejimida (`valyuta` = "USD") — dollardagi qatorlarning
 * o'z summasi (`summa`), kurs kerak emas; boshqa valyutadagi qator jamga qo'shilmaydi (jami to'liq emas deb belgilanadi).
 */
export function harakatPulJami(rows: TovarHarakati[], valyuta: "UZS" | "USD" = "UZS") {
  let kirim = 0, chiqim = 0, toliq = true;
  if (valyuta === "USD") {
    for (const row of rows) {
      if (row.summa == null || row.valyuta !== "USD") { toliq = false; continue; }
      if (harakatMiqdori(row) > 0) kirim += Math.abs(row.summa);
      if (harakatMiqdori(row) < 0) chiqim += Math.abs(row.summa);
    }
    return { kirim, chiqim, toliq };
  }
  for (const row of rows) {
    if (row.summa == null && row.summaSom == null) { toliq = false; continue; }
    if (row.summaSom == null) { toliq = false; continue; }
    if (harakatMiqdori(row) > 0) kirim += Math.abs(row.summaSom);
    if (harakatMiqdori(row) < 0) chiqim += Math.abs(row.summaSom);
  }
  return { kirim, chiqim, toliq };
}

export function harakatHavolasi(row: TovarHarakati) {
  if (!row.refId) return null;
  const id = encodeURIComponent(row.refId);
  if (row.type === "SALE") return { href: `/savdo?tab=tarix&sotuv=${id}`, nom: "Savdo tarixida ochish" };
  const paths: Record<string, string> = { STOCK_TAKE: "inventarizatsiya", WRITE_OFF: "chiqimlar", PURCHASE: "kirimlar", TRANSFER_IN: "kochirishlar", TRANSFER_OUT: "kochirishlar", TRANSFER: "kochirishlar" };
  return paths[row.type ?? ""] ? { href: `/ombor/${paths[row.type!]}?hujjat=${id}`, nom: row.type === "STOCK_TAKE" ? "Inventarizatsiyada ochish" : "Hujjat bo'limida ochish" } : null;
}
