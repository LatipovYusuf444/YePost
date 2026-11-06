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
