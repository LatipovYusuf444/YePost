// Do'konning asosiy valyutasi — backenddan kelgan yozuvda valyuta ko'rsatilmagan bo'lsa ishlatiladigan standart qiymat.
// "Faqat dollar" (USD_ONLY) rejimida — USD, "Faqat so'm" (UZS_ONLY) da — UZS, ikki valyuta (DUAL) rejimida — backenddagi `defaultCurrency`
// (odatda so'm). Qiymatni `lib/valyuta.ts` store'i rejim o'qilganda o'rnatadi. Bu modul importlarsiz: toza funksiyalar (narx valyutasi,
// qarz taqsimoti, hujjat moslagichlari) va testlar uni to'g'ridan-to'g'ri ishlatadi.
//
// Avval bunday joylarda doim "UZS" olinardi: "Faqat dollar" do'konida valyutasi yozilmagan $0.17 narx "so'mdagi narx" deb bloklanardi.

export type AsosiyValyutaKodi = "UZS" | "USD";

let joriy: AsosiyValyutaKodi = "UZS";

/** Store chaqiradi: rejim yoki `defaultCurrency` o'zgarganda. */
export function asosiyValyutaniBelgilash(valyuta: string | null | undefined) {
  joriy = String(valyuta ?? "").trim().toUpperCase() === "USD" ? "USD" : "UZS";
}

/** Do'konning hozirgi asosiy valyutasi. */
export function asosiyValyuta(): AsosiyValyutaKodi {
  return joriy;
}

/**
 * Backenddan kelgan valyuta kodi ("USD" | "UZS" | "SUM"); bo'sh yoki noma'lum bo'lsa — do'konning asosiy valyutasi ("UZS" emas).
 */
export function valyutaYokiAsosiy(valyuta?: string | null): AsosiyValyutaKodi {
  const kod = String(valyuta ?? "").trim().toUpperCase();
  if (kod === "USD") return "USD";
  if (kod === "UZS" || kod === "SUM" || kod === "SO'M" || kod === "SOM") return "UZS";
  return joriy;
}

/** Valyuta aniq ko'rsatilganmi (bo'sh yoki noma'lum emas). */
export function valyutaAniqmi(valyuta?: string | null): boolean {
  const kod = String(valyuta ?? "").trim().toUpperCase();
  return kod === "USD" || kod === "UZS" || kod === "SUM" || kod === "SO'M" || kod === "SOM";
}
