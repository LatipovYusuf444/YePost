import { valyutaYokiAsosiy } from "./asosiyValyuta.ts";
// Kassa amaliyoti oynasidagi amallar (Tahrirlash / Bekor qilish / O'chirish / manba hujjatini ochish) va tarix (audit) o'zgarishlari.
// UI'siz, importlarsiz — testlarda to'g'ridan-to'g'ri ishlaydi.
//
// Backend shartnomasi (openapi.json):
// - PATCH /finance/cash-operations/:id — faqat QORALAMA; DELETE — faqat tasdiqlanmagan (qoralama yoki bekor qilingan);
//   POST /finance/cash-operations/:id/cancel — tasdiqlanganni bekor qiladi (ledger teskari yozuv, qoldiqlar qayta hisoblanadi). Qaytarish yo'q.
// - Shuning uchun TASDIQLANGAN amaliyotni tahrirlash = tuzatilgan yangi amaliyot (qoralama) → eskisini bekor qilish (sabab bilan) → yangisini
//   tasdiqlash. Yetkazib beruvchi/xodim/mijoz hisobi va kassa jami backendda bekor qilish va tasdiqlash orqali to'g'ri qayta hisoblanadi.
// - Eski kirim/xarajat yozuvlari (CASH_IN, EXPENSE): PATCH/DELETE /finance/cash-ins|expenses/:id (summa, sana, to'lov turi, izoh).
// - Savdo (SALE) va qaytarish (RETURN) qatorlari bu yerda tahrirlanmaydi — o'sha hujjatning o'zida.

export type KassaManba = "SALE" | "RETURN" | "CASH_IN" | "EXPENSE" | "CASH_OPERATION";
export type KassaHolatKodi = "qoralama" | "tasdiqlangan" | "bekor_qilingan";

export type AmalHolati = { korinadi: boolean; mumkin: boolean; sabab?: "davrYopilgan" | "ruxsatYoq" };

export type KassaAmallari = {
  /** "patch" — qoralama (PATCH); "almashtirish" — tasdiqlangan (yangi + eskisini bekor qilish); "eski" — eski kirim/xarajat (PATCH). */
  tahrirUsuli: "patch" | "almashtirish" | "eski" | null;
  tahrir: AmalHolati;
  bekor: AmalHolati;
  ochirish: AmalHolati;
  /** Savdo/qaytarishdan kelgan qator: tahrir o'rniga shu hujjatni ochish havolasi. */
  havola: { tur: "sotuv" | "qaytarish"; id: string } | null;
};

const YOQ: AmalHolati = { korinadi: false, mumkin: false };

/** Hujjat kuni (YYYY-MM-DD) yopilgan davrga tushadimi: `closedUntil` shu kun ham kiradi. */
export function davrYopilganmi(kun: string | null | undefined, closedUntil: string | null | undefined): boolean {
  return Boolean(kun && closedUntil && kun.slice(0, 10) <= closedUntil.slice(0, 10));
}

/**
 * Amaliyot oynasida qaysi tugmalar ko'rinadi va bosiladi. `tahrirRuxsati` — tasdiqlangan amaliyotni tahrirlash huquqi (backendda alohida
 * grant yo'q: direktor yoki admin); qoralamani yaratgan kassir avvalgidek tahrirlaydi. Davr yopilgan bo'lsa tugmalar ko'rinadi, lekin o'chiq.
 */
export function kassaAmallari(p: {
  manba: KassaManba | undefined;
  holat: KassaHolatKodi;
  refId: string | undefined;
  kun: string | null | undefined;
  closedUntil: string | null | undefined;
  tahrirRuxsati: boolean;
}): KassaAmallari {
  const yopilgan = davrYopilganmi(p.kun, p.closedUntil);
  const holat = (korinadi: boolean, ruxsat = true): AmalHolati =>
    !korinadi ? YOQ : yopilgan ? { korinadi, mumkin: false, sabab: "davrYopilgan" } : ruxsat ? { korinadi, mumkin: true } : { korinadi, mumkin: false, sabab: "ruxsatYoq" };

  if ((p.manba === "SALE" || p.manba === "RETURN") && p.refId) {
    return { tahrirUsuli: null, tahrir: YOQ, bekor: YOQ, ochirish: YOQ, havola: { tur: p.manba === "SALE" ? "sotuv" : "qaytarish", id: p.refId } };
  }
  if (!p.refId) return { tahrirUsuli: null, tahrir: YOQ, bekor: YOQ, ochirish: YOQ, havola: null };

  if (p.manba === "CASH_OPERATION") {
    if (p.holat === "qoralama") return { tahrirUsuli: "patch", tahrir: holat(true), bekor: YOQ, ochirish: holat(true), havola: null };
    if (p.holat === "tasdiqlangan") {
      return { tahrirUsuli: "almashtirish", tahrir: holat(true, p.tahrirRuxsati), bekor: holat(true), ochirish: YOQ, havola: null };
    }
    return { tahrirUsuli: null, tahrir: YOQ, bekor: YOQ, ochirish: holat(true), havola: null };
  }
  if (p.manba === "CASH_IN" || p.manba === "EXPENSE") {
    // Eski yozuvlarda bekor qilish endpointi yo'q: tahrirlash va (avvalgidek jadvaldagi kabi) o'chirish.
    if (p.holat === "bekor_qilingan") return { tahrirUsuli: null, tahrir: YOQ, bekor: YOQ, ochirish: holat(true), havola: null };
    return { tahrirUsuli: "eski", tahrir: holat(true, p.tahrirRuxsati), bekor: YOQ, ochirish: holat(true), havola: null };
  }
  return { tahrirUsuli: null, tahrir: YOQ, bekor: YOQ, ochirish: YOQ, havola: null };
}

/** Bekor qilish sababi (backendga, ko'pi bilan 500 belgi; bo'sh bo'lsa yuborilmaydi). */
export function bekorSababi(sabab: string | null | undefined) {
  const toza = (sabab ?? "").trim();
  return toza ? toza.slice(0, 500) : undefined;
}

// ---- Sana ----

// Toshkent kuni (UTC+5, yozgi vaqt yo'q): ISO vaqtdan "YYYY-MM-DD"; allaqachon kun bo'lsa o'zi.
export function toshkentKunidan(qiymat: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(qiymat)) return qiymat;
  const vaqt = new Date(qiymat).getTime();
  return Number.isFinite(vaqt) ? new Date(vaqt + 5 * 3600 * 1000).toISOString().slice(0, 10) : qiymat.slice(0, 10);
}

/**
 * Eski kirim/xarajat (PATCH /finance/cash-ins|expenses/:id) uchun `date`: backend uni o'zgartirmasdan bazaga yozadi, shuning uchun to'liq
 * ISO vaqt kerak (faqat kun rad etiladi). Kun o'zgarmagan bo'lsa yuborilmaydi; bugun — hozirgi vaqt, o'tgan kun — o'sha kunning 23:59:59 (Toshkent).
 */
export function eskiYozuvSanasi(kun: string, boshlangichKun: string, bugun: string, hozir: Date = new Date()): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(kun) || kun === boshlangichKun) return undefined;
  return kun === bugun ? hozir.toISOString() : new Date(`${kun}T23:59:59+05:00`).toISOString();
}

// ---- Almashtirish izohi ----

export type AlmashtirishQiymati = { summa: number; valyuta?: "UZS" | "USD"; kun: string; tolovTuri: string; turi: string; kontragent: string };

/**
 * Tasdiqlangan amaliyot almashtirilganda yangi amaliyot izohiga yoziladigan "oldin → keyin" xulosasi: backend bekor qilish sababini va
 * almashtirish bog'lanishini saqlamaydi, izoh esa saqlanadi va tarixda ham ko'rinadi. `matn` — tarjima qilingan qismlar.
 */
export function almashtirishIzohi(p: {
  eskiRaqam: string;
  oldin: AlmashtirishQiymati;
  keyin: AlmashtirishQiymati;
  sabab?: string;
  summaMatni: (summa: number, valyuta?: "UZS" | "USD") => string;
  matn: { orniga: string; summa: string; sana: string; tolovTuri: string; turi: string; kontragent: string; sabab: string };
}): string {
  const { oldin, keyin, matn } = p;
  const qismlar: string[] = [];
  if (oldin.summa !== keyin.summa || valyutaYokiAsosiy(oldin.valyuta) !== valyutaYokiAsosiy(keyin.valyuta)) {
    qismlar.push(`${matn.summa} ${p.summaMatni(oldin.summa, oldin.valyuta)} → ${p.summaMatni(keyin.summa, keyin.valyuta)}`);
  }
  if (oldin.kun !== keyin.kun) qismlar.push(`${matn.sana} ${oldin.kun} → ${keyin.kun}`);
  if (oldin.tolovTuri !== keyin.tolovTuri) qismlar.push(`${matn.tolovTuri} ${oldin.tolovTuri} → ${keyin.tolovTuri}`);
  if (oldin.turi !== keyin.turi) qismlar.push(`${matn.turi} ${oldin.turi} → ${keyin.turi}`);
  if (oldin.kontragent.trim() !== keyin.kontragent.trim() && (oldin.kontragent.trim() || keyin.kontragent.trim())) {
    qismlar.push(`${matn.kontragent} ${oldin.kontragent.trim() || "—"} → ${keyin.kontragent.trim() || "—"}`);
  }
  const sabab = (p.sabab ?? "").trim();
  return [`${p.eskiRaqam} ${matn.orniga}${qismlar.length ? `: ${qismlar.join("; ")}` : ""}.`, sabab ? `${matn.sabab}: ${sabab}` : ""].filter(Boolean).join(" ");
}

// ---- Tarix (GET /audit/logs?resourceId=) ----

export type KassaTarixMaydoni = "amount" | "currency" | "date" | "paymentMethod" | "type" | "name" | "note" | "supplierId" | "customerId" | "employeeId" | "status" | "settleCurrency" | "rate";
export type KassaTarixOzgarishi = { maydon: KassaTarixMaydoni; oldin: unknown; keyin: unknown };

const TARIX_MAYDONLARI: KassaTarixMaydoni[] = ["amount", "currency", "date", "paymentMethod", "type", "name", "note", "supplierId", "customerId", "employeeId", "settleCurrency", "rate", "status"];

function obyekt(qiymat: unknown): Record<string, unknown> | null {
  return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Record<string, unknown>) : null;
}

// Backend summani satr ("4500000.00") yoki son bilan, sanani ISO bilan yozishi mumkin: taqqoslash uchun bir xil ko'rinish (sana — Toshkent kuni).
function tenglashtir(maydon: KassaTarixMaydoni, qiymat: unknown): unknown {
  if (qiymat === null || qiymat === undefined || qiymat === "") return null;
  if (maydon === "amount" || maydon === "rate") {
    const son = Number(qiymat);
    return Number.isFinite(son) ? son : qiymat;
  }
  if (maydon === "date" && typeof qiymat === "string") return toshkentKunidan(qiymat);
  return qiymat;
}

type AuditYozuvi = { action?: string; diff?: unknown; before?: unknown; after?: unknown };

// Audit yozuvining "oldin" va "keyin" holati. Backend `diff` ustunida saqlaydi: POST (yaratish, tasdiqlash, bekor qilish) — `{ after }`,
// servisdagi UPDATE — `{ maydon: { from, to } }`. Eski/boshqa shakl (`before`/`after` ildizda) ham o'qiladi.
function auditHolatlari(log: AuditYozuvi): { oldin: Record<string, unknown> | null; keyin: Record<string, unknown> | null } {
  const diff = obyekt(log.diff);
  if (diff && (obyekt(diff.before) || obyekt(diff.after))) return { oldin: obyekt(diff.before), keyin: obyekt(diff.after) };
  if (diff) {
    const juftlar = Object.entries(diff).filter(([, v]) => { const j = obyekt(v); return Boolean(j && ("from" in j || "to" in j)); });
    if (juftlar.length) {
      return {
        oldin: Object.fromEntries(juftlar.map(([k, v]) => [k, (v as Record<string, unknown>).from])),
        keyin: Object.fromEntries(juftlar.map(([k, v]) => [k, (v as Record<string, unknown>).to])),
      };
    }
  }
  return { oldin: obyekt(log.before), keyin: obyekt(log.after) };
}

/** Audit yozuvidagi "oldin → keyin" o'zgarishlar (faqat kassa amaliyotining ma'noli maydonlari); yaratishda (oldin yo'q) — bo'sh. */
export function kassaTarixOzgarishlari(log: AuditYozuvi): KassaTarixOzgarishi[] {
  const { oldin, keyin } = auditHolatlari(log);
  if (!oldin || !keyin) return [];
  return TARIX_MAYDONLARI.flatMap((maydon) => {
    if (!(maydon in oldin) && !(maydon in keyin)) return [];
    const a = tenglashtir(maydon, oldin[maydon]);
    const b = tenglashtir(maydon, keyin[maydon]);
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [{ maydon, oldin: a, keyin: b }];
  });
}

/**
 * Amal turi: backend auditida faqat CREATE/UPDATE/DELETE bor — tasdiqlash va bekor qilish ham POST bo'lgani uchun CREATE bo'lib yoziladi.
 * Shuning uchun "keyin" holatdagi `status` bo'yicha: CONFIRMED → tasdiqlandi, CANCELLED → bekor qilindi.
 */
export function kassaTarixAmali(log: AuditYozuvi): "CREATE" | "UPDATE" | "DELETE" | "CONFIRM" | "CANCEL" | "other" {
  const amal = String(log.action ?? "").toUpperCase();
  if (amal === "DELETE") return "DELETE";
  const holat = String(auditHolatlari(log).keyin?.status ?? "").toUpperCase();
  if (holat === "CANCELLED") return "CANCEL";
  if (holat === "CONFIRMED" && amal !== "UPDATE") return "CONFIRM";
  return amal === "CREATE" || amal === "UPDATE" ? amal : "other";
}

/** Yozuvdagi valyuta ("oldin" va "keyin" holat uchun alohida). */
export function kassaTarixValyutalari(log: AuditYozuvi): { oldin?: "UZS" | "USD"; keyin?: "UZS" | "USD" } {
  const { oldin, keyin } = auditHolatlari(log);
  const v = (x: unknown) => (x === "USD" ? "USD" : x === "UZS" ? "UZS" : undefined);
  return { oldin: v(oldin?.currency), keyin: v(keyin?.currency) };
}
