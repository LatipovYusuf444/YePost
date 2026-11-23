// Yon panel menyusi tartibi: foydalanuvchi bandlarni (va bo'lim ichidagi bandlarni) o'ziga qulay joyga sudraydi.
// Tartib shu brauzerda, foydalanuvchi bo'yicha saqlanadi (faqat ko'rinish sozlamasi — marshrut va ruxsatlar o'zgarmaydi).
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.

/** `asosiy` — yuqori darajadagi bandlar kalitlari; `bolalar` — bo'lim kaliti → ichidagi bandlar kalitlari. */
export type MenyuTartibi = { asosiy: string[]; bolalar: Record<string, string[]> };

export const MENYU_TARTIBI_KALITI = "yepost-menyu-tartibi";

const kalitlarmi = (qiymat: unknown): qiymat is string[] =>
  Array.isArray(qiymat) && qiymat.every((item) => typeof item === "string");

/**
 * Ro'yxatni saqlangan tartibda qaytaradi. Saqlanmagan (keyin qo'shilgan) band o'zining standart joyiga yaqin turadi — standart
 * ro'yxatdagi oldingi qo'shnisidan keyin; saqlangan, lekin endi yo'q kalitlar e'tiborsiz qoldiriladi.
 */
export function tartibniQollash<T>(royxat: readonly T[], kalit: (item: T) => string, saqlangan?: readonly string[] | null): T[] {
  if (!saqlangan?.length) return [...royxat];
  const xarita = new Map(royxat.map((item) => [kalit(item), item]));
  const natija: string[] = [];
  for (const k of saqlangan) if (xarita.has(k) && !natija.includes(k)) natija.push(k);
  royxat.forEach((item, indeks) => {
    const k = kalit(item);
    if (natija.includes(k)) return;
    // Standart ro'yxatda o'zidan oldingi, tartibda bor eng yaqin qo'shnidan keyin.
    let joy = 0;
    for (let i = indeks - 1; i >= 0; i -= 1) {
      const oldingi = natija.indexOf(kalit(royxat[i]));
      if (oldingi >= 0) {
        joy = oldingi + 1;
        break;
      }
    }
    natija.splice(joy, 0, k);
  });
  return natija.map((k) => xarita.get(k) as T);
}

/** `from` dagi elementni `to` ga ko'chiradi (yangi massiv). */
export function kochirish<T>(royxat: readonly T[], from: number, to: number): T[] {
  const natija = [...royxat];
  if (from < 0 || from >= natija.length || to < 0 || to >= natija.length || from === to) return natija;
  const [element] = natija.splice(from, 1);
  natija.splice(to, 0, element);
  return natija;
}

/**
 * Foydalanuvchi faqat o'ziga ko'rinadigan bandlarni (rol bo'yicha) tartiblaydi: ko'rinmaydiganlari to'liq tartibda o'z joyida qoladi,
 * ko'rinadiganlar egallagan joylar esa yangi tartib bilan to'ldiriladi.
 */
export function korinadiganTartibniBirlashtirish(toliq: readonly string[], korinadigan: readonly string[]): string[] {
  const korinadi = new Set(korinadigan);
  let keyingi = 0;
  return toliq.map((k) => (korinadi.has(k) ? korinadigan[keyingi++] ?? k : k));
}

/** Saqlangan qiymat → tartib (buzilgan yoki eski format bo'lsa null). */
export function tartibniTahlil(matn: string | null | undefined): MenyuTartibi | null {
  if (!matn) return null;
  try {
    const qiymat = JSON.parse(matn) as { asosiy?: unknown; bolalar?: unknown };
    if (!qiymat || typeof qiymat !== "object" || !kalitlarmi(qiymat.asosiy)) return null;
    const bolalar: Record<string, string[]> = {};
    if (qiymat.bolalar && typeof qiymat.bolalar === "object") {
      for (const [k, v] of Object.entries(qiymat.bolalar as Record<string, unknown>)) if (kalitlarmi(v)) bolalar[k] = v;
    }
    return { asosiy: qiymat.asosiy, bolalar };
  } catch {
    return null;
  }
}

/** Foydalanuvchiga tegishli saqlash kaliti (bir brauzerda bir nechta xodim ishlasa, har birining tartibi alohida). */
export function tartibKaliti(egasi: string | null | undefined) {
  return `${MENYU_TARTIBI_KALITI}:${egasi || "mehmon"}`;
}
