import type { Qaytarish, QaytarishSababi, Sotuv } from "@/types/savdo";
import { mijozNomi, sotuvHolati } from "../savdoYordamchilari";

// Qaytarish bosqichma-bosqich oynasi (wizard) va ro'yxat uchun yordamchilar.
// Hisob-kitob va qoldiq miqdorlarini backend beradi: bu yerda faqat normalizatsiya va tanlash mantiqi bor.

// Backend qabul qiladigan sabablar (CreateReturnDto.reason) — UI tartibi.
export type UiSabab = QaytarishSababi;
export const UI_SABABLAR: UiSabab[] = ["DEFECT", "CUSTOMER_CHANGED_MIND", "WRONG", "NOT_SUITABLE", "OTHER"];

// Har bir asosiy sabab uchun "tezkor izoh" variantlari. Backend sabablari (enum) o'zgarmaydi: tanlangan variantlar
// sabab izohiga (reasonComment) matn bo'lib yoziladi. Matnlari: savdo_qaytarish → wizard.presets.<kalit>.
export const SABAB_VARIANTLARI: Record<UiSabab, string[]> = {
  DEFECT: ["notWorking", "damaged", "packageDamaged", "missingParts", "usedLook", "expired"],
  CUSTOMER_CHANGED_MIND: ["noLongerNeeded", "tooExpensive", "foundCheaper", "giftRejected", "orderedByMistake"],
  WRONG: ["wrongModel", "wrongColor", "wrongSize", "wrongQuantity", "mixedUp"],
  NOT_SUITABLE: ["sizeNotFit", "colorNotLike", "qualityNotSatisfied", "featuresMismatch", "incompatible"],
  OTHER: ["operatorError", "duplicateOrder", "lateDelivery"],
};

// Qaytarish raqami: backend `docNumber` (QAY-000003); bo'lmasa hujjat ID sining boshi.
export function qaytarishRaqami(qaytarish: Qaytarish) {
  return qaytarish.docNumber ?? qaytarish.documentNumber ?? qaytarish.number ?? qaytarish.id.slice(0, 8).toUpperCase();
}

export function qaytarishHolati(qaytarish: Qaytarish) {
  return String(qaytarish.status ?? "DRAFT").toUpperCase();
}

// Qaytarish mumkin bo'lgan sotuv: tasdiqlangan, ombori bor, qatorlari bor.
// Qaysi qatordan necha dona qaytarilishi mumkinligini backend aytadi (GET /sales/{id}/returnable-items).
export function qaytarishMumkinmi(sotuv: Sotuv) {
  return sotuvHolati(sotuv) === "CONFIRMED" && Boolean(sotuv.warehouseId ?? sotuv.warehouse?.id) && (sotuv.items?.length ?? 0) > 0;
}

// Shu sotuv bo'yicha tasdiqlangan qaytarish hujjati bormi (ro'yxatdagi "oldin qaytarilgan" belgisi uchun).
export function sotuvdaTasdiqlanganQaytarishBormi(sotuvId: string, qaytarishlar: Qaytarish[]) {
  return qaytarishlar.some((qaytarish) => qaytarish.saleId === sotuvId && qaytarishHolati(qaytarish) === "CONFIRMED");
}

export function sotuvSanasi(sotuv: Sotuv) {
  return sotuv.confirmedAt ?? sotuv.date ?? sotuv.createdAt;
}

// Backend raqamlarni ko'pincha satr ("7500000.00") ko'rinishida qaytaradi.
// null / undefined / bo'sh satr / son bo'lmagan qiymat → null ("ma'lumot yo'q"); 0 haqiqiy qiymat sifatida saqlanadi.
export function raqamga(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const son = Number(typeof value === "string" ? value.trim().replace(",", ".") : value);
  return Number.isFinite(son) ? son : null;
}

// Miqdor: manfiy bo'lmagan chekli son, aks holda null (noto'g'ri qiymat 0 ga aylantirilmaydi).
export function miqdorgaAylantirish(value: unknown) {
  const son = raqamga(value);
  return son !== null && son >= 0 ? son : null;
}

// Ro'yxat/tafsilot: mijoz nomi — avval backenddagi qaytarish hujjati, keyin bog'langan sotuv.
export function qaytarishMijozi(qaytarish: Qaytarish, sotuvlar: Sotuv[]) {
  const nom = qaytarish.customer?.fullName ?? qaytarish.customer?.name;
  if (nom) return nom;
  const sotuv = qaytarish.sale ?? sotuvlar.find((item) => item.id === qaytarish.saleId);
  return sotuv ? mijozNomi(sotuv) : null;
}
