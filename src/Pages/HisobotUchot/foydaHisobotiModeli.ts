import { hisobotValyutasiniTekshirish, type HisobotValyutasi } from "./hisobotValyutasi.ts";

/** Tushum, tannarx va foyda — bitta valyutada. */
export type FoydaSummalari = { tushum: number; tannarx: number; foyda: number };

export type FoydaQatori = {
  id: string; nomi: string; sotilgan: number;
  // So'ralgan hisobot valyutasidagi summalar (eski maydonlar: revenue, cost, profit).
  tushum: number; tannarx: number; foyda: number; rentabellik: number;
  // Har sotuv o'z kursida hisoblangan summalar so'mda va dollarda; kurs bo'lmasa dollar `null`.
  uzs: FoydaSummalari | null;
  usd: FoydaSummalari | null;
  zarar: boolean;
  cheklar: number | null;
  // Faqat mahsulotlar kesimida: 1 dona tannarxi, $.
  birDonaTannarxUsd: number | null;
  // Faqat mijozlar kesimida: mijozga eng ko'p foyda keltirgan mahsulot.
  engYaxshiMahsulot: { nomi: string; foydaUzs: number } | null;
};

/** Butun filtr bo'yicha jami (sahifaga emas): backend `summary`. */
export type FoydaXulosasi = {
  sotilgan: number;
  uzs: FoydaSummalari;
  usd: FoydaSummalari | null;
  rentabellik: number;
  cheklar: number | null;
  ortachaKurs: number | null;
};

/** `topProfit` / `lossItems` elementi: mahsulot va uning foydasi so'mda va dollarda. */
export type FoydaTaklifi = { id: string; nomi: string; foydaUzs: number; foydaUsd: number | null };

export type FoydaGuruhi = "PRODUCT" | "CUSTOMER";

function obyekt(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function son(value: unknown) {
  const natija = Number(value ?? 0);
  if (!Number.isFinite(natija)) throw new Error("Hisobotda noto'g'ri son yoki summa qaytdi.");
  return natija;
}

/** Berilmagan (`null`/`undefined`) qiymat — `null`; aks holda son. */
function sonYokiNull(value: unknown) {
  return value === null || value === undefined || value === "" ? null : son(value);
}

function summalar(tushum: unknown, tannarx: unknown, foyda: unknown): FoydaSummalari | null {
  const t = sonYokiNull(tushum);
  const c = sonYokiNull(tannarx);
  const f = sonYokiNull(foyda);
  return t === null || c === null || f === null ? null : { tushum: t, tannarx: c, foyda: f };
}

/** Backend so'ralgan valyutada hisoblaydi; summalar qayta konvertatsiya qilinmaydi. */
export function foydaHisobotiniMoslash(raw: unknown, kutilgan?: HisobotValyutasi, guruh: FoydaGuruhi = "PRODUCT"): {
  valyuta: HisobotValyutasi; qatorlar: FoydaQatori[]; xulosa: FoydaXulosasi | null; eng: FoydaTaklifi[] | null; zarar: FoydaTaklifi[] | null;
} {
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
    const tushum = son(item.revenue ?? (valyuta === "USD" ? item.revenueUsd : item.revenueUzs));
    const foyda = son(item.profit ?? (valyuta === "USD" ? item.profitUsd : item.profitUzs));
    const tannarx = son(item.cost ?? (valyuta === "USD" ? item.costUsd : item.costUzs));
    // Eski javobda faqat hisobot valyutasidagi summalar bor.
    const asosiy: FoydaSummalari = { tushum, tannarx, foyda };
    const uzs = "revenueUzs" in item ? summalar(item.revenueUzs, item.costUzs, item.profitUzs) : valyuta === "UZS" ? asosiy : null;
    const usd = "revenueUsd" in item ? summalar(item.revenueUsd, item.costUsd, item.profitUsd) : valyuta === "USD" ? asosiy : null;
    const eng = obyekt(item.bestProduct);
    return {
      id: String(item.productId ?? item.groupKey ?? item.customerId ?? `profit-${index}`),
      // Mijozlar kesimida nomi bo'lmagan guruh — mijoz biriktirilmagan (donalik) sotuvlar.
      nomi: String(item.productName ?? item.groupName ?? item.customerName ?? (guruh === "CUSTOMER" ? "Donalik mijoz" : "Mahsulot")),
      sotilgan: son(item.qtySold), tushum, tannarx, foyda,
      rentabellik: son(item.marginPct ?? (tushum ? foyda / tushum * 100 : 0)),
      uzs, usd,
      zarar: typeof item.isLoss === "boolean" ? item.isLoss : foyda < 0,
      cheklar: sonYokiNull(item.checks),
      birDonaTannarxUsd: sonYokiNull(item.unitCostUsd),
      engYaxshiMahsulot: eng.productName ? { nomi: String(eng.productName), foydaUzs: son(eng.profitUzs) } : null,
    };
  }).filter((qator) => qator.sotilgan !== 0 || qator.tushum !== 0 || qator.tannarx !== 0 || qator.foyda !== 0);
  return { valyuta, qatorlar, xulosa: xulosaniMoslash(record.summary), eng: taklifniMoslash(record.topProfit), zarar: taklifniMoslash(record.lossItems) };
}

function xulosaniMoslash(raw: unknown): FoydaXulosasi | null {
  const s = obyekt(raw);
  const uzs = summalar(s.revenueUzs, s.costUzs, s.profitUzs);
  if (!uzs) return null;
  return {
    sotilgan: son(s.qtySold),
    uzs,
    usd: summalar(s.revenueUsd, s.costUsd, s.profitUsd),
    rentabellik: son(s.marginPct ?? (uzs.tushum ? uzs.foyda / uzs.tushum * 100 : 0)),
    cheklar: sonYokiNull(s.checks),
    ortachaKurs: sonYokiNull(s.avgRate),
  };
}

function taklifniMoslash(raw: unknown): FoydaTaklifi[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((value, index) => {
    const item = obyekt(value);
    return {
      id: String(item.productId ?? `taklif-${index}`),
      nomi: String(item.productName ?? "Mahsulot"),
      foydaUzs: son(item.profitUzs),
      foydaUsd: sonYokiNull(item.profitUsd),
    };
  });
}

/**
 * Summaning asosiy va qo'shimcha ko'rinishi: tanlangan valyuta asosiy, ikkinchisi qo'shimcha (≈).
 * Dollar summasi yo'q (kurs kiritilmagan) bo'lsa — so'm asosiy, qo'shimcha yo'q.
 */
export function valyutaJufti(uzs: number, usd: number | null, afzal: HisobotValyutasi) {
  if (afzal === "USD" && usd !== null) return { asosiy: { summa: usd, valyuta: "USD" as const }, qoshimcha: { summa: uzs, valyuta: "UZS" as const } };
  return { asosiy: { summa: uzs, valyuta: "UZS" as const }, qoshimcha: usd === null ? null : { summa: usd, valyuta: "USD" as const } };
}

/** Qator summasining asosiy/qo'shimcha ko'rinishi; so'm/dollar maydonlari bo'lmasa (eski javob) faqat hisobot valyutasidagi qiymat. */
export function qatorJufti(qator: Pick<FoydaQatori, "uzs" | "usd" | "tushum" | "tannarx" | "foyda">, kalit: keyof FoydaSummalari, afzal: HisobotValyutasi) {
  const uzs = qator.uzs?.[kalit];
  if (uzs === undefined) return { asosiy: { summa: qator[kalit], valyuta: afzal }, qoshimcha: null };
  return valyutaJufti(uzs, qator.usd?.[kalit] ?? null, afzal);
}

export type FoydaSaralashKaliti = "nomi" | "sotilgan" | "tushum" | "tannarx" | "foyda" | "rentabellik";

/** Jadval tartibi: nom bo'yicha harf tartibida, qolganlari son bo'yicha; asl ro'yxat o'zgarmaydi. */
export function foydaniSaralash(qatorlar: FoydaQatori[], kalit: FoydaSaralashKaliti, kamayish: boolean): FoydaQatori[] {
  const yonalish = kamayish ? -1 : 1;
  return [...qatorlar].sort((a, b) =>
    (kalit === "nomi" ? a.nomi.localeCompare(b.nomi, "uz") : a[kalit] - b[kalit]) * yonalish
  );
}

function qatordanTaklif(qator: FoydaQatori): FoydaTaklifi {
  return { id: qator.id, nomi: qator.nomi, foydaUzs: qator.uzs?.foyda ?? qator.foyda, foydaUsd: qator.usd?.foyda ?? null };
}

/** Eng ko'p foyda keltirganlar (faqat foydasi 0 dan katta qatorlar). */
export function engKopFoyda(qatorlar: FoydaQatori[], soni = 5): FoydaQatori[] {
  return qatorlar.filter((qator) => qator.foyda > 0).sort((a, b) => b.foyda - a.foyda).slice(0, soni);
}

/** Zarar bilan sotilganlar: sotuv narxi tannarxdan past (eng katta zarar birinchi). */
export function zararliQatorlar(qatorlar: FoydaQatori[]): FoydaQatori[] {
  return qatorlar.filter((qator) => qator.zarar).sort((a, b) => a.foyda - b.foyda);
}

/** Panel ro'yxati: backend ro'yxati (butun filtr bo'yicha) bo'lsa shu, bo'lmasa ko'rinayotgan qatorlardan. */
export function panelRoyxati(server: FoydaTaklifi[] | null, qatorlardan: FoydaQatori[]): FoydaTaklifi[] {
  return server ?? qatorlardan.map(qatordanTaklif);
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

/** Ikkala valyutada jami: dollar faqat hamma qatorda bo'lsa hisoblanadi. */
export function foydaJamiIkkiValyuta(qatorlar: FoydaQatori[]): { uzs: FoydaSummalari | null; usd: FoydaSummalari | null } {
  const yigish = (tanlash: (qator: FoydaQatori) => FoydaSummalari | null) => {
    const royxat = qatorlar.map(tanlash);
    if (royxat.length === 0 || royxat.some((qiymat) => qiymat === null)) return null;
    return (royxat as FoydaSummalari[]).reduce(
      (jami, qiymat) => ({ tushum: jami.tushum + qiymat.tushum, tannarx: jami.tannarx + qiymat.tannarx, foyda: jami.foyda + qiymat.foyda }),
      { tushum: 0, tannarx: 0, foyda: 0 }
    );
  };
  return { uzs: yigish((qator) => qator.uzs), usd: yigish((qator) => qator.usd) };
}
