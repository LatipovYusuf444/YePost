// Hisobot UI yordamchilari.

export function pul(summa: number) {
  return `${Math.round(summa).toLocaleString("uz-UZ")} so'm`;
}

export function son(qiymat: number) {
  return qiymat.toLocaleString("uz-UZ");
}

export function bugun() {
  return new Date().toISOString().slice(0, 10);
}

export function bugunMinus(kun: number) {
  const sana = new Date();
  sana.setDate(sana.getDate() - kun);
  return sana.toISOString().slice(0, 10);
}

export function oyBoshi() {
  const sana = new Date();
  sana.setDate(1);
  return sana.toISOString().slice(0, 10);
}

// N oy oldingi oyning 1-sanasi (masalan oyBoshiMinus(2) → 3 oylik davr boshi).
export function oyBoshiMinus(oy: number) {
  const sana = new Date();
  sana.setDate(1);
  sana.setMonth(sana.getMonth() - oy);
  return sana.toISOString().slice(0, 10);
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
  const kun = sana.slice(0, 10);
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
