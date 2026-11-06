// Hisobot UI yordamchilari.
import { bugungiToshkentKuni, kunniSurish, toshkentKuni } from "@/lib/hujjatSanasi";
import { pulMatni } from "@/lib/valyuta";

export function pul(summa: number) {
  return pulMatni(summa, "UZS", true);
}

export function son(qiymat: number) {
  return qiymat.toLocaleString("uz-UZ");
}

// "Bugun" va davr chegaralari Toshkent kuni bo'yicha (M3): UTC bo'yicha olinsa 00:00–05:00 da kechagi kun chiqardi.
export function bugun() {
  return bugungiToshkentKuni();
}

export function bugunMinus(kun: number) {
  return kunniSurish(bugungiToshkentKuni(), -kun);
}

export function oyBoshi() {
  return `${bugungiToshkentKuni().slice(0, 7)}-01`;
}

// N oy oldingi oyning 1-sanasi (masalan oyBoshiMinus(2) → 3 oylik davr boshi).
export function oyBoshiMinus(oy: number) {
  const [yil, oyRaqami] = bugungiToshkentKuni().split("-").map(Number);
  return new Date(Date.UTC(yil, oyRaqami - 1 - oy, 1)).toISOString().slice(0, 10);
}

const OY_NOMLARI = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

// "2026-05" → oylar ro'yxati (davr ichidagi har bir oy).
export function oylarRoyxati(dateFrom: string, dateTo: string) {
  const royxat: string[] = [];
  if (!dateFrom || !dateTo) return royxat;
  const [fy, fm] = dateFrom.slice(0, 7).split("-").map(Number);
  const [ty, tm] = dateTo.slice(0, 7).split("-").map(Number);
  let yil = fy;
  let oy = fm;
  while (yil < ty || (yil === ty && oy <= tm)) {
    royxat.push(`${yil}-${String(oy).padStart(2, "0")}`);
    oy += 1;
    if (oy > 12) {
      oy = 1;
      yil += 1;
    }
  }
  return royxat;
}

// "2026-05" → "May" (yilKorsat bo'lsa "May 26")
export function oyNomi(oyKaliti: string, yilKorsat = false) {
  const [yil, oy] = oyKaliti.split("-").map(Number);
  const nom = OY_NOMLARI[oy - 1] ?? oyKaliti;
  return yilKorsat ? `${nom} ${String(yil).slice(2)}` : nom;
}

// Sana oralig'iga tushadimi (dateFrom/dateTo "" bo'lsa cheklamaydi).
export function sanadaMi(sana: string, dateFrom: string, dateTo: string) {
  // ISO vaqt (UTC) Toshkent kuniga o'giriladi; "YYYY-MM-DD" o'zgarishsiz.
  const kun = toshkentKuni(sana) || sana.slice(0, 10);
  if (dateFrom && kun < dateFrom) return false;
  if (dateTo && kun > dateTo) return false;
  return true;
}

export function sanaFormat(sana: string) {
  const vaqt = new Date(sana);
  if (Number.isNaN(vaqt.getTime())) return sana;
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(vaqt);
}

export function vaqtFormat(sana: string) {
  const vaqt = new Date(sana);
  if (Number.isNaN(vaqt.getTime())) return sana;
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(vaqt);
}

export const auditActionRangi: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-600",
  UPDATE: "bg-orange-50 text-orange-600",
  DELETE: "bg-red-50 text-red-500",
};
