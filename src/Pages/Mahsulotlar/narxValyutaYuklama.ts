// Mahsulot formasi: narx va uning valyutalarini backendga yuborish/o'qish. Har bir narxning o'z valyutasi bor
// (costCurrency / retailCurrency / wholesaleCurrency). UI yo'q — alohida sinash mumkin.
import { narxValyutalari, type NarxValyutaManbasi, type NarxValyutasi } from "../../lib/narxValyutasi.ts";

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
 */
export function narxYigish(qoralama?: NarxQoralamasi) {
  if (!qoralama || (!qoralama.costPrice && !qoralama.retailPrice && !qoralama.wholesalePrice)) return undefined;
  const ulgurjiKiritilgan = Boolean(qoralama.wholesalePrice);
  return {
    costPrice: Number(qoralama.costPrice || 0),
    costCurrency: qoralama.costCurrency ?? "UZS",
    retailPrice: Number(qoralama.retailPrice || 0),
    retailCurrency: qoralama.retailCurrency ?? "UZS",
    wholesalePrice: Number(qoralama.wholesalePrice || qoralama.retailPrice || 0),
    wholesaleCurrency: ulgurjiKiritilgan ? (qoralama.wholesaleCurrency ?? "UZS") : (qoralama.retailCurrency ?? "UZS"),
  };
}

/** Mavjud narxdagi har bir narxning valyutasi (tahrirlashda forma shundan boshlanadi). */
export function narxQoralamaValyutalari(narx?: NarxValyutaManbasi | null) {
  const valyutalar = narxValyutalari(narx);
  return { costCurrency: valyutalar.cost, retailCurrency: valyutalar.retail, wholesaleCurrency: valyutalar.wholesale };
}

/** Tannarx va chakana narx bir valyutada bo'lsagina ustama (%) va sotuv narxini bir-biridan hisoblash mumkin. */
export function ustamaHisoblashMumkin(qoralama: Pick<NarxQoralamasi, "costCurrency" | "retailCurrency">) {
  return qoralama.costCurrency === qoralama.retailCurrency;
}
