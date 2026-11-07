import type { Sotuv } from "@/types/savdo";

type Xodim = {
  id?: string | null;
  fullName?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  phone?: string | null;
};

function matn(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

/** Display-only resolution. A profile/directory entry is usable only for the sale's employee ID. */
export function sotuvMasulMalumoti(
  sotuv: Pick<Sotuv, "responsibleId" | "cashierId" | "responsible">,
  xodimlar: readonly Xodim[] = [],
  profil?: Xodim | null,
) {
  const id = matn(sotuv.responsibleId) || matn(sotuv.cashierId) || matn(sotuv.responsible?.id);
  const biriktirilgan = sotuv.responsible && (!id || !matn(sotuv.responsible.id) || matn(sotuv.responsible.id) === id)
    ? sotuv.responsible : undefined;
  const xodim = id ? xodimlar.find(item => matn(item.id) === id) : undefined;
  const ozProfili = id && matn(profil?.id) === id ? profil : undefined;
  const manbalar = [biriktirilgan, xodim, ozProfili];
  const nom = manbalar.map(item => matn(item?.fullName) || matn(item?.name) || [matn(item?.firstName), matn(item?.lastName)].filter(Boolean).join(" ") || matn(item?.username)).find(Boolean) || "-";
  const telefon = manbalar.map(item => matn(item?.phone)).find(Boolean) || "-";
  return { nom, telefon };
}
