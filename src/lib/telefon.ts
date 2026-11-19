// Telefon raqami davlatlari (backend 18.11 common/utils/phone.ts bilan bir xil): mijoz, yetkazib beruvchi va mijoz kompaniyasi telefoni
// `+<kod><raqam>` ko'rinishida saqlanadi. O'zbekiston raqami kodsiz ham (9 ta raqam) qabul qilinadi, boshqalari faqat kod bilan.
// UI'siz — alohida sinaladi.

export type TelefonDavlati = {
  kod: string;
  // Davlat qisqa nomi (bayroq emoji Windows'da harf bo'lib chiqadi — matn ishlatiladi).
  qisqa: string;
  // Koddan keyingi raqamlar soni.
  uzunlik: number;
  // Ko'rinishdagi guruhlar ("90 123 45 67").
  guruhlar: readonly number[];
};

/** Tanlov tartibi: O'zbekiston birinchi. Rossiya va Qozog'iston bir xil +7. */
export const TELEFON_DAVLATLARI: readonly TelefonDavlati[] = [
  { kod: "998", qisqa: "UZ", uzunlik: 9, guruhlar: [2, 3, 2, 2] },
  { kod: "7", qisqa: "RU/KZ", uzunlik: 10, guruhlar: [3, 3, 2, 2] },
  { kod: "993", qisqa: "TM", uzunlik: 8, guruhlar: [2, 6] },
  { kod: "992", qisqa: "TJ", uzunlik: 9, guruhlar: [2, 3, 4] },
  { kod: "93", qisqa: "AF", uzunlik: 9, guruhlar: [2, 3, 4] },
  { kod: "996", qisqa: "KG", uzunlik: 9, guruhlar: [3, 3, 3] },
];

export const OZBEKISTON = TELEFON_DAVLATLARI[0];

// Uzun kod birinchi tekshiriladi: "+993…" "+99…" emas, "+93…" "+9…" emas.
const KOD_TARTIBI = [...TELEFON_DAVLATLARI].sort((a, b) => b.kod.length - a.kod.length);

export function davlatKodBilan(kod: string) {
  return TELEFON_DAVLATLARI.find((davlat) => davlat.kod === kod) ?? OZBEKISTON;
}

type AjratilganTelefon = { davlat: TelefonDavlati; milliy: string };

/** Raqamlar qaysi davlat kodi bilan boshlanadi (uzun kod birinchi). */
export function kodBilanBoshlanadi(raqamlar: string) {
  return KOD_TARTIBI.find((item) => raqamlar.startsWith(item.kod));
}

/**
 * "+"siz yozilgan to'liq raqam (backend normalizePhone qabul qiladigan shakllar): "998" + 9 ta, eski "8998" + 9 ta, O'zbekiston "0" + 9 ta,
 * yoki boshqa davlat kodi + shu davlat uzunligi ("79123456789", "99365123456"). Tanilmasa — null.
 */
export function toliqRaqamShakli(raqamlar: string): AjratilganTelefon | null {
  if (raqamlar.length === 13 && raqamlar.startsWith("8998")) return { davlat: OZBEKISTON, milliy: raqamlar.slice(4) };
  if (raqamlar.length === 12 && raqamlar.startsWith("998")) return { davlat: OZBEKISTON, milliy: raqamlar.slice(3) };
  if (raqamlar.length === 10 && raqamlar.startsWith("0")) return { davlat: OZBEKISTON, milliy: raqamlar.slice(1) };
  const toliq = KOD_TARTIBI.find((item) => item !== OZBEKISTON && raqamlar.length === item.kod.length + item.uzunlik && raqamlar.startsWith(item.kod));
  return toliq ? { davlat: toliq, milliy: raqamlar.slice(toliq.kod.length) } : null;
}

/**
 * Telefon matnini davlat va milliy raqamlarga ajratadi. "+" bilan boshlangan yoki kodi bilan to'liq raqam — shu davlat; aks holda
 * O'zbekiston (kodsiz 9 ta raqam, "998…", eski "8998…", "0…"). Milliy qism davlat uzunligidan oshmaydi.
 */
export function telefonniAjratish(qiymat: string | null | undefined): AjratilganTelefon {
  const matn = (qiymat ?? "").trim();
  let raqamlar = matn.replace(/\D/g, "");
  if (raqamlar.startsWith("8998") && raqamlar.length === 13) raqamlar = raqamlar.slice(1);
  const plyus = matn.startsWith("+");
  if (raqamlar.startsWith("998") && (plyus || raqamlar.length === 12)) return { davlat: OZBEKISTON, milliy: raqamlar.slice(3, 12) };
  if (plyus) {
    const davlat = kodBilanBoshlanadi(raqamlar);
    if (davlat) return { davlat, milliy: raqamlar.slice(davlat.kod.length, davlat.kod.length + davlat.uzunlik) };
  }
  const toliq = toliqRaqamShakli(raqamlar);
  if (toliq) return toliq;
  return { davlat: OZBEKISTON, milliy: raqamlar.slice(0, OZBEKISTON.uzunlik) };
}

/**
 * Maydonga yopishtirilgan (yoki brauzer avto-to'ldirgan) matn: "+kod…" — shu davlat; kodsiz to'liq shakl ("998…", "8998…", "0…",
 * "79…") — o'z davlati; qolgani tanlangan davlatda (uzunligigacha).
 */
export function kiritilganTelefon(matn: string, joriy: TelefonDavlati): AjratilganTelefon {
  const toza = matn.trim();
  const raqamlar = toza.replace(/\D/g, "");
  if (toza.startsWith("+") && kodBilanBoshlanadi(raqamlar)) return telefonniAjratish(toza);
  if (raqamlar.length > joriy.uzunlik) {
    const toliq = toliqRaqamShakli(raqamlar);
    if (toliq) return toliq;
  }
  return { davlat: joriy, milliy: raqamlar.slice(0, joriy.uzunlik) };
}

/** "+", "+9", "+99" — hali birorta davlat kodi bo'lishi mumkin bo'lgan boshlanish (kod to'liq yozilmagan). */
export function kodYozilmoqda(matn: string) {
  const toza = matn.trim();
  if (!toza.startsWith("+")) return false;
  const raqamlar = toza.replace(/\D/g, "");
  return !kodBilanBoshlanadi(raqamlar) && TELEFON_DAVLATLARI.some((item) => item.kod.startsWith(raqamlar));
}

/** Milliy raqamlarni davlat guruhlariga bo'ladi ("901234567" → "90 123 45 67"). */
export function milliyKorinish(davlat: TelefonDavlati, milliy: string) {
  const qismlar: string[] = [];
  let boshi = 0;
  for (const uzunlik of davlat.guruhlar) {
    const qism = milliy.slice(boshi, boshi + uzunlik);
    if (qism) qismlar.push(qism);
    boshi += uzunlik;
  }
  return qismlar.join(" ");
}

/** Saqlanadigan qiymat: "+<kod><milliy>", bo'sh raqamda "". */
export function telefonQiymati(davlat: TelefonDavlati, milliy: string) {
  return milliy ? `+${davlat.kod}${milliy}` : "";
}

/** Backend qabul qiladigan to'liq raqammi (`+<kod>` va to'g'ri uzunlik). */
export function toliqTelefonmi(qiymat: string | null | undefined) {
  const matn = (qiymat ?? "").replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(matn)) return false;
  const { davlat, milliy } = telefonniAjratish(matn.startsWith("+") ? matn : `+${matn}`);
  return milliy.length === davlat.uzunlik && `+${davlat.kod}${milliy}` === (matn.startsWith("+") ? matn : `+${matn}`);
}

/** Ro'yxatdagi ko'rinish: "+79123456789" → "+7 912 345 67 89"; tanilmagan raqam o'zgarmaydi. */
export function telefonniFormatlash(telefon: string | null | undefined) {
  const matn = telefon ?? "";
  if (!toliqTelefonmi(matn)) return matn;
  const { davlat, milliy } = telefonniAjratish(matn.trim().startsWith("+") ? matn : `+${matn.replace(/\D/g, "")}`);
  return `+${davlat.kod} ${milliyKorinish(davlat, milliy)}`;
}
