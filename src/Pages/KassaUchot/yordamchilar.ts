import type { KassaKanali, KassaYonalishi } from "./types";

export const maydonKlass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100";

export function yangiId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function hozir() {
  const sana = new Date();
  const offset = new Date(sana.getTime() - sana.getTimezoneOffset() * 60000);
  return offset.toISOString().slice(0, 16); // datetime-local uchun
}

// Keyingi hujjat raqami: FP1, FP2, ... — mavjudlardagi eng katta FP raqamdan +1.
export function keyingiRaqam(amaliyotlar: { raqam: string }[]) {
  let engKatta = 0;
  for (const a of amaliyotlar) {
    const mos = /^FP(\d+)$/.exec(a.raqam);
    if (mos) engKatta = Math.max(engKatta, Number(mos[1]));
  }
  return `FP${engKatta + 1}`;
}

export function summaFormat(summa: number) {
  return `${Math.round(summa).toLocaleString("uz-UZ")} so'm`;
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

export const kanalMatni: Record<KassaKanali, string> = {
  naqd: "Naqd",
  bank: "Bank",
  ilova: "Ilova",
};

export const yonalishMatni: Record<KassaYonalishi, string> = {
  tushum: "Tushum",
  chiqim: "Chiqim",
};

export const amaliyotTuriMatni: Record<import("./types").KassaAmaliyotTuri, string> = {
  xaridor_tolovi: "Mijozdan to'lov",
  hisobdor_qaytardi: "Hisobdor shaxs mablag'ini qaytarish",
  taminotchi_qaytardi: "Yetkazib beruvchi mablag'ini qaytarishi",
  boshqa_kirim: "Boshqa pul mablag'lari tushumi",
  donalik_savdo: "Donalik savdo",
  taminot_tolovi: "Yetkazib beruvchiga to'lov",
  xaridorga_qaytarish: "Xaridorga pul mablag'larini qaytarish",
  ish_haqi: "Ish haqini to'lash",
  boshqa_chiqim: "Boshqa pul xarajatlari",
  xarajat: "Xarajat",
};

// Har turning yo'nalishi (kirim yoki chiqim).
export const turYonalishi: Record<import("./types").KassaAmaliyotTuri, KassaYonalishi> = {
  xaridor_tolovi: "tushum",
  hisobdor_qaytardi: "tushum",
  taminotchi_qaytardi: "tushum",
  boshqa_kirim: "tushum",
  donalik_savdo: "tushum",
  taminot_tolovi: "chiqim",
  xaridorga_qaytarish: "chiqim",
  ish_haqi: "chiqim",
  boshqa_chiqim: "chiqim",
  xarajat: "chiqim",
};

// Turga qarab qaysi tomon ko'rsatiladi: mijoz / xodim / yetkazib beruvchi.
export function partiyaTuri(
  turi: import("./types").KassaAmaliyotTuri
): "xaridor" | "xodim" | "yetkazib" | null {
  if (turi === "xaridor_tolovi" || turi === "xaridorga_qaytarish") return "xaridor";
  if (turi === "hisobdor_qaytardi" || turi === "ish_haqi") return "xodim";
  if (turi === "taminotchi_qaytardi" || turi === "taminot_tolovi") return "yetkazib";
  return null;
}

// Izoh (kommentariya) majburiy bo'lgan turlar.
export function izohMajburiy(turi: import("./types").KassaAmaliyotTuri) {
  return turi === "boshqa_chiqim";
}
