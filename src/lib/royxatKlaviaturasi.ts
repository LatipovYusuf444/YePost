// Ochiladigan ro'yxatlarda klaviatura bilan yurish (savdodagi mijoz tanlovidek): ↓/↑ — keyingi/oldingi (chetda aylanadi),
// Home/End — boshi/oxiri, PageDown/PageUp — 5 tadan. UI'siz va `@/` importlarisiz — testlarda ishlaydi.

const SAHIFA = 5;

/**
 * Harf terib tez o'tish (oddiy select kabi): `matn` bilan boshlanadigan birinchi variant indeksi. Bitta harf qayta bosilsa — joriydan
 * keyingi shu harfli variantga o'tiladi (aylanib). Bo'sh nomlar (o'chirilgan variantlar) tashlanadi. Topilmasa — -1.
 */
export function harfBilanTopish(nomlar: readonly string[], matn: string, joriy: number): number {
  const izlov = matn.toLocaleLowerCase();
  if (!izlov) return -1;
  const boshlanadi = (index: number) => {
    const nom = nomlar[index]?.trim().toLocaleLowerCase() ?? "";
    return nom !== "" && nom.startsWith(izlov);
  };
  const bittaHarfQayta = izlov.length > 1 && [...izlov].every((harf) => harf === izlov[0]);
  if (izlov.length === 1 || bittaHarfQayta) {
    const harf = izlov[0];
    for (let qadam = 1; qadam <= nomlar.length; qadam += 1) {
      const index = (Math.max(joriy, -1) + qadam) % nomlar.length;
      if ((nomlar[index]?.trim().toLocaleLowerCase() ?? "").startsWith(harf)) return index;
    }
    return -1;
  }
  return nomlar.findIndex((_, index) => boshlanadi(index));
}

/** Yangi belgilangan indeks; tugma yurishga tegishli bo'lmasa yoki ro'yxat bo'sh bo'lsa — null. */
export function klaviaturaYonalishi(tugma: string, joriy: number, soni: number): number | null {
  if (soni <= 0) return null;
  switch (tugma) {
    case "ArrowDown":
      return joriy < 0 || joriy >= soni - 1 ? 0 : joriy + 1;
    case "ArrowUp":
      return joriy <= 0 ? soni - 1 : joriy - 1;
    case "Home":
      return 0;
    case "End":
      return soni - 1;
    case "PageDown":
      return Math.min(soni - 1, Math.max(joriy, 0) + SAHIFA);
    case "PageUp":
      return Math.max(0, joriy - SAHIFA);
    default:
      return null;
  }
}
