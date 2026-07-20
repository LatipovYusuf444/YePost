import type { KirimHolati, SavdoHolati, TolovTuri, Xaridor, XaridorKompaniyasi } from "./types";

export const maydonKlass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100";

export function yangiId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function bugun() {
  return new Date().toISOString().slice(0, 10);
}

export function summaFormat(summa: number) {
  return `${Math.round(summa).toLocaleString("uz-UZ")} so'm`;
}

export function xaridorNomi(xaridor: Xaridor) {
  return [xaridor.familiya, xaridor.ism].filter(Boolean).join(" ");
}

export function asosiyTelefon(xaridor: Xaridor) {
  return xaridor.telefonlar.find((telefon) => telefon.trim()) ?? "";
}

export function kompaniyaNomi(kompaniyalar: XaridorKompaniyasi[], kompaniyaId: string) {
  return kompaniyalar.find((item) => item.id === kompaniyaId)?.nomi ?? "";
}

export function qisqaVaqt(sana: string) {
  const vaqt = new Date(sana);
  if (Number.isNaN(vaqt.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(vaqt);
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

export const savdoHolatMatni: Record<SavdoHolati, string> = {
  qoralama: "Qoralama",
  tolangan: "To'langan",
  qarzdor: "Qarzdorlik",
  bekor: "Bekor qilingan",
};

export const savdoHolatRangi: Record<SavdoHolati, string> = {
  qoralama: "bg-slate-100 text-slate-600",
  tolangan: "bg-emerald-50 text-emerald-600",
  qarzdor: "bg-orange-50 text-orange-600",
  bekor: "bg-red-50 text-red-500",
};

export const tolovTuriMatni: Record<TolovTuri, string> = {
  naqd: "Naqd",
  karta: "Karta",
  bank: "Bank o'tkazmasi",
};

export const kirimHolatMatni: Record<KirimHolati, string> = {
  qabul: "Qabul qilingan",
  kutilmoqda: "Kutilmoqda",
  bekor: "Bekor qilingan",
};

export const kirimHolatRangi: Record<KirimHolati, string> = {
  qabul: "bg-emerald-50 text-emerald-600",
  kutilmoqda: "bg-orange-50 text-orange-600",
  bekor: "bg-red-50 text-red-500",
};
