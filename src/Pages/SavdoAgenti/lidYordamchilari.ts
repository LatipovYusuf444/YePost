import { davomiylikQismlari, nisbiyVaqt } from "@/lib/savdoAgenti";

// Bosqich belgisi ranglari (ro'yxat va kartada bir xil).
export const BOSQICH_RANGLARI: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 ring-slate-200",
  INTERESTED: "bg-sky-50 text-sky-700 ring-sky-100",
  ORDER: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  CALL_BACK: "bg-amber-50 text-amber-700 ring-amber-100",
  SALE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  LOST: "bg-rose-50 text-rose-700 ring-rose-100",
};

export function bosqichRangi(stage?: string | null) {
  return BOSQICH_RANGLARI[stage ?? ""] ?? BOSQICH_RANGLARI.NEW;
}

type Tarjima = (kalit: string, opts?: Record<string, unknown>) => string;

/** 75 → "1 daq", 3725 → "1 soat 2 daq", 40 → "40 s". */
export function davomiylikMatni(soniya: number | null | undefined, t: Tarjima): string {
  const q = davomiylikQismlari(soniya);
  if (!q) return "";
  if (q.soat > 0) {
    const soat = t("lid.duration.soat", { n: q.soat });
    return q.daqiqa > 0 ? `${soat} ${t("lid.duration.daqiqa", { n: q.daqiqa })}` : soat;
  }
  if (q.daqiqa > 0) return t("lid.duration.daqiqa", { n: q.daqiqa });
  return t("lid.duration.soniya", { n: q.soniya });
}

/** "hozir", "12 daq oldin", "3 soat oldin", "2 kun oldin". */
export function nisbiyVaqtMatni(qiymat: string | null | undefined, t: Tarjima): string {
  const v = nisbiyVaqt(qiymat);
  if (!v) return "";
  return v.tur === "hozir" ? t("lid.relative.hozir") : t(`lid.relative.${v.tur}`, { n: v.n });
}

/** Kanban ustuni nuqtasi rangi. */
export const BOSQICH_NUQTALARI: Record<string, string> = {
  NEW: "bg-slate-400",
  INTERESTED: "bg-sky-500",
  ORDER: "bg-indigo-500",
  CALL_BACK: "bg-amber-500",
  SALE: "bg-emerald-500",
  LOST: "bg-rose-500",
};

/**
 * Mas'ul tayinlash ro'yxati: /accounts/users nofaol xodimlarni ham qaytaradi, backend esa ularni mas'ul qilmaydi
 * (errors.crm.lead_owner_invalid) — shuning uchun faqat faollar.
 */
export function faolXodimlar(royxat: Array<{ id: string; fullName?: string; name?: string; username?: string; isActive?: boolean }>) {
  return royxat
    .filter((x) => Boolean(x.id) && x.isActive !== false)
    .map((x) => ({ id: x.id, nom: x.fullName || x.name || x.username || x.id }));
}
