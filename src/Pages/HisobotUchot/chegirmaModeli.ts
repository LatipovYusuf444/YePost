// Chegirmalar hisoboti: backend qatorlarini jadval qatoriga o'girish (UI'siz va `@/` importlarisiz — testlarda ishlaydi).
// GET /reports/discounts (23.11 dan): `discountAmount` — faqat qatorlardagi chegirma, `receiptDiscount` — chek chegirmasi.
// Jadvaldagi jami chegirma — ikkalasining yig'indisi; `discountPct` backendda ikkalasini hisobga oladi.
import type { DiscountReportGroupBy, DiscountReportRow } from "../../types/reports.ts";

export type Qator = {
  id: string;
  nomi: string;
  sotuvlarSoni: number;
  chegirmaliSotuvlar: number;
  sotuvSummasi: number;
  // Qatorlardagi chegirma (discountAmount) va chek chegirmasi (receiptDiscount); `chegirma` — ikkalasining yig'indisi.
  qatorChegirmasi: number;
  chekChegirmasi: number;
  chegirma: number;
  foiz: number;
  // Zavod bonusi (faqat kun/oy kesimida).
  bonus: number;
};

export const raqam = (value: unknown) => {
  const natija = Number(value ?? 0);
  return Number.isFinite(natija) ? natija : 0;
};

// Backend sana yoki oyni ISO ("2026-10-05", "2026-10") ko'rinishida qaytarsa, o'qishga qulay qilinadi.
export function sarlavhaMatni(label: string, guruh: DiscountReportGroupBy) {
  if (guruh === "DAY") {
    const mos = /^(\d{4})-(\d{2})-(\d{2})/.exec(label);
    if (mos) return `${mos[3]}.${mos[2]}.${mos[1]}`;
  }
  if (guruh === "MONTH") {
    const mos = /^(\d{4})-(\d{2})/.exec(label);
    if (mos) return `${mos[2]}.${mos[1]}`;
  }
  return label;
}

export function qatorlarniOlish(royxat: DiscountReportRow[], guruh: DiscountReportGroupBy): Qator[] {
  return royxat.map((item, index) => {
    const qatorChegirmasi = raqam(item.discountAmount);
    const chekChegirmasi = raqam(item.receiptDiscount);
    const chegirma = qatorChegirmasi + chekChegirmasi;
    const sotuvSummasi = raqam(item.salesAmount);
    const label = String(item.label ?? item.key ?? "").trim();
    return {
      id: String(item.key ?? item.label ?? `chegirma-${index}`),
      nomi: label ? sarlavhaMatni(label, guruh) : "—",
      sotuvlarSoni: raqam(item.salesCount),
      chegirmaliSotuvlar: raqam(item.discountedSalesCount ?? item.salesCount),
      sotuvSummasi,
      qatorChegirmasi,
      chekChegirmasi,
      chegirma,
      bonus: raqam(item.bonusAmount),
      // Foiz backenddan kelmasa, chegirmagacha bo'lgan summaga nisbatan hisoblanadi.
      foiz: item.discountPct != null
        ? raqam(item.discountPct)
        : sotuvSummasi + chegirma > 0 ? (chegirma / (sotuvSummasi + chegirma)) * 100 : 0,
    };
  });
}
