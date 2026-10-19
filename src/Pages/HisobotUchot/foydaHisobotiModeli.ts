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
export type FoydaGuruhi = "PRODUCT" | "CUSTOMER";

export function foydaHisobotiniMoslash(raw: unknown, kutilgan?: HisobotValyutasi, guruh: FoydaGuruhi = "PRODUCT"): { valyuta: HisobotValyutasi; qatorlar: FoydaQatori[] } {
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
      id: String(item.productId ?? item.groupKey ?? item.customerId ?? `profit-${index}`),
      // Mijozlar kesimida nomi bo'lmagan guruh — mijoz biriktirilmagan (donalik) sotuvlar.
      nomi: String(item.productName ?? item.groupName ?? item.customerName ?? (guruh === "CUSTOMER" ? "Donalik mijoz" : "Mahsulot")),
      sotilgan: son(item.qtySold), tushum, tannarx: son(item.cost), foyda,
      rentabellik: son(item.marginPct ?? (tushum ? foyda / tushum * 100 : 0)),
    };
  }).filter((qator) => qator.sotilgan !== 0 || qator.tushum !== 0 || qator.tannarx !== 0 || qator.foyda !== 0);
  return { valyuta, qatorlar };
}

export type FoydaSaralashKaliti = "nomi" | "sotilgan" | "tushum" | "tannarx" | "foyda" | "rentabellik";

/** Jadval tartibi: nom bo'yicha harf tartibida, qolganlari son bo'yicha; asl ro'yxat o'zgarmaydi. */
export function foydaniSaralash(qatorlar: FoydaQatori[], kalit: FoydaSaralashKaliti, kamayish: boolean): FoydaQatori[] {
  const yonalish = kamayish ? -1 : 1;
  return [...qatorlar].sort((a, b) =>
    (kalit === "nomi" ? a.nomi.localeCompare(b.nomi, "uz") : a[kalit] - b[kalit]) * yonalish
  );
}

/** Eng ko'p foyda keltirganlar (faqat foydasi 0 dan katta qatorlar). */
export function engKopFoyda(qatorlar: FoydaQatori[], soni = 5): FoydaQatori[] {
  return qatorlar.filter((qator) => qator.foyda > 0).sort((a, b) => b.foyda - a.foyda).slice(0, soni);
}

/** Zarar bilan sotilganlar: sotuv narxi tannarxdan past (eng katta zarar birinchi). */
export function zararliQatorlar(qatorlar: FoydaQatori[]): FoydaQatori[] {
  return qatorlar.filter((qator) => qator.foyda < 0).sort((a, b) => a.foyda - b.foyda);
}

export function foydaJami(qatorlar: FoydaQatori[]) {
  const tushum = qatorlar.reduce((sum, qator) => sum + qator.tushum, 0);
  const foyda = qatorlar.reduce((sum, qator) => sum + qator.foyda, 0);
  return {
    sotilgan: qatorlar.reduce((sum, qator) => sum + qator.sotilgan, 0),
    tushum,
    tannarx: qatorlar.reduce((sum, qator) => sum + qator.tannarx, 0),
    foyda,
    rentabellik: tushum ? (foyda / tushum) * 100 : 0,
  };
}
