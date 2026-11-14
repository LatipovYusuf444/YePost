// Savdo qoralamasi va qoldiq (TZ 14.11.2026): qoralama saqlashda qoldiq TEKSHIRILMAYDI (faqat ogohlantirish) — backend ham POST/PATCH
// /sales da tekshirmaydi, qoralama omborga tegmaydi. Qoldiq faqat "Ombordan chiqarish" (POST /sales/:id/confirm) da tekshiriladi.
// UI'siz — testlarda to'g'ridan-to'g'ri ishlaydi.

const EPS = 1e-9;

/** So'ralgan miqdor (asosiy birlikda) ombordagi qoldiqdan ko'pmi. */
export function qoldiqYetmaydimi(talab: number, mavjud: number) {
  return Number.isFinite(talab) && talab > Math.max(Number(mavjud) || 0, 0) + EPS;
}

export type Yetishmovchilik = { modificationId: string; nom: string; mavjud: number; kerak: number };

/**
 * "Ombordan chiqarish" uchun yetmaydigan tovarlar: bir xil tovarning qatorlari qo'shiladi (asosiy birlikda). Qoldig'i noma'lum
 * (`qoldiq` null qaytargan) tovar ro'yxatga kirmaydi — uni backend tekshiradi.
 */
export function yetmaydiganTovarlar(
  qatorlar: ReadonlyArray<{ modificationId: string; quantity: number | string; nom: string }>,
  qoldiq: (modificationId: string) => number | null
): Yetishmovchilik[] {
  const jami = new Map<string, { nom: string; kerak: number }>();
  for (const qator of qatorlar) {
    if (!qator.modificationId) continue;
    const joriy = jami.get(qator.modificationId) ?? { nom: qator.nom, kerak: 0 };
    joriy.kerak += Math.max(Number(qator.quantity) || 0, 0);
    jami.set(qator.modificationId, joriy);
  }
  const natija: Yetishmovchilik[] = [];
  for (const [modificationId, { nom, kerak }] of jami) {
    const mavjud = qoldiq(modificationId);
    if (mavjud === null) continue;
    if (qoldiqYetmaydimi(kerak, mavjud)) natija.push({ modificationId, nom, mavjud: Math.max(mavjud, 0), kerak });
  }
  return natija;
}
