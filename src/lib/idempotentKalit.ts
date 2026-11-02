// Idempotency-Key: tarmoq uzilib javob kelmagan bo'lsa ham qayta bosish hujjatni ikki marta yozmaydi. Kalit "amal + ma'lumot" ga bog'lanadi:
// server javob bergan bo'lsa (xato bo'lsa ham) kalit tashlanadi, chunki keyingi urinish tuzatilgan holatda yangi so'rov bo'lishi kerak
// (masalan izoh yozilib "Smenani yopish" qayta bosiladi). Javob noma'lum qolgan holatda shu kalit saqlanadi: server birinchi javobni qaytaradi.
const KALIT_MUDDATI = 24 * 60 * 60 * 1000;

type Yozuv = { kalit: string; muddati: number };
const kalitlar = new Map<string, Yozuv>();

function imzo(amal: string, tana: unknown) {
  return `${amal}|${JSON.stringify(tana ?? null)}`;
}

/** Natijasi noma'lum xatomi: javob kelmagan, server xatosi yoki birinchi so'rov hali tugamagan (409 request_in_progress). */
export function natijaNomalummi(error: unknown) {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === undefined || status >= 500 || status === 409;
}

export function idempotentKalitOlish(amal: string, tana: unknown, vaqt = Date.now()) {
  const kalit = imzo(amal, tana);
  const mavjud = kalitlar.get(kalit);
  if (mavjud && vaqt < mavjud.muddati) return mavjud.kalit;
  const yangi = crypto.randomUUID();
  kalitlar.set(kalit, { kalit: yangi, muddati: vaqt + KALIT_MUDDATI });
  return yangi;
}

/** Tugmaga bog'langan so'rov: chaqiruv `Idempotency-Key` qiymatini oladi. */
export async function idempotentBajarish<T>(amal: string, tana: unknown, chaqiruv: (kalit: string) => Promise<T>): Promise<T> {
  const yozuv = imzo(amal, tana);
  try {
    const natija = await chaqiruv(idempotentKalitOlish(amal, tana));
    kalitlar.delete(yozuv);
    return natija;
  } catch (error) {
    if (!natijaNomalummi(error)) kalitlar.delete(yozuv);
    throw error;
  }
}
