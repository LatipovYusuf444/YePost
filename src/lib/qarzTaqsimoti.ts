// Mijoz to'lovi eng eski qarzdan yopiladi (FIFO). Backend javoblari uch shaklda keladi: tasdiqlashdagi `allocation`,
// oldindan ko'rishda ildizdagi `allocated` va hujjat tafsilotidagi `allocations[]` (savdo ichki obyekt bilan) —
// hammasi bitta `QarzTaqsimoti` ko'rinishiga keltiriladi. UI'siz, faqat tur importlari — testlarda to'g'ridan-to'g'ri ishlaydi.
import type { QarzTaqsimoti, QarzTaqsimotQatori } from "../types/qarzTaqsimoti.ts";

type Yozuv = Record<string, unknown>;
const yozuv = (value: unknown): Yozuv => (value && typeof value === "object" && !Array.isArray(value) ? (value as Yozuv) : {});
const son = (value: unknown) => {
  const raqam = Number(value);
  return Number.isFinite(raqam) ? raqam : 0;
};
const pulQiymati = (value: unknown): string | number | null => (typeof value === "string" || typeof value === "number" ? value : null);

export function taqsimotValyutasi(value: unknown): "UZS" | "USD" {
  return String(value ?? "").toUpperCase() === "USD" ? "USD" : "UZS";
}

/** Pul matni kassa formatida: so'm butun, dollar sentgacha. */
export function taqsimotSummasi(value: unknown, valyuta: unknown) {
  const kod = taqsimotValyutasi(valyuta);
  const matn = son(value).toLocaleString("uz-UZ", { maximumFractionDigits: kod === "USD" ? 2 : 0 });
  return kod === "USD" ? `$${matn}` : `${matn} so'm`;
}

/** "SOT-07839743" → "№07839743"; bo'sh bo'lsa "". */
export function qisqaHujjatRaqami(docNumber: unknown) {
  const matn = String(docNumber ?? "").trim();
  return matn ? `№${matn.replace(/^[A-Za-z]+-/, "")}` : "";
}

export const taqsimotQatoriRaqami = (qator: QarzTaqsimotQatori) => qator.docNumber ?? qator.sale?.docNumber ?? null;
export const taqsimotQatoriValyutasi = (qator: QarzTaqsimotQatori) => taqsimotValyutasi(qator.currency ?? qator.sale?.currency);
export const taqsimotQatoriBoshlangichmi = (qator: QarzTaqsimotQatori) => Boolean(qator.isOpeningDebt ?? qator.sale?.isOpeningDebt);

function qatorlarniOqish(value: unknown): QarzTaqsimotQatori[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const qator = yozuv(item);
    return typeof qator.saleId === "string" && qator.saleId ? [qator as unknown as QarzTaqsimotQatori] : [];
  });
}

/**
 * Tasdiqlash javobi (DTO yoki `{ data }` o'rovi) dagi `allocation`, oldindan ko'rishdagi ildiz `allocated`
 * yoki hujjat tafsilotidagi `allocations[]` (+ `accountAmount`, hisob valyutasi `settleCurrency`). Hech biri bo'lmasa null.
 */
export function taqsimotniOqish(raw: unknown): QarzTaqsimoti | null {
  const tashqi = yozuv(raw);
  const ichki = yozuv(tashqi.data);
  const manba = [tashqi.allocation, ichki.allocation, tashqi, ichki].map(yozuv).find((item) => Array.isArray(item.allocated));
  if (manba) {
    return {
      allocated: qatorlarniOqish(manba.allocated),
      toAccount: pulQiymati(manba.toAccount),
      accountCurrency: typeof manba.accountCurrency === "string" ? manba.accountCurrency : null,
      closedSales: Array.isArray(manba.closedSales) ? manba.closedSales.filter((id): id is string => typeof id === "string") : null,
    };
  }
  const hujjat = Array.isArray(tashqi.allocations) ? tashqi : Array.isArray(ichki.allocations) ? ichki : null;
  if (!hujjat) return null;
  const allocated = qatorlarniOqish(hujjat.allocations);
  const hisobga = pulQiymati(hujjat.accountAmount);
  if (allocated.length === 0 && !(son(hisobga) > 0)) return null;
  return {
    allocated,
    toAccount: hisobga,
    accountCurrency: typeof hujjat.settleCurrency === "string" ? hujjat.settleCurrency : null,
    closedSales: null,
  };
}

/** To'liq yopilgan savdolar: `closedSales` bo'lsa shu ro'yxat, bo'lmasa qoldig'i 0 ga tushgan qatorlar. */
export function yopilganQatorlar(taqsimot: QarzTaqsimoti) {
  const yopiq = new Set(taqsimot.closedSales ?? []);
  return taqsimot.allocated.filter((qator) =>
    taqsimot.closedSales ? yopiq.has(qator.saleId) : qator.debtRemaining != null && son(qator.debtRemaining) <= 0
  );
}

/**
 * Tasdiqlashdan keyingi xabar: "2 ta savdo yopildi: №07839743, №41633428" va "Hisobga: $0".
 * Hech narsa yopilmagan va hisobga pul tushmagan bo'lsa null.
 */
export function taqsimotXabari(taqsimot: QarzTaqsimoti | null, til = "uz"): { sarlavha: string; tafsilot: string } | null {
  if (!taqsimot) return null;
  const hisobga = son(taqsimot.toAccount);
  if (taqsimot.allocated.length === 0 && !(hisobga > 0)) return null;
  const ru = til === "ru";
  const yopilgan = yopilganQatorlar(taqsimot);
  const raqamlar = yopilgan.map((qator) => qisqaHujjatRaqami(taqsimotQatoriRaqami(qator))).filter(Boolean).join(", ");
  const qisman = taqsimot.allocated.length - yopilgan.length;
  const sarlavha =
    taqsimot.allocated.length === 0
      ? ru ? "Открытых долгов нет" : "Ochiq qarz yo'q"
      : yopilgan.length === 0
        ? ru ? `Долг погашен частично: ${qisman}` : `Qarz qisman yopildi: ${qisman} ta`
        : ru
          ? `Закрыто продаж: ${yopilgan.length}${raqamlar ? ` (${raqamlar})` : ""}`
          : `${yopilgan.length} ta savdo yopildi${raqamlar ? `: ${raqamlar}` : ""}`;
  const tafsilot = [
    ...(yopilgan.length > 0 && qisman > 0 ? [ru ? `частично: ${qisman}` : `qisman: ${qisman} ta`] : []),
    `${ru ? "На счёт" : "Hisobga"}: ${taqsimotSummasi(hisobga, taqsimot.accountCurrency)}`,
  ].join(" · ");
  return { sarlavha, tafsilot };
}
