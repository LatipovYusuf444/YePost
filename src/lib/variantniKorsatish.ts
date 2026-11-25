// Ochiladigan ro'yxat (select, qidiruv natijalari) ichidagi belgilangan variantni ko'rinadigan qiladi — faqat ro'yxatning o'zini aylantirib.
// `scrollIntoView` ro'yxat hali joylashtirilmagan paytda (portal birinchi chizilganda u sahifa oxirida oddiy element bo'ladi) butun
// sahifani aylantirib yuborardi: ro'yxat bosilgan maydon ostida emas, ekran tepasida chiqardi.
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.

/** `variant` dan yuqoriga `chegara` gacha (o'zi ham) birinchi vertikal aylanadigan elementni topadi. */
function aylanadiganOta(variant: HTMLElement, chegara: HTMLElement): HTMLElement | null {
  let joriy: HTMLElement | null = variant.parentElement;
  while (joriy) {
    const uslub = getComputedStyle(joriy).overflowY;
    if ((uslub === "auto" || uslub === "scroll") && joriy.scrollHeight > joriy.clientHeight) return joriy;
    if (joriy === chegara) return null;
    joriy = joriy.parentElement;
  }
  return null;
}

/** Belgilangan variant ro'yxat chegarasidan chiqib qolgan bo'lsa, ro'yxatni eng kam masofaga aylantiradi (sahifaga tegmaydi). */
export function variantniKorsatish(royxat: HTMLElement | null | undefined, variant: HTMLElement | null | undefined) {
  if (!royxat || !variant || !royxat.contains(variant)) return;
  const quti = aylanadiganOta(variant, royxat);
  if (!quti) return;
  const q = quti.getBoundingClientRect();
  const v = variant.getBoundingClientRect();
  if (v.top < q.top) quti.scrollTop -= q.top - v.top;
  else if (v.bottom > q.bottom) quti.scrollTop += v.bottom - q.bottom;
}
