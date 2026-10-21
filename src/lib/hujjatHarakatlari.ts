// Hujjat bo'yicha ombor harakati (GET /reports/stock-movement?documentIds=<id>): shu hujjat (sotuv, kirim, chiqim, ko'chirma, qaytarish)
// bilan qaysi mahsulot qancha chiqqan/kirgan. Qatorda `refId` = hujjat id. UI'siz va `@/` importlarisiz yozilgan — alohida sinash mumkin.
import { qatorMiqdoriMatni, type BirlikliQator } from "./kopBirlik.ts";

export type HarakatYonalishi = "chiqim" | "kirim";

export type HujjatHarakati = {
  kalit: string;
  sana: string | null;
  /** Backend hujjat turi (SALE, PURCHASE, WRITE_OFF, TRANSFER_IN, RETURN ...). */
  turi: string;
  hujjatId: string | null;
  /** Hujjat raqami (`docNumber`), masalan SAV-000012. */
  hujjatRaqami: string | null;
  omborId: string | null;
  omborNomi: string;
  mahsulotId: string | null;
  variantId: string | null;
  mahsulotNomi: string;
  variantNomi: string;
  /** Doim musbat; chiqqanmi kirganmi — `yonalish`da. */
  miqdor: number;
  yonalish: HarakatYonalishi;
  birlik: string;
};

type Obyekt = Record<string, unknown>;

function obyekt(qiymat: unknown): Obyekt | null {
  return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : null;
}

function matn(qiymat: unknown): string | null {
  return typeof qiymat === "string" && qiymat.trim() ? qiymat.trim() : null;
}

const yaxlit6 = (son: number) => Math.round(son * 1e6) / 1e6;

// Backend (tasdiqlangan): `quantity` ishorali — "+" kirim, "−" chiqim — va `unitName` birligida (mahsulotning asosiy birligi).
// Yo'nalish faqat ishoradan olinadi: hujjat turiga qarab taxmin qilinmaydi (masalan, bekor qilingan sotuvning "SALE" harakati musbat — kirim).
function harakatYonalishi(miqdor: number): HarakatYonalishi {
  return miqdor < 0 ? "chiqim" : "kirim";
}

/**
 * GET /reports/stock-movement javobi (massiv, `{ items }`, `{ data }` yoki `{ data: { items } }`) → harakatlar.
 * `hujjatId` berilsa, `refId` boshqa hujjatniki bo'lgan qatorlar tashlanadi: eski server `documentIds`ni bilmasa butun harakat ro'yxatini
 * qaytarishi mumkin, u shu hujjatniki sifatida ko'rsatilmasligi kerak. Miqdori yo'q yoki nol qatorlar tashlanadi.
 */
export function hujjatHarakatlari(raw: unknown, hujjatId?: string): HujjatHarakati[] {
  const asosiy = obyekt(raw);
  const ichki = obyekt(asosiy?.data);
  const royxat = [raw, asosiy?.items, asosiy?.data, ichki?.items].find(Array.isArray) as unknown[] | undefined;
  const harakatlar: HujjatHarakati[] = [];
  (royxat ?? []).forEach((element, indeks) => {
    const qator = obyekt(element);
    if (!qator) return;
    const refId = matn(qator.refId) ?? matn(qator.documentId);
    if (hujjatId && refId && refId !== hujjatId) return;
    const imzoliMiqdor = Number(qator.quantity);
    if (!Number.isFinite(imzoliMiqdor) || imzoliMiqdor === 0) return;
    const turi = matn(qator.type) ?? "";
    const mahsulot = obyekt(qator.product);
    const variant = obyekt(qator.modification);
    const ombor = obyekt(qator.warehouse);
    const birlik = obyekt(qator.unit);
    const variantId = matn(qator.modificationId) ?? matn(variant?.id);
    const mahsulotId = matn(qator.productId) ?? matn(mahsulot?.id);
    harakatlar.push({
      kalit: matn(qator.id) ?? `${refId ?? hujjatId ?? "hujjat"}:${variantId ?? mahsulotId ?? "tovar"}:${indeks}`,
      sana: matn(qator.date) ?? matn(qator.createdAt),
      turi,
      hujjatId: refId,
      hujjatRaqami: matn(qator.docNumber),
      omborId: matn(qator.warehouseId) ?? matn(ombor?.id),
      omborNomi: matn(qator.warehouseName) ?? matn(ombor?.name) ?? "",
      mahsulotId,
      variantId,
      mahsulotNomi: matn(qator.productName) ?? matn(mahsulot?.name) ?? "",
      variantNomi: matn(qator.modificationName) ?? matn(variant?.name) ?? "",
      miqdor: Math.abs(imzoliMiqdor),
      yonalish: harakatYonalishi(imzoliMiqdor),
      birlik: matn(qator.unitName) ?? matn(birlik?.shortName) ?? matn(birlik?.name) ?? "",
    });
  });
  return harakatlar;
}

/** Harakat qatori nomini (va birligini) hujjatning o'z qatorlaridan to'ldirish uchun (sotuvdagi tovar nomi); `sotuvdagi` — hujjatda yozilgan miqdor ("2 korobka"). */
export type HarakatNomi = { mahsulot?: string; variant?: string; birlik?: string; sotuvdagi?: string };

export type HarakatQatori = {
  kalit: string;
  mahsulotNomi: string;
  variantNomi: string;
  omborNomi: string;
  birlik: string;
  chiqdi: number;
  qaytdi: number;
  sana: string | null;
  /** Hujjat qatoridagi miqdor (asosiy birlikdan boshqa birlikda sotilgan bo'lsa shu birlikda): ombordagi hisob bilan solishtirish uchun. */
  sotuvdagi: string;
};

/** Sotuv (hujjat) qatori: nom, miqdor va birlik maydonlari (`types/savdo.ts` SotuvMahsuloti bilan mos). */
export type HujjatQatoriNomi = {
  modificationId: string;
  modification?: { name?: string; product?: { name?: string } } | null;
  baseUnitName?: string | null;
  quantity?: unknown;
  price?: unknown;
  unitId?: string | null;
  unitName?: string | null;
  unitQuantity?: unknown;
  unitPrice?: unknown;
};

/**
 * Hujjat qatorlaridan `variant id → nom, birlik, hujjatdagi miqdor` (harakatda nom kelmasa shu ishlatiladi). Bir variant bir necha qatorda
 * bo'lsa, miqdorlar "2 korobka + 1 dona" ko'rinishida birlashtiriladi.
 */
export function hujjatQatorlariNomlari(qatorlar: readonly HujjatQatoriNomi[] | null | undefined): Map<string, HarakatNomi> {
  const xarita = new Map<string, HarakatNomi>();
  for (const qator of qatorlar ?? []) {
    const mahsulot = qator.modification?.product?.name ?? qator.modification?.name ?? "";
    const variant = qator.modification?.name && qator.modification.name !== mahsulot ? qator.modification.name : "";
    const miqdor = qatorMiqdoriMatni(qator as BirlikliQator);
    const mavjud = xarita.get(qator.modificationId);
    xarita.set(qator.modificationId, {
      mahsulot,
      variant,
      birlik: qator.baseUnitName ?? undefined,
      sotuvdagi: mavjud?.sotuvdagi ? `${mavjud.sotuvdagi} + ${miqdor}` : miqdor,
    });
  }
  return xarita;
}

/**
 * Ombordan chiqarilgan sana: harakatning o'z sanasi (hujjat bo'yicha birinchi qator), bo'lmasa hujjat sanasi → tasdiqlangan vaqt → yaratilgan vaqt.
 * `kiritilgan` — hujjat haqiqatda kiritilgan vaqt (o'tgan kunga yozilgan bo'lsa sana bilan farq qiladi).
 */
export function ombordanChiqarishSanasi(
  harakatlar: readonly HujjatHarakati[] | null | undefined,
  hujjat: { date?: string | null; confirmedAt?: string | null; createdAt?: string | null }
): { sana: string | null; kiritilgan: string | null } {
  const sana = harakatlar?.find((harakat) => harakat.sana)?.sana ?? hujjat.date ?? hujjat.confirmedAt ?? hujjat.createdAt ?? null;
  return { sana, kiritilgan: hujjat.confirmedAt ?? hujjat.createdAt ?? null };
}

const vaqtQiymati = (qiymat: string | null) => {
  const vaqt = qiymat ? Date.parse(qiymat) : NaN;
  return Number.isFinite(vaqt) ? vaqt : 0;
};

/**
 * Bir tovar (variant) va ombor bo'yicha yig'adi: bir tovarning bir nechta harakati (partiyalar) bitta qatorga tushadi.
 * Nomi harakatning o'zida bo'lmasa `nomi(variantId, mahsulotId)` dan olinadi (masalan, sotuv qatorlaridan).
 */
export function harakatQatorlari(
  harakatlar: readonly HujjatHarakati[],
  nomi?: (variantId: string | null, mahsulotId: string | null) => HarakatNomi | undefined
): HarakatQatori[] {
  const guruhlar = new Map<string, HarakatQatori>();
  for (const harakat of harakatlar) {
    const kalit = `${harakat.variantId ?? harakat.mahsulotId ?? harakat.kalit}|${harakat.omborId ?? ""}`;
    const topilgan = nomi?.(harakat.variantId, harakat.mahsulotId);
    let qator = guruhlar.get(kalit);
    if (!qator) {
      qator = {
        kalit,
        mahsulotNomi: harakat.mahsulotNomi || topilgan?.mahsulot || "",
        variantNomi: harakat.variantNomi || topilgan?.variant || "",
        omborNomi: harakat.omborNomi,
        birlik: harakat.birlik || topilgan?.birlik || "",
        chiqdi: 0,
        qaytdi: 0,
        sana: null,
        sotuvdagi: topilgan?.sotuvdagi ?? "",
      };
      guruhlar.set(kalit, qator);
    }
    if (harakat.yonalish === "chiqim") qator.chiqdi = yaxlit6(qator.chiqdi + harakat.miqdor);
    else qator.qaytdi = yaxlit6(qator.qaytdi + harakat.miqdor);
    if (vaqtQiymati(harakat.sana) >= vaqtQiymati(qator.sana)) qator.sana = harakat.sana ?? qator.sana;
  }
  return Array.from(guruhlar.values()).sort(
    (a, b) => a.mahsulotNomi.localeCompare(b.mahsulotNomi, "uz") || a.variantNomi.localeCompare(b.variantNomi, "uz") || a.omborNomi.localeCompare(b.omborNomi, "uz")
  );
}

/** Birliklar qo'shib yuborilmaydi (dona, kg, litr): har birlik alohida yig'iladi. */
export function harakatJamilari(qatorlar: readonly HarakatQatori[]) {
  const jami = new Map<string, { birlik: string; chiqdi: number; qaytdi: number }>();
  for (const qator of qatorlar) {
    const yozuv = jami.get(qator.birlik) ?? { birlik: qator.birlik, chiqdi: 0, qaytdi: 0 };
    yozuv.chiqdi = yaxlit6(yozuv.chiqdi + qator.chiqdi);
    yozuv.qaytdi = yaxlit6(yozuv.qaytdi + qator.qaytdi);
    jami.set(qator.birlik, yozuv);
  }
  return Array.from(jami.values());
}
