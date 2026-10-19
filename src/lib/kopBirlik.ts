// Ko'p birlikli tovarlar: qoldiq bitta asosiy birlikda (masalan dona) yuritiladi, qo'shimcha birliklar (pochka, qop, korobka)
// koeffitsient bilan qo'yiladi: `koeff` — 1 shu birlikda nechta asosiy birlik. UI'siz va `@/` importlarisiz yozilgan — testlarda ishlaydi.

export type TovarBirligi = {
  unitId: string;
  kod: string | null;
  nomi: string;
  qisqa: string;
  /** Kasr miqdor mumkin (kg, litr, metr). */
  kasr: boolean;
  /** 1 shu birlikda nechta asosiy birlik. */
  koeff: number;
  asosiy: boolean;
  qabul: boolean;
  sotuv: boolean;
  /** Shu birlikning o'z narxi (katalogdagi o'sha narx turi valyutasida); `null` — asosiy narx × koeff. */
  chakana: number | null;
  ulgurji: number | null;
  shtrix: string | null;
};

/** Narx turi: tanlangan birlik narxi shunga qarab olinadi (tannarx har doim asosiy narx × koeff). */
export type BirlikNarxTuri = "COST" | "RETAIL" | "WHOLESALE";

function obyekt(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function musbatYokiNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const son = Number(value);
  return Number.isFinite(son) && son > 0 ? son : null;
}

const yaxlit6 = (son: number) => Math.round(son * 1e6) / 1e6;

/** Backend `units` ro'yxatini (factor satr bo'lishi mumkin) tartibga keltiradi: asosiy birlik birinchi. */
export function birliklarniMoslash(raw: unknown): TovarBirligi[] {
  const tashqi = obyekt(raw);
  const royxat = Array.isArray(raw) ? raw : [tashqi.data, tashqi.items, tashqi.units].find(Array.isArray) ?? [];
  const natija: TovarBirligi[] = [];
  for (const qiymat of royxat as unknown[]) {
    const item = obyekt(qiymat);
    const unitId = typeof item.unitId === "string" ? item.unitId : "";
    const koeff = musbatYokiNull(item.factor ?? item.koeff);
    if (!unitId || koeff === null) continue;
    const nomi = String(item.name ?? item.nomi ?? "");
    natija.push({
      unitId,
      kod: typeof item.code === "string" ? item.code : null,
      nomi,
      qisqa: String(item.shortName ?? "") || nomi,
      kasr: item.isFractional === true,
      koeff,
      asosiy: item.isBase === true,
      qabul: item.canReceive !== false,
      sotuv: item.canSell !== false,
      chakana: musbatYokiNull(item.retailPrice),
      ulgurji: musbatYokiNull(item.wholesalePrice),
      shtrix: typeof item.barcode === "string" && item.barcode.trim() ? item.barcode.trim() : null,
    });
  }
  return natija.sort((a, b) => Number(b.asosiy) - Number(a.asosiy) || a.koeff - b.koeff);
}

export function asosiyBirlik(birliklar: readonly TovarBirligi[] | undefined) {
  return birliklar?.find((birlik) => birlik.asosiy);
}

/** Sotuvda tanlash mumkin birliklar; faqat asosiy birlik bo'lsa tanlov kerak emas (bo'sh ro'yxat). */
export function sotuvBirliklari(birliklar: readonly TovarBirligi[] | undefined) {
  const royxat = (birliklar ?? []).filter((birlik) => birlik.sotuv || birlik.asosiy);
  return royxat.length > 1 ? royxat : [];
}

/** Kirimda tanlash mumkin birliklar (pochka kabi `canReceive: false` birliklar chiqmaydi). */
export function qabulBirliklari(birliklar: readonly TovarBirligi[] | undefined) {
  const royxat = (birliklar ?? []).filter((birlik) => birlik.qabul || birlik.asosiy);
  return royxat.length > 1 ? royxat : [];
}

export function birlikTopish(birliklar: readonly TovarBirligi[] | undefined, unitId: string | null | undefined) {
  return unitId ? birliklar?.find((birlik) => birlik.unitId === unitId) : undefined;
}

/** Shtrix-kod shu tovarning qo'shimcha birligiga tegishlimi (masalan pochka shtrix-kodi). */
export function shtrixBirligi(birliklar: readonly TovarBirligi[] | undefined, kod: string) {
  const toza = kod.trim().toLowerCase();
  return toza ? birliklar?.find((birlik) => !birlik.asosiy && birlik.sotuv && birlik.shtrix?.toLowerCase() === toza) : undefined;
}

/** Birlikdagi miqdor → asosiy birlikdagi miqdor (qoldiq shu bilan o'zgaradi). Birlik yo'q yoki asosiy bo'lsa o'zgarmaydi. */
export function asosiyMiqdor(birlik: TovarBirligi | undefined, miqdor: number) {
  return birlik && !birlik.asosiy ? yaxlit6(miqdor * birlik.koeff) : miqdor;
}

/** Asosiy birlikdagi miqdor → birlikdagi miqdor. */
export function birlikdagiMiqdor(birlik: TovarBirligi | undefined, asosiyMiqdori: number) {
  return birlik && !birlik.asosiy ? yaxlit6(asosiyMiqdori / birlik.koeff) : asosiyMiqdori;
}

/** Qo'shimcha birlikda faqat butun miqdor (korobka, pochka) mumkin: kasr bo'lsa backend `quantity_not_whole` qaytaradi. */
export function miqdorYaroqlimi(birlik: TovarBirligi | undefined, miqdor: number) {
  if (!(miqdor > 0)) return false;
  if (!birlik || birlik.asosiy || birlik.kasr) return true;
  return Number.isInteger(yaxlit6(miqdor));
}

type NarxJufti = { valyuta: "UZS" | "USD"; asl: number; som: number };

/**
 * Tanlangan birlikdagi narx. Birlikning o'z narxi (chakana/ulgurji) bo'lsa — shu, bo'lmasa asosiy narx × koeff;
 * dollar narxning so'mdagi qiymati o'sha kurs bilan proporsional o'zgaradi. Tannarx har doim asosiy narx × koeff.
 */
export function birlikNarxi(narx: NarxJufti | null, birlik: TovarBirligi | undefined, tur: BirlikNarxTuri): NarxJufti | null {
  if (!narx || !birlik || birlik.asosiy) return narx;
  const oz = tur === "RETAIL" ? birlik.chakana : tur === "WHOLESALE" ? birlik.ulgurji : null;
  const asl = oz ?? yaxlit6(narx.asl * birlik.koeff);
  const nisbat = narx.asl > 0 ? asl / narx.asl : 0;
  return { valyuta: narx.valyuta, asl: Math.round(asl * 100) / 100, som: Math.round(narx.som * nisbat) };
}

function sonMatni(son: number) {
  return son.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
}

/**
 * Qoldiq asosiy birlikda: "45 pochka 20 dona" ko'rinishida (eng katta butun birlik + qoldiq). Katta birlik bo'lmasa yoki miqdor
 * unga yetmasa — faqat asosiy birlikda.
 */
export function qoldiqMatni(asosiyMiqdori: number, birliklar: readonly TovarBirligi[] | undefined) {
  const asosiy = asosiyBirlik(birliklar);
  const asosiyMatn = `${sonMatni(asosiyMiqdori)} ${asosiy?.qisqa ?? ""}`.trim();
  const katta = [...(birliklar ?? [])].filter((birlik) => !birlik.asosiy && birlik.koeff > 1 && !birlik.kasr).sort((a, b) => b.koeff - a.koeff)[0];
  if (!katta || !asosiy) return asosiyMatn;
  const soni = Math.floor(yaxlit6(asosiyMiqdori / katta.koeff));
  if (soni < 1) return asosiyMatn;
  const qoldi = yaxlit6(asosiyMiqdori - soni * katta.koeff);
  return `${sonMatni(soni)} ${katta.qisqa}${qoldi > 0 ? ` ${sonMatni(qoldi)} ${asosiy.qisqa}` : ""}`;
}

/** `/reports/stock-balance` qatori: eng katta birlik bo'yicha taqsimot va boshqa birliklardagi taxminiy miqdor. */
export type QoldiqTaqsimoti = {
  breakdown?: { unitName?: string | null; count?: unknown; remainder?: unknown } | null;
  approx?: Array<{ unitName?: string | null; quantity?: unknown }> | null;
};

function qisqaSon(value: unknown, xonalar: number) {
  const son = Number(value);
  return Number.isFinite(son) ? son.toLocaleString("uz-UZ", { maximumFractionDigits: xonalar }) : "";
}

/**
 * Qoldiq asosiy birlikda saqlanadi, ekranda esa birliklarda ham: `bolingan` — "2 qop 4,367 kg" (butun birlik + qoldiq),
 * `taxminan` — "≈ 130,83 pochka · 2,18 qop". Taqsimot yo'q (tovarda bir birlik) bo'lsa ikkalasi `null`.
 */
export function qoldiqTaqsimotiMatni(item: QoldiqTaqsimoti, asosiyBirlikNomi?: string | null) {
  const b = item.breakdown;
  const soni = Number(b?.count);
  const qoldi = Number(b?.remainder);
  const bolingan = b?.unitName && Number.isFinite(soni) && soni > 0
    ? `${qisqaSon(soni, 3)} ${b.unitName}${Number.isFinite(qoldi) && qoldi > 0 ? ` ${qisqaSon(qoldi, 3)}${asosiyBirlikNomi ? ` ${asosiyBirlikNomi}` : ""}` : ""}`
    : null;
  const qismlar = (item.approx ?? [])
    .filter((qism) => qism?.unitName && Number.isFinite(Number(qism.quantity)))
    .map((qism) => `${qisqaSon(qism.quantity, 2)} ${qism.unitName}`);
  return { bolingan, taxminan: qismlar.length ? `≈ ${qismlar.join(" · ")}` : null };
}

/** `GET /sales/:id/returnable-items` qatori: pochkada sotilgan qatorda `unit*` maydonlari ham keladi. */
export type QaytariladiganBirlikQatori = {
  soldQuantity?: unknown;
  returnedQuantity?: unknown;
  remainingQuantity?: unknown;
  unitId?: string | null;
  unitName?: string | null;
  unitQuantity?: unknown;
  unitRemainingQuantity?: unknown;
};

/**
 * Qaytarish miqdori sotilgan birlikda kiritiladi (10 pochkadan 3 tasi): birlikda sotilgan qatorda sotilgan/qolgan miqdor
 * `unitQuantity`/`unitRemainingQuantity`dan olinadi, qolgan qatorlarda — asosiy birlikdagi maydonlardan.
 */
export function qaytariladiganQatorBirligida(javob: QaytariladiganBirlikQatori) {
  const birlikda = Boolean(javob.unitId) && musbatYokiNull(javob.unitQuantity) !== null && manfiyEmas(javob.unitRemainingQuantity) !== null;
  if (!birlikda) return { birlikda: false as const, birlik: null, sotilgan: javob.soldQuantity, oldin: javob.returnedQuantity, qolgan: javob.remainingQuantity };
  const sotilgan = Number(javob.unitQuantity);
  const qolgan = Number(javob.unitRemainingQuantity);
  return { birlikda: true as const, birlik: javob.unitName || null, sotilgan, oldin: yaxlit6(sotilgan - qolgan), qolgan };
}

/** Savatcha qatorining ASOSIY birlikdagi qiymatlari (so'mda; dollar narxlar asl valyutasida ham). */
export type SavatchaBaza = {
  chakanaNarx: number;
  ulgurjiNarx: number;
  qoldiq: number;
  aslNarx?: number;
  aslUlgurjiNarx?: number;
  kurs?: number;
};

const yaxlit2 = (son: number) => Math.round(son * 100) / 100;

/**
 * Savatcha qatori tanlangan birlikda: narxlar (so'mda), dollar narxlar va qoldiq shu birlikda hisoblanadi, shunda savatchaning
 * qolgan hisobi (jami, chegirma, to'lov) o'zgarmaydi. Birlikning o'z narxi (katalogdagi o'sha narx turi valyutasida) bo'lsa — shu,
 * bo'lmasa asosiy narx × koeffitsient. Qoldiq asosiy birlikda saqlanadi: birlikda butun songa tushiriladi (kasrli birlikdan tashqari).
 */
export function savatchaBirlikQiymatlari(baza: SavatchaBaza, birlik: TovarBirligi | undefined, narxTuri: "chakana" | "ulgurji") {
  const k = birlik && !birlik.asosiy ? birlik.koeff : 1;
  const kurs = baza.kurs ?? 0;
  const boshqa = !birlik || birlik.asosiy;
  let chakanaNarx = baza.chakanaNarx;
  let ulgurjiNarx = baza.ulgurjiNarx;
  let aslNarx = baza.aslNarx;
  let aslUlgurjiNarx = baza.aslUlgurjiNarx;
  if (!boshqa) {
    if ((baza.aslNarx ?? 0) > 0 && kurs > 0) {
      aslNarx = birlik.chakana ?? yaxlit2((baza.aslNarx ?? 0) * k);
      chakanaNarx = Math.round(aslNarx * kurs);
    } else {
      chakanaNarx = birlik.chakana ?? Math.round(baza.chakanaNarx * k);
    }
    if ((baza.aslUlgurjiNarx ?? 0) > 0 && kurs > 0) {
      aslUlgurjiNarx = birlik.ulgurji ?? yaxlit2((baza.aslUlgurjiNarx ?? 0) * k);
      ulgurjiNarx = Math.round(aslUlgurjiNarx * kurs);
    } else {
      ulgurjiNarx = birlik.ulgurji ?? (baza.ulgurjiNarx > 0 ? Math.round(baza.ulgurjiNarx * k) : 0);
    }
  }
  const qoldiq = !birlik || birlik.asosiy ? baza.qoldiq : birlik.kasr ? Math.round((baza.qoldiq / k) * 1000) / 1000 : Math.floor(baza.qoldiq / k + 1e-9);
  return {
    chakanaNarx,
    ulgurjiNarx,
    narx: narxTuri === "ulgurji" ? ulgurjiNarx || chakanaNarx : chakanaNarx,
    qoldiq,
    ...(aslNarx !== undefined ? { aslNarx } : {}),
    ...(aslUlgurjiNarx !== undefined ? { aslUlgurjiNarx } : {}),
  };
}

/** Hujjat (sotuv, kirim, ko'chirma) qatori: qo'shimcha birlikda kiritilgan bo'lsa `unitId` va birlikdagi son/narx ham keladi. */
export type BirlikliQator = {
  quantity: unknown;
  price: unknown;
  unitId?: string | null;
  unitName?: string | null;
  unitQuantity?: unknown;
  unitPrice?: unknown;
};

function manfiyEmas(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const son = Number(value);
  return Number.isFinite(son) && son >= 0 ? son : null;
}

/** Qatorni ko'rsatish uchun: birlikda kiritilgan bo'lsa shu birlikdagi miqdor va narx (10 pochka × 12 000), aks holda asosiy birlikda. */
export function qatorBirligida(item: BirlikliQator) {
  const soni = musbatYokiNull(item.unitQuantity);
  const narx = manfiyEmas(item.unitPrice);
  if (item.unitId && soni !== null && narx !== null) return { miqdor: soni, narx, birlik: item.unitName || null, unitId: item.unitId };
  return { miqdor: Number(item.quantity), narx: Number(item.price), birlik: null, unitId: null };
}

/** "10 pochka" yoki (asosiy birlikda) "500". */
export function qatorMiqdoriMatni(item: BirlikliQator) {
  const qator = qatorBirligida(item);
  const soni = qator.miqdor.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
  return qator.birlik ? `${soni} ${qator.birlik}` : soni;
}

/**
 * Mavjud qatorni qayta yuborish (qoralamani saqlash, nusxa olish): birlikda kiritilgan qator birlikdagi son va narx bilan, `unitId` bilan
 * yuboriladi — asosiy birlikdagi taqsimlangan narx (12 000 / 50) yaxlitlanib summani buzmasligi uchun.
 */
export function qatorniQaytaYuborish(item: BirlikliQator) {
  const qator = qatorBirligida(item);
  return qator.unitId
    ? { quantity: qator.miqdor, price: qator.narx, unitId: qator.unitId }
    : { quantity: qator.miqdor, price: qator.narx };
}

/** PUT /catalog/products/:id/units tanasi: asosiy birlik yuborilmaydi (backend uni o'zi yuritadi). */
export type BirlikMalumoti = {
  unitId: string;
  factor: number;
  canReceive: boolean;
  canSell: boolean;
  retailPrice: number | null;
  wholesalePrice: number | null;
  barcode: string | null;
};

export function birliklarTanasi(birliklar: readonly TovarBirligi[]): { units: BirlikMalumoti[] } {
  return {
    units: birliklar.filter((birlik) => !birlik.asosiy).map((birlik) => ({
      unitId: birlik.unitId,
      factor: birlik.koeff,
      canReceive: birlik.qabul,
      canSell: birlik.sotuv,
      retailPrice: birlik.chakana,
      wholesalePrice: birlik.ulgurji,
      barcode: birlik.shtrix,
    })),
  };
}

/** Kartochkadagi koeffitsientni tekshirish: musbat, asosiy birlik bilan bir xil emas va takrorlanmaydi. Xato matni kaliti yoki `null`. */
export function birliklarXatosi(birliklar: readonly TovarBirligi[]): "unitDuplicate" | "factorInvalid" | null {
  const qoshimcha = birliklar.filter((birlik) => !birlik.asosiy);
  if (qoshimcha.some((birlik) => !(birlik.koeff > 0))) return "factorInvalid";
  const idlar = new Set(birliklar.map((birlik) => birlik.unitId));
  return idlar.size === birliklar.length ? null : "unitDuplicate";
}

/**
 * Kirimda sanalgan miqdor bo'yicha haqiqiy koeffitsient (asosiy birlik ÷ sanalgan birlik soni) va kartochkadagidan farqi.
 * Backend (`checkUnitId`/`checkCount`) farq 2% dan oshsa `FACTOR_CHANGED` ogohlantirishini qaytaradi — shu qoida oldindan ko'rsatiladi.
 */
export function koeffTekshiruvi(asosiyMiqdori: number, sanalgan: number, kartaKoeffi: number) {
  if (!(asosiyMiqdori > 0) || !(sanalgan > 0) || !(kartaKoeffi > 0)) return null;
  const haqiqiy = yaxlit6(asosiyMiqdori / sanalgan);
  const farqFoiz = Math.round(Math.abs(haqiqiy - kartaKoeffi) / kartaKoeffi * 10000) / 100;
  return { haqiqiy, farqFoiz, ogohlantirish: farqFoiz > 2 };
}

/** Kirimdagi koeffitsientni tekshirish (jami og'irlik ÷ pochkalar soni): 1 pochkada nechta kg va u kartochkadagidan farqi. */
export function pochkaOgirligi(jamiOgirlik: number, pochkalarSoni: number) {
  return jamiOgirlik > 0 && pochkalarSoni > 0 ? Math.round((jamiOgirlik / pochkalarSoni) * 1e6) / 1e6 : null;
}
