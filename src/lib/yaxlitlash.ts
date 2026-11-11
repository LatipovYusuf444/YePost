// Pul yaxlitlash backend (Decimal ROUND_HALF_UP) bilan bir xil (M7). `Math.round(x * 100) / 100` ikkilik kasr xatosida
// yarim tiyinni pastga tushirardi: 20.10 × 5% = 1.005 → 1.00 (backend 1.01), farq 0.01 "qarz" bo'lib qolardi.
// Son o'nlik ko'rinishida (eng qisqa yozuvi) surilib yaxlitlanadi; yarmi noldan uzoqlashadi. Importlarsiz — testlarda ishlaydi.

export function yaxlitHalfUp(son: number, xona = 2): number {
  if (!Number.isFinite(son) || son === 0) return son;
  const belgi = son < 0 ? -1 : 1;
  const mutlaq = Math.abs(son);
  const matn = String(mutlaq);
  const surilgan = matn.includes("e") ? mutlaq * 10 ** xona : Number(`${matn}e${xona}`);
  const butun = Math.round(surilgan);
  return belgi * Number(`${butun}e-${xona}`);
}

/**
 * Valyuta narxini kurs bilan o'giradi ($3.50 × 12 600 = 44 100 so'm) — natija YAXLITLANMAYDI (butun so'mgacha ham emas).
 * Faqat ikkilik kasr shovqini tozalanadi (117.65 × 11 780 → 1 385 917, 1 385 916.9999… emas). Ko'rsatishda formatlanadi.
 */
export function kursBilanOgirish(asl: number, kurs: number): number {
  const natija = asl * kurs;
  return Number.isFinite(natija) ? Math.round(natija * 1e6) / 1e6 : 0;
}
