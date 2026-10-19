// Aralash (so'm + dollar) sotuv uchun hisob-kitob funksiyalari. UI yo'q — alohida sinash mumkin.
//
// Savatcha va ekrandagi barcha hisob-kitob so'mda yuritiladi (dollar mahsulotning so'mdagi narxi bugungi kurs bilan olingan).
// Backendga esa dollarda saqlangan mahsulot qatori o'z valyutasida (USD, asl dollar narxi) yuboriladi, to'lov esa
// so'm va dollar qismlariga bo'linadi; backend hammasini tasdiqlash kunidagi kurs bilan o'giradi, qaytim so'mda beriladi.

export type NarxTuri = "chakana" | "ulgurji";

type DollarMaydonlari = {
  valyuta?: "USD";
  aslNarx?: number;
  aslUlgurjiNarx?: number;
  /** Ulgurji narx so'mda alohida belgilangan (chakana dollarda bo'lsa ham ulgurji tanlanganda qator so'mda ketadi). */
  ulgurjiSomda?: boolean;
  kurs?: number;
};

export type DollarQatori = { narx: number; kurs: number };

/**
 * Tanlangan narx turi dollarda saqlangan bo'lsa, uning asl dollar narxi va kursi; aks holda null (qator so'mda).
 * Chakana va ulgurji narxlarning valyutalari alohida; ulgurji narx umuman belgilanmagan bo'lsa chakana narxga qaytiladi.
 */
export function dollarNarxi(item: DollarMaydonlari, narxTuri: NarxTuri): DollarQatori | null {
  if (item.valyuta !== "USD") return null;
  const kurs = Number(item.kurs) || 0;
  const ulgurjiDollar = item.aslUlgurjiNarx ?? 0;
  const ulgurji = narxTuri === "ulgurji" && (ulgurjiDollar > 0 || item.ulgurjiSomda === true);
  const asl = ulgurji ? ulgurjiDollar : (item.aslNarx ?? 0);
  return kurs > 0 && asl > 0 ? { narx: asl, kurs } : null;
}

/** Sentgacha yaxlitlash (dollar uchun). */
export function sentgaYaxlitlash(son: number) {
  return Math.round(son * 100) / 100;
}

/** Dollar qiymati (sentda) so'mda necha bo'ladi (butun so'mgacha yaxlitlanadi). */
export function dollarniSomga(sent: number, kurs: number) {
  return Math.round((sent / 100) * kurs);
}

type QatorMalumoti = {
  modificationId: string;
  quantity: number;
  /** So'mdagi katalog narxi. */
  price: number;
  /** So'mdagi jami chegirma (narx chegirmasi + umumiy chegirma ulushi). */
  discount: number;
  dollar: DollarQatori | null;
  /** Qator narx turi; berilmasa maydon yuborilmaydi. */
  priceType?: "RETAIL" | "WHOLESALE";
  /** Qo'shimcha birlik (pochka): `quantity` va narx shu birlikda; asosiy birlikda berilmaydi. */
  unitId?: string;
};

export type SotuvQatori = {
  modificationId: string;
  quantity: number;
  price: number;
  discount: number;
  currency?: "USD";
  priceType?: "RETAIL" | "WHOLESALE";
  unitId?: string;
};

/** Backendga ketadigan qator: dollar mahsulot o'z valyutasida (asl narx va dollardagi chegirma), qolganlari avvalgidek so'mda. */
export function sotuvQatori(qator: QatorMalumoti): SotuvQatori {
  const narxTuri = { ...(qator.priceType ? { priceType: qator.priceType } : {}), ...(qator.unitId ? { unitId: qator.unitId } : {}) };
  if (!qator.dollar) {
    return { modificationId: qator.modificationId, quantity: qator.quantity, price: qator.price, discount: qator.discount, ...narxTuri };
  }
  return {
    modificationId: qator.modificationId,
    quantity: qator.quantity,
    price: qator.dollar.narx,
    discount: sentgaYaxlitlash(qator.discount / qator.dollar.kurs),
    currency: "USD",
    ...narxTuri,
  };
}

/** POS narx turi (chakana/ulgurji) → backend `priceType`. */
export function narxTuriKodi(narxTuri: NarxTuri): "RETAIL" | "WHOLESALE" {
  return narxTuri === "ulgurji" ? "WHOLESALE" : "RETAIL";
}

export type TolovUlushi = {
  /** So'mdagi qism (so'm). */
  uzs: number;
  /** Dollardagi qism (sent). */
  usdSent: number;
};

/**
 * So'm va dollar to'lovni omborlar (alohida sotuvlar) orasida taqsimlaydi: avval dollar, keyin so'm bilan ketma-ket to'ldiriladi.
 * Dollar qismi sotuvning so'mdagi ulushidan oshmaydi (oxirgi sotuv bundan mustasno — qaytim shu yerda hisoblanadi).
 * `guruhSoflari` — har sotuvning so'mdagi to'lanadigan summasi.
 */
export function aralashTolovniTaqsimlash(guruhSoflari: number[], uzs: number, usdSent: number, kurs: number): TolovUlushi[] {
  let uzsQoldi = uzs;
  let sentQoldi = usdSent;
  return guruhSoflari.map((ehtiyoj, index) => {
    const oxirgi = index === guruhSoflari.length - 1;
    const sent = sentQoldi > 0 ? (oxirgi ? sentQoldi : Math.min(sentQoldi, Math.floor((ehtiyoj / kurs) * 100))) : 0;
    sentQoldi -= sent;
    const dollarSomda = dollarniSomga(sent, kurs);
    const som = oxirgi ? uzsQoldi : Math.min(uzsQoldi, Math.max(ehtiyoj - dollarSomda, 0));
    uzsQoldi -= som;
    return { uzs: som, usdSent: sent };
  });
}
