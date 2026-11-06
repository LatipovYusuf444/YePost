// Fokusdagi `type="number"` maydonda sichqoncha g'ildiragi qiymatni o'zgartirmasligi uchun (miqdor/narx tasodifan o'zgarib ketmasin).
// Brauzer qiymatni faqat maydon fokusda bo'lganda o'zgartiradi — shuning uchun g'ildirak aylanganda maydon fokusdan chiqariladi,
// sahifa esa odatdagidek aylanadi.

export function gildirakSonniOzgartirmasin(hodisa: Pick<WheelEvent, "target">, faol: Element | null = typeof document === "undefined" ? null : document.activeElement) {
  const nishon = hodisa.target as { tagName?: string; type?: string; blur?: () => void } | null;
  if (!nishon || nishon.tagName !== "INPUT" || nishon.type !== "number") return false;
  if (faol !== (nishon as unknown as Element)) return false;
  nishon.blur?.();
  return true;
}

/** Butun ilova uchun bir marta o'rnatiladi; qaytgan funksiya tinglovchini olib tashlaydi. */
export function gildirakniOrnatish(maqsad: Pick<Document, "addEventListener" | "removeEventListener"> = document) {
  const tinglovchi = (hodisa: Event) => { gildirakSonniOzgartirmasin(hodisa as WheelEvent); };
  maqsad.addEventListener("wheel", tinglovchi, { passive: true, capture: true });
  return () => maqsad.removeEventListener("wheel", tinglovchi, { capture: true });
}
