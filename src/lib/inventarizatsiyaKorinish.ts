type MiqdorQatori = {
  actualQuantity: number | string;
  expectedQuantity?: number | string | null;
  systemQuantity?: number | string | null;
};

export function inventarizatsiyaQatorFarqi(item: MiqdorQatori): number | null {
  const expected = item.expectedQuantity ?? item.systemQuantity;
  if (expected == null || String(expected).trim() === "" || String(item.actualQuantity).trim() === "") return null;
  const actual = Number(item.actualQuantity);
  const system = Number(expected);
  return Number.isFinite(actual) && Number.isFinite(system) ? actual - system : null;
}

// Ko'rish oynasi uchun qatorlar soni. Turli birlikdagi mahsulot miqdorlari qo'shilmaydi.
export function inventarizatsiyaQatorXulosasi(items: MiqdorQatori[]) {
  const jami = { jami: items.length, mos: 0, ortiqcha: 0, kamomad: 0, noaniq: 0 };
  for (const item of items) {
    const farq = inventarizatsiyaQatorFarqi(item);
    if (farq === null) jami.noaniq++;
    else if (farq > 0) jami.ortiqcha++;
    else if (farq < 0) jami.kamomad++;
    else jami.mos++;
  }
  return jami;
}
