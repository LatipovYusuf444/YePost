// Planshet/telefon (sensorli ekran)da maydonga dasturiy fokus berish ekran klaviaturasini ochib, sahifaning yarmini yopadi.
// Shuning uchun "qulaylik uchun" fokuslar (ro'yxat ochilganda qidiruvga, mahsulot qo'shilgach qidiruvga qaytish) faqat
// sichqoncha/sensorli panelli qurilmada beriladi. UI'siz — testlarda ishlaydi.

/** Asosiy kiritish qurilmasi sichqoncha (aniq ko'rsatkich + hover) bo'lsa `true`. */
export function sichqonchaliQurilma(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : true;
  } catch {
    return true;
  }
}
