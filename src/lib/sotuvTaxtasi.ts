// Savdo Kanban (1-bosqich) — sof yordamchilar (React/axios yo'q, testlar to'g'ridan-to'g'ri import qiladi).
// Backend: GET /api/v1/sales/board va GET /api/v1/sales/board/:column?cursor=…

export const TAXTA_USTUNLARI = ["draft", "shipped", "partial", "closed", "cancelled"] as const;
export type TaxtaKaliti = (typeof TAXTA_USTUNLARI)[number];

export type TaxtaFiltrQiymatlari = {
  search?: string;
  responsibleId?: string;
  warehouseId?: string;
  currency?: string;
  saleType?: string;
  overdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

/** Bo'sh filtrlar yuborilmaydi; overdue faqat true bo'lsa. Sana faqat YYYY-MM-DD. */
export function taxtaParametrlari(filtr: TaxtaFiltrQiymatlari): Record<string, string> {
  const natija: Record<string, string> = {};
  const qidiruv = filtr.search?.trim();
  if (qidiruv) natija.search = qidiruv;
  for (const kalit of ["responsibleId", "warehouseId", "currency", "saleType"] as const) {
    const qiymat = filtr[kalit]?.trim();
    if (qiymat) natija[kalit] = qiymat;
  }
  if (filtr.overdue) natija.overdue = "true";
  for (const kalit of ["dateFrom", "dateTo"] as const) {
    const qiymat = filtr[kalit]?.slice(0, 10);
    if (qiymat && /^\d{4}-\d{2}-\d{2}$/.test(qiymat)) natija[kalit] = qiymat;
  }
  return natija;
}

/** Filtr kaliti: o'zgarsa barcha ustunlar birinchi sahifadan boshlanadi (eski kursorlar tashlanadi). */
export function taxtaFiltrKaliti(filtr: TaxtaFiltrQiymatlari) {
  return JSON.stringify(taxtaParametrlari(filtr));
}

export type TaxtaAmali =
  /** draft -> shipped: POST /sales/:id/confirm (avval ombordan chiqarish oynasi). */
  | "tasdiqlash"
  /** -> partial / closed: POST /sales/:id/payments (to'lov oynasi). */
  | "tolov"
  /** -> cancelled: POST /sales/:id/cancel (sabab so'raladi). */
  | "bekor";

export type TaxtaRuxsatlari = {
  /** kassir, omborchi, admin, direktor: tasdiqlash va to'lov. */
  amal: boolean;
  /** admin + RETURN_CANCEL yoki direktor. */
  bekor: boolean;
};

/**
 * Kartochkani `qayerdan` -> `qayerga` sudrashda qaysi amal bajariladi (null — mumkin emas).
 * shipped/partial/closed ustunlari hujjat holati va to'lovdan hisoblanadi: qo'lda faqat tasdiqlash (draft -> shipped),
 * to'lov (qarzi bor tasdiqlangan sotuv -> partial/closed) va bekor qilish mumkin.
 */
export function taxtaAmali(qayerdan: string, qayerga: string, ruxsat: TaxtaRuxsatlari): TaxtaAmali | null {
  if (qayerdan === qayerga) return null;
  if (qayerga === "cancelled") return qayerdan !== "cancelled" && ruxsat.bekor ? "bekor" : null;
  if (!ruxsat.amal) return null;
  if (qayerdan === "draft" && qayerga === "shipped") return "tasdiqlash";
  if ((qayerdan === "shipped" || qayerdan === "partial") && (qayerga === "partial" || qayerga === "closed")) return "tolov";
  return null;
}

/** Summa satr ko'rinishida keladi: son sifatida (noto'g'ri bo'lsa null). */
export function taxtaSummasi(qiymat: string | number | null | undefined): number | null {
  if (qiymat === null || qiymat === undefined || qiymat === "") return null;
  const son = typeof qiymat === "number" ? qiymat : Number(String(qiymat).replace(/\s+/g, ""));
  return Number.isFinite(son) ? son : null;
}

/** Kartochkadagi mijoz nomi: customer / clientCompany / walkInCustomerName (bittasi to'ladi). */
export function taxtaMijozi(k: { customer?: { name?: string | null } | null; clientCompany?: { name?: string | null } | null; walkInCustomerName?: string | null }) {
  return k.customer?.name?.trim() || k.clientCompany?.name?.trim() || k.walkInCustomerName?.trim() || "";
}

/** Chap chiziq rangi: muddati o'tgan qarz — qizil; 2 kundan uzoq qoralama — to'q sariq. */
export function taxtaOgohlantirishi(k: { overdue?: boolean; draftDays?: number | null }): "qizil" | "sariq" | null {
  if (k.overdue) return "qizil";
  if ((k.draftDays ?? 0) > 2) return "sariq";
  return null;
}

/** Keyingi sahifani qo'shishda takrorlarni tashlash (sahifa orasida kartochka ustun almashtirgan bo'lishi mumkin). */
export function kartochkalarniQoshish<T extends { id: string }>(mavjud: readonly T[], yangi: readonly T[]): T[] {
  const bor = new Set(mavjud.map((k) => k.id));
  return [...mavjud, ...yangi.filter((k) => !bor.has(k.id))];
}

/** Kartochka menyusi uchun: shu ustundan bajariladigan amallar (har amal bir marta, birinchi mos ustun bilan). */
export function taxtaMumkinAmallari(qayerdan: string, ruxsat: TaxtaRuxsatlari): Array<{ amal: TaxtaAmali; qayerga: TaxtaKaliti }> {
  const natija: Array<{ amal: TaxtaAmali; qayerga: TaxtaKaliti }> = [];
  for (const qayerga of TAXTA_USTUNLARI) {
    const amal = taxtaAmali(qayerdan, qayerga, ruxsat);
    if (amal && !natija.some((m) => m.amal === amal)) natija.push({ amal, qayerga });
  }
  return natija;
}

export type TaxtaRadSababi = "ruxsat" | "bekorRuxsat" | "bekorQilingan" | "avvalJonatish" | "hisoblanadi";

/** Sudrab bo'lmaydigan ustunga tashlanganda nima uchunligi (i18n kaliti); amal mumkin yoki o'z ustuni bo'lsa null. */
export function taxtaRadSababi(qayerdan: string, qayerga: string, ruxsat: TaxtaRuxsatlari): TaxtaRadSababi | null {
  if (qayerdan === qayerga || taxtaAmali(qayerdan, qayerga, ruxsat)) return null;
  if (qayerdan === "cancelled") return "bekorQilingan";
  if (qayerga === "cancelled") return "bekorRuxsat";
  // Shu yo'nalish ruxsat bo'lganda mumkin bo'lardi — demak muammo rolda.
  if (!ruxsat.amal && taxtaAmali(qayerdan, qayerga, { amal: true, bekor: ruxsat.bekor })) return "ruxsat";
  if (qayerdan === "draft" && (qayerga === "partial" || qayerga === "closed")) return "avvalJonatish";
  return "hisoblanadi";
}

/** Kursor yaroqsiz (eskirgan) — ustunni birinchi sahifadan qayta yuklash kerak. */
export const TAXTA_KURSOR_XATOSI = "errors.sales.board_cursor_invalid";

type TaxtaSahifasi<T> = { items: readonly T[]; nextCursor?: string | null };

/**
 * Avtomatik yangilashda foydalanuvchi ochgan sahifalar sonini saqlash: birinchi sahifadan boshlab kursorlar ketma-ket
 * (o'zgartirilmasdan) qayta yuriladi, `sahifalar` tagacha yoki kursor tugaguncha. Takrorlar tashlanadi.
 */
export async function sahifalarniQaytaYurish<T extends { id: string }>(
  birinchi: TaxtaSahifasi<T>,
  sahifalar: number,
  olish: (cursor: string) => Promise<TaxtaSahifasi<T>>
): Promise<{ items: T[]; nextCursor: string | null; sahifalar: number }> {
  let items = [...birinchi.items];
  let cursor = birinchi.nextCursor ?? null;
  let soni = 1;
  while (cursor && soni < sahifalar) {
    const keyingi = await olish(cursor);
    items = kartochkalarniQoshish(items, keyingi.items);
    cursor = keyingi.nextCursor ?? null;
    soni += 1;
  }
  return { items, nextCursor: cursor, sahifalar: soni };
}
