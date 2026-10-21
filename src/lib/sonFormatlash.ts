// Summa kiritish maydonlari uchun: yozayotganda raqamlar guruhlanadi ("30000000" → "30 000 000"), holatda esa toza raqam matni saqlanadi
// ("30000000" yoki "1234.5"). UI'siz va importlarsiz yozilgan — alohida sinash mumkin.

const GURUH_BELGISI = " ";
const ENG_KO_P_BUTUN_XONA = 15;

/**
 * Kiritilgan matnni toza raqam matniga keltiradi: vergul nuqtaga aylanadi, raqam va (kasr bo'lsa) bitta nuqtadan boshqa belgilar tashlanadi,
 * kasr `kasr` xonagacha qisqartiriladi, ortiqcha bosh nollar ("007" → "7") olinadi. Yozilayotgan "12." saqlanadi (kasr > 0 bo'lsa).
 */
export function sonniTozalash(matn: string, kasr = 2): string {
  const oddiy = String(matn ?? "").replace(/,/g, ".").replace(/[^\d.]/g, "");
  const nuqta = oddiy.indexOf(".");
  let butun = (nuqta === -1 ? oddiy : oddiy.slice(0, nuqta)).slice(0, ENG_KO_P_BUTUN_XONA);
  butun = butun.replace(/^0+(?=\d)/, "");
  if (kasr <= 0 || nuqta === -1) return butun;
  const kasrQismi = oddiy.slice(nuqta + 1).replace(/\./g, "").slice(0, kasr);
  return `${butun || "0"}.${kasrQismi}`;
}

/** Toza matn nolmi ("0", "0.", "0.00"): maydonda boshlang'ich nol ko'rsatilmaydi — faqat placeholder turadi. Bo'sh matn nol emas. */
export function nolmi(toza: string): boolean {
  return toza !== "" && Number(toza) === 0;
}

/** Toza raqam matnini ko'rinish uchun guruhlaydi: "30000000" → "30 000 000", "1234.5" → "1 234.5", "12." → "12.". */
export function sonniGuruhlash(toza: string | number | null | undefined): string {
  const matn = toza === null || toza === undefined ? "" : String(toza);
  if (!matn) return "";
  const nuqta = matn.indexOf(".");
  const butun = nuqta === -1 ? matn : matn.slice(0, nuqta);
  const kasr = nuqta === -1 ? "" : matn.slice(nuqta);
  return `${butun.replace(/\B(?=(\d{3})+(?!\d))/g, GURUH_BELGISI)}${kasr}`;
}

/** `pozitsiya`gacha bo'lgan raqam va nuqtalar soni (guruh bo'shliqlari hisobga olinmaydi). */
export function belgilarSoni(matn: string, pozitsiya: number): number {
  return (matn.slice(0, Math.max(pozitsiya, 0)).match(/[\d.,]/g) ?? []).length;
}

/** Guruhlangan matnda `soni` ta raqam/nuqtadan keyingi joy (kursor shu yerga qo'yiladi). */
export function kursorOrni(guruhlangan: string, soni: number): number {
  if (soni <= 0) return 0;
  let sanalgan = 0;
  for (let indeks = 0; indeks < guruhlangan.length; indeks += 1) {
    if (/[\d.]/.test(guruhlangan[indeks])) sanalgan += 1;
    if (sanalgan === soni) return indeks + 1;
  }
  return guruhlangan.length;
}

/**
 * Maydondagi o'zgarish: yangi toza qiymat va kursor oldidagi raqamlar soni. Foydalanuvchi faqat guruh bo'shlig'ini o'chirgan bo'lsa
 * ("30 |000" da Backspace), toza qiymat o'zgarmaydi — bunda bo'shliq oldidagi raqam o'chiriladi (aks holda hech narsa bo'lmayotgandek tuyuladi).
 */
export function maydonOzgarishi(p: { yozilgan: string; kursor: number; joriyToza: string; joriyKorinish: string; kasr: number }) {
  const toza = sonniTozalash(p.yozilgan, p.kasr);
  const kursordanOldin = sonniTozalash(p.yozilgan.slice(0, p.kursor), p.kasr).length;
  const faqatBoshliqOchdi = toza === p.joriyToza && p.yozilgan.length < p.joriyKorinish.length && /^\d/.test(toza);
  if (faqatBoshliqOchdi && kursordanOldin > 0) {
    const indeks = kursordanOldin - 1;
    return { toza: toza.slice(0, indeks) + toza.slice(indeks + 1), kursordanOldin: indeks };
  }
  return { toza, kursordanOldin };
}
