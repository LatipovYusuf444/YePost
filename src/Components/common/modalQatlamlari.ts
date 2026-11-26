// Saqlanmagan o'zgarishlar tekshiruvi yoqilgan modallar va ularning ustidagi qatlamlar (ochilish tartibida): Esc faqat eng ustkisiga tegishli.
export const himoyaliModallar: symbol[] = [];

/**
 * Modal ustidagi kichik qatlam (masalan, sozlash paneli) ochiq turganda Esc ostidagi modalga tegmasin — qatlam o'zi yopiladi.
 * Qaytgan funksiya qatlamni ro'yxatdan chiqaradi.
 */
export function modalUstiQatlami(): () => void {
  const id = Symbol("qatlam");
  himoyaliModallar.push(id);
  return () => {
    const indeks = himoyaliModallar.indexOf(id);
    if (indeks >= 0) himoyaliModallar.splice(indeks, 1);
  };
}
