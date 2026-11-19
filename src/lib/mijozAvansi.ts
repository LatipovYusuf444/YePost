// Mijozning boshlang'ich avansi (backend 18.11): dasturdan oldin biz mijozga qarzdor edik (masalan, $500 oldindan to'lagan).
// POST /partners/customers/:id/opening-debt { direction: "CREDIT" } → AVB- hujjat; summa mijoz hisobiga (balans) tushadi va ochiq
// qarzlarini darhol yopadi; kassa va savdo tushumiga ta'sir qilmaydi. Ro'yxat: GET .../opening-credits; bekor qilish: .../cancel
// (tiklash yo'q). UI'siz — alohida sinaladi.
import { valyutaYokiAsosiy } from "./asosiyValyuta.ts";

export type MijozAvansi = {
  id: string;
  docNumber: string;
  status: "CONFIRMED" | "CANCELLED" | string;
  amount: number;
  currency: "UZS" | "USD";
  date: string;
  note: string;
  createdAt: string;
};

type Obyekt = Record<string, unknown>;
const obyekt = (qiymat: unknown): Obyekt | null => (qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : null);
const matn = (qiymat: unknown) => (typeof qiymat === "string" ? qiymat.trim() : typeof qiymat === "number" ? String(qiymat) : "");

/** Bitta avans (javob `{ data }` ichida bo'lishi ham mumkin); id bo'lmasa `null`. */
export function mijozAvansi(raw: unknown): MijozAvansi | null {
  const asosiy = obyekt(raw);
  const o = asosiy && !matn(asosiy.id) && obyekt(asosiy.data) ? obyekt(asosiy.data) : asosiy;
  const id = matn(o?.id);
  if (!o || !id) return null;
  const summa = Number(o.amount);
  return {
    id,
    docNumber: matn(o.docNumber) || matn(o.documentNumber),
    status: (matn(o.status) || "CONFIRMED").toUpperCase(),
    amount: Number.isFinite(summa) ? summa : 0,
    currency: valyutaYokiAsosiy(matn(o.currency)),
    // To'liq vaqt saqlanadi: kun Toshkent bo'yicha kunMatni'da olinadi (UTC kesilsa tungi yozuv bir kun oldin ko'rinardi).
    date: matn(o.date) || matn(o.createdAt),
    note: matn(o.note),
    createdAt: matn(o.createdAt),
  };
}

/** GET .../opening-credits (massiv, `{ data }`, `{ items }`) → avanslar (yangisi birinchi, bekor qilinganlari ham). */
export function mijozAvanslari(raw: unknown): MijozAvansi[] {
  const asosiy = obyekt(raw);
  const ichki = obyekt(asosiy?.data);
  const royxat = [raw, asosiy?.data, asosiy?.items, ichki?.items].find(Array.isArray) as unknown[] | undefined;
  return (royxat ?? []).map(mijozAvansi).filter((avans): avans is MijozAvansi => avans !== null);
}

/** Yaratish javobi avansmi (CREDIT, AVB-) yoki boshlang'ich qarz sotuvi (DEBT). */
export function avansJavobimi(raw: unknown) {
  const asosiy = obyekt(raw);
  const o = asosiy && !matn(asosiy.id) && obyekt(asosiy.data) ? obyekt(asosiy.data) : asosiy;
  return matn(o?.direction).toUpperCase() === "CREDIT";
}

/** Hisob-kitob hisobotida boshlang'ich qoldiq qatori: AVB- — mijoz avansi, YAB- — yetkazib beruvchining bizga qarzi. */
export function boshlangichQoldiqTuri(hujjatRaqami: string) {
  const raqam = hujjatRaqami.trim().toUpperCase();
  if (raqam.startsWith("AVB-")) return "avans";
  if (raqam.startsWith("YAB-")) return "bizgaQarz";
  return "qarz";
}
