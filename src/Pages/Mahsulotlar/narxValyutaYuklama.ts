// Mahsulot formasi: narx va uning valyutalarini backendga yuborish/o'qish. Har bir narxning o'z valyutasi bor
// (costCurrency / retailCurrency / wholesaleCurrency). UI yo'q — alohida sinash mumkin.
import { narxValyutalari, type NarxValyutaManbasi, type NarxValyutasi } from "../../lib/narxValyutasi.ts";
import { asosiyValyuta } from "../../lib/asosiyValyuta.ts";

export type NarxQoralamasi = {
  costPrice: string;
  costCurrency: NarxValyutasi;
  retailPrice: string;
  retailCurrency: NarxValyutasi;
  wholesalePrice: string;
  wholesaleCurrency: NarxValyutasi;
};

/**
 * Narx majburiy emas: hech bir narx maydoni to'ldirilmagan bo'lsa narx umuman yuborilmaydi
 * (aks holda backendga 0 ketib, "Narx mavjud emas" o'rniga "0" saqlanib qolardi).
 * Ulgurji narx kiritilmasa chakana narx nusxalanadi — valyutasi ham chakana narxniki bo'ladi.
 * `yagona` — bir valyutali rejim valyutasi (Faqat so'm / Faqat dollar): berilsa uchala narx ham shu valyutada yuboriladi
 * (boshqa valyutani backend `errors.currency.not_allowed` bilan rad etadi). Ikki valyuta rejimida `null`/berilmaydi.
 */
export function narxYigish(qoralama?: NarxQoralamasi, yagona?: NarxValyutasi | null) {
  if (!qoralama || (!qoralama.costPrice && !qoralama.retailPrice && !qoralama.wholesalePrice)) return undefined;
  const ulgurjiKiritilgan = Boolean(qoralama.wholesalePrice);
  return {
    costPrice: Number(qoralama.costPrice || 0),
    costCurrency: yagona ?? qoralama.costCurrency ?? asosiyValyuta(),
    retailPrice: Number(qoralama.retailPrice || 0),
    retailCurrency: yagona ?? qoralama.retailCurrency ?? asosiyValyuta(),
    wholesalePrice: Number(qoralama.wholesalePrice || qoralama.retailPrice || 0),
    wholesaleCurrency: yagona ?? (ulgurjiKiritilgan ? (qoralama.wholesaleCurrency ?? asosiyValyuta()) : (qoralama.retailCurrency ?? asosiyValyuta())),
  };
}

/**
 * Mavjud narxdagi har bir narxning valyutasi (tahrirlashda forma shundan boshlanadi). Bir valyutali rejimda (`yagona`) forma
 * doim rejim valyutasidan boshlanadi — boshqa valyutada saqlangan narx shu valyutaga o'tadi (`rejimgaMosEmasNarx` bilan ogohlantiriladi).
 */
export function narxQoralamaValyutalari(narx?: NarxValyutaManbasi | null, yagona?: NarxValyutasi | null) {
  if (yagona) return { costCurrency: yagona, retailCurrency: yagona, wholesaleCurrency: yagona };
  const valyutalar = narxValyutalari(narx);
  return { costCurrency: valyutalar.cost, retailCurrency: valyutalar.retail, wholesaleCurrency: valyutalar.wholesale };
}

/** Bir valyutali rejimda saqlangan narxning birorta qismi boshqa valyutada bo'lsa `true` (summani tekshirish haqida ogohlantirish uchun). */
export function rejimgaMosEmasNarx(narx: NarxValyutaManbasi | null | undefined, yagona: NarxValyutasi | null | undefined) {
  if (!yagona || !narx) return false;
  const valyutalar = narxValyutalari(narx);
  return valyutalar.cost !== yagona || valyutalar.retail !== yagona || valyutalar.wholesale !== yagona;
}

type NarxRaqamlari = { costPrice?: number | string | null; retailPrice?: number | string | null; wholesalePrice?: number | string | null };

/**
 * Bir valyutali rejimda boshqa valyutada saqlangan narxning raqamlari tahrirda o'zgartirilmagan bo'lsa `true` — bunday narx
 * qayta yuborilmaydi (aks holda faqat nomi tuzatilgan mahsulotning eski 9 000 so'mlik narxi jimgina $9 000 bo'lib qolardi).
 */
export function ozgarmaganBoshqaValyutaNarx(
  narx: NarxRaqamlari,
  saqlangan: (NarxValyutaManbasi & NarxRaqamlari) | null | undefined,
  yagona: NarxValyutasi | null | undefined,
) {
  if (!saqlangan || !rejimgaMosEmasNarx(saqlangan, yagona)) return false;
  const teng = (a?: number | string | null, b?: number | string | null) => Number(a || 0) === Number(b || 0);
  return teng(narx.costPrice, saqlangan.costPrice)
    && teng(narx.retailPrice, saqlangan.retailPrice)
    && teng(narx.wholesalePrice, saqlangan.wholesalePrice);
}

export type NarxMaydoni = "costPrice" | "retailPrice" | "wholesalePrice";
const NARX_MAYDONI_VALYUTASI = { costPrice: "cost", retailPrice: "retail", wholesalePrice: "wholesale" } as const;

/**
 * Bir valyutali rejimda narxning faqat bir qismi o'zgartirilgan bo'lsa — boshqa valyutada saqlangan va raqami tegilmagan
 * maydonlar (masalan "Faqat so'm"da $8 tannarx): ular rejim valyutasida jimgina "8 so'm" bo'lib ketmasligi uchun saqlash
 * to'xtatiladi va shu maydonlarda narxni qayta kiritish so'raladi. Hech bir narx o'zgarmagan bo'lsa (narx umuman yuborilmaydi),
 * ikki valyuta rejimida yoki raqami 0 bo'lgan maydon uchun — bo'sh ro'yxat.
 */
export function ozgarmaganBoshqaValyutaMaydonlar(
  narx: NarxRaqamlari,
  saqlangan: (NarxValyutaManbasi & NarxRaqamlari) | null | undefined,
  yagona: NarxValyutasi | null | undefined,
): NarxMaydoni[] {
  if (!yagona || !saqlangan || !rejimgaMosEmasNarx(saqlangan, yagona)) return [];
  if (ozgarmaganBoshqaValyutaNarx(narx, saqlangan, yagona)) return [];
  const valyutalar = narxValyutalari(saqlangan);
  const maydonlar: NarxMaydoni[] = ["costPrice", "retailPrice", "wholesalePrice"];
  return maydonlar.filter((maydon) => valyutalar[NARX_MAYDONI_VALYUTASI[maydon]] !== yagona
    && Number(saqlangan[maydon] || 0) !== 0
    && Number(narx[maydon] || 0) === Number(saqlangan[maydon] || 0));
}

/** Tahrirda yuboriladigan narx: `narxYigish`, lekin bir valyutali rejimda o'zgartirilmagan boshqa valyutadagi narx yuborilmaydi (`undefined`). */
export function yuboriladiganNarx(
  qoralama: NarxQoralamasi | undefined,
  saqlangan: (NarxValyutaManbasi & NarxRaqamlari) | null | undefined,
  yagona: NarxValyutasi | null | undefined,
) {
  if (qoralama && ozgarmaganBoshqaValyutaNarx(qoralama, saqlangan, yagona)) return undefined;
  return narxYigish(qoralama, yagona);
}

/** Tannarx va chakana narx bir valyutada bo'lsagina ustama (%) va sotuv narxini bir-biridan hisoblash mumkin. */
export function ustamaHisoblashMumkin(qoralama: Pick<NarxQoralamasi, "costCurrency" | "retailCurrency">) {
  return qoralama.costCurrency === qoralama.retailCurrency;
}
