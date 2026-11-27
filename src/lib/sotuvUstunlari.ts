// Yangi sotuv: mahsulotlar jadvalidagi ustunlar tartibi (foydalanuvchi o'zi sudrab o'zgartiradi). № , Jami va o'chirish joyida qoladi.

export type SotuvUstuni = "mahsulot" | "katalog" | "sotuvNarxi" | "miqdor" | "chegirma";

export const STANDART_SOTUV_USTUNLARI: readonly SotuvUstuni[] = ["mahsulot", "katalog", "sotuvNarxi", "miqdor", "chegirma"];

/** Katta ekrandagi kengliklar (mahsulot eng keng — uzun nomlar sig'sin). */
const KENGLIKLAR: Record<SotuvUstuni, string> = {
  mahsulot: "minmax(0,2.4fr)",
  katalog: "minmax(150px,1.2fr)",
  sotuvNarxi: "minmax(88px,1fr)",
  miqdor: "minmax(64px,0.7fr)",
  chegirma: "minmax(150px,1.25fr)",
};

export const SOTUV_USTUN_KALITI = "yepost-sotuv-ustunlar";

/** grid-template-columns: № · (foydalanuvchi tartibidagi ustunlar) · Jami · o'chirish. */
export function ustunShabloni(tartib: readonly SotuvUstuni[]): string {
  return ["32px", ...tartib.map((kalit) => KENGLIKLAR[kalit]), "minmax(96px,0.9fr)", "40px"].join(" ");
}

/** Saqlangan qiymat: noma'lum/takror ustun tashlanadi, yetishmagani standart joyiga qo'shiladi; buzilgan — null. */
export function ustunTartibiniTahlil(xom: string | null): SotuvUstuni[] | null {
  if (!xom) return null;
  let qiymat: unknown;
  try {
    qiymat = JSON.parse(xom);
  } catch {
    return null;
  }
  if (!Array.isArray(qiymat)) return null;
  const tartib: SotuvUstuni[] = [];
  for (const kalit of qiymat) {
    if (STANDART_SOTUV_USTUNLARI.includes(kalit as SotuvUstuni) && !tartib.includes(kalit as SotuvUstuni)) tartib.push(kalit as SotuvUstuni);
  }
  if (!tartib.length) return null;
  // Yetishmagan ustun standart tartibdagi qo'shnisidan keyin qo'yiladi (birinchisi bo'lsa — boshiga).
  STANDART_SOTUV_USTUNLARI.forEach((kalit, orin) => {
    if (tartib.includes(kalit)) return;
    const oldingi = orin > 0 ? tartib.indexOf(STANDART_SOTUV_USTUNLARI[orin - 1]) : -1;
    tartib.splice(oldingi + 1, 0, kalit);
  });
  return tartib;
}

/** `kalit` ustunini `yangiOrin` ga ko'chiradi (chegaradan chiqsa chetga); o'zgarmasa o'sha massiv qaytadi. */
export function ustunniKochirish<K extends string>(tartib: readonly K[], kalit: K, yangiOrin: number): K[] {
  const eski = tartib.indexOf(kalit);
  if (eski < 0) return [...tartib];
  const orin = Math.max(0, Math.min(tartib.length - 1, yangiOrin));
  if (orin === eski) return tartib as K[];
  const natija = tartib.filter((k) => k !== kalit);
  natija.splice(orin, 0, kalit);
  return natija;
}

export function standartTartibmi(tartib: readonly SotuvUstuni[]): boolean {
  return tartib.length === STANDART_SOTUV_USTUNLARI.length && tartib.every((kalit, i) => kalit === STANDART_SOTUV_USTUNLARI[i]);
}
