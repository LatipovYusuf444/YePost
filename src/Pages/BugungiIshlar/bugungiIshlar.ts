// "Bugungi ishlar" sahifasining sof yordamchilari: muddat ko'rinishi, kun bo'yicha guruhlash, "Ertaga"ga surish.
// UI'siz, faqat nisbiy importlar — alohida sinaladi (tests/bugungiIshlar.test.mjs).
import { isoniAjratish, toshkentHozir, toshkentIso } from "../../lib/crmNatija.ts";
import { kunniSurish } from "../../lib/hujjatSanasi.ts";
import type { Activity, KunTartibi } from "../../types/crm.ts";

export const KUN_VARIANTLARI = [7, 14, 30] as const;
export const STANDART_KUNLAR = 7;
const STANDART_SOAT = "10:00";
const KUN_MS = 24 * 60 * 60 * 1000;

export type KunGuruhi = { kun: string; vazifalar: Activity[] };

function vaqtMs(qiymat?: string | null): number {
  const ms = qiymat ? new Date(qiymat).getTime() : Number.NaN;
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/** Muddat bo'yicha o'sish tartibida (muddatsizlar oxirida); asl ro'yxat o'zgarmaydi. */
export function muddatBoyichaSaralash(vazifalar: readonly Activity[]): Activity[] {
  return [...vazifalar].sort((a, b) => vaqtMs(a.dueAt) - vaqtMs(b.dueAt));
}

/** "Keyinroq" bo'limi: Toshkent kuni bo'yicha guruhlar (kunlar o'sish tartibida, ichida — vaqt bo'yicha). */
export function kunlarBoyichaGuruhlash(vazifalar: readonly Activity[]): KunGuruhi[] {
  const guruhlar = new Map<string, Activity[]>();
  for (const vazifa of muddatBoyichaSaralash(vazifalar)) {
    const kun = isoniAjratish(vazifa.dueAt).kun;
    const royxat = guruhlar.get(kun);
    if (royxat) royxat.push(vazifa);
    else guruhlar.set(kun, [vazifa]);
  }
  // Muddatsiz ("") guruh oxirida.
  return [...guruhlar.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([kun, royxat]) => ({ kun, vazifalar: royxat }));
}

/** Muddat kunidan bugungacha necha Toshkent kuni o'tgan (bugun — 0, kelajak — manfiy); muddat noto'g'ri bo'lsa null. */
export function kechikishKunlari(dueAt: string | null | undefined, hozir: Date = new Date()): number | null {
  const kun = isoniAjratish(dueAt).kun;
  if (!kun) return null;
  const bugun = toshkentHozir(hozir).kun;
  return Math.round((Date.parse(`${bugun}T00:00:00Z`) - Date.parse(`${kun}T00:00:00Z`)) / KUN_MS);
}

/**
 * "Ertaga" tugmasi: vaqti saqlanadi, kuni — muddatdan bir kun keyin, lekin ertangi kundan oldin emas
 * (muddati o'tgan vazifa ham ertaga shu vaqtga ko'chadi). Muddat bo'lmasa — ertaga 10:00.
 */
export function ertagagaSurish(dueAt: string | null | undefined, hozir: Date = new Date()): string {
  const { kun, vaqt } = isoniAjratish(dueAt);
  const ertaga = kunniSurish(toshkentHozir(hozir).kun, 1);
  const keyingi = kun ? kunniSurish(kun, 1) : "";
  const yangiKun = keyingi && keyingi > ertaga ? keyingi : ertaga;
  return toshkentIso(yangiKun, vaqt || STANDART_SOAT);
}

/** Surish ertaga emas, undan keyingi kunga tushadimi (tugma matni: "Ertaga" yoki "+1 kun"). */
export function surishErtagadanKeyinmi(dueAt: string | null | undefined, hozir: Date = new Date()): boolean {
  const ertaga = kunniSurish(toshkentHozir(hozir).kun, 1);
  return isoniAjratish(ertagagaSurish(dueAt, hozir)).kun > ertaga;
}

/** "YYYY-MM-DD" -> hafta kuni (0 — yakshanba), kun, oy (0–11), yil; noto'g'ri qiymatda null. */
export function kunQismlari(kun: string): { haftaKuni: number; kun: number; oy: number; yil: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(kun)) return null;
  const [yil, oy, kunRaqami] = kun.split("-").map(Number);
  const sana = new Date(Date.UTC(yil, oy - 1, kunRaqami));
  if (sana.getUTCMonth() !== oy - 1) return null;
  return { haftaKuni: sana.getUTCDay(), kun: kunRaqami, oy: oy - 1, yil };
}

export function jamiVazifalar(tartib: KunTartibi | null | undefined): number {
  if (!tartib) return 0;
  return tartib.overdue.length + tartib.today.length + tartib.tomorrow.length + tartib.later.length;
}

/** Bajarilgan/bekor qilingan vazifani qayta yuklashni kutmasdan ro'yxatdan olib tashlaydi. */
export function vazifaniOlibTashlash(tartib: KunTartibi, id: string): KunTartibi {
  const ol = (royxat: Activity[]) => royxat.filter((vazifa) => vazifa.id !== id);
  return { overdue: ol(tartib.overdue), today: ol(tartib.today), tomorrow: ol(tartib.tomorrow), later: ol(tartib.later) };
}

/** Ochiq vazifa muddati o'tganmi: backend `overdue` bayrog'i yoki muddat hozirdan oldin (sahifa ochiq turganda o'tib ketgan). */
export function muddatiOtganmi(vazifa: Activity, hozir: Date = new Date()): boolean {
  if (vazifa.overdue === true) return true;
  const ms = vaqtMs(vazifa.dueAt);
  return Number.isFinite(ms) && ms < hozir.getTime();
}
