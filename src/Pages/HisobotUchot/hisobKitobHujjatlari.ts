import type { HisobotValyutasi } from "./hisobotValyutasi";

export type HisobKitobHujjatQatori = {
  id: string;
  hujjat: string;
  turi: string;
  sana: string;
  debet: number | null;
  kredit: number | null;
  qoldiq: number | null;
};

function summa(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) return null;
  const son = Number(value);
  return Number.isFinite(son) ? son : null;
}

/** Backendning hujjatlari va yurma qoldig'i; frontend kurs qo'llamaydi va qoldiqni qayta hisoblamaydi. */
export function hisobKitobHujjatlariniMoslash(raw: unknown, currency: HisobotValyutasi): HisobKitobHujjatQatori[] {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  if (data.currency && data.currency !== currency) throw new Error("Hujjatlar valyutasi tanlangan valyutaga mos kelmadi.");
  const items = Array.isArray(raw) ? raw : data.items ?? data.documents;
  if (!Array.isArray(items)) throw new Error("Hujjatlar ro'yxatini o'qib bo'lmadi. Qayta urinib ko'ring.");
  return items.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Hisobotda hujjat ma'lumotlari noto'g'ri qaytdi.");
    const row = item as Record<string, unknown>;
    if (row.currency && row.currency !== currency) throw new Error("Hujjat valyutasi tanlangan valyutaga mos kelmadi.");
    return {
      id: `${row.documentId ?? row.id ?? "hujjat"}:${index}`,
      hujjat: String(row.docNumber ?? row.documentNumber ?? row.number ?? "—"),
      turi: String(row.type ?? row.documentType ?? ""),
      sana: String(row.date ?? row.createdAt ?? ""),
      debet: summa(row.debit),
      kredit: summa(row.credit),
      qoldiq: summa(row.runningBalance ?? row.balance ?? row.closingBalance),
    };
  });
}
