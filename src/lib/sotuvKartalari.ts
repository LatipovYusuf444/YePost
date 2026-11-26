// Yangi sotuv oynasidagi kartalar joylashuvi (Narx turi, Umumiy birlik, Umumiy chegirma, Yakuniy summalar): foydalanuvchi ularni
// mahsulotlar jadvalining tepasiga yoki ostiga sudraydi, tartiblaydi, keragini yashiradi. Shu brauzerda, foydalanuvchi bo'yicha
// saqlanadi (refresh va qayta kirishda ham qoladi). UI'siz va `@/` importlarisiz — testlarda ishlaydi.

export type SotuvKartasi = "narxTuri" | "umumiyBirlik" | "umumiyChegirma" | "xulosa";
export type KartaZonasi = "tepa" | "past";
export type KartalarJoylashuvi = { tepa: SotuvKartasi[]; past: SotuvKartasi[]; yashirin: SotuvKartasi[] };

export const SOTUV_KARTALARI: readonly SotuvKartasi[] = ["narxTuri", "umumiyBirlik", "umumiyChegirma", "xulosa"];
/** Yakuniy summalar yashirilmaydi (jami summa doim ko'rinishi kerak). */
export const YASHIRILMAYDIGAN: readonly SotuvKartasi[] = ["xulosa"];

export const STANDART_JOYLASHUV: KartalarJoylashuvi = { tepa: [], past: [...SOTUV_KARTALARI], yashirin: [] };

export const SOTUV_KARTALARI_KALITI = "yepost-sotuv-kartalari";

const kartami = (qiymat: unknown): qiymat is SotuvKartasi => typeof qiymat === "string" && (SOTUV_KARTALARI as readonly string[]).includes(qiymat);

/**
 * Har qanday saqlangan qiymat → yaroqli joylashuv: noma'lum va takror kalitlar tashlanadi, yashirib bo'lmaydigani yashirindan
 * chiqariladi, saqlanmagan (keyin qo'shilgan) karta pastdagi standart joyiga qo'yiladi. Buzilgan qiymat — null.
 */
export function joylashuvniTahlil(qiymat: unknown): KartalarJoylashuvi | null {
  let obyekt = qiymat;
  if (typeof obyekt === "string") {
    try {
      obyekt = JSON.parse(obyekt);
    } catch {
      return null;
    }
  }
  if (!obyekt || typeof obyekt !== "object") return null;
  const xom = obyekt as Record<string, unknown>;
  if (!Array.isArray(xom.tepa) || !Array.isArray(xom.past)) return null;
  const korilgan = new Set<SotuvKartasi>();
  const olish = (royxat: unknown) =>
    (Array.isArray(royxat) ? royxat : []).filter((kalit): kalit is SotuvKartasi => {
      if (!kartami(kalit) || korilgan.has(kalit)) return false;
      korilgan.add(kalit);
      return true;
    });
  const tepa = olish(xom.tepa);
  const past = olish(xom.past);
  const yashirin = olish(xom.yashirin);
  for (const kalit of [...yashirin]) {
    if (YASHIRILMAYDIGAN.includes(kalit)) {
      yashirin.splice(yashirin.indexOf(kalit), 1);
      past.push(kalit);
    }
  }
  SOTUV_KARTALARI.forEach((kalit, indeks) => {
    if (korilgan.has(kalit)) return;
    // Standart tartibdagi oldingi qo'shnisidan keyin (pastda); bo'lmasa boshiga.
    let joy = 0;
    for (let i = indeks - 1; i >= 0; i -= 1) {
      const oldingi = past.indexOf(SOTUV_KARTALARI[i]);
      if (oldingi >= 0) {
        joy = oldingi + 1;
        break;
      }
    }
    past.splice(joy, 0, kalit);
  });
  return { tepa, past, yashirin };
}

function olibTashlash(joylashuv: KartalarJoylashuvi, kalit: SotuvKartasi): KartalarJoylashuvi {
  return {
    tepa: joylashuv.tepa.filter((k) => k !== kalit),
    past: joylashuv.past.filter((k) => k !== kalit),
    yashirin: joylashuv.yashirin.filter((k) => k !== kalit),
  };
}

/** Kartani `zona` ning `indeks` joyiga qo'yadi (sudrab tashlash). `indeks` karta olib tashlangandan keyingi ro'yxat bo'yicha. */
export function kartaniJoylash(joylashuv: KartalarJoylashuvi, kalit: SotuvKartasi, zona: KartaZonasi, indeks: number): KartalarJoylashuvi {
  const natija = olibTashlash(joylashuv, kalit);
  const royxat = [...natija[zona]];
  royxat.splice(Math.max(0, Math.min(indeks, royxat.length)), 0, kalit);
  return { ...natija, [zona]: royxat };
}

/**
 * "Yuqoriga" / "Pastga": umumiy ketma-ketlik [tepa..., JADVAL, past...] bo'yicha bitta qadam. Tepadagi oxirgi karta pastga
 * siljisa jadval ostiga (birinchi bo'lib), pastdagi birinchi karta yuqoriga siljisa jadval tepasiga (oxirgi bo'lib) o'tadi.
 */
export function kartaniSiljitish(joylashuv: KartalarJoylashuvi, kalit: SotuvKartasi, yonalish: -1 | 1): KartalarJoylashuvi {
  const tepaIndeks = joylashuv.tepa.indexOf(kalit);
  const pastIndeks = joylashuv.past.indexOf(kalit);
  if (tepaIndeks >= 0) {
    if (yonalish === -1) return tepaIndeks === 0 ? joylashuv : kartaniJoylash(joylashuv, kalit, "tepa", tepaIndeks - 1);
    return tepaIndeks === joylashuv.tepa.length - 1 ? kartaniJoylash(joylashuv, kalit, "past", 0) : kartaniJoylash(joylashuv, kalit, "tepa", tepaIndeks + 1);
  }
  if (pastIndeks >= 0) {
    if (yonalish === 1) return pastIndeks === joylashuv.past.length - 1 ? joylashuv : kartaniJoylash(joylashuv, kalit, "past", pastIndeks + 1);
    return pastIndeks === 0 ? kartaniJoylash(joylashuv, kalit, "tepa", joylashuv.tepa.length) : kartaniJoylash(joylashuv, kalit, "past", pastIndeks - 1);
  }
  return joylashuv;
}

/** Karta hozir siljiy oladimi (menyuda "Yuqoriga"/"Pastga" o'chirib qo'yish uchun). */
export function siljiyOladimi(joylashuv: KartalarJoylashuvi, kalit: SotuvKartasi, yonalish: -1 | 1): boolean {
  return kartaniSiljitish(joylashuv, kalit, yonalish) !== joylashuv;
}

export function kartaniYashirish(joylashuv: KartalarJoylashuvi, kalit: SotuvKartasi): KartalarJoylashuvi {
  if (YASHIRILMAYDIGAN.includes(kalit) || joylashuv.yashirin.includes(kalit)) return joylashuv;
  const natija = olibTashlash(joylashuv, kalit);
  return { ...natija, yashirin: [...natija.yashirin, kalit] };
}

/** Yashirilgan karta standart joyiga yaqin (pastga) qaytadi. */
export function kartaniQaytarish(joylashuv: KartalarJoylashuvi, kalit: SotuvKartasi): KartalarJoylashuvi {
  if (!joylashuv.yashirin.includes(kalit)) return joylashuv;
  const qolgan = olibTashlash(joylashuv, kalit);
  return joylashuvniTahlil({ ...qolgan }) ?? STANDART_JOYLASHUV;
}

export function standartmi(joylashuv: KartalarJoylashuvi): boolean {
  return (
    joylashuv.tepa.length === 0 &&
    joylashuv.yashirin.length === 0 &&
    joylashuv.past.length === STANDART_JOYLASHUV.past.length &&
    joylashuv.past.every((k, i) => k === STANDART_JOYLASHUV.past[i])
  );
}

/**
 * Saqlash kalitlari (yon menyu tartibidagidek): birinchisi foydalanuvchi ID, ikkinchisi do'kon|login (ID hali ma'lum bo'lmagan
 * paytda ham topiladi). Ikkalasiga yoziladi, shu tartibda o'qiladi. Egasi noma'lum — "mehmon".
 */
export function joylashuvKalitlari(egasi: { id?: string | null; login?: string | null }): string[] {
  const kalitlar: string[] = [];
  const id = egasi.id?.trim();
  const login = egasi.login?.trim();
  if (id) kalitlar.push(`${SOTUV_KARTALARI_KALITI}:${id}`);
  if (login) kalitlar.push(`${SOTUV_KARTALARI_KALITI}:login:${login}`);
  return kalitlar.length ? kalitlar : [`${SOTUV_KARTALARI_KALITI}:mehmon`];
}

/**
 * Sudrash nishoni: ko'rsatkich (y) qaysi zonaga va qaysi indeksga tushadi. `zonalar` — ekrandagi zonalar (yuqoridan pastga) va
 * ulardagi kartalar o'rtasi (sudralayotgan kartasiz). Zona ichida bo'lsa — o'sha zona; aks holda eng yaqin zona.
 */
export function sudrashNishoni(
  y: number,
  zonalar: Array<{ zona: KartaZonasi; tepa: number; past: number; ortalar: number[] }>
): { zona: KartaZonasi; indeks: number } | null {
  if (!zonalar.length) return null;
  let tanlangan = zonalar[0];
  let eng = Number.POSITIVE_INFINITY;
  for (const z of zonalar) {
    const masofa = y < z.tepa ? z.tepa - y : y > z.past ? y - z.past : 0;
    if (masofa < eng) {
      eng = masofa;
      tanlangan = z;
    }
  }
  return { zona: tanlangan.zona, indeks: tanlangan.ortalar.filter((orta) => orta < y).length };
}
