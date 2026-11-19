// Inventarizatsiyada korobkada sanash (backend 19.11, inventory/README): qator `actualQuantity` o'rniga
// `{ closedUnitId, closedQuantity, openQuantity }` bo'lishi mumkin — closedUnitId tovarning qo'shimcha birligi (/catalog/products/:id/units
// dagi `unitId`), closedQuantity — yopiq qadoqlar soni, openQuantity — ochiq qolgani asosiy birlikda.
// Backend: actualQuantity = round(closedQuantity × factor, 3) + openQuantity, hujjatda closedFactor bilan saqlanadi.
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.

/**
 * Qatordagi korobka sanog'i (maydon matnlari — "5", "" ham bo'lishi mumkin). `koeff` — hujjatda saqlangan koeffitsient (closedFactor):
 * faqat tahrirda ochilgan qatorda bo'ladi; tovar birligining hozirgi koeffitsienti undan farq qilsa, qator korobka ko'rinishida
 * qayta yuborilmaydi (backend jamini hozirgi koeffitsient bilan qayta hisoblab, saqlangan miqdorni o'zgartirib yuborardi).
 */
export type KorobkaSanogi = { unitId: string; yopiq: string; ochiq: string; koeff?: number };

/** Sanash uchun birlik: tovarning qo'shimcha birligi (asosiy emas), koeffitsienti bilan. */
export type KorobkaBirligi = { unitId: string; nomi: string; koeff: number; kasr?: boolean };

/** Backend qatoridagi saqlangan korobka maydonlari (GET /inventory/stock-takes/:id). */
export type KorobkaliQator = {
  actualQuantity?: number | string | null;
  closedUnitId?: string | null;
  closedQuantity?: number | string | null;
  closedFactor?: number | string | null;
  openQuantity?: number | string | null;
};

const yaxlit3 = (son: number) => Math.round(son * 1000) / 1000;

function sonMi(matn: string): number | null {
  const toza = matn.trim().replace(",", ".");
  if (!toza) return null;
  const son = Number(toza);
  return Number.isFinite(son) && son >= 0 ? son : NaN;
}

/** 3 xonagacha kasr (backend `maxDecimalPlaces: 3`). */
function uchXonagacha(son: number) {
  return Math.abs(son * 1000 - Math.round(son * 1000)) < 1e-6;
}

export type KorobkaNatijasi =
  | { holat: "bosh" }
  | { holat: "xato"; sabab: "son" | "butun" }
  | { holat: "tayyor"; yopiq: number; ochiq: number; jami: number };

/**
 * Korobka sanog'ini tekshiradi va jamini (asosiy birlikda) hisoblaydi: ikkala maydon bo'sh — sanalmagan; manfiy, son bo'lmagan yoki 3 xonadan
 * ortiq kasr — xato; bo'sh maydon 0 hisoblanadi. `butun` — asosiy birlik kasr emas (dona): jami butun son bo'lishi shart (backend
 * QUANTITY_NOT_WHOLE qaytaradi).
 */
export function korobkaNatijasi(sanoq: KorobkaSanogi, koeff: number, butun = false): KorobkaNatijasi {
  const yopiq = sonMi(sanoq.yopiq);
  const ochiq = sonMi(sanoq.ochiq);
  if (yopiq === null && ochiq === null) return { holat: "bosh" };
  const y = yopiq ?? 0;
  const o = ochiq ?? 0;
  if (Number.isNaN(y) || Number.isNaN(o) || !uchXonagacha(y) || !uchXonagacha(o) || !(koeff > 0)) return { holat: "xato", sabab: "son" };
  const jami = yaxlit3(yaxlit3(y * koeff) + o);
  if (butun && !Number.isInteger(jami)) return { holat: "xato", sabab: "butun" };
  return { holat: "tayyor", yopiq: y, ochiq: o, jami };
}

/** Jadvaldagi "Miqdor" maydoni uchun jami matni ("" — sanalmagan, "x" — xato: sanoq tekshiruvi uni noto'g'ri deb ko'radi). */
export function korobkaJamiMatni(sanoq: KorobkaSanogi, koeff: number, butun = false) {
  const natija = korobkaNatijasi(sanoq, koeff, butun);
  return natija.holat === "tayyor" ? String(natija.jami) : natija.holat === "bosh" ? "" : "x";
}

/** So'rov qatori: korobka sanog'i to'g'ri bo'lsa backend korobka maydonlari, aks holda null. */
export function korobkaSoroviQatori(modificationId: string, sanoq: KorobkaSanogi | undefined, koeff: number | undefined, butun = false) {
  if (!sanoq || !sanoq.unitId || koeff === undefined) return null;
  const natija = korobkaNatijasi(sanoq, koeff, butun);
  if (natija.holat !== "tayyor") return null;
  return { modificationId, closedUnitId: sanoq.unitId, closedQuantity: natija.yopiq, openQuantity: natija.ochiq };
}

/**
 * Korobkada sanash yoqilganda allaqachon yozilgan miqdor yo'qolmasin: 63 dona, 1 korobka = 12 → 5 korobka + 3. Yozilmagan yoki noto'g'ri
 * miqdor — bo'sh maydonlar.
 */
export function korobkagaAjratish(jamiMatni: string | undefined, birlik: KorobkaBirligi): KorobkaSanogi {
  const jami = sonMi(jamiMatni ?? "");
  if (jami === null || Number.isNaN(jami) || !(birlik.koeff > 0)) return { unitId: birlik.unitId, yopiq: "", ochiq: "" };
  const yopiq = Math.floor(jami / birlik.koeff + 1e-9);
  const ochiq = yaxlit3(jami - yaxlit3(yopiq * birlik.koeff));
  // 0 sanalgan bo'lsa ham "sanalgan" bo'lib qoladi ("0" korobka).
  return { unitId: birlik.unitId, yopiq: yopiq > 0 || ochiq <= 0 ? String(yopiq) : "", ochiq: ochiq > 0 ? String(ochiq) : "" };
}

/** Saqlangan qatordan korobka sanog'i (tahrir uchun); korobkasiz qator — null. */
export function saqlanganKorobka(qator: KorobkaliQator): KorobkaSanogi | null {
  if (!qator.closedUnitId || qator.closedQuantity === null || qator.closedQuantity === undefined) return null;
  const ochiq = Number(qator.openQuantity ?? 0);
  const koeff = Number(qator.closedFactor);
  return {
    unitId: qator.closedUnitId,
    yopiq: String(Number(qator.closedQuantity)),
    ochiq: ochiq ? String(ochiq) : "",
    ...(Number.isFinite(koeff) && koeff > 0 ? { koeff } : {}),
  };
}

/** Saqlangan qator ko'rinishi: "5 korobka + 3" (ochiq 0 bo'lsa "5 korobka"); korobkasiz qator — null. */
export function korobkaKorinishi(qator: KorobkaliQator, birlikNomi?: string | null) {
  if (!qator.closedUnitId || qator.closedQuantity === null || qator.closedQuantity === undefined) return null;
  const yopiq = Number(qator.closedQuantity);
  const ochiq = Number(qator.openQuantity ?? 0);
  const koeff = Number(qator.closedFactor ?? 0);
  const nomi = birlikNomi?.trim() || (koeff > 0 ? `× ${koeff}` : "");
  const asosi = `${yopiq}${nomi ? ` ${nomi}` : ""}`;
  return ochiq ? `${asosi} + ${ochiq}` : asosi;
}

/** Sanash uchun birliklar: faqat qo'shimcha (asosiy bo'lmagan, koeffitsienti 1 dan katta) birliklar; eng katta qadoq (korobka) birinchi. */
export function korobkaBirliklari<T extends { unitId: string; nomi: string; qisqa?: string; koeff: number; asosiy: boolean }>(birliklar: readonly T[]): KorobkaBirligi[] {
  return birliklar
    .filter((birlik) => !birlik.asosiy && birlik.koeff > 1)
    .map((birlik) => ({ unitId: birlik.unitId, nomi: birlik.nomi || birlik.qisqa || "", koeff: birlik.koeff }))
    .sort((a, b) => b.koeff - a.koeff);
}

/**
 * Qoralamani umumiy hujjat oynasida (InventoryHujjatModal, PATCH) saqlash: oyna miqdorni faqat asosiy birlikda tahrirlaydi. Miqdori
 * o'zgarmagan korobkali qator korobka ko'rinishida qayta yuboriladi (aks holda "5 korobka + 3" yo'qolardi); o'zgargani — actualQuantity.
 * Backend korobka qatorini birlikning HOZIRGI koeffitsienti bilan qayta hisoblaydi: birlik o'chirilgan yoki koeffitsienti o'zgargan
 * (`joriyKoeff` saqlangan closedFactor bilan teng emas yoki noma'lum) bo'lsa — saqlangan jami actualQuantity bilan yuboriladi.
 */
export function qoralamaQatorlari(
  qatorlar: ReadonlyArray<{ modificationId: string; quantity: number }>,
  asl: ReadonlyArray<KorobkaliQator & { modificationId: string }>,
  joriyKoeff: (modificationId: string, unitId: string) => number | undefined,
): Array<{ modificationId: string; actualQuantity: number } | { modificationId: string; closedUnitId: string; closedQuantity: number; openQuantity: number }> {
  const xarita = new Map(asl.map((qator) => [qator.modificationId, qator]));
  return qatorlar.map(({ modificationId, quantity }) => {
    const eski = xarita.get(modificationId);
    const korobka = eski ? saqlanganKorobka(eski) : null;
    const koeff = korobka ? joriyKoeff(modificationId, korobka.unitId) : undefined;
    if (eski && korobka && Number(eski.actualQuantity) === quantity && koeff !== undefined && Math.abs(koeff - Number(eski.closedFactor)) < 1e-9) {
      return { modificationId, closedUnitId: korobka.unitId, closedQuantity: Number(eski.closedQuantity), openQuantity: Number(eski.openQuantity ?? 0) };
    }
    return { modificationId, actualQuantity: quantity };
  });
}
