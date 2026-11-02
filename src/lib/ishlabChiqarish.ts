// Ishlab chiqarish modulining toza qismi (UI'siz, testlanadi): server javoblarini o'qish va form ma'lumotini so'rov tanasiga yig'ish.
import type {
  KalkulyatsiyaTanasi,
  Mavjudlik,
  MavjudlikQatori,
  NomliQator,
  PortlashQatori,
  RetseptTanasi,
  SmenaTanasi,
  TozaxtashSababi,
} from "../types/ishlabChiqarish.ts";

export const TOXTASH_SABABLARI: TozaxtashSababi[] = ["BREAKDOWN", "MAINTENANCE", "NO_STAFF", "OTHER_WORK", "NO_MATERIAL", "NO_POWER", "OTHER"];

const SERIYA = /^[A-Za-z0-9._-]+$/;

/** Rulon seriyasi faqat A-Z a-z 0-9 . _ - belgilaridan. */
export function seriyaYaroqlimi(seriya: string) {
  return SERIYA.test(seriya.trim());
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

/** Bo'sh qiymatlarni tashlaydi: so'rovga `undefined`/bo'sh satr ketmaydi. */
export function tozaTana<T extends Record<string, unknown>>(tana: T): T {
  return Object.fromEntries(Object.entries(tana).filter(([, qiymat]) => qiymat !== undefined && qiymat !== "")) as T;
}

type Obyekt = Record<string, unknown>;
const obyekt = (value: unknown): Obyekt => (value && typeof value === "object" && !Array.isArray(value) ? (value as Obyekt) : {});

function royxatOqish<T>(raw: unknown, kalitlar: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const tashqi = obyekt(raw);
  const ichki = obyekt(tashqi.data);
  for (const manba of [tashqi, ichki]) {
    for (const kalit of kalitlar) if (Array.isArray(manba[kalit])) return manba[kalit] as T[];
  }
  return Array.isArray(tashqi.data) ? (tashqi.data as T[]) : [];
}

/** GET /production/recipes/:id/explode: «300 uchun nima kerak». Javob shakli hujjatda yozilmagan, odatiy ro'yxat nomlari o'qiladi. */
export function portlashQatorlari(raw: unknown) {
  return royxatOqish<PortlashQatori>(raw, ["items", "requirements", "inputs", "lines"]);
}

export function portlashMiqdori(qator: PortlashQatori) {
  return sonMaydoni(qator.quantity ?? qator.required ?? undefined);
}

/** availability: { items, hasShortage }; hasShortage kelmasa qatorlardagi yetishmovchilikdan aniqlanadi. */
export function mavjudlikOqish(raw: unknown): Mavjudlik {
  const items = royxatOqish<MavjudlikQatori>(raw, ["items", "requirements"]);
  const tashqi = obyekt(raw);
  const belgi = tashqi.hasShortage ?? obyekt(tashqi.data).hasShortage;
  return { items, hasShortage: typeof belgi === "boolean" ? belgi : items.some((qator) => Number(qator.shortage ?? 0) > 0) };
}

export type RetseptFormasi = {
  modificationId: string;
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
export function retseptTanasiniYigish(forma: RetseptFormasi): { tana: RetseptTanasi } | { xato: string } {
  const baseQuantity = sonMaydoni(forma.baseQuantity);
  if (!forma.modificationId) return { xato: "errors.product" };
  if (!forma.warehouseId) return { xato: "errors.wipWarehouse" };
  if (!(baseQuantity && baseQuantity > 0)) return { xato: "errors.baseQuantity" };
  const inputs: RetseptTanasi["inputs"] = [];
  for (const qator of forma.inputs) {
    if (!qator.modificationId) return { xato: "errors.lineProduct" };
    const quantity = sonMaydoni(qator.quantity);
    const min = sonMaydoni(qator.min);
    const max = sonMaydoni(qator.max);
    if (qator.kind === "FIXED" && !(quantity && quantity > 0)) return { xato: "errors.lineQuantity" };
    if (qator.kind === "RANGE" && !(min !== undefined && max !== undefined && min >= 0 && max >= min)) return { xato: "errors.lineRange" };
    inputs.push(tozaTana({
      modificationId: qator.modificationId,
      kind: qator.kind,
      ...(qator.kind === "FIXED" ? { quantity, tolerancePercent: sonMaydoni(qator.tolerancePercent) } : {}),
      ...(qator.kind === "RANGE" ? { min, max } : {}),
    }));
  }
  if (inputs.length === 0) return { xato: "errors.noInputs" };
  const outputs: RetseptTanasi["outputs"] = [];
  for (const qator of forma.outputs) {
    const quantity = sonMaydoni(qator.quantity);
    if (!qator.modificationId) return { xato: "errors.lineProduct" };
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity" };
    outputs.push(tozaTana({ modificationId: qator.modificationId, role: qator.role, quantity, quantityType: qator.quantityType || undefined }));
  }
  if (!outputs.some((qator) => qator.role === "MAIN")) return { xato: "errors.noMainOutput" };
  return {
    tana: tozaTana({
      modificationId: forma.modificationId,
      warehouseId: forma.warehouseId,
      baseQuantity,
      outputMin: sonMaydoni(forma.outputMin),
      outputMax: sonMaydoni(forma.outputMax),
      normalScrapPercent: sonMaydoni(forma.normalScrapPercent),
      consumeOnIssue: forma.consumeOnIssue,
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

export function kalkulyatsiyaTanasiniYigish(forma: KalkulyatsiyaFormasi): { tana: KalkulyatsiyaTanasi } | { xato: string } {
  if (!forma.modificationId) return { xato: "errors.product" };
  if (forma.lines.length === 0) return { xato: "errors.noInputs" };
  const lines: KalkulyatsiyaTanasi["lines"] = [];
  for (const qator of forma.lines) {
    const quantity = sonMaydoni(qator.quantity);
    const price = sonMaydoni(qator.price);
    const costingRate = sonMaydoni(qator.costingRate);
    if (!qator.modificationId) return { xato: "errors.lineProduct" };
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity" };
    if (!(price !== undefined && price >= 0)) return { xato: "errors.linePrice" };
    if (qator.currency === "USD" && !(costingRate && costingRate > 0)) return { xato: "errors.lineRate" };
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
  outputs: Array<{ quantity: string; scrapQuantity: string; serial: string; modificationId: string; role: "" | "MAIN" | "WASTE" }>;
  inputs: Array<{ modificationId: string; quantity: string; entryMethod: "NORM" | "ACTUAL"; offRecipe: boolean }>;
  downtime: Array<{ reason: TozaxtashSababi; hours: string; note: string }>;
};

export function smenaTanasiniYigish(forma: SmenaFormasi): { tana: SmenaTanasi } | { xato: string } {
  if (!forma.orderId && !(forma.recipeId && forma.destWarehouseId)) return { xato: "errors.orderOrRecipe" };
  const outputs: SmenaTanasi["outputs"] = [];
  for (const qator of forma.outputs) {
    const quantity = sonMaydoni(qator.quantity);
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity" };
    const serial = qator.serial.trim();
    if (serial && !seriyaYaroqlimi(serial)) return { xato: "errors.serialFormat" };
    outputs.push(tozaTana({ quantity, scrapQuantity: sonMaydoni(qator.scrapQuantity), serial, modificationId: qator.modificationId, role: qator.role }));
  }
  if (outputs.length === 0) return { xato: "errors.noOutputs" };
  const inputs: NonNullable<SmenaTanasi["inputs"]> = [];
  for (const qator of forma.inputs) {
    const quantity = sonMaydoni(qator.quantity);
    if (!qator.modificationId) return { xato: "errors.lineProduct" };
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity" };
    inputs.push({ modificationId: qator.modificationId, quantity, entryMethod: qator.entryMethod, ...(qator.offRecipe ? { offRecipe: true } : {}) });
  }
  const downtime: NonNullable<SmenaTanasi["downtime"]> = [];
  for (const qator of forma.downtime) {
    const hours = sonMaydoni(qator.hours);
    if (!(hours && hours > 0)) return { xato: "errors.downtimeHours" };
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
