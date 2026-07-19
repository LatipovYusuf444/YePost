import type { DavomatHolati, Lavozim, Xodim, XodimHolati } from "./types";

export const maydonKlass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100";

export function yangiId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function bugun() {
  return new Date().toISOString().slice(0, 10);
}

export function summaFormat(summa: number) {
  return `${Math.round(summa).toLocaleString("uz-UZ")} so'm`;
}

export function xodimNomi(xodim: Xodim) {
  return [xodim.familiya, xodim.ism].filter(Boolean).join(" ");
}

export function bosHarflar(xodim: Xodim) {
  return [xodim.ism, xodim.familiya]
    .map((qism) => qism.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .join("");
}

export function asosiyTelefon(xodim: Xodim) {
  return xodim.telefonlar.find((telefon) => telefon.trim()) ?? "";
}

export function lavozimNomi(lavozimlar: Lavozim[], lavozimId: string) {
  return lavozimlar.find((item) => item.id === lavozimId)?.nomi ?? "";
}

// Xodimning haqiqiy vakolatlari = lavozim vakolatlari + shaxsiy vakolatlar.
export function xodimVakolatlari(xodim: Xodim, lavozimlar: Lavozim[]) {
  const lavozim = lavozimlar.find((item) => item.id === xodim.lavozimId);
  return new Set([...(lavozim?.vakolatlar ?? []), ...xodim.vakolatlar]);
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

// "09:02" va "18:15" orasidagi ish soati (masalan 9.2).
export function ishSoati(kelgan: string, ketgan: string) {
  const daqiqa = (vaqt: string) => {
    const [soat, min] = vaqt.split(":").map(Number);
    return Number.isFinite(soat) && Number.isFinite(min) ? soat * 60 + min : null;
  };
  const boshi = daqiqa(kelgan);
  const oxiri = daqiqa(ketgan);
  if (boshi === null || oxiri === null || oxiri <= boshi) return 0;
  return Math.round(((oxiri - boshi) / 60) * 10) / 10;
}

export const holatMatni: Record<XodimHolati, string> = {
  faol: "Faol",
  tatilda: "Ta'tilda",
  "ishdan-ketgan": "Ishdan ketgan",
};

export const holatRangi: Record<XodimHolati, string> = {
  faol: "bg-emerald-50 text-emerald-600",
  tatilda: "bg-orange-50 text-orange-600",
  "ishdan-ketgan": "bg-slate-100 text-slate-500",
};

export const davomatMatni: Record<DavomatHolati, string> = {
  keldi: "Keldi",
  kechikdi: "Kechikdi",
  kelmadi: "Kelmadi",
  tatil: "Ta'til",
};

export const davomatRangi: Record<DavomatHolati, string> = {
  keldi: "bg-emerald-50 text-emerald-600",
  kechikdi: "bg-orange-50 text-orange-600",
  kelmadi: "bg-red-50 text-red-500",
  tatil: "bg-sky-50 text-sky-600",
};
