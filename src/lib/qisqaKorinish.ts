// "Qisqa ko'rinish" sozlamasi: Sotuv yaratish oynasi va Sotuv tafsiloti oynasi uchun BITTA, foydalanuvchi bo'yicha saqlanadigan tanlov.
// Faqat ko'rinish — kartalar/matnlar yashirilganda qiymatlar, hisob va saqlash o'zgarmaydi. Xatolar, maydon nomlari va muhim
// ogohlantirishlar bu ro'yxatga kirmaydi (doim ko'rinadi). UI'siz va `@/` importlarisiz — testlarda ishlaydi.

/** Qayerda ishlaydi: yaratish oynasida, tafsilotda yoki ikkalasida. */
export type Qamrov = "ikkalasi" | "yaratish" | "tafsilot";

export const QISQA_KARTALAR = [
  { kalit: "shtrixkod", qamrov: "yaratish" },
  { kalit: "katalogImport", qamrov: "yaratish" },
  { kalit: "narxTuri", qamrov: "yaratish" },
  { kalit: "umumiyBirlik", qamrov: "yaratish" },
  { kalit: "umumiyChegirma", qamrov: "ikkalasi" },
  { kalit: "izoh", qamrov: "ikkalasi" },
  { kalit: "xulosa", qamrov: "ikkalasi" },
  { kalit: "jarayon", qamrov: "tafsilot" },
  { kalit: "telegram", qamrov: "tafsilot" },
] as const satisfies ReadonlyArray<{ kalit: string; qamrov: Qamrov }>;

export const QISQA_MATNLAR = [
  { kalit: "qoldiq", qamrov: "yaratish" },
  { kalit: "birlik", qamrov: "yaratish" },
  { kalit: "mijozIzohi", qamrov: "yaratish" },
  { kalit: "bosqichTavsifi", qamrov: "ikkalasi" },
  { kalit: "chegirmaIzohi", qamrov: "yaratish" },
  { kalit: "kartaIzohi", qamrov: "yaratish" },
  { kalit: "klaviatura", qamrov: "yaratish" },
  { kalit: "tolovIzohi", qamrov: "ikkalasi" },
  { kalit: "sarlavhaIzohi", qamrov: "tafsilot" },
  { kalit: "yordamchi", qamrov: "tafsilot" },
] as const satisfies ReadonlyArray<{ kalit: string; qamrov: Qamrov }>;

export type QisqaKarta = (typeof QISQA_KARTALAR)[number]["kalit"];
export type QisqaMatn = (typeof QISQA_MATNLAR)[number]["kalit"];
export type QisqaKorinish = { kartalar: Record<QisqaKarta, boolean>; matnlar: Record<QisqaMatn, boolean> };

/**
 * Boshlang'ich Qisqa ko'rinish: ixtiyoriy kartalar yopiq. Qisqa va foydali matnlar (qoldiq, narx birligi, mijoz izohi, bosqich
 * tavsiflari) ochiq; uzun tushuntirishlar (klaviatura, chegirma va karta izohlari, to'lov izohi, sarlavha izohi, bo'sh joy
 * belgilari) yopiq.
 */
export const STANDART_QISQA: QisqaKorinish = {
  kartalar: Object.fromEntries(QISQA_KARTALAR.map(({ kalit }) => [kalit, false])) as Record<QisqaKarta, boolean>,
  matnlar: {
    qoldiq: true,
    birlik: true,
    mijozIzohi: true,
    bosqichTavsifi: true,
    chegirmaIzohi: false,
    kartaIzohi: false,
    klaviatura: false,
    tolovIzohi: false,
    sarlavhaIzohi: false,
    yordamchi: false,
  },
};

export const QISQA_KORINISH_KALITI = "yepost-qisqa-korinish";

/** Saqlangan qiymat → to'liq sozlama: noma'lum kalitlar tashlanadi, yetishmaganlari standartdan olinadi; buzilgani — null. */
export function qisqaKorinishniTahlil(xom: unknown): QisqaKorinish | null {
  let obyekt = xom;
  if (typeof obyekt === "string") {
    try {
      obyekt = JSON.parse(obyekt);
    } catch {
      return null;
    }
  }
  if (!obyekt || typeof obyekt !== "object" || Array.isArray(obyekt)) return null;
  const { kartalar, matnlar } = obyekt as { kartalar?: unknown; matnlar?: unknown };
  if ((kartalar && typeof kartalar !== "object") || (matnlar && typeof matnlar !== "object")) return null;
  const olish = <K extends string>(manba: unknown, kalitlar: readonly { kalit: K }[], standart: Record<K, boolean>) =>
    Object.fromEntries(
      kalitlar.map(({ kalit }) => {
        const qiymat = (manba as Record<string, unknown> | undefined)?.[kalit];
        return [kalit, typeof qiymat === "boolean" ? qiymat : standart[kalit]];
      })
    ) as Record<K, boolean>;
  return {
    kartalar: olish(kartalar, QISQA_KARTALAR, STANDART_QISQA.kartalar),
    matnlar: olish(matnlar, QISQA_MATNLAR, STANDART_QISQA.matnlar),
  };
}

export function teng(a: QisqaKorinish, b: QisqaKorinish): boolean {
  return (
    QISQA_KARTALAR.every(({ kalit }) => a.kartalar[kalit] === b.kartalar[kalit]) &&
    QISQA_MATNLAR.every(({ kalit }) => a.matnlar[kalit] === b.matnlar[kalit])
  );
}

/** Rejim va sozlama bo'yicha ko'rinish: To'liq rejimda hammasi ko'rinadi. */
export function kartaKorinadimi(qisqa: boolean, korinish: QisqaKorinish, kalit: QisqaKarta): boolean {
  return !qisqa || korinish.kartalar[kalit];
}

export function matnKorinadimi(qisqa: boolean, korinish: QisqaKorinish, kalit: QisqaMatn): boolean {
  return !qisqa || korinish.matnlar[kalit];
}
