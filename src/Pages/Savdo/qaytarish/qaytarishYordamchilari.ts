import type { Qaytarish, QaytarishSababi, Sotuv } from "@/types/savdo";
import { sotuvHolati, sotuvMahsulotiId, sotuvMahsulotiMiqdori } from "../savdoYordamchilari";

// Qaytarish bosqichma-bosqich oynasi (wizard) uchun REAL (backend bilan ishlaydigan) yordamchilar.
// Namunaviy (mock) ma'lumotlar alohida `mockReturnData.ts` faylida.

export type UiSabab = "DEFECT" | "CUSTOMER_CHANGED_MIND" | "WRONG" | "NOT_SUITABLE" | "OTHER";

export const UI_SABABLAR: UiSabab[] = ["DEFECT", "CUSTOMER_CHANGED_MIND", "WRONG", "NOT_SUITABLE", "OTHER"];

// Backend faqat DEFECT | WRONG | OTHER sabablarini biladi; qolgan sabablar izohga ("Sabab: ...") yoziladi.
export function backendSabab(sabab: UiSabab): QaytarishSababi {
  if (sabab === "DEFECT") return "DEFECT";
  if (sabab === "WRONG") return "WRONG";
  return "OTHER";
}

// Backend izohiga yoziladigan sabab matni (tilga bog'liq emas — hujjatda doim bir xil saqlanadi).
export const SABAB_IZOH_MATNI: Record<UiSabab, string> = {
  DEFECT: "Mahsulot nuqsonli",
  CUSTOMER_CHANGED_MIND: "Mijoz fikrini o'zgartirdi",
  WRONG: "Noto'g'ri mahsulot berilgan",
  NOT_SUITABLE: "Mahsulot mos kelmadi",
  OTHER: "Boshqa",
};

// Qaytarish raqami: backend `docNumber` (QAY-000003); bo'lmasa hujjat ID sining boshi.
export function qaytarishRaqami(qaytarish: Qaytarish) {
  return qaytarish.docNumber ?? qaytarish.documentNumber ?? qaytarish.number ?? qaytarish.id.slice(0, 8).toUpperCase();
}

export function qaytarishHolati(qaytarish: Qaytarish) {
  return String(qaytarish.status ?? "DRAFT").toUpperCase();
}

// Sotuv bo'yicha TASDIQLANGAN qaytarishlarda har bir sotuv qatori uchun qaytarilgan miqdor.
export function qaytarilganMiqdorlar(sotuvId: string, qaytarishlar: Qaytarish[]) {
  const xarita = new Map<string, number>();
  for (const qaytarish of qaytarishlar) {
    if (qaytarish.saleId !== sotuvId || qaytarishHolati(qaytarish) !== "CONFIRMED") continue;
    for (const item of qaytarish.items ?? []) {
      xarita.set(item.saleItemId, (xarita.get(item.saleItemId) ?? 0) + Number(item.quantity ?? 0));
    }
  }
  return xarita;
}

// Sotuv qatorining hali qaytarilishi mumkin bo'lgan miqdori.
export function qolganMiqdor(sotuv: Sotuv, qaytarishlar: Qaytarish[]) {
  const qaytarilgan = qaytarilganMiqdorlar(sotuv.id, qaytarishlar);
  return (sotuv.items ?? []).map((item) => {
    const id = sotuvMahsulotiId(item);
    const sotilgan = sotuvMahsulotiMiqdori(item);
    const oldin = qaytarilgan.get(id) ?? 0;
    return { item, id, sotilgan, oldin, qolgan: Math.max(sotilgan - oldin, 0) };
  });
}

// Qaytarish mumkin bo'lgan sotuv: tasdiqlangan, ombori bor, qatorlari bor.
export function qaytarishMumkinmi(sotuv: Sotuv) {
  return sotuvHolati(sotuv) === "CONFIRMED" && Boolean(sotuv.warehouseId ?? sotuv.warehouse?.id) && (sotuv.items?.length ?? 0) > 0;
}

export function sotuvSanasi(sotuv: Sotuv) {
  return sotuv.confirmedAt ?? sotuv.date ?? sotuv.createdAt;
}

// Backend raqamlarni ko'pincha satr ("7500000") ko'rinishida qaytaradi.
export function raqamga(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const son = Number(value);
  return Number.isFinite(son) ? son : null;
}
