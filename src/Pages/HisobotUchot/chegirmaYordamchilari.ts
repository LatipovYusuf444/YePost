import axios from "axios";
import { discountReportApi } from "@/api/reportsApi";
import { sotuvlarSahifasiniOlish } from "@/api/savdoApi";
import { masulNomi, mijozNomi, sotuvChegirmaSummasi, sotuvHolati, sotuvSummasi } from "@/Pages/Savdo/savdoYordamchilari";
import type { Sotuv } from "@/types/savdo";
import type { DiscountReportGroupBy, DiscountReportRow, DiscountReportSummary } from "@/types/reports";

// Chegirmalar hisoboti yordamchilari.
// Asosiy manba — backend `GET /reports/discounts`. Backendda bu endpoint hali bo'lmasa (404), hisob
// sotuvlar ro'yxatidan (har bir sotuvdagi chegirma summasidan) hisoblanadi va ekranda shu haqda ogohlantiriladi.

export type ChegirmaManbasi = "backend" | "sotuvlar";

export type ChegirmaXulosa = {
  jami: number;
  chegirmaliSotuvlar: number;
  sotuvlarSoni: number;
};

export type ChegirmaXulosalari = {
  bugun: ChegirmaXulosa;
  oy: ChegirmaXulosa;
  manba: ChegirmaManbasi;
  bugunKuni: string;
  oyBoshi: string;
};

const raqam = (value: unknown) => {
  const natija = Number(value ?? 0);
  return Number.isFinite(natija) ? natija : 0;
};

// Qurilma (mahalliy) vaqti bo'yicha "YYYY-MM-DD". toISOString() UTC beradi, shuning uchun kechasi bir kun adashadi.
export function mahalliyKun(sana: Date) {
  const oy = String(sana.getMonth() + 1).padStart(2, "0");
  const kun = String(sana.getDate()).padStart(2, "0");
  return `${sana.getFullYear()}-${oy}-${kun}`;
}

// Mahalliy kun chegaralari backendga UTC ISO ko'rinishida yuboriladi.
export const kunBoshi = (kun: string) => new Date(`${kun}T00:00:00`).toISOString();
export const kunOxiri = (kun: string) => new Date(`${kun}T23:59:59.999`).toISOString();

function oldingiKun(kun: string) {
  const sana = new Date(`${kun}T12:00:00`);
  sana.setDate(sana.getDate() - 1);
  return mahalliyKun(sana);
}

export function backendYoqmi(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

function sotuvKuni(sotuv: Sotuv) {
  const qiymat = sotuv.confirmedAt ?? sotuv.date ?? sotuv.createdAt;
  const sana = qiymat ? new Date(qiymat) : null;
  return sana && !Number.isNaN(sana.getTime()) ? mahalliyKun(sana) : "";
}

// Berilgan oraliqdagi tasdiqlangan sotuvlar (barcha sahifalari). Oraliq mahalliy kunlar bo'yicha tekshiriladi.
export async function tasdiqlanganSotuvlar(dateFrom: string, dateTo: string): Promise<Sotuv[]> {
  // Backend sana filtri UTC bo'yicha bo'lishi mumkin, shuning uchun bir kun oldindan olinib, so'ng mahalliy kun bo'yicha saralanadi.
  const filtr = { dateFrom: oldingiKun(dateFrom), dateTo, status: "CONFIRMED" as const, pageSize: 100 };
  const birinchi = await sotuvlarSahifasiniOlish({ ...filtr, page: 1 });
  const qolgan = birinchi.totalPages > 1
    ? await Promise.all(
        Array.from({ length: birinchi.totalPages - 1 }, (_, index) => sotuvlarSahifasiniOlish({ ...filtr, page: index + 2 })),
      )
    : [];
  return [birinchi.items, ...qolgan.map((sahifa) => sahifa.items)]
    .flat()
    .filter((sotuv) => {
      const kun = sotuvKuni(sotuv);
      return sotuvHolati(sotuv) === "CONFIRMED" && kun >= dateFrom && kun <= dateTo;
    });
}

export function sotuvlardanXulosa(sotuvlar: Sotuv[]): ChegirmaXulosa {
  let jami = 0;
  let chegirmali = 0;
  sotuvlar.forEach((sotuv) => {
    const chegirma = sotuvChegirmaSummasi(sotuv);
    if (chegirma > 0) {
      jami += chegirma;
      chegirmali += 1;
    }
  });
  return { jami, chegirmaliSotuvlar: chegirmali, sotuvlarSoni: sotuvlar.length };
}

// Backend javobi `{ summary, items }` ko'rinishida kutiladi, lekin `rows` yoki `data` (massiv yoki ichki obyekt) bilan kelsa ham o'qiladi.
type BackendIchki = { summary?: DiscountReportSummary; items?: DiscountReportRow[]; rows?: DiscountReportRow[] };
type BackendJavob = BackendIchki & { data?: DiscountReportRow[] | BackendIchki };

export function javobQatorlari(javob: unknown): DiscountReportRow[] {
  const qiymat = (javob ?? {}) as BackendJavob;
  const ichki = Array.isArray(qiymat.data) ? undefined : qiymat.data;
  return qiymat.items ?? qiymat.rows ?? (Array.isArray(qiymat.data) ? qiymat.data : undefined) ?? ichki?.items ?? ichki?.rows ?? [];
}

export function javobXulosasi(javob: unknown): DiscountReportSummary | undefined {
  const qiymat = (javob ?? {}) as BackendJavob;
  const ichki = Array.isArray(qiymat.data) ? undefined : qiymat.data;
  return qiymat.summary ?? ichki?.summary;
}

// Backend javobidan (summary yoki qatorlar yig'indisidan) xulosa olinadi.
export function backendXulosa(javob: unknown): ChegirmaXulosa {
  const summary = javobXulosasi(javob);
  if (summary && summary.totalDiscount != null) {
    return {
      jami: raqam(summary.totalDiscount),
      chegirmaliSotuvlar: raqam(summary.discountedSalesCount),
      sotuvlarSoni: raqam(summary.totalSalesCount),
    };
  }
  const qatorlar = javobQatorlari(javob);
  return {
    jami: qatorlar.reduce((sum, qator) => sum + raqam(qator.discountAmount), 0),
    chegirmaliSotuvlar: qatorlar.reduce((sum, qator) => sum + raqam(qator.discountedSalesCount ?? qator.salesCount), 0),
    sotuvlarSoni: qatorlar.reduce((sum, qator) => sum + raqam(qator.salesCount), 0),
  };
}

// "Bugun" va "Shu oy" kartalari uchun ma'lumot.
export async function chegirmaXulosalariniOlish(): Promise<ChegirmaXulosalari> {
  const bugunKuni = mahalliyKun(new Date());
  const oyBoshi = `${bugunKuni.slice(0, 8)}01`;
  const sorov = (dan: string, gacha: string) =>
    discountReportApi.olish({ groupBy: "DAY", dateFrom: kunBoshi(dan), dateTo: kunOxiri(gacha), page: 1, pageSize: 1 });

  try {
    const [bugun, oy] = await Promise.all([sorov(bugunKuni, bugunKuni), sorov(oyBoshi, bugunKuni)]);
    return { bugun: backendXulosa(bugun), oy: backendXulosa(oy), manba: "backend", bugunKuni, oyBoshi };
  } catch (error) {
    if (!backendYoqmi(error)) throw error;
  }

  // Backend hisoboti yo'q: oy sotuvlari bir marta olinib, "bugun" ulardan ajratiladi.
  const sotuvlar = await tasdiqlanganSotuvlar(oyBoshi, bugunKuni);
  return {
    bugun: sotuvlardanXulosa(sotuvlar.filter((sotuv) => sotuvKuni(sotuv) === bugunKuni)),
    oy: sotuvlardanXulosa(sotuvlar),
    manba: "sotuvlar",
    bugunKuni,
    oyBoshi,
  };
}

// Sotuvlar ro'yxatidan kesim (kun / oy / kassir / mahsulot) bo'yicha qatorlar. Ular backend qatorlari bilan bir xil shaklda.
export function sotuvlardanQatorlar(
  sotuvlar: Sotuv[],
  guruh: DiscountReportGroupBy,
  responsibleId?: string,
): DiscountReportRow[] {
  const royxat = responsibleId ? sotuvlar.filter((sotuv) => sotuv.responsibleId === responsibleId) : sotuvlar;
  type Yig = { label: string; discountAmount: number; salesCount: number; discountedSalesCount: number; salesAmount: number };
  const xarita = new Map<string, Yig>();
  const yigish = (key: string, label: string) => {
    let qator = xarita.get(key);
    if (!qator) {
      qator = { label, discountAmount: 0, salesCount: 0, discountedSalesCount: 0, salesAmount: 0 };
      xarita.set(key, qator);
    }
    return qator;
  };

  royxat.forEach((sotuv) => {
    const kun = sotuvKuni(sotuv);
    if (guruh === "PRODUCT") {
      // Mahsulot kesimi uchun sotuv qatorlari (items) kerak; ro'yxat javobida ular bo'lmasa, bu kesim bo'sh qoladi.
      (sotuv.items ?? []).forEach((item) => {
        const nomi = item.modification?.product?.name ?? item.modification?.name ?? item.modificationId;
        const qator = yigish(item.modification?.product?.id ?? item.modificationId, nomi);
        const chegirma = raqam(item.discount);
        qator.salesCount += 1;
        if (chegirma > 0) qator.discountedSalesCount += 1;
        qator.discountAmount += chegirma;
        qator.salesAmount += raqam(item.quantity) * raqam(item.price) - chegirma;
      });
      return;
    }
    const [key, label] =
      guruh === "DAY"
        ? [kun, kun]
        : guruh === "MONTH"
          ? [kun.slice(0, 7), kun.slice(0, 7)]
          : guruh === "CUSTOMER"
            ? [sotuv.customerId ?? sotuv.clientCompanyId ?? "donalik", mijozNomi(sotuv)]
            : [sotuv.responsibleId ?? "-", masulNomi(sotuv)];
    const qator = yigish(key, label);
    const chegirma = sotuvChegirmaSummasi(sotuv);
    qator.salesCount += 1;
    if (chegirma > 0) qator.discountedSalesCount += 1;
    qator.discountAmount += chegirma;
    qator.salesAmount += sotuvSummasi(sotuv);
  });

  const qatorlar = [...xarita.entries()].map(([key, qator]) => ({ key, ...qator }));
  return guruh === "DAY" || guruh === "MONTH"
    ? qatorlar.sort((a, b) => a.key.localeCompare(b.key))
    : qatorlar;
}

export function xulosaSummaryga(xulosa: ChegirmaXulosa, sotuvSummasiJami: number): DiscountReportSummary {
  return {
    totalDiscount: xulosa.jami,
    discountedSalesCount: xulosa.chegirmaliSotuvlar,
    totalSalesCount: xulosa.sotuvlarSoni,
    totalSalesAmount: sotuvSummasiJami,
    avgDiscountPct: sotuvSummasiJami + xulosa.jami > 0 ? (xulosa.jami / (sotuvSummasiJami + xulosa.jami)) * 100 : 0,
  };
}
