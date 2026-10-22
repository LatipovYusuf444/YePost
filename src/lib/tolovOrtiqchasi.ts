// Tasdiqlangan sotuvga keyingi to'lov qarzdan oshganda (backend, 2026-10-21): NAQD to'lovda qarz yopiladi, ortgan pul so'mda qaytim bo'ladi
// (so'm kassasidan REFUND bo'lib yoziladi) yoki `keepExcess: true` bilan mijoz hisobiga o'tadi. Karta, bank va hisobdan to'lov qarzdan oshmaydi.
// `POST /sales/:id/payments` va `POST /finance/debt-repayment` shu ikki ixtiyoriy maydonni (`roundChange`, `keepExcess`) qabul qiladi.
// UI'siz va tashqi importlarsiz yozilgan — alohida sinash mumkin.

export type OrtiqchaQatori = {
  /** CASH | CARD | BANK | BALANCE | DEBT. */
  paymentType: string;
  /** Qatorning sotuv valyutasidagi qiymati (boshqa valyutadagi to'lov bugungi kurs bilan o'girilgan). */
  qiymat: number;
};

export type OrtiqchaTahlili = {
  /** Qarzdan ortgan pul, sotuv valyutasida. Chegaradan oshmasa (yaxlitlash shovqini) — 0. */
  ortiqcha: number;
  /** Ortiqchani boshlagan qatorning indeksi (qatorlar yuboriladigan tartibda); ortiqcha bo'lmasa -1. */
  birinchiOshgan: number;
  /** Ortiqchani naqd bo'lmagan to'lov (karta, bank, hisob) hosil qilyapti — backend 400 bilan rad etadi. */
  naqdEmas: boolean;
};

/**
 * Qatorlar ketma-ket yuborilganda qaysi biri qarzdan oshishini aniqlaydi. `avvalTolangan` — sotuvda allaqachon to'langan (qarzdan
 * oshmaydigan) qism: jami to'langani emas, shuning uchun oldingi qaytimli to'lovlar yangi ortiqcha bo'lib ko'rinmaydi.
 */
export function ortiqchaTahlili(p: {
  jami: number;
  avvalTolangan: number;
  qatorlar: readonly OrtiqchaQatori[];
  /** Shu miqdorgacha farq ortiqcha hisoblanmaydi (boshqa valyutadagi to'lovni yaxlitlash). */
  chegara: number;
}): OrtiqchaTahlili {
  let yigindi = p.avvalTolangan;
  let birinchiOshgan = -1;
  let naqdEmas = false;
  p.qatorlar.forEach((qator, indeks) => {
    if (!(qator.qiymat > 0)) return;
    yigindi += qator.qiymat;
    if (yigindi - p.jami > p.chegara) {
      if (birinchiOshgan === -1) birinchiOshgan = indeks;
      if (qator.paymentType !== "CASH") naqdEmas = true;
    }
  });
  const farq = yigindi - p.jami;
  return { ortiqcha: farq > p.chegara ? farq : 0, birinchiOshgan, naqdEmas };
}

/** Dollar qatnashdimi: sotuv dollarda yoki qatorlardan biri dollarda (shunda qaytim mingtagacha yaxlitlanishi mumkin). */
export function dollarQatnashdimi(sotuvValyutasi: string, qatorValyutalari: readonly string[]): boolean {
  return sotuvValyutasi === "USD" || qatorValyutalari.some((valyuta) => valyuta === "USD");
}

/**
 * Mijozga beriladigan qaytim, so'mda (taxminiy: yakuniy summani server hisoblaydi). Qaytim doim so'mda beriladi; sotuv dollarda bo'lsa
 * bugungi kurs bilan o'giriladi (kurs yo'q bo'lsa 0 — hisoblab bo'lmaydi). Dollar qatnashsa va yaxlitlash yoqilgan bo'lsa — eng yaqin minggacha.
 */
export function qaytimSomda(p: {
  ortiqcha: number;
  sotuvValyutasi: string;
  kurs: number;
  dollarQatnashdi: boolean;
  yaxlitlash: boolean;
}): number {
  if (!(p.ortiqcha > 0)) return 0;
  const som = p.sotuvValyutasi === "USD" ? (p.kurs > 0 ? p.ortiqcha * p.kurs : 0) : p.ortiqcha;
  if (!(som > 0)) return 0;
  return p.dollarQatnashdi && p.yaxlitlash ? Math.round(som / 1000) * 1000 : Math.round(som);
}

export type OrtiqchaMaydonlari = { keepExcess?: true; roundChange?: false };

/**
 * So'rovga qo'shiladigan maydonlar. Faqat ortiqcha bor bo'lsagina va faqat standartdan farq qilganda yuboriladi:
 * `keepExcess: true` — hisobga o'tkazish (mijozsiz sotuvda backend 400 beradi, shuning uchun mijoz bo'lmasa yuborilmaydi),
 * `roundChange: false` — dollar qatnashganda aniq qaytim (yaxlitlamasdan).
 */
export function ortiqchaMaydonlari(p: {
  ortiqcha: number;
  hisobgaYozish: boolean;
  mijozBor: boolean;
  dollarQatnashdi: boolean;
  yaxlitlash: boolean;
}): OrtiqchaMaydonlari {
  if (!(p.ortiqcha > 0)) return {};
  if (p.hisobgaYozish && p.mijozBor) return { keepExcess: true };
  return p.dollarQatnashdi && !p.yaxlitlash ? { roundChange: false } : {};
}

/** Qaytim doim so'mda beriladi: ko'rinish valyutasiga o'girilmaydi ("339 000 so'm"). */
export function somMatni(qiymat: number, somBelgisi: string): string {
  return `${Math.round(qiymat).toLocaleString("uz-UZ")} ${somBelgisi}`;
}

/**
 * Summa o'z valyutasida, ko'rinish valyutasiga (sarlavhadagi so'm/dollar) o'girilmasdan: "$12.5" yoki "728 000 so'm". Sotuv hujjati o'z valyutasida
 * (`sale.currency`) yuritiladi, ko'rinish valyutasi esa bugungi kurs bilan o'giradi — tahrirlash oynalarida ikkalasi aralashmasligi kerak.
 */
export function valyutadaMatn(miqdor: number, valyuta: string, somBelgisi: string): string {
  return valyuta === "USD" ? `$${miqdor.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}` : somMatni(miqdor, somBelgisi);
}

/** To'lov natijasi: mijozga qaytim (so'mda) va mijoz hisobiga o'tgan pul. Ikkalasi ham yo'q bo'lsa 0. */
export type TolovNatijasi = { qaytim: number; hisobga: number };

type Obyekt = Record<string, unknown>;

function obyekt(qiymat: unknown): Obyekt | null {
  return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : null;
}

function musbatSon(qiymat: unknown): number {
  if (qiymat === undefined || qiymat === null || qiymat === "") return 0;
  const son = Number(typeof qiymat === "string" ? qiymat.replace(/\s/g, "").replace(",", ".") : qiymat);
  return Number.isFinite(son) && son > 0 ? son : 0;
}

/**
 * `POST /sales/:id/payments` (`change`, `keptAmount`) va `POST /finance/debt-repayment` (`change`, `excessToBalance`) javobidan natija.
 * Maydonlar javob ildizida yoki `data` ichida kelishi mumkin; "0" va yo'q maydon — 0.
 */
export function tolovNatijasi(raw: unknown): TolovNatijasi {
  const asosiy = obyekt(raw);
  const ichki = obyekt(asosiy?.data);
  const olish = (...kalitlar: string[]) => {
    for (const kalit of kalitlar) {
      const qiymat = musbatSon(ichki?.[kalit] ?? asosiy?.[kalit]);
      if (qiymat > 0) return qiymat;
    }
    return 0;
  };
  return { qaytim: olish("change"), hisobga: olish("keptAmount", "excessToBalance") };
}

/** Ketma-ket yuborilgan to'lovlar natijalarini qo'shadi. */
export function natijalarYigindisi(natijalar: readonly TolovNatijasi[]): TolovNatijasi {
  return natijalar.reduce(
    (yigindi, natija) => ({ qaytim: yigindi.qaytim + natija.qaytim, hisobga: yigindi.hisobga + natija.hisobga }),
    { qaytim: 0, hisobga: 0 }
  );
}

/** Sotuvning saqlangan to'lov qatorlari bo'yicha jami qaytim (`changeAmount`, so'mda) va hisobga o'tgan pul (`keptAmount`). */
export function tolovlarQaytimi(tolovlar: ReadonlyArray<{ changeAmount?: unknown; keptAmount?: unknown }> | null | undefined): TolovNatijasi {
  return natijalarYigindisi(
    (tolovlar ?? []).map((tolov) => ({ qaytim: musbatSon(tolov.changeAmount), hisobga: musbatSon(tolov.keptAmount) }))
  );
}
