import type { Mahsulot, OlchovBirligi } from "../types/catalog.ts";
import type { StockBalanceItem } from "../api/reportsApi.ts";

export type KategoriyaQatori = {
  kalit: string;
  mahsulotId: string;
  nom: string;
  variant: string;
  shtrix: string;
  artikul: string;
  omborId: string | null;
  omborNomi: string;
  birlik: string;
  qoldiq: number | null;
  rezerv: number | null;
  mavjud: number | null;
  nofaol: boolean;
};

function raqam(value: unknown): number | null {
  if (value == null || value === "") return null;
  const son = Number(value);
  return Number.isFinite(son) ? son : null;
}

type Obyekt = Record<string, unknown>;

function obyekt(qiymat: unknown): Obyekt | null {
  return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : null;
}

/**
 * GET /catalog/products?categoryId=<id> javobi (massiv, `{ items }`, `{ data }` yoki `{ data: { items } }`) → mahsulotlar va serverning
 * aniq yozgan `totalPages` soni (yozilmasa 1: oddiy massiv javobda sahifalash bor deb taxmin qilinmaydi). Id'siz qatorlar tashlanadi.
 */
export function kategoriyaMahsulotlariJavobi(raw: unknown): { items: Mahsulot[]; totalPages: number } {
  const asosiy = obyekt(raw);
  const ichki = obyekt(asosiy?.data);
  const royxat = [raw, asosiy?.items, asosiy?.data, ichki?.items].find(Array.isArray) as unknown[] | undefined;
  const items = (royxat ?? []).filter((element): element is Mahsulot => {
    const qator = obyekt(element);
    return typeof qator?.id === "string" && qator.id !== "";
  });
  const sahifalar = Number(asosiy?.totalPages ?? ichki?.totalPages);
  return { items, totalPages: Number.isFinite(sahifalar) && sahifalar > 1 ? Math.floor(sahifalar) : 1 };
}

/**
 * Serverdan kelgan kategoriya mahsulotlari umumiy ro'yxat bilan birlashtiriladi (id bo'yicha, serverniki ustun): serverda bo'lib,
 * yuklangan umumiy ro'yxatda yo'q (yoki aksincha) mahsulot ham kategoriya ro'yxatidan tushib qolmaydi.
 */
export function kategoriyaMahsulotlariniBirlashtirish(server: readonly Mahsulot[] | null | undefined, umumiy: readonly Mahsulot[]): Mahsulot[] {
  if (!server?.length) return [...umumiy];
  const xarita = new Map<string, Mahsulot>(umumiy.map((mahsulot) => [mahsulot.id, mahsulot]));
  for (const mahsulot of server) xarita.set(mahsulot.id, { ...xarita.get(mahsulot.id), ...mahsulot });
  return Array.from(xarita.values());
}

export function kategoriyaQatorlari(
  kategoriyaId: string,
  mahsulotlar: Mahsulot[],
  qoldiqlar: StockBalanceItem[],
  birliklar: OlchovBirligi[] = [],
): KategoriyaQatori[] {
  const mahsulotXaritasi = new Map(mahsulotlar.map(item => [item.id, item]));
  const birlikXaritasi = new Map(birliklar.map(item => [item.id, item.shortName || item.name]));
  const birligi = (item?: Mahsulot) => item?.unit?.shortName || item?.unit?.name || birlikXaritasi.get(item?.unitId ?? "") || "";
  const topilgan = new Set<string>();
  const natija: KategoriyaQatori[] = [];

  qoldiqlar.forEach((qator, index) => {
    const mahsulot = mahsulotXaritasi.get(qator.productId);
    const kategoriya = mahsulot?.categoryId || mahsulot?.category?.id;
    if ((qator.categoryId && qator.categoryId !== kategoriyaId) || (kategoriya && kategoriya !== kategoriyaId)) return;
    topilgan.add(qator.productId);
    const qoldiq = raqam(qator.quantity);
    const rezerv = raqam(qator.reservedQuantity);
    const mavjud = raqam(qator.availableQuantity) ?? (qoldiq !== null && rezerv !== null ? qoldiq - rezerv : null);
    natija.push({
      kalit: `${qator.productId}:${qator.modificationId}:${qator.warehouseId ?? "yoq"}:${index}`,
      mahsulotId: qator.productId,
      nom: qator.productName || mahsulot?.name || "—",
      variant: qator.modificationName && qator.modificationName !== (qator.productName || mahsulot?.name) ? qator.modificationName : "",
      shtrix: qator.barcode || mahsulot?.barcode || "",
      artikul: mahsulot?.article || "",
      omborId: qator.warehouseId,
      omborNomi: qator.warehouseName || "",
      birlik: qator.unitName || birligi(mahsulot),
      qoldiq, rezerv, mavjud,
      nofaol: mahsulot?.isActive === false,
    });
  });
  mahsulotlar.filter(item => (item.categoryId || item.category?.id) === kategoriyaId && !topilgan.has(item.id)).forEach(item => {
    natija.push({
      kalit: `${item.id}:qoldiqsiz`, mahsulotId: item.id, nom: item.name,
      variant: "", shtrix: item.barcode || "", artikul: item.article || "",
      omborId: null, omborNomi: "", birlik: birligi(item),
      qoldiq: null, rezerv: null, mavjud: null, nofaol: item.isActive === false,
    });
  });
  return natija.sort((a, b) => a.nom.localeCompare(b.nom, "uz") || a.variant.localeCompare(b.variant, "uz") || a.omborNomi.localeCompare(b.omborNomi, "uz"));
}

// Dona, kilogramm va litr qo'shib yuborilmaydi: har birlik alohida yig'iladi.
export function kategoriyaMiqdorJamilari(qatorlar: KategoriyaQatori[]) {
  const jami = new Map<string, number>();
  for (const qator of qatorlar) {
    if (qator.birlik && qator.mavjud !== null) jami.set(qator.birlik, (jami.get(qator.birlik) ?? 0) + qator.mavjud);
  }
  return Array.from(jami, ([birlik, mavjud]) => ({ birlik, mavjud }));
}
