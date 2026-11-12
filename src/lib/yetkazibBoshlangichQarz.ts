import { valyutaYokiAsosiy } from "./asosiyValyuta.ts";
// Yetkazib beruvchiga boshlang'ich qarz (dasturdan oldin biz qarzdor bo'lgan summa): POST/GET /partners/suppliers/:id/opening-debt(s).
// Darhol tasdiqlanadi (qoralama yo'q), bekor qilinadi va qayta tiklanadi. Bu kirim emas: omborga va qoldiqqa tushmaydi.
// UI'siz va tashqi importlarsiz — alohida sinaladi.

export type YetkazibQarzHolati = "CONFIRMED" | "CANCELLED" | string;

export type YetkazibBoshlangichQarzi = {
  id: string;
  docNumber: string;
  status: YetkazibQarzHolati;
  amount: number;
  currency: "UZS" | "USD";
  rate: number | null;
  date: string;
  note: string;
  createdAt: string;
};

/** Izoh uzunligi chegarasi (backend: 300 belgigacha). */
export const YETKAZIB_QARZ_IZOH_UZUNLIGI = 300;

type Obyekt = Record<string, unknown>;

function obyekt(qiymat: unknown): Obyekt | null {
  return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : null;
}

function matn(qiymat: unknown): string {
  return typeof qiymat === "string" ? qiymat.trim() : typeof qiymat === "number" ? String(qiymat) : "";
}

function son(qiymat: unknown): number {
  const n = Number(qiymat);
  return Number.isFinite(n) ? n : 0;
}

/** Bitta qarz yozuvi (javob o'rovli `{ data }` bo'lishi ham mumkin); id bo'lmasa `null`. */
export function yetkazibQarzi(raw: unknown): YetkazibBoshlangichQarzi | null {
  const asosiy = obyekt(raw);
  const o = asosiy && !matn(asosiy.id) && obyekt(asosiy.data) ? obyekt(asosiy.data) : asosiy;
  const id = matn(o?.id);
  if (!o || !id) return null;
  const kurs = Number(o.rate);
  return {
    id,
    docNumber: matn(o.docNumber) || matn(o.documentNumber) || matn(o.number),
    status: (matn(o.status) || "CONFIRMED").toUpperCase(),
    amount: son(o.amount),
    currency: valyutaYokiAsosiy(matn(o.currency)),
    rate: o.rate !== null && o.rate !== undefined && Number.isFinite(kurs) && kurs > 0 ? kurs : null,
    date: (matn(o.date) || matn(o.createdAt)).slice(0, 10),
    note: matn(o.note),
    createdAt: matn(o.createdAt),
  };
}

/** GET /partners/suppliers/:id/opening-debts javobi (massiv, `{ data }`, `{ items }`, `{ data: { items } }`) → yozuvlar. Tartib serverniki (yangisi birinchi). */
export function yetkazibQarzlari(raw: unknown): YetkazibBoshlangichQarzi[] {
  const asosiy = obyekt(raw);
  const ichki = obyekt(asosiy?.data);
  const royxat = [raw, asosiy?.data, asosiy?.items, ichki?.items].find(Array.isArray) as unknown[] | undefined;
  return (royxat ?? []).map(yetkazibQarzi).filter((qarz): qarz is YetkazibBoshlangichQarzi => qarz !== null);
}

/** Qaysi amal mumkin: tasdiqlangan — bekor qilish, bekor qilingan — qayta tiklash (mijoz boshlang'ich qarzidan farqli). */
export function yetkazibQarzAmali(qarz: Pick<YetkazibBoshlangichQarzi, "status">): "bekor" | "tiklash" | null {
  if (qarz.status === "CONFIRMED") return "bekor";
  if (qarz.status === "CANCELLED") return "tiklash";
  return null;
}

/** Boshlang'ich qarzni faqat admin va direktor kiritadi, bekor qiladi va tiklaydi. */
export function yetkazibQarzRuxsati(rol: string): boolean {
  return rol === "ADMIN" || rol === "DIREKTOR";
}
