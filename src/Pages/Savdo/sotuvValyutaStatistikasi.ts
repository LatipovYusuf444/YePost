import type { Sotuv } from "../../types/savdo";
import { toshkentKuni } from "../../lib/hujjatSanasi.ts";

type Valyuta = "UZS" | "USD";
type Toliqlik = "savdoToliq" | "tolovToliq" | "qarzToliq";

function son(value: unknown): number | null {
  if (value === undefined || value === null || value === "" || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function valyuta(value: string | null | undefined, fallback: Valyuta | null = "UZS"): Valyuta | null {
  if (!value) return fallback;
  const code = value.toUpperCase();
  return code === "UZS" || code === "USD" ? code : null;
}

function boshNatija() {
  return { savdo: 0, tolov: 0, qarz: 0, qaytim: 0, savdoSoni: 0, qarzdorSotuvlar: 0, savdoToliq: true, tolovToliq: true, qarzToliq: true };
}

export function sotuvValyutaStatistikasi(
  sotuvlar: Sotuv[], dan: string, gacha: string,
  sanaOlish: (sotuv: Sotuv) => string | undefined = (sotuv) => sotuv.date ?? sotuv.createdAt,
) {
  const result = { UZS: boshNatija(), USD: boshNatija() };
  const notoliq = (key: Toliqlik) => { result.UZS[key] = false; result.USD[key] = false; };
  const davrda = (day: string) => (!dan || day >= dan) && (!gacha || day <= gacha);
  const idlar = new Set<string>();
  const tolovIdlar = new Set<string>();

  for (const sale of sotuvlar) {
    if (idlar.has(sale.id)) continue;
    idlar.add(sale.id);
    if (String(sale.status).toUpperCase() !== "CONFIRMED") continue;
    const currency = valyuta(sale.currency);
    const day = toshkentKuni(sanaOlish(sale));
    const saleInPeriod = day ? davrda(day) : !dan && !gacha;
    if (!day && (dan || gacha)) {
      if (!sale.isOpeningDebt) notoliq("savdoToliq");
      notoliq("qarzToliq");
    }

    if (saleInPeriod) {
      const debt = son(sale.debtAmount);
      if (currency && debt !== null) {
        result[currency].qarz += debt;
        if (debt > 0) result[currency].qarzdorSotuvlar++;
      } else notoliq("qarzToliq");

      if (!sale.isOpeningDebt) {
        const amounts = { UZS: 0, USD: 0 };
        const entries = Object.entries(sale.totalsByCurrency ?? {});
        if (entries.length > 0) {
          for (const [key, value] of entries) {
            const code = valyuta(key);
            const amount = son(value);
            if (!code || amount === null) notoliq("savdoToliq");
            else amounts[code] += amount;
          }
        } else if (Array.isArray(sale.items) && (sale.items.length > 0 || son(sale.totalAmount ?? sale.total) === 0)) {
          for (const item of sale.items) {
            const code = valyuta(item.currency, currency);
            const quantity = son(item.quantity);
            const price = son(item.price);
            const discount = item.discount == null ? 0 : son(item.discount);
            const amount = item.total != null ? son(item.total) : quantity !== null && price !== null && discount !== null ? quantity * price - discount : null;
            if (!code || amount === null || amount < 0) notoliq("savdoToliq");
            else amounts[code] += amount;
          }
        } else notoliq("savdoToliq");
        for (const code of ["UZS", "USD"] as const) {
          result[code].savdo += amounts[code];
          if (amounts[code] > 0) result[code].savdoSoni++;
        }
      }
    }

    // To'lov kuni sotuv kunidan mustaqil: eski sotuvga bugun kelgan pul ham hisoblanadi.
    if (!Array.isArray(sale.payments) || (sale.payments.length === 0 && Number(sale.paidAmount) > 0)) {
      notoliq("tolovToliq");
      continue;
    }
    for (const payment of sale.payments) {
      const type = String(payment.paymentType).toUpperCase();
      if (type === "BALANCE" || type === "DEBT") continue;
      if (!["CASH", "CARD", "BANK"].includes(type)) { notoliq("tolovToliq"); continue; }
      const paidDay = toshkentKuni(payment.date ?? payment.paidAt ?? payment.createdAt);
      if (!paidDay && (dan || gacha)) { notoliq("tolovToliq"); continue; }
      if (paidDay && !davrda(paidDay)) continue;
      if (payment.id && tolovIdlar.has(payment.id)) continue;
      if (payment.id) tolovIdlar.add(payment.id);
      const code = valyuta(payment.currency, currency);
      const amount = son(payment.amount);
      if (!code || amount === null) { notoliq("tolovToliq"); continue; }
      result[code].tolov += amount;
      // Qaytim so'mda: dollar tushumidan ayirilmaydi va alohida ko'rsatiladi.
      const change = payment.changeAmount == null ? 0 : son(payment.changeAmount);
      if (change === null) notoliq("tolovToliq");
      else result.UZS.qaytim += change;
    }
  }

  for (const group of Object.values(result)) {
    for (const key of ["savdo", "tolov", "qarz", "qaytim"] as const) group[key] = Math.round((group[key] + Number.EPSILON) * 100) / 100;
  }
  return result;
}

export function statistikaTafsilotiKerak(sale: Sotuv) {
  if (String(sale.status).toUpperCase() !== "CONFIRMED") return false;
  return !Array.isArray(sale.payments) || (sale.payments.length === 0 && Number(sale.paidAmount) > 0)
    || (!sale.isOpeningDebt && !Object.keys(sale.totalsByCurrency ?? {}).length && !Array.isArray(sale.items));
}

export async function statistikaTafsilotlariniYuklash(sotuvlar: Sotuv[], olish: (id: string) => Promise<Sotuv>) {
  const result = [...sotuvlar];
  const indices = sotuvlar.flatMap((sale, i) => statistikaTafsilotiKerak(sale) ? [i] : []);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, indices.length) }, async () => {
    while (next < indices.length) {
      const index = indices[next++];
      try {
        const detail = await olish(sotuvlar[index].id);
        if (detail.id === sotuvlar[index].id) result[index] = { ...sotuvlar[index], ...detail };
      } catch {
        // Tafsilot olinmasa ma'lumot to'liq deb belgilanmaydi; kartada soxta nol chiqmaydi.
      }
    }
  }));
  return result;
}
