// Mahsulot narxining valyutalari. Backend (4-qism) har bir narxga alohida valyuta beradi:
// costCurrency (tannarx), retailCurrency (chakana), wholesaleCurrency (ulgurji). Eski `currency` hamon qabul qilinadi/qaytadi,
// lekin endi u faqat chakana narx valyutasini bildiradi. Bu fayl hech narsani import qilmaydi (testlarda to'g'ridan-to'g'ri ishlaydi).

export type NarxValyutasi = "UZS" | "USD";

export type NarxValyutaManbasi = {
  currency?: string | null;
  costCurrency?: string | null;
  retailCurrency?: string | null;
  wholesaleCurrency?: string | null;
};

export type NarxValyutalari = { cost: NarxValyutasi; retail: NarxValyutasi; wholesale: NarxValyutasi };

function valyutaKodi(qiymat?: string | null): NarxValyutasi | null {
  const kod = qiymat?.toUpperCase();
  return kod === "USD" ? "USD" : kod === "UZS" ? "UZS" : null;
}

/**
 * Har bir narxning o'z valyutasi. Yangi maydon bo'lmasa — eski `currency` (eski serverda hamma narxniki, yangisida chakana narxniki),
 * u ham bo'lmasa so'm (valyutasi yozilmagan narx so'm hisoblanadi).
 */
export function narxValyutalari(narx?: NarxValyutaManbasi | null): NarxValyutalari {
  const umumiy = valyutaKodi(narx?.currency) ?? "UZS";
  return {
    cost: valyutaKodi(narx?.costCurrency) ?? umumiy,
    retail: valyutaKodi(narx?.retailCurrency) ?? umumiy,
    wholesale: valyutaKodi(narx?.wholesaleCurrency) ?? umumiy,
  };
}
