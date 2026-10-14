import type { FoydaXarajatYozuvi } from "./types";
import { hisobotValyutasiniTekshirish, type HisobotValyutasi } from "./hisobotValyutasi.ts";

type Pul = number | string;
export type IncomeExpenseResponse = {
  income?: { saleRevenue?: Pul; otherIncome?: Pul; supplierBonus?: Pul; returns?: Pul; total?: Pul };
  cost?: { costOfGoods?: Pul };
  expenses?: { items?: Array<{ category?: string; name?: string; amount?: Pul }>; refunds?: Pul; total?: Pul };
  summary?: { revenue?: Pul; cost?: Pul; grossProfit?: Pul; expense?: Pul; netProfit?: Pul; currency?: string };
};

function son(value: Pul | undefined, nom: string) {
  if (value === undefined || value === null || String(value).trim() === "" || !Number.isFinite(Number(value))) {
    throw new Error(`Hisobotda ${nom} summasi yo'q yoki noto'g'ri.`);
  }
  return Number(value);
}

/** Backend jami summalari asosiy manba; tafsilotlar va formulalar ular bilan tekshiriladi. */
export function foydaXarajatniMoslash(value: IncomeExpenseResponse, sana: string, kutilgan?: HisobotValyutasi) {
  const valyuta = hisobotValyutasiniTekshirish(value.summary?.currency, kutilgan);
  const birlik = valyuta === "USD" ? 0.01 : 1;
  // Har maydon mustaqil yaxlitlanadi: n ta operand va natija uchun eng ko'p (n+1)/2 birlik farq.
  const aniqlik = (operandlar: number) => (operandlar + 1) * birlik / 2 + 1e-7;
  const mos = (a: number, b: number, nom: string, operandlar = 1) => {
    if (Math.abs(a - b) > aniqlik(operandlar)) throw new Error(`Backend hisobotida ${nom} summalari mos kelmadi.`);
  };
  const daromad = son(value.income?.saleRevenue ?? value.summary?.revenue, "tushum");
  const tannarx = son(value.cost?.costOfGoods ?? value.summary?.cost, "tannarx");
  const boshqa = son(value.income?.otherIncome ?? 0, "boshqa daromad");
  const bonus = son(value.income?.supplierBonus ?? 0, "bonus");
  const qaytarilgan = son(value.income?.returns ?? 0, "qaytarish");
  if (bonus < 0 || bonus > Math.max(boshqa, 0) + aniqlik(1)) throw new Error("Backend bonusi boshqa daromad jami bilan mos kelmadi.");
  const qator = (id: string, tur: FoydaXarajatYozuvi["tur"], kategoriya: string, summa: number): FoydaXarajatYozuvi => ({ id, tur, kategoriya, summa, sana, filialId: "" });
  const xarajatlar = (value.expenses?.items ?? []).map((item, index) => qator(`expense-${index}`, "xarajat", item.name || item.category || "Xarajat", son(item.amount, "xarajat")));
  const refunds = son(value.expenses?.refunds ?? 0, "qaytarilgan pul");
  // CUSTOMER_REFUND savdo qaytarishidan alohida; expenses.total = items + refunds.
  if (refunds !== 0) xarajatlar.push(qator("refunds", "xarajat", "Mijozga kassadan qaytarilgan pul", refunds));
  const tafsilotJami = xarajatlar.reduce((sum, row) => sum + row.summa, 0);
  const jami = value.expenses?.total ?? value.summary?.expense;
  const xarajat = son(jami ?? tafsilotJami, "jami xarajat");
  const qoldiq = xarajat - tafsilotJami;
  const yaxlitlashFarqi = Math.abs(qoldiq) <= aniqlik(xarajatlar.length);
  if (qoldiq < 0 && !yaxlitlashFarqi) throw new Error("Backend xarajat tafsilotlari jami bilan mos kelmadi.");
  if (Math.abs(qoldiq) > 1e-8) xarajatlar.push(qator(yaxlitlashFarqi ? "expense-rounding" : "expense-unallocated", "xarajat", yaxlitlashFarqi ? "Yaxlitlash farqi" : "Tafsiloti berilmagan xarajatlar", qoldiq));
  const summary = value.summary;
  const jamiDaromad = son(value.income?.total ?? daromad + boshqa, "jami daromad");
  const yalpi = son(summary?.grossProfit ?? daromad - tannarx, "yalpi foyda");
  const sof = son(summary?.netProfit ?? jamiDaromad - tannarx - xarajat, "sof foyda");
  if (summary?.revenue !== undefined) mos(daromad, son(summary.revenue, "tushum"), "tushum");
  if (summary?.cost !== undefined) mos(tannarx, son(summary.cost, "tannarx"), "tannarx");
  mos(daromad + boshqa, jamiDaromad, "jami daromad", 2);
  if (summary?.expense !== undefined) mos(xarajat, son(summary.expense, "xarajat"), "xarajat");
  mos(daromad - tannarx, yalpi, "yalpi foyda", 2);
  mos(jamiDaromad - tannarx - xarajat, sof, "sof foyda", 3);
  return {
    valyuta, qaytarilgan, boshqaDaromad: { jami: boshqa, zavodBonusi: bonus },
    jami: { daromad, tannarx, xarajat, yalpi, boshqa, sof, jamiDaromad },
    qatorlar: [qator("saleRevenue", "daromad", "Savdo tushumi (sof)", daromad), qator("saleCost", "tannarx", "Sotilgan tovar tannarxi", tannarx), ...xarajatlar].filter(row => row.summa !== 0),
  };
}
