// Kassa uchoti jadvali uchun: tushum/chiqim raqamlari (K1, K2, ...) va sotuv to'lovining tushunarli nomi (qaysi sotuv, qaysi mahsulotlar).
// UI'siz yozilgan — alohida sinash mumkin.
import { toshkentKuni } from "./hujjatSanasi.ts";

export type RaqamlanadiganQator = {
  id: string;
  kanal: string;
  yonalish: string;
  /** Amaliyot sanasi (ISO yoki YYYY-MM-DD). */
  sana: string;
  /** Yozuv kiritilgan vaqt (ISO); bo'lmasa sana vaqti ishlatiladi. */
  kiritilgan?: string;
};

const vaqtQiymati = (qiymat?: string | null) => {
  const vaqt = qiymat ? Date.parse(qiymat) : NaN;
  return Number.isFinite(vaqt) ? vaqt : 0;
};

/** Eskisi birinchi: avval Toshkent kuni, keyin kiritilgan vaqt, oxirida id (tartib har safar bir xil chiqishi uchun). */
export function kassaTartibi(a: RaqamlanadiganQator, b: RaqamlanadiganQator): number {
  const kunA = toshkentKuni(a.sana);
  const kunB = toshkentKuni(b.sana);
  if (kunA !== kunB) return kunA < kunB ? -1 : 1;
  return vaqtQiymati(a.kiritilgan ?? a.sana) - vaqtQiymati(b.kiritilgan ?? b.sana) || a.id.localeCompare(b.id);
}

/**
 * Har bir bo'limda (to'lov turi + tushum/chiqim) eng eski amaliyot K1, keyingisi K2 va hokazo. Raqam qidiruv yoki tanlangan bo'limga bog'liq emas:
 * ro'yxatning o'zi o'zgarmasa, har bir amaliyot doim bir xil raqam oladi (bekor qilingan va qoralamalar ham hisobga kiradi).
 */
export function kassaRaqamlari(qatorlar: readonly RaqamlanadiganQator[]): Map<string, string> {
  const bolimlar = new Map<string, RaqamlanadiganQator[]>();
  for (const qator of qatorlar) {
    const kalit = `${qator.kanal}:${qator.yonalish}`;
    const bolim = bolimlar.get(kalit);
    if (bolim) bolim.push(qator);
    else bolimlar.set(kalit, [qator]);
  }
  const raqamlar = new Map<string, string>();
  for (const bolim of bolimlar.values()) {
    [...bolim].sort(kassaTartibi).forEach((qator, indeks) => raqamlar.set(qator.id, `K${indeks + 1}`));
  }
  return raqamlar;
}

/** Sotuv qatori: mahsulot nomi `modification.product.name`da (variant nomi — zaxira). */
export type SotuvQatoriNomi = { modification?: { name?: string | null; product?: { name?: string | null } | null } | null };

/** Sotuvdagi mahsulot nomlari, kelish tartibida, takrorlarsiz (bir mahsulotning bir nechta varianti bitta bo'lib chiqadi). */
export function sotuvMahsulotNomlari(qatorlar: readonly SotuvQatoriNomi[] | null | undefined): string[] {
  const nomlar: string[] = [];
  for (const qator of qatorlar ?? []) {
    const nom = (qator.modification?.product?.name ?? qator.modification?.name ?? "").trim();
    if (nom && !nomlar.includes(nom)) nomlar.push(nom);
  }
  return nomlar;
}

/** Jadval katagiga sig'adigan miqdorda nom: birinchi `chegara` ta ko'rsatiladi, qolgani `yana` sonida. */
export function mahsulotlarQisqacha(nomlar: readonly string[], chegara = 3): { korinadi: string[]; yana: number } {
  return { korinadi: nomlar.slice(0, chegara), yana: Math.max(nomlar.length - chegara, 0) };
}

/** Sotuv hujjat raqami: backend `number`, `documentNumber` yoki `docNumber`dan birini qaytaradi (SOT-000014). */
export function sotuvHujjatRaqami(sotuv: { number?: string | null; documentNumber?: string | null; docNumber?: string | null } | null | undefined): string {
  return [sotuv?.documentNumber, sotuv?.docNumber, sotuv?.number].find((qiymat) => typeof qiymat === "string" && qiymat.trim())?.trim() ?? "";
}
