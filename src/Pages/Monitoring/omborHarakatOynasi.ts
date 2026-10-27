// Monitoring "Omborlar bo'yicha kirim va chiqim" grafigining davr oynasi (kunlik / oylik / yillik).
import type { ChiqimHujjati, KirimHujjati, KochirishHujjati } from "@/types/ombor";

export type Davr = "kunlik" | "oylik" | "yillik";

// Xarid, hisobdan chiqarish va ko'chirmaning sanasi — backendning `date` maydoni (hujjat sanasi; backend hisobotlari ham
// shuni ishlatadi). confirmedAt/sentAt/receivedAt backendda yo'q, updatedAt esa har o'zgarishda siljiydi — shuning uchun olinmaydi.
export function hujjatSanasi(hujjat: KirimHujjati | ChiqimHujjati | KochirishHujjati) {
  return hujjat.date || hujjat.createdAt || "";
}

// Bitta tasdiqlangan hujjatning ombor bo'yicha harakati: qaysi kuni, qaysi omborga, kirimmi yoki chiqimmi.
export type OmborHarakat = {
  kun: string;
  warehouseId: string;
  nom: string;
  turi: "kirim" | "chiqim";
  summa: number;
};

export type OmborHarakatNuqtasi = { nom: string; kirim: number; chiqim: number };

const KUN_FORMATI = /^\d{4}-\d{2}-\d{2}$/;

function kunKaliti(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Vaqt-qatori emas, balki "joriy yig'indi" ko'rinishidagi grafiklar uchun (to'lov turlari,
// omborlar kirim/chiqim, top/kam sotilgan mahsulotlar) — tanlangan [dateFrom, dateTo]
// oralig'ini davr turiga qarab "oxirgi" pastki oynaga toraytiradi: kunlik = faqat dateTo kuni,
// oylik = dateTo joylashgan taqvim oyi, yillik = dateTo joylashgan yil — lekin tashqi
// tanlangan oraliqdan chetga chiqmaydi (dateFrom dan oldinga siljimaydi).
export function anchorOraligi(
  dateFrom: string,
  dateTo: string,
  davr: Davr,
): { from: string; to: string } {
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  if (Number.isNaN(end.getTime())) return { from: dateFrom, to: dateTo };
  let start: Date;
  if (davr === "kunlik") {
    start = new Date(end);
  } else if (davr === "oylik") {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  } else {
    start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
  }
  const startKey = kunKaliti(start);
  return { from: startKey < dateFrom ? dateFrom : startKey, to: dateTo };
}

// anchorOraligi bilan bir xil, lekin davr `dateTo` emas, berilgan `tayanchKun` (oxirgi harakat kuni)
// atrofida olinadi: kunlik = shu kun, oylik = shu oy, yillik = shu yil. dateFrom/dateTo dan chetga chiqmaydi.
function tayanchOraligi(
  dateFrom: string,
  dateTo: string,
  davr: Davr,
  tayanchKun: string,
): { from: string; to: string } {
  const oyna = anchorOraligi(dateFrom, tayanchKun, davr);
  if (davr === "kunlik") return oyna;
  const yil = Number(tayanchKun.slice(0, 4));
  const oy = Number(tayanchKun.slice(5, 7));
  const oxiri = davr === "oylik" ? kunKaliti(new Date(Date.UTC(yil, oy, 0))) : `${yil}-12-31`;
  return { from: oyna.from, to: oxiri < dateTo ? oxiri : dateTo };
}

// Grafik oynasi. Standart oyna dateTo'ga tayanadi (kunlik = bugun). Agar o'sha oynada hech qanday harakat
// bo'lmasa-yu, tanlangan oraliqda ilgari harakat bo'lgan bo'lsa, oyna oxirgi harakat kuniga siljiydi
// (`almashgan: true`) — shunda "Kunlik" bugun hujjat bo'lmagani uchun bo'sh qolmaydi.
export function omborHarakatOynasi(
  harakatlar: OmborHarakat[],
  dateFrom: string,
  dateTo: string,
  davr: Davr,
): { from: string; to: string; almashgan: boolean } {
  const standart = anchorOraligi(dateFrom, dateTo, davr);
  let oxirgi = "";
  harakatlar.forEach((harakat) => {
    if (!KUN_FORMATI.test(harakat.kun)) return;
    if (harakat.kun >= dateFrom && harakat.kun <= dateTo && harakat.kun > oxirgi) oxirgi = harakat.kun;
  });
  if (!oxirgi || oxirgi >= standart.from) return { ...standart, almashgan: false };
  return { ...tayanchOraligi(dateFrom, dateTo, davr, oxirgi), almashgan: true };
}

// Oyna ichidagi harakatlarni omborlar bo'yicha yig'adi (eng katta aylanma birinchi).
export function omborlarBoyichaYigish(
  harakatlar: OmborHarakat[],
  oyna: { from: string; to: string },
): OmborHarakatNuqtasi[] {
  const xarita = new Map<string, OmborHarakatNuqtasi>();
  harakatlar.forEach((harakat) => {
    if (harakat.kun < oyna.from || harakat.kun > oyna.to) return;
    const joriy = xarita.get(harakat.warehouseId) ?? { nom: harakat.nom, kirim: 0, chiqim: 0 };
    joriy[harakat.turi] += harakat.summa;
    xarita.set(harakat.warehouseId, joriy);
  });
  return Array.from(xarita.values()).sort(
    (a, b) => b.kirim + b.chiqim - (a.kirim + a.chiqim),
  );
}

// "2026-10-27" → "27.10.2026"; bir kunlik oraliq bitta sana, aks holda "01.10.2026 – 27.10.2026".
export function sanaOraligiMatni(from: string, to: string) {
  const korinish = (kun: string) => kun.split("-").reverse().join(".");
  return from === to ? korinish(from) : `${korinish(from)} – ${korinish(to)}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// GET /reports/warehouse-flow (backend, tannarxda): kirim/chiqim sotuv, qaytarish, ko'chirma, hisobdan chiqarish,
// inventarizatsiya va boshlang'ich qoldiqni o'z ichiga oladi. groupBy = WAREHOUSE | DAY | MONTH | YEAR.
// ---------------------------------------------------------------------------------------------------------------------

export type OmborOqimiGuruhi = "WAREHOUSE" | "DAY" | "MONTH" | "YEAR";

export type OmborOqimiQatori = {
  warehouseId: string;
  nom: string;
  // DAY: "2026-10-27", MONTH: "2026-10", YEAR: "2026"; WAREHOUSE uchun bo'sh.
  bucket: string;
  kirim: number;
  chiqim: number;
};

type OraliqBucket = { key: string; nom: string };

export function davrGuruhi(davr: Davr): OmborOqimiGuruhi {
  return davr === "kunlik" ? "DAY" : davr === "oylik" ? "MONTH" : "YEAR";
}

function raqam(qiymat: unknown) {
  const son = Number(qiymat ?? 0);
  return Number.isFinite(son) ? son : 0;
}

function mahalliyKun(sana: Date) {
  const oy = String(sana.getMonth() + 1).padStart(2, "0");
  const kun = String(sana.getDate()).padStart(2, "0");
  return `${sana.getFullYear()}-${oy}-${kun}`;
}

// Backend `bucket` ni davr kalitiga keltiradi. Kutilgan ko'rinish — "2026-10-27" / "2026-10" / "2026"; "2026-10-01" yoki
// to'liq vaqt ("...T19:00:00.000Z") kelsa ham, MAHALLIY kun/oy/yil olinadi (hujjat sanalari ham shunday o'qiladi).
export function oqimBucketKaliti(bucket: unknown, guruh: OmborOqimiGuruhi): string {
  const matn = String(bucket ?? "").trim();
  if (!matn || guruh === "WAREHOUSE") return "";
  if (guruh === "YEAR" && /^\d{4}$/.test(matn)) return matn;
  if (guruh === "MONTH" && /^\d{4}-\d{2}$/.test(matn)) return matn;
  let kun = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(matn)) {
    kun = matn;
  } else {
    const sana = new Date(matn);
    kun = Number.isNaN(sana.getTime()) ? "" : mahalliyKun(sana);
  }
  if (guruh === "DAY") return kun;
  return guruh === "MONTH" ? kun.slice(0, 7) : kun.slice(0, 4);
}

// Server javobini ({ currency, items: [{ warehouseId, warehouseName, bucket, incomeAmount, expenseAmount }], totals }) qatorlarga aylantiradi.
export function omborOqiminiMoslash(
  javob: unknown,
  guruh: OmborOqimiGuruhi,
): { currency: string; qatorlar: OmborOqimiQatori[] } {
  const obyekt = (javob && typeof javob === "object" ? javob : {}) as Record<string, unknown>;
  const royxat = Array.isArray(javob) ? javob : Array.isArray(obyekt.items) ? obyekt.items : [];
  const qatorlar = royxat.map((element) => {
    const qator = (element && typeof element === "object" ? element : {}) as Record<string, unknown>;
    return {
      warehouseId: String(qator.warehouseId ?? ""),
      nom: String(qator.warehouseName ?? ""),
      bucket: oqimBucketKaliti(qator.bucket, guruh),
      kirim: raqam(qator.incomeAmount),
      chiqim: raqam(qator.expenseAmount),
    };
  });
  return { currency: String(obyekt.currency ?? ""), qatorlar };
}

// DAY qatorlari → harakat kunlari (oxirgi harakat kunini topish uchun). Nol summa harakat emas.
export function oqimdanHarakatlar(qatorlar: OmborOqimiQatori[]): OmborHarakat[] {
  return qatorlar.flatMap((qator) => {
    if (!qator.bucket) return [];
    const asos = { kun: qator.bucket, warehouseId: qator.warehouseId, nom: qator.nom };
    const harakatlar: OmborHarakat[] = [];
    if (qator.kirim !== 0) harakatlar.push({ ...asos, turi: "kirim", summa: qator.kirim });
    if (qator.chiqim !== 0) harakatlar.push({ ...asos, turi: "chiqim", summa: qator.chiqim });
    return harakatlar;
  });
}

// WAREHOUSE qatorlari → omborlar bo'yicha ustunlar (kirim ham chiqim ham nol bo'lgan ombor chiqarilmaydi).
export function oqimdanOmborlar(qatorlar: OmborOqimiQatori[]): OmborHarakatNuqtasi[] {
  const xarita = new Map<string, OmborHarakatNuqtasi>();
  qatorlar.forEach((qator) => {
    const kalit = qator.warehouseId || qator.nom;
    const joriy = xarita.get(kalit) ?? { nom: qator.nom, kirim: 0, chiqim: 0 };
    joriy.kirim += qator.kirim;
    joriy.chiqim += qator.chiqim;
    xarita.set(kalit, joriy);
  });
  return Array.from(xarita.values())
    .filter((nuqta) => nuqta.kirim !== 0 || nuqta.chiqim !== 0)
    .sort((a, b) => b.kirim + b.chiqim - (a.kirim + a.chiqim));
}

// Server kun darajasida hisoblaydi: bir kunlik oraliqdagi soatlik bo'laklar o'rniga bitta kun nuqtasi olinadi.
export function oqimOraliqlari(oraliqlar: OraliqBucket[], dateFrom: string): OraliqBucket[] {
  if (!oraliqlar[0]?.key.includes("T")) return oraliqlar;
  return [{ key: dateFrom, nom: sanaOraligiMatni(dateFrom, dateFrom).slice(0, 5) }];
}

// Tanlangan ombor (warehouseId) uchun kirim yoki chiqim dinamikasi: har bir bo'lakka server summasi tushadi.
export function oqimdanNuqtalar(
  qatorlar: OmborOqimiQatori[],
  oraliqlar: OraliqBucket[],
  turi: "kirim" | "chiqim",
  warehouseId: string,
): Array<{ nom: string; summa: number }> {
  const xarita = new Map(oraliqlar.map((bucket) => [bucket.key, 0]));
  qatorlar.forEach((qator) => {
    if (warehouseId && qator.warehouseId && qator.warehouseId !== warehouseId) return;
    if (xarita.has(qator.bucket)) xarita.set(qator.bucket, (xarita.get(qator.bucket) ?? 0) + qator[turi]);
  });
  return oraliqlar.map((bucket) => ({ nom: bucket.nom, summa: xarita.get(bucket.key) ?? 0 }));
}
