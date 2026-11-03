// Ishlab chiqarish modulining toza qismi (UI'siz, testlanadi): server javoblarini o'qish va form ma'lumotini so'rov tanasiga yig'ish.
import type {
  KalkulyatsiyaTanasi,
  Mavjudlik,
  MavjudlikQatori,
  NomliQator,
  Portlash,
  PortlashQatori,
  RetseptTanasi,
  SmenaChiqimi,
  SmenaHisoboti,
  SmenaTanasi,
  TozaxtashSababi,
} from "../types/ishlabChiqarish.ts";
import type { FormaXatosi } from "./maydonXatolari.ts";

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

/** availability: { orderId, items, hasShortage }. hasShortage faqat ogohlantirish: hech narsa band qilinmaydi. */
export function mavjudlikOqish(raw: unknown): Mavjudlik {
  const malumot = obyekt(raw);
  const items = Array.isArray(malumot.items) ? (malumot.items as MavjudlikQatori[]) : [];
  return { items, hasShortage: malumot.hasShortage === true };
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

export function kalkulyatsiyaTanasiniYigish(forma: KalkulyatsiyaFormasi): { tana: KalkulyatsiyaTanasi } | FormaXatosi {
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
  outputs: Array<{ quantity: string; scrapQuantity: string; serial: string; modificationId: string; role: "" | "MAIN" | "WASTE" }>;
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
    outputs.push(tozaTana({ quantity, scrapQuantity: sonMaydoni(qator.scrapQuantity), serial, modificationId: qator.modificationId, role: qator.role }));
  }
  if (outputs.length === 0) return { xato: "errors.noOutputs", maydon: "outputs" };
  // Hamma qator normadan (qoralamani qayta ochganda server to'ldirgan qatorlar) — yuborilmaydi: server chiqqan mahsulotga qarab normani qayta hisoblaydi.
  const faqatNorma = forma.inputs.length > 0 && forma.inputs.every((qator) => qator.entryMethod === "NORM" && !qator.offRecipe);
  const inputs: NonNullable<SmenaTanasi["inputs"]> = [];
  for (const [i, qator] of (faqatNorma ? [] : forma.inputs).entries()) {
    const quantity = sonMaydoni(qator.quantity);
    if (!qator.modificationId) return { xato: "errors.lineProduct", maydon: `inputs.${i}.modificationId` };
    if (!(quantity && quantity > 0)) return { xato: "errors.lineQuantity", maydon: `inputs.${i}.quantity` };
    inputs.push({ modificationId: qator.modificationId, quantity, entryMethod: qator.entryMethod, ...(qator.offRecipe ? { offRecipe: true } : {}) });
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
