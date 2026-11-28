// Mijozning mas'ul xodimi (backend: POST/PATCH /partners/customers `responsibleId`; null — olib tashlash; javobda `responsibleId`, `responsible`).
// Yangi CRM vazifalari shu xodimga tushadi. UI'siz va tashqi importlarsiz — alohida sinash mumkin.

export type MasulManbasi = {
  id?: string | null;
  fullName?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

/** Xodim nomi: to'liq ism → ism → ism+familiya → login; hech biri bo'lmasa bo'sh. */
export function xodimNomi(xodim: MasulManbasi | null | undefined): string {
  if (!xodim) return "";
  const ismFamiliya = [xodim.firstName, xodim.lastName].map((qism) => qism?.trim() ?? "").filter(Boolean).join(" ");
  return xodim.fullName?.trim() || xodim.name?.trim() || ismFamiliya || xodim.username?.trim() || "";
}

/** Javobdagi mas'ul: id (`responsibleId` yoki `responsible.id`) va nomi; yo'q bo'lsa bo'sh satrlar. */
export function mijozMasuli(mijoz: { responsibleId?: string | null; responsible?: MasulManbasi | null }): { id: string; nom: string } {
  const id = mijoz.responsibleId || mijoz.responsible?.id || "";
  return { id, nom: id ? xodimNomi(mijoz.responsible) : "" };
}

/** POST uchun: tanlanmagan mas'ul yuborilmaydi. */
export function yaratishMasuli(tanlangan: string | undefined): { responsibleId?: string } {
  return tanlangan ? { responsibleId: tanlangan } : {};
}

/** PATCH uchun: faqat o'zgargan bo'lsa yuboriladi; tozalansa — null (olib tashlash). */
export function tahrirMasuli(boshlangich: string | undefined, tanlangan: string | undefined): { responsibleId?: string | null } {
  const yangi = tanlangan || "";
  return yangi === (boshlangich || "") ? {} : { responsibleId: yangi || null };
}
