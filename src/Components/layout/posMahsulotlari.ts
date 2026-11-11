import type { QoldiqTanlovi } from "@/types/savdo";
import { asosiyMiqdor, birlikTopish, type TovarBirligi } from "../../lib/kopBirlik.ts";
import { kursBilanOgirish } from "../../lib/yaxlitlash.ts";

// POS mahsulot tanlash uchun umumiy yordamchilar: MahsulotTanlashModal (to'liq oyna) va headerdagi tezkor qidiruv
// bir xil qoida bo'yicha nom, narx va qoldiqni hisoblaydi.

/** Mahsulot narxi/nomi o'zgarganda (masalan savatchadan tahrirlangach) yuboriladigan oyna hodisasi: qidiruv keshlari tozalanadi. */
export const KATALOG_YANGILANDI_HODISASI = "yepost:katalog-yangilandi";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Birinchi musbat qiymatni qaytaradi (backend ba'zan 0 yoki bo'sh yuboradi).
export function musbat(...qiymatlar: unknown[]) {
  for (const qiymat of qiymatlar) {
    const son = Number(qiymat);
    if (Number.isFinite(son) && son > 0) return son;
  }
  return 0;
}

// UUID ko'rinishidagi "nom" haqiqiy nom emas — bo'sh deb hisoblanadi.
export function toza(nom?: string | null) {
  const qiymat = nom?.trim() ?? "";
  return qiymat && !UUID.test(qiymat) ? qiymat : "";
}

export function mahsulotNomi(item: QoldiqTanlovi) {
  return toza(item.modification?.product?.name);
}

export function variantNomi(item: QoldiqTanlovi) {
  const variant = toza(item.modification?.name);
  return variant && variant !== "Asosiy variant" && variant !== mahsulotNomi(item) ? variant : "";
}

/** Mahsulot (tovar kartochkasi) id'si — savatchadan mahsulotni tahrirlash oynasini ochish uchun; bo'lmasa undefined. */
export function mahsulotIdOlish(item: QoldiqTanlovi) {
  return item.modification?.product?.id || item.productId || undefined;
}

export function savatNomi(item: QoldiqTanlovi) {
  return [mahsulotNomi(item), variantNomi(item)].filter(Boolean).join(" / ") || toza(item.modification?.name);
}

export function qoldiqMiqdori(item: QoldiqTanlovi) {
  const raw = item as QoldiqTanlovi & {
    availableQuantity?: number;
    availableQty?: number;
    balanceQty?: number;
    qty?: number;
  };
  return Number(raw.quantity ?? raw.balance ?? raw.availableQuantity ?? raw.availableQty ?? raw.balanceQty ?? raw.qty ?? 0);
}

/** Modalda qo'shiladigan miqdor: shu ombordagi savatcha miqdorini ham hisobga oladi. */
export function tanlashQoldigi(item: QoldiqTanlovi, warehouseId: string, cart: ReadonlyArray<{ id: string; soni: number; birliklar?: TovarBirligi[]; birlikId?: string }>) {
  const qoldiq = qoldiqMiqdori(item);
  if (!Number.isFinite(qoldiq)) return 0;
  // Savatchadagi miqdor qo'shimcha birlikda (pochka) bo'lishi mumkin: qoldiq asosiy birlikda, shuning uchun o'giriladi.
  const qator = cart.find((row) => row.id === tanlovKaliti(item.modificationId, warehouseId));
  const savatchada = qator ? asosiyMiqdor(birlikTopish(qator.birliklar, qator.birlikId), qator.soni) : 0;
  return Math.max(0, qoldiq - savatchada);
}

/** Ulgurji narx dollarda saqlanganmi (chakana narx valyutasidan mustaqil). */
function ulgurjiDollardami(dollar?: QoldiqTanlovi["valyuta"]) {
  return Boolean(dollar) && (dollar?.ulgurjiCurrency ?? dollar?.currency) === "USD";
}

/**
 * Savatcha narxlari qaysi valyuta rejimida hisoblanadi (Sozlamalar → Valyuta, backend 11.11.2026):
 *  - DUAL (standart): avvalgidek — savatcha so'mda, dollar narx kurs bilan so'mga o'giriladi, qator backendga o'z valyutasida (USD) ketadi.
 *  - UZS_ONLY: savatcha so'mda; dollarda saqlangan (eski) narx kurs bilan so'mga o'giriladi, qator esa so'mda ketadi. Narxda kurs
 *    kelmasa — `kurs` (do'konning amaldagi kursi) ishlatiladi.
 *  - USD_ONLY: savatcha dollarda; dollar narx o'girilmaydi (kurs kerak emas). So'mdagi (eski) narx bu rejimda sotilmaydi.
 */
export type PosNarxRejimi = { rejim: "DUAL" | "UZS_ONLY" | "USD_ONLY"; kurs?: number };

const IKKI_VALYUTA: PosNarxRejimi = { rejim: "DUAL" };

/** Savatcha narxlari valyutasi: "Faqat dollar" rejimida — dollar, qolganlarida — so'm. */
export function posSavatValyutasi(rejim: PosNarxRejimi): "UZS" | "USD" {
  return rejim.rejim === "USD_ONLY" ? "USD" : "UZS";
}

/** So'mda alohida belgilangan ulgurji narx (ulgurji narx dollarda bo'lsa 0). */
function somdagiUlgurji(item: QoldiqTanlovi) {
  const dollar = item.valyuta;
  if (ulgurjiDollardami(dollar)) return 0;
  return dollar?.currency === "USD" ? (dollar.ulgurjiUzs ?? 0) : musbat(item.modification?.price?.wholesalePrice);
}

/** "Faqat dollar" rejimidagi narx: dollardagi asl narx, o'girilmasdan. So'mdagi narx — 0 (sotib bo'lmaydi). */
function dollardagiNarx(item: QoldiqTanlovi, narxTuri: "chakana" | "ulgurji") {
  const dollar = item.valyuta;
  if (narxTuri === "ulgurji") {
    const ulgurji = ulgurjiDollardami(dollar) ? (dollar?.ulgurjiAsl ?? 0) : 0;
    if (ulgurji > 0) return ulgurji;
    // Ulgurji narx so'mda alohida belgilangan: bu narxda sotilmaydi (chakana narxga jimgina o'tilmaydi).
    if (somdagiUlgurji(item) > 0) return 0;
  }
  return dollar?.currency === "USD" && dollar.asl > 0 ? dollar.asl : 0;
}

/**
 * "Faqat dollar" rejimida mahsulot narxi yo'qligining sababi so'mdagi narxmi: tanlangan narx turi so'mda belgilangan, dollarda emas.
 * Bunday mahsulot shu rejimda sotilmaydi (backend so'mdagi yozuvni rad etadi) — kassirga narxni dollarda kiritish kerakligi aytiladi.
 */
export function somdagiNarxmi(item: QoldiqTanlovi, narxTuri: "chakana" | "ulgurji") {
  if (item.narxAniq === false || dollardagiNarx(item, narxTuri) > 0) return false;
  if (narxTuri === "ulgurji" && somdagiUlgurji(item) > 0) return true;
  if (item.valyuta?.currency === "USD") return false;
  const narx = item.modification?.price;
  return musbat(narx?.retailPrice, narx?.sellingPrice, item.sellingPrice, item.price) > 0;
}

export function qoldiqNarxi(item: QoldiqTanlovi, narxTuri: "chakana" | "ulgurji", rejim: PosNarxRejimi = IKKI_VALYUTA) {
  if (item.narxAniq === false) return 0;
  if (rejim.rejim === "USD_ONLY") return dollardagiNarx(item, narxTuri);
  // Dollarda saqlangan narx: so'mdagi narx = asl dollar narxi × kurs, YAXLITLANMASDAN. Backend yuboradigan retailPriceUzs /
  // wholesalePriceUzs butun so'mgacha yaxlitlangan ($3.50 → 4) — sotuv narxi sifatida ishlatilmaydi (mijozdan ortiqcha olinardi).
  // Chakana va ulgurji narxlarning valyutalari alohida (masalan chakana so'mda, ulgurji dollarda).
  const dollar = item.valyuta;
  const kurs = dollar?.kurs ?? (rejim.rejim === "UZS_ONLY" ? (rejim.kurs ?? 0) : 0);
  const ulgurjiAsl = ulgurjiDollardami(dollar) ? (dollar?.ulgurjiAsl ?? 0) : 0;
  if (narxTuri === "ulgurji" && dollar?.currency !== "USD" && ulgurjiAsl > 0) {
    // Chakana so'mda, ulgurji dollarda: kurs yo'q bo'lsa ulgurji narxda sotuvga qo'shib bo'lmaydi (chakana narxga jimgina o'tilmaydi).
    return kurs > 0 ? kursBilanOgirish(ulgurjiAsl, kurs) : 0;
  }
  if (dollar?.currency === "USD") {
    if (!(kurs > 0) || !(dollar.asl > 0)) return 0;
    if (narxTuri === "ulgurji") {
      if (ulgurjiAsl > 0) return kursBilanOgirish(ulgurjiAsl, kurs);
      // Ulgurji narx so'mda alohida belgilangan — o'zi (o'girilmaydi).
      const ulgurjiSom = dollar.ulgurjiUzs ?? 0;
      if (ulgurjiSom > 0) return ulgurjiSom;
    }
    return kursBilanOgirish(dollar.asl, kurs);
  }
  const narx = item.modification?.price;
  const chakana = musbat(narx?.retailPrice, narx?.sellingPrice, item.sellingPrice, item.price, narx?.wholesalePrice);
  const ulgurji = musbat(narx?.wholesalePrice);
  return narxTuri === "ulgurji" && ulgurji > 0 ? ulgurji : chakana;
}

function narxlarniBirlashtirish(a?: QoldiqTanlovi["modification"], b?: QoldiqTanlovi["modification"]) {
  const narx = {
    costPrice: musbat(a?.price?.costPrice, b?.price?.costPrice),
    retailPrice: musbat(a?.price?.retailPrice, b?.price?.retailPrice),
    wholesalePrice: musbat(a?.price?.wholesalePrice, b?.price?.wholesalePrice),
    sellingPrice: musbat(a?.price?.sellingPrice, b?.price?.sellingPrice, a?.price?.retailPrice, b?.price?.retailPrice),
  };
  // Hech qanday narx yo'q bo'lsa, keyingi bosqichda katalogdan to'ldirish uchun undefined qoldiriladi.
  return narx.retailPrice || narx.wholesalePrice || narx.sellingPrice ? narx : undefined;
}

// Ombor qoldig'ini (miqdor) katalog ma'lumotlari (nom, narx) bilan birlashtiradi.
// Ikkala manbadan ham bo'sh/0 qiymatlar haqiqiy qiymatni bosib ketmaydi.
export function qoldiqBirlashtirish(omborQoldiq: QoldiqTanlovi[], katalog: QoldiqTanlovi[]) {
  const xarita = new Map<string, QoldiqTanlovi>();

  katalog.forEach((item) => {
    if (item.modificationId) xarita.set(item.modificationId, item);
  });

  omborQoldiq.forEach((item) => {
    if (!item.modificationId) return;
    const katalogdagi = xarita.get(item.modificationId);
    const mod = item.modification;
    const katMod = katalogdagi?.modification;
    const mahsulotNom = toza(mod?.product?.name) || toza(katMod?.product?.name);

    xarita.set(item.modificationId, {
      ...katalogdagi,
      ...item,
      valyuta: katalogdagi?.valyuta ?? item.valyuta,
      narxAniq: katalogdagi?.narxAniq ?? item.narxAniq,
      sellingPrice: musbat(item.sellingPrice, item.price, katalogdagi?.sellingPrice, katalogdagi?.price),
      price: musbat(item.price, item.sellingPrice, katalogdagi?.price, katalogdagi?.sellingPrice),
      modification: {
        ...katMod,
        ...mod,
        id: mod?.id ?? katMod?.id ?? item.modificationId,
        name: toza(mod?.name) || toza(katMod?.name) || undefined,
        barcode: mod?.barcode || katMod?.barcode,
        article: mod?.article || katMod?.article,
        product: {
          id: mod?.product?.id || katMod?.product?.id || item.productId || "",
          name: mahsulotNom,
        },
        price: narxlarniBirlashtirish(mod, katMod),
      },
    });
  });

  return Array.from(xarita.values());
}

export function tanlovKaliti(modificationId: string, warehouseId: string) {
  return `${modificationId}::${warehouseId}`;
}

// Dollarda saqlangan narxi bor mahsulot bo'lsa, savatcha elementiga qo'shiladigan maydonlar (aks holda bo'sh obyekt).
// Ikki valyuta rejimida faqat kurs bor bo'lsa (backend `valyuta`ni shunda beradi) ishlaydi.
// Chakana va ulgurji narxlarning valyutalari alohida: dollarda bo'lmagan narx uchun asl dollar narxi 0 (qator so'mda ketadi).
// "Faqat so'm" rejimida maydonlar birlik (pochka) narxini to'g'ri o'girish uchun saqlanadi, qator esa so'mda ketadi.
// "Faqat dollar" rejimida savatcha dollarda: asl narxlar kurs 1 bilan (o'girilmaydi). Ulgurji narx so'mda alohida belgilangan bo'lsa —
// `ulgurjiSomda` (ulgurji turida sotilmaydi); ulgurji narx umuman yo'q bo'lsa — chakana dollar narxi (qoldiqNarxi ham shunday beradi),
// shunda qo'shimcha birlik (pochka) ulgurji narxi ham dollar yo'lidan, butun songa yaxlitlanmasdan hisoblanadi ($1.25 × 3 = $3.75).
export function dollarMalumoti(item: QoldiqTanlovi, rejim: PosNarxRejimi = IKKI_VALYUTA) {
  const dollar = item.valyuta;
  if (rejim.rejim === "USD_ONLY") {
    const aslNarx = dollar?.currency === "USD" && dollar.asl > 0 ? dollar.asl : 0;
    const ulgurjiDollar = ulgurjiDollardami(dollar) ? Math.max(dollar?.ulgurjiAsl ?? 0, 0) : 0;
    const ulgurjiSomda = !ulgurjiDollar && somdagiUlgurji(item) > 0;
    const aslUlgurjiNarx = ulgurjiDollar || (ulgurjiSomda ? 0 : aslNarx);
    if (!aslNarx && !aslUlgurjiNarx) return {};
    return { valyuta: "USD" as const, aslNarx, aslUlgurjiNarx, kurs: 1, ...(ulgurjiSomda ? { ulgurjiSomda: true } : {}) };
  }
  // "Faqat so'm" rejimida narxda kurs kelmasa do'konning amaldagi kursi; so'mdagi qiymat (…Uzs) shart emas — kurs bilan hisoblanadi.
  const somRejimi = rejim.rejim === "UZS_ONLY";
  const kurs = dollar?.kurs || (somRejimi ? rejim.kurs : 0) || 0;
  if (!dollar || !kurs) return {};
  const chakanaDollarda = dollar.currency === "USD" && (somRejimi || Boolean(dollar.uzs)) && dollar.asl > 0;
  const ulgurjiDollarda = ulgurjiDollardami(dollar) && (dollar.ulgurjiAsl ?? 0) > 0 && (somRejimi || Boolean(dollar.ulgurjiUzs));
  if (!chakanaDollarda && !ulgurjiDollarda) return {};
  // Ulgurji narx so'mda alohida belgilangan bo'lsa (ulgurji tanlanganda chakana dollar narxiga qaytilmasligi uchun) belgilanadi.
  const ulgurjiSomda = !ulgurjiDollarda && (dollar.ulgurjiUzs ?? 0) > 0;
  return {
    valyuta: "USD" as const,
    aslNarx: chakanaDollarda ? dollar.asl : 0,
    aslUlgurjiNarx: ulgurjiDollarda ? (dollar.ulgurjiAsl ?? 0) : 0,
    kurs,
    ...(ulgurjiSomda ? { ulgurjiSomda: true } : {}),
  };
}
