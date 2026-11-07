// POST /sales/:id/cancel { reason }: backend bo'sh joylarni kesadi, 500 belgidan uzun sabab 400 beradi.
// Shuning uchun frontend ham kesadi va 500 belgigacha qisqartiradi; bo'sh sabab yuborilmaydi (backend `cancelReason: null` saqlaydi).
export const BEKOR_SABABI_UZUNLIGI = 500;

export function bekorQilishSababi(matn?: string | null) {
  return (matn ?? "").trim().slice(0, BEKOR_SABABI_UZUNLIGI);
}
