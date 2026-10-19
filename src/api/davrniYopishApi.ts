import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";

// Sozlamalar → "Davrni yopish": GET/PUT /settings/period-close.
// Yopilgan kun (o'sha kun ham) va undan oldingi sanadagi hujjatlarni yaratish, tahrirlash, tasdiqlash, bekor qilish,
// tiklash va o'chirish backendda 423 errors.document.period_closed bilan rad etiladi.
export type DavrniYopishKim = { id: string; fullName?: string | null; username?: string | null };

export type DavrniYopishHolati = {
  /** Shu kungacha (shu kun ham) davr yopiq; `null` — davr ochiq. "YYYY-MM-DD". */
  closedUntil: string | null;
  changedBy: DavrniYopishKim | null;
  changedAt: string | null;
};

type DavrniYopishJavobi = Partial<{
  closedUntil: string | null;
  changedBy: DavrniYopishKim | null;
  changedAt: string | null;
}>;

function kunniTozalash(qiymat: unknown): string | null {
  if (typeof qiymat !== "string") return null;
  const kun = qiymat.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(kun) ? kun : null;
}

/** Backend javobi (o'rovli yoki o'rovsiz) → yagona holat. */
export function davrniYopishHolati(raw: DavrniYopishJavobi | ApiEnvelope<DavrniYopishJavobi> | null | undefined): DavrniYopishHolati {
  const javob = (raw ? apiData(raw) : null) ?? {};
  const kim = javob.changedBy;
  return {
    closedUntil: kunniTozalash(javob.closedUntil),
    changedBy: kim && typeof kim === "object" && typeof kim.id === "string" ? kim : null,
    changedAt: typeof javob.changedAt === "string" && javob.changedAt ? javob.changedAt : null,
  };
}

export const davrniYopishApi = {
  olish: async () =>
    davrniYopishHolati((await apiClient.get<DavrniYopishJavobi | ApiEnvelope<DavrniYopishJavobi>>("/settings/period-close")).data),

  // Faqat DIREKTOR (boshqalarga 403). `null` — davr ochiladi. Bugundan keyingi sana 400 errors.document.date_in_future.
  yangilash: async (closedUntil: string | null) =>
    davrniYopishHolati(
      (await apiClient.put<DavrniYopishJavobi | ApiEnvelope<DavrniYopishJavobi>>("/settings/period-close", { closedUntil })).data
    ),
};
