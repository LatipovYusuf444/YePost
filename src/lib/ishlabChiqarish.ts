// Ishlab chiqarish modulining toza qismi (UI'siz, testlanadi): server javoblarini o'qish va form ma'lumotini so'rov tanasiga yig'ish.
import type {
  KalkulyatsiyaTanasi,
  Mavjudlik,
  MavjudlikQatori,
  NomliQator,
  Portlash,
  QabulAkti,
  QabulOgohlantirishi,
  QabulTanasi,
  YopishQatori,
  YopishTanasi,
  PortlashQatori,
  RetseptTanasi,
  SmenaChiqimi,
  SmenaHisoboti,
  SmenaTanasi,
  TozaxtashSababi,
} from "../types/ishlabChiqarish.ts";
import { serverXatoMaydonlari as maydonlarniOqish, type FormaXatosi } from "./maydonXatolari.ts";

// Forma maydon xatolari butun loyiha uchun umumiy (lib/maydonXatolari): eski importlar uchun shu yerdan ham beriladi.
export { serverXatoMaydonlari, type FormaXatosi, type XatoMaydonQoidasi } from "./maydonXatolari.ts";

export const TOXTASH_SABABLARI: TozaxtashSababi[] = ["BREAKDOWN", "MAINTENANCE", "NO_STAFF", "OTHER_WORK", "NO_MATERIAL", "NO_POWER", "OTHER"];

const SERIYA = /^[A-Za-z0-9._-]+$/;

/** Rulon seriyasi faqat A-Z a-z 0-9 . _ - belgilaridan. */
export function seriyaYaroqlimi(seriya: string) {
  return SERIYA.test(seriya.trim());
}

/** Qoralamada server `docNumber: ""` qaytaradi (raqam tasdiqlashda yoki releaseda paydo bo'ladi). */
export function hujjatRaqami(hujjat?: { docNumber?: string | null } | null) {
  return hujjat?.docNumber?.trim() ?? "";
}

/** Hujjatlarda bog'langan hujjat raqami kelmaydi, faqat id: raqam shu ro'yxatdan topiladi. */
export function raqamXaritasi(hujjatlar?: ReadonlyArray<{ id: string; docNumber?: string | null }> | null) {
  return new Map((hujjatlar ?? []).map((hujjat) => [hujjat.id, hujjatRaqami(hujjat)]));
}

/** Smena chiqimining hozirgi miqdori: quantity + barcha tuzatishlar. */
export function chiqimMiqdori(qator: Pick<SmenaChiqimi, "quantity" | "corrections">) {
  return (qator.corrections ?? []).reduce((jami, tuzatish) => jami + (Number(tuzatish.delta) || 0), Number(qator.quantity) || 0);
}

/** Hisobot mahsuloti: yaroqli mahsulot qatori (bo'lmasa birinchi qator). */
export function hisobotMahsuloti(hisobot: Pick<SmenaHisoboti, "outputs">) {
  const qatorlar = hisobot.outputs ?? [];
  return qatorlar.find((qator) => qator.role === "MAIN") ?? qatorlar[0];
}

export function qatorNomi(qator?: NomliQator | null) {
  return (
    qator?.productName?.trim() ||
    qator?.modification?.product?.name?.trim() ||
    qator?.product?.name?.trim() ||
    qator?.modification?.name?.trim() ||
    qator?.modificationName?.trim() ||
    qator?.name?.trim() ||
    "—"
  );
}

/**
 * Dona (kasrsiz birlik) mahsulotda sexga berish, qaytarish, smena chiqishi va kiritilgan sarf butun son bo'lishi kerak: aks holda server
 * 400 `errors.catalog.quantity_not_whole` qaytaradi. Server qator yo'lini (`errors[].field`, masalan "lines.1.quantity") bersa — `null`
 * (odatdagi bog'lash ishlaydi); bermasa kasr miqdorli qator belgilanadi. Qator birligi formada yo'q: kasr qator bittadan ko'p bo'lsa (masalan,
 * 12,5 kg xomashyo va 2,5 dona) qaysi biri dona ekani noma'lum — kg qatorini noto'g'ri qizil qilmaslik uchun `null` (xabar tepada chiqadi).
 * Norma bo'yicha to'lgan qatorni bermang: u kasr bo'lishi mumkin.
 */
export function butunMiqdorXatolari(
  tafsilot: unknown,
  qatorlar: ReadonlyArray<{ yol: string; miqdor: string | number | null | undefined }>,
  matn: string
): Record<string, string> | null {
  const kod = tafsilot && typeof tafsilot === "object" ? (tafsilot as { code?: unknown }).code : undefined;
  if (typeof kod !== "string" || !kod.endsWith("quantity_not_whole")) return null;
  if (Object.keys(maydonlarniOqish(tafsilot, {})).some((yol) => /\.\d+\./.test(yol))) return null;
  const yollar = qatorlar
    .filter(({ miqdor }) => {
      const son = sonMaydoni(miqdor);
      return son !== undefined && son > 0 && !Number.isInteger(Math.round(son * 1e6) / 1e6);
    })
    .map(({ yol }) => yol);
  return yollar.length === 1 ? { [yollar[0]]: matn } : null;
}

/** Formadagi son maydoni: bo'sh yoki noto'g'ri bo'lsa `undefined` (so'rovga qo'shilmaydi). */
export function sonMaydoni(qiymat: string | number | null | undefined) {
  if (qiymat === null || qiymat === undefined || String(qiymat).trim() === "") return undefined;
  const son = Number(String(qiymat).replace(",", "."));
  return Number.isFinite(son) ? son : undefined;
}

export function miqdorMatni(qiymat: unknown) {
  const son = Number(qiymat);
  if (qiymat === null || qiymat === undefined || qiymat === "" || !Number.isFinite(son)) return "—";
  return son.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
}

/**
 * Qoralamani tahrirlash (PATCH): formada tozalangan ixtiyoriy maydon ham yuboriladi, aks holda server eski qiymatni saqlab qoladi.
 * `bosh` — tozalangan maydon qiymati: matn uchun "", raqam uchun 0, sana va bog'lanish uchun null.
 */
export function tahrirTanasi<T extends Record<string, unknown>>(tana: T, bosh: Record<string, string | number | null>): T {
  return { ...Object.fromEntries(Object.entries(bosh).filter(([kalit]) => !(kalit in tana))), ...tana } as T;
}

/** Bo'sh qiymatlarni tashlaydi: so'rovga `undefined`/bo'sh satr ketmaydi. */
export function tozaTana<T extends Record<string, unknown>>(tana: T): T {
  return Object.fromEntries(Object.entries(tana).filter(([, qiymat]) => qiymat !== undefined && qiymat !== "")) as T;
}

type Obyekt = Record<string, unknown>;
const obyekt = (value: unknown): Obyekt => (value && typeof value === "object" && !Array.isArray(value) ? (value as Obyekt) : {});

/** GET /production/recipes/:id/explode: «300 uchun nima kerak» (kirishlar) va nima chiqadi (mahsulot, chiqindi). */
export function portlashOqish(raw: unknown): Portlash {
  const malumot = obyekt(raw);
  const royxat = (kalit: string) => (Array.isArray(malumot[kalit]) ? (malumot[kalit] as PortlashQatori[]) : []);
  return { inputs: royxat("inputs"), outputs: royxat("outputs") };
}

export function portlashMiqdori(qator: PortlashQatori) {
  return sonMaydoni(qator.quantity ?? undefined);
}

/**
 * availability: { orderId, items, hasShortage, issuedFully }. Xomashyo buyurtma yaratilganda band qilinadi (bo'sh turgan miqdorgacha);
 * hasShortage — "Xomashyo kutilmoqda", issuedFully: false — "to'liq berilmadi". issuedFully kelmasa (eski server) — belgi chiqmaydi.
 */
export function mavjudlikOqish(raw: unknown): Mavjudlik {
  const malumot = obyekt(raw);
  const items = Array.isArray(malumot.items) ? (malumot.items as MavjudlikQatori[]) : [];
  return { items, hasShortage: malumot.hasShortage === true, issuedFully: malumot.issuedFully !== false };
}

// ---- Buyurtma holatlari (17.11 jarayoni) ----
// Yangi buyurtma darhol RELEASED ("Yangi"); DRAFT va DONE faqat eski yozuvlarda.
/** Ish davom etayotgan buyurtma: xomashyo berish, smena hisoboti va qabul shu holatlarda. */
export const OCHIQ_BUYURTMA = ["RELEASED", "MATERIAL_ISSUED", "IN_PROGRESS", "AWAITING_ACCEPTANCE", "RETURNED"];
/** Yopish (qatorli yopish hujjati) — faqat qabul qilingan (eski DONE ham). */
export const YOPILADIGAN_BUYURTMA = ["ACCEPTED", "DONE"];
/** Ro'yxat filtri tartibi. */
export const BUYURTMA_HOLATLARI = ["RELEASED", "MATERIAL_ISSUED", "IN_PROGRESS", "AWAITING_ACCEPTANCE", "RETURNED", "ACCEPTED", "CLOSED", "CANCELLED", "DRAFT", "DONE"];

/** Tahrirlash va bekor qilish — faqat xomashyo berilgunga qadar (eski qoralama ham). */
export function buyurtmaTahrirlanadimi(status?: string | null) {
  return status === "RELEASED" || status === "DRAFT";
}

/** Qo'lda yakunlash (ACCEPTED): ish boshlangan ochiq buyurtma (RELEASED emas). Qabul kutayotgan akt bo'lsa server rad etadi. */
export function buyurtmaYakunlanadimi(status?: string | null) {
  return OCHIQ_BUYURTMA.includes(status ?? "") && status !== "RELEASED";
}

// ---- Smena chiqishi: brak sababi ----

/** Brak (scrapQuantity > 0) bo'lsa sababi majburiy: aks holda tasdiqlashda `errors.production.scrap_reason_required`. */
export function brakSababiKerakmi(qator: { scrapQuantity?: string | number | null; scrapReasonId?: string | null }) {
  const brak = sonMaydoni(qator.scrapQuantity ?? undefined);
  return brak !== undefined && brak > 0 && !qator.scrapReasonId;
}

// ---- Qabul akti ----

export type QabulFormaQatori = { lineId: string; good: string; scrap: string; scrapReasonId: string };

/** Akt qatorlari forma qiymatiga: PM soni (boshida ustanikiga teng). */
export function qabulFormasi(akt: Pick<QabulAkti, "lines">): QabulFormaQatori[] {
  const matn = (qiymat: unknown) => (qiymat === null || qiymat === undefined ? "" : String(qiymat));
  return (akt.lines ?? []).map((qator) => ({ lineId: qator.id, good: matn(qator.good ?? qator.masterGood), scrap: matn(qator.scrap ?? qator.masterScrap), scrapReasonId: qator.scrapReasonId ?? qator.masterScrapReasonId ?? "" }));
}

/**
 * Qabul tanasi: har qator — yaroqli, brak va brak sababi. Bo'sh yoki manfiy son, sababsiz brak va ikkalasi 0 (server
 * `accept_quantity_required` — "Miqdorni kiriting") so'rovsiz to'xtatiladi.
 */
export function qabulTanasiniYigish(qatorlar: readonly QabulFormaQatori[], izoh = ""): { tana: QabulTanasi } | FormaXatosi {
  const lines: NonNullable<QabulTanasi["lines"]> = [];
  for (const [i, qator] of qatorlar.entries()) {
    const good = sonMaydoni(qator.good);
    const scrap = sonMaydoni(qator.scrap) ?? 0;
    if (good === undefined || good < 0) return { xato: "errors.acceptGood", maydon: `lines.${i}.good` };
    if (scrap < 0) return { xato: "errors.acceptScrap", maydon: `lines.${i}.scrap` };
    if (scrap > 0 && !qator.scrapReasonId) return { xato: "errors.scrapReasonRequired", maydon: `lines.${i}.scrapReasonId` };
    lines.push({ lineId: qator.lineId, good, scrap, ...(scrap > 0 ? { scrapReasonId: qator.scrapReasonId } : {}) });
  }
  if (lines.length > 0 && lines.every((qator) => !(qator.good ?? 0) && !(qator.scrap ?? 0))) return { xato: "errors.acceptQuantityRequired", maydon: "lines.0.good" };
  return { tana: { lines, ...(izoh.trim() ? { note: izoh.trim() } : {}) } };
}

/** Brak ulushi, %: brak ÷ (yaroqli + brak). */
export function brakFoizi(yaroqli: unknown, brak: unknown) {
  const jami = (Number(yaroqli) || 0) + (Number(brak) || 0);
  return jami > 0 ? Math.round(((Number(brak) || 0) / jami) * 10000) / 100 : 0;
}

/** Qabul javobidagi ogohlantirishlar: SCRAP_ABOVE_LIMIT — brak chegaradan oshdi (qizil ogohlantirish). */
export function qabulOgohlantirishlari(raw: unknown): QabulOgohlantirishi[] {
  const royxat = obyekt(raw).warnings;
  return Array.isArray(royxat) ? royxat.filter((qator): qator is QabulOgohlantirishi => Boolean(qator) && typeof (qator as { code?: unknown }).code === "string") : [];
}

// ---- Buyurtmani yopish ----

export type YopishFormaQatori = { modificationId: string; expected: number; returned: string; kept: string };

/** close-preview → forma: standart hammasi qaytadi, sexda 0 qoladi. */
export function yopishFormasi(qatorlar: readonly YopishQatori[]): YopishFormaQatori[] {
  return qatorlar.map((qator) => ({
    modificationId: qator.modificationId,
    expected: Number(qator.expected) || 0,
    returned: String(qator.returned ?? qator.expected ?? 0),
    kept: String(qator.kept ?? 0),
  }));
}

/** Yo'qotish = ortishi kerak − qaytadi − sexda qoladi (manfiy bo'lsa forma xatoli). */
export function yopishYoqotishi(qator: YopishFormaQatori) {
  return Math.round((qator.expected - (sonMaydoni(qator.returned) ?? 0) - (sonMaydoni(qator.kept) ?? 0)) * 1000) / 1000;
}

/** Yopish tanasi: qaytadi + qoladi ortganidan ko'p bo'lsa server `close_return_exceeds` beradi — so'rovsiz to'xtatiladi. */
export function yopishTanasiniYigish(qatorlar: readonly YopishFormaQatori[], izoh = ""): { tana: YopishTanasi } | FormaXatosi {
  const lines: NonNullable<YopishTanasi["lines"]> = [];
  for (const [i, qator] of qatorlar.entries()) {
    const returned = sonMaydoni(qator.returned) ?? 0;
    const kept = sonMaydoni(qator.kept) ?? 0;
    if (returned < 0) return { xato: "errors.closeNegative", maydon: `lines.${i}.returned` };
    if (kept < 0) return { xato: "errors.closeNegative", maydon: `lines.${i}.kept` };
    if (yopishYoqotishi(qator) < 0) return { xato: "errors.closeExceeds", maydon: `lines.${i}.returned` };
    lines.push({ modificationId: qator.modificationId, returned, kept });
  }
  return { tana: { ...(lines.length ? { lines } : {}), ...(izoh.trim() ? { note: izoh.trim() } : {}) } };
}

// ---- Bosqichlar chizig'i ----

export type BosqichKaliti = "order" | "issue" | "report" | "acceptance" | "close";
export type Bosqich = { kalit: BosqichKaliti; sana: string | null; raqam?: string; kim?: string | null; holat: "done" | "current" | "pending" | "skipped" };

type SanaliHujjat = { status?: string | null; date?: string | null; docNumber?: string | null; orderId?: string | null };
type AktSanasi = { status?: string | null; acceptedAt?: string | null; acceptedById?: string | null; docNumber?: string | null; orderId?: string | null };

function oxirgiHujjat<T>(royxat: readonly T[], sana: (qator: T) => string | null | undefined) {
  return [...royxat].filter((qator) => sana(qator)).sort((a, b) => String(sana(b)).localeCompare(String(sana(a))))[0];
}

/**
 * Buyurtma bosqichlari: buyurtma (createdAt) → berish (tasdiqlangan sexga berish sanasi) → kun yakuni (tasdiqlangan hisobot sanasi)
 * → qabul (aktning acceptedAt, acceptedById) → yopish (close.date, close.createdById). Har bosqichda eng oxirgi hujjat.
 * `berishYoq` — sozlamada xomashyo berish bosqichi o'chirilgan: bosqich "o'tkazib yuborilgan".
 */
export function buyurtmaBosqichlari(
  buyurtma: { id: string; status?: string | null; createdAt?: string | null; date?: string | null; docNumber?: string | null; close?: { date?: string | null; createdAt?: string | null; createdById?: string | null } | null },
  hujjatlar: { berishlar?: readonly SanaliHujjat[] | null; hisobotlar?: readonly SanaliHujjat[] | null; aktlar?: readonly AktSanasi[] | null },
  berishYoq = false
): Bosqich[] {
  const shu = <T extends { orderId?: string | null }>(royxat?: readonly T[] | null) => (royxat ?? []).filter((qator) => qator.orderId === buyurtma.id);
  const berish = oxirgiHujjat(shu(hujjatlar.berishlar).filter((qator) => qator.status === "CONFIRMED"), (qator) => qator.date);
  const hisobot = oxirgiHujjat(shu(hujjatlar.hisobotlar).filter((qator) => qator.status === "CONFIRMED"), (qator) => qator.date);
  const akt = oxirgiHujjat(shu(hujjatlar.aktlar).filter((qator) => qator.status === "CONFIRMED"), (qator) => qator.acceptedAt);
  const yopish = buyurtma.close ?? null;
  const bosqichlar: Array<Omit<Bosqich, "holat">> = [
    { kalit: "order", sana: buyurtma.createdAt ?? buyurtma.date ?? null, raqam: buyurtma.docNumber || undefined },
    { kalit: "issue", sana: berish?.date ?? null, raqam: berish?.docNumber || undefined },
    { kalit: "report", sana: hisobot?.date ?? null, raqam: hisobot?.docNumber || undefined },
    { kalit: "acceptance", sana: akt?.acceptedAt ?? null, raqam: akt?.docNumber || undefined, kim: akt?.acceptedById ?? null },
    { kalit: "close", sana: yopish ? yopish.date ?? yopish.createdAt ?? null : null, kim: yopish?.createdById ?? null },
  ];
  // Ish har kuni takrorlanadi (berish → kun yakuni → qabul), shuning uchun joriy bosqich hujjat sanalaridan emas, buyurtma holatidan:
  // kecha qabul qilingan, bugungi smena qabul kutayotgan buyurtmada joriy — "Qabul".
  const joriy = joriyBosqich(buyurtma.status, berishYoq);
  return bosqichlar.map((bosqich): Bosqich => {
    if (bosqich.kalit === joriy) return { ...bosqich, holat: "current" };
    if (bosqich.kalit === "issue" && berishYoq && !bosqich.sana) return { ...bosqich, holat: "skipped" };
    return { ...bosqich, holat: bosqich.sana ? "done" : "pending" };
  });
}

/** Buyurtma holati bo'yicha hozirgi bosqich; yopilgan va bekor qilinganda yo'q. */
function joriyBosqich(status: string | null | undefined, berishYoq: boolean): BosqichKaliti | null {
  switch (status) {
    case "DRAFT":
    case "RELEASED":
      return berishYoq ? "report" : "issue";
    case "MATERIAL_ISSUED":
    case "IN_PROGRESS":
    case "RETURNED":
      return "report";
    case "AWAITING_ACCEPTANCE":
      return "acceptance";
    case "ACCEPTED":
    case "DONE":
      return "close";
    default:
      return null;
  }
}

export type RetseptFormasi = {
  modificationId: string;
  // Brak mahsuloti (ixtiyoriy): qabul qilingan brak shu mahsulot bo'lib brak omboriga kiradi.
  scrapModificationId?: string;
  warehouseId: string;
  baseQuantity: string;
  outputMin: string;
  outputMax: string;
  normalScrapPercent: string;
  consumeOnIssue: boolean;
  note: string;
  inputs: Array<{ modificationId: string; kind: "FIXED" | "RANGE" | "FREE"; quantity: string; tolerancePercent: string; min: string; max: string }>;
  outputs: Array<{ modificationId: string; role: "MAIN" | "WASTE"; quantity: string; quantityType: "" | "PROPORTIONAL" | "PER_BATCH" }>;
};

/** Forma → so'rov tanasi. Xato bo'lsa `{ xato: <i18n kaliti> }`. */

export function retseptTanasiniYigish(forma: RetseptFormasi): { tana: RetseptTanasi } | FormaXatosi {
  const baseQuantity = sonMaydoni(forma.baseQuantity);
  if (!forma.modificationId) return { xato: "errors.product", maydon: "modificationId" };
  if (!forma.warehouseId) return { xato: "errors.wipWarehouse", maydon: "warehouseId" };
  if (!(baseQuantity && baseQuantity > 0)) return { xato: "errors.baseQuantity", maydon: "baseQuantity" };
  const inputs: RetseptTanasi["inputs"] = [];
  for (const [i, qator] of forma.inputs.entries()) {
    if (!qator.modificationId) return { xato: "errors.lineProduct", maydon: `inputs.${i}.modificationId` };
    const quantity = sonMaydoni(qator.quantity);
    const min = sonMaydoni(qator.min);
    const max = sonMaydoni(qator.max);
    if (qator.kind === "FIXED" && !(quantity && quantity > 0)) return { xato: "errors.lineQuantity", maydon: `inputs.${i}.quantity` };
    if (qator.kind === "RANGE" && !(min !== undefined && max !== undefined && min >= 0 && max >= min)) return { xato: "errors.lineRange", maydon: min === undefined || min < 0 ? `inputs.${i}.min` : `inputs.${i}.max` };
    inputs.push(tozaTana({
      modificationId: qator.modificationId,
      kind: qator.kind,
      ...(qator.kind === "FIXED" ? { quantity, tolerancePercent: sonMaydoni(qator.tolerancePercent) } : {}),
      ...(qator.kind === "RANGE" ? { min, max } : {}),
    }));
  }
  if (inputs.length === 0) return { xato: "errors.noInputs", maydon: "inputs" };
  const outputs: RetseptTanasi["outputs"] = [];
  for (const [i, qator] of forma.outputs.entries()) {
    const quantity = sonMaydoni(qator.quantity);
    if (!qator.modificationId) return { xato: "errors.lineProduct", maydon: `outputs.${i}.modificationId` };
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity", maydon: `outputs.${i}.quantity` };
    outputs.push(tozaTana({ modificationId: qator.modificationId, role: qator.role, quantity, quantityType: qator.quantityType || undefined }));
  }
  if (!outputs.some((qator) => qator.role === "MAIN")) return { xato: "errors.noMainOutput", maydon: "outputs" };
  return {
    tana: tozaTana({
      modificationId: forma.modificationId,
      warehouseId: forma.warehouseId,
      baseQuantity,
      outputMin: sonMaydoni(forma.outputMin),
      outputMax: sonMaydoni(forma.outputMax),
      normalScrapPercent: sonMaydoni(forma.normalScrapPercent),
      consumeOnIssue: forma.consumeOnIssue,
      scrapModificationId: forma.scrapModificationId || undefined,
      note: forma.note.trim(),
      inputs,
      outputs,
    }),
  };
}

export type KalkulyatsiyaFormasi = {
  modificationId: string;
  recipeId: string;
  validFrom: string;
  normalScrapPercent: string;
  note: string;
  lines: Array<{ modificationId: string; quantity: string; price: string; currency: "UZS" | "USD"; costingRate: string }>;
};

/**
 * `yagona` — bir valyutali rejim valyutasi (Faqat so'm / Faqat dollar). Berilsa, rejimdan oldin boshqa valyutada saqlangan qator
 * yuborilmaydi: foydalanuvchi uning valyutasini o'zgartirib, narxini tekshirishi kerak (summa jimgina boshqa valyutaga o'tmasligi uchun).
 */
export function kalkulyatsiyaTanasiniYigish(forma: KalkulyatsiyaFormasi, yagona?: "UZS" | "USD" | null): { tana: KalkulyatsiyaTanasi } | FormaXatosi {
  if (!forma.modificationId) return { xato: "errors.product", maydon: "modificationId" };
  if (forma.lines.length === 0) return { xato: "errors.noInputs", maydon: "lines" };
  const lines: KalkulyatsiyaTanasi["lines"] = [];
  for (const [i, qator] of forma.lines.entries()) {
    const quantity = sonMaydoni(qator.quantity);
    const price = sonMaydoni(qator.price);
    const costingRate = sonMaydoni(qator.costingRate);
    if (!qator.modificationId) return { xato: "errors.lineProduct", maydon: `lines.${i}.modificationId` };
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity", maydon: `lines.${i}.quantity` };
    if (!(price !== undefined && price >= 0)) return { xato: "errors.linePrice", maydon: `lines.${i}.price` };
    if (yagona && qator.currency !== yagona) return { xato: "errors.lineCurrencyMode", maydon: `lines.${i}.currency` };
    if (qator.currency === "USD" && !(costingRate && costingRate > 0)) return { xato: "errors.lineRate", maydon: `lines.${i}.costingRate` };
    lines.push(tozaTana({ modificationId: qator.modificationId, quantity, price, currency: qator.currency, costingRate: qator.currency === "USD" ? costingRate : undefined }));
  }
  return {
    tana: tozaTana({
      modificationId: forma.modificationId,
      recipeId: forma.recipeId,
      validFrom: forma.validFrom,
      normalScrapPercent: sonMaydoni(forma.normalScrapPercent),
      note: forma.note.trim(),
      lines,
    }),
  };
}

/** Kartaning taxminiy jami (so'mda, faqat ekran uchun): aniq `total` ni server hisoblaydi. */
export function kalkulyatsiyaJami(lines: KalkulyatsiyaFormasi["lines"]) {
  return lines.reduce((jami, qator) => {
    const kurs = qator.currency === "USD" ? sonMaydoni(qator.costingRate) ?? 0 : 1;
    return jami + (sonMaydoni(qator.quantity) ?? 0) * (sonMaydoni(qator.price) ?? 0) * kurs;
  }, 0);
}

export type SmenaFormasi = {
  orderId: string;
  recipeId: string;
  destWarehouseId: string;
  shiftEndsAt: string;
  comment: string;
  outputs: Array<{ quantity: string; scrapQuantity: string; scrapReasonId?: string; serial: string; modificationId: string; role: "" | "MAIN" | "WASTE" }>;
  inputs: Array<{ modificationId: string; quantity: string; entryMethod: "NORM" | "ACTUAL"; offRecipe: boolean }>;
  downtime: Array<{ reason: TozaxtashSababi; hours: string; note: string }>;
};

export function smenaTanasiniYigish(forma: SmenaFormasi): { tana: SmenaTanasi } | FormaXatosi {
  if (!forma.orderId && !(forma.recipeId && forma.destWarehouseId)) return { xato: "errors.orderOrRecipe", maydon: forma.recipeId ? "destWarehouseId" : "recipeId" };
  const outputs: SmenaTanasi["outputs"] = [];
  for (const [i, qator] of forma.outputs.entries()) {
    const quantity = sonMaydoni(qator.quantity);
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity", maydon: `outputs.${i}.quantity` };
    const serial = qator.serial.trim();
    if (serial && !seriyaYaroqlimi(serial)) return { xato: "errors.serialFormat", maydon: `outputs.${i}.serial` };
    const scrapQuantity = sonMaydoni(qator.scrapQuantity);
    // Brak bo'lsa sababi majburiy (server tasdiqlashda `scrap_reason_required` beradi); brak yo'q bo'lsa sabab yuborilmaydi.
    if (brakSababiKerakmi(qator)) return { xato: "errors.scrapReasonRequired", maydon: `outputs.${i}.scrapReasonId` };
    outputs.push(tozaTana({ quantity, scrapQuantity, scrapReasonId: scrapQuantity && scrapQuantity > 0 ? qator.scrapReasonId : undefined, serial, modificationId: qator.modificationId, role: qator.role }));
  }
  if (outputs.length === 0) return { xato: "errors.noOutputs", maydon: "outputs" };
  // Hamma qator normadan (qoralamani qayta ochganda server to'ldirgan qatorlar) — yuborilmaydi: server chiqqan mahsulotga qarab normani qayta hisoblaydi.
  const faqatNorma = forma.inputs.length > 0 && forma.inputs.every((qator) => qator.entryMethod === "NORM" && !qator.offRecipe);
  const inputs: NonNullable<SmenaTanasi["inputs"]> = [];
  for (const [i, qator] of (faqatNorma ? [] : forma.inputs).entries()) {
    const quantity = sonMaydoni(qator.quantity);
    if (!qator.modificationId) return { xato: "errors.lineProduct", maydon: `inputs.${i}.modificationId` };
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity", maydon: `inputs.${i}.quantity` };
    // offRecipe yuborilmaydi: server o'zi aniqlaydi (retseptda yo'q xomashyo), so'rovdagi qiymat e'tiborga olinmaydi.
    inputs.push({ modificationId: qator.modificationId, quantity, entryMethod: qator.entryMethod });
  }
  const downtime: NonNullable<SmenaTanasi["downtime"]> = [];
  for (const [i, qator] of forma.downtime.entries()) {
    const hours = sonMaydoni(qator.hours);
    if (!(hours && hours > 0)) return { xato: "errors.downtimeHours", maydon: `downtime.${i}.hours` };
    downtime.push(tozaTana({ reason: qator.reason, hours, note: qator.note.trim() }));
  }
  return {
    tana: tozaTana({
      ...(forma.orderId ? { orderId: forma.orderId } : { recipeId: forma.recipeId, destWarehouseId: forma.destWarehouseId }),
      shiftEndsAt: forma.shiftEndsAt ? new Date(forma.shiftEndsAt).toISOString() : undefined,
      comment: forma.comment.trim(),
      outputs,
      // inputs berilmasa server normadan to'ldiradi; bo'sh massiv yuborilmaydi.
      ...(inputs.length ? { inputs } : {}),
      ...(downtime.length ? { downtime } : {}),
    }),
  };
}

/** Ro'yxat qidiruvi: so'z berilgan qiymatlardan birida uchrasa mos (katta-kichik harf farqsiz). Bo'sh so'z — hammasi mos. */
export function qidiruvgaMos(soz: string, qiymatlar: ReadonlyArray<unknown>) {
  const qidiruv = soz.trim().toLocaleLowerCase();
  if (!qidiruv) return true;
  return qiymatlar.some((qiymat) => qiymat !== null && qiymat !== undefined && String(qiymat).toLocaleLowerCase().includes(qidiruv));
}

/** Holat filtri (bitta holat yoki holatlar guruhi): `null` — hammasi. */
export function holatBoyicha<T extends { status?: string | null }>(qatorlar: readonly T[], holatlar: readonly string[] | null) {
  return holatlar ? qatorlar.filter((qator) => holatlar.includes(qator.status ?? "")) : [...qatorlar];
}
