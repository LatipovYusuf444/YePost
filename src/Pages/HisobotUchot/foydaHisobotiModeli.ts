import { hisobotValyutasiniTekshirish, type HisobotValyutasi } from "./hisobotValyutasi.ts";

export type FoydaQatori = {
  id: string; nomi: string; sotilgan: number; tushum: number;
  tannarx: number; foyda: number; rentabellik: number;
};

function obyekt(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function son(value: unknown) {
  const natija = Number(value ?? 0);
  if (!Number.isFinite(natija)) throw new Error("Hisobotda noto'g'ri son yoki summa qaytdi.");
  return natija;
}

/** Backend so'ralgan valyutada hisoblaydi; summalar qayta konvertatsiya qilinmaydi. */
export function foydaHisobotiniMoslash(raw: unknown, kutilgan?: HisobotValyutasi): { valyuta: HisobotValyutasi; qatorlar: FoydaQatori[] } {
  const tashqi = obyekt(raw);
  const data = tashqi.success !== undefined && tashqi.data !== undefined ? tashqi.data : raw;
  const record = obyekt(data);
  const valyuta = hisobotValyutasiniTekshirish(obyekt(record.summary).currency ?? record.currency ?? tashqi.currency, kutilgan);
  const items = Array.isArray(data) ? data : [record.items, record.data, record.value].find(Array.isArray)
    ?? ("revenue" in record ? [record] : []);
  const qatorlar: FoydaQatori[] = items.map((value, index) => {
    const item = obyekt(value);
    if (item.currency && String(item.currency).toUpperCase() !== valyuta) {
      throw new Error("Hisobot qatorlari bir xil valyutada qaytarilishi kerak.");
    }
    const tushum = son(item.revenue);
    const foyda = son(item.profit);
    return {
      id: String(item.productId ?? item.groupKey ?? `profit-${index}`),
      nomi: String(item.productName ?? item.groupName ?? "Mahsulot"),
      sotilgan: son(item.qtySold), tushum, tannarx: son(item.cost), foyda,
      rentabellik: son(item.marginPct ?? (tushum ? foyda / tushum * 100 : 0)),
    };
  }).filter((qator) => qator.sotilgan !== 0 || qator.tushum !== 0 || qator.tannarx !== 0 || qator.foyda !== 0);
  return { valyuta, qatorlar };
}
