// "Umumiy miqdor" har tovarning o'z birligi bo'yicha: 5 korobka · 12 kg · 3 dona (har xil birliklar bitta songa qo'shilmaydi).
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.

export type BirlikMiqdori = { birlik: string; miqdor: number };

const yaxlit3 = (son: number) => Math.round(son * 1000) / 1000;

/**
 * Qatorlar miqdorini birlik nomi bo'yicha jamlaydi (katta-kichik harf va bo'sh joy farqsiz), birinchi uchragan tartibda.
 * Son bo'lmagan yoki manfiy miqdor hisobga olinmaydi.
 */
export function birlikBoyichaMiqdor(qatorlar: ReadonlyArray<{ birlik: string; miqdor: number }>): BirlikMiqdori[] {
  const guruhlar = new Map<string, BirlikMiqdori>();
  for (const { birlik, miqdor } of qatorlar) {
    if (!Number.isFinite(miqdor) || miqdor < 0) continue;
    const nom = birlik.trim();
    const kalit = nom.toLocaleLowerCase();
    const bor = guruhlar.get(kalit);
    if (bor) bor.miqdor = yaxlit3(bor.miqdor + miqdor);
    else guruhlar.set(kalit, { birlik: nom, miqdor: yaxlit3(miqdor) });
  }
  return [...guruhlar.values()];
}

/** Bir qatorli matn: "5 korobka · 12 kg · 3 dona" (title va ekran o'quvchi uchun). */
export function birlikMiqdoriMatni(guruhlar: readonly BirlikMiqdori[], son: (qiymat: number) => string = String) {
  return guruhlar.map((guruh) => `${son(guruh.miqdor)} ${guruh.birlik}`.trim()).join(" · ");
}
