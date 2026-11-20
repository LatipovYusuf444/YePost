// Ro'yxatda belgilanganlarni birdaniga o'chirish (backend 20.11: POST /partners/customers/bulk-delete, POST /catalog/products/bulk-delete):
// body { ids } — 1 tadan 500 tagacha, har biri bir marta. 200 { deleted }; 404 — biror id topilmadi (hech narsa o'chirilmaydi), tanada `ids`.
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.

/** Bitta so'rovda ko'pi bilan nechta yozuv. */
export const KOP_OCHIRISH_CHEGARASI = 500;

/**
 * Belgilarni o'zgartirish: `belgilansin` — qo'shish yoki olib tashlash. Qo'shishda jami chegaradan oshmaydi (`kesildi` — sig'maganlari bor).
 */
export function tanlovniOzgartirish(
  tanlangan: ReadonlySet<string>,
  ids: readonly string[],
  belgilansin: boolean,
  chegara = KOP_OCHIRISH_CHEGARASI,
): { tanlangan: Set<string>; kesildi: boolean } {
  const yangi = new Set(tanlangan);
  if (!belgilansin) {
    for (const id of ids) yangi.delete(id);
    return { tanlangan: yangi, kesildi: false };
  }
  let kesildi = false;
  for (const id of ids) {
    if (yangi.has(id)) continue;
    if (yangi.size >= chegara) {
      kesildi = true;
      break;
    }
    yangi.add(id);
  }
  return { tanlangan: yangi, kesildi };
}

/** "Hammasini tanlash" holati ko'rinib turgan qatorlar uchun: hammasi, bir qismi yoki hech biri belgilangan. */
export function hammasiHolati(tanlangan: ReadonlySet<string>, korinadigan: readonly string[]): "hammasi" | "qisman" | "hech" {
  if (!korinadigan.length) return "hech";
  const soni = korinadigan.filter((id) => tanlangan.has(id)).length;
  return soni === 0 ? "hech" : soni === korinadigan.length ? "hammasi" : "qisman";
}

/** Ro'yxatda endi yo'q (o'chirilgan, filtrdan chiqqan) belgilarni olib tashlash; o'zgarmasa o'sha Set qaytadi. */
export function tanlovniQisqartirish(tanlangan: ReadonlySet<string>, mavjud: readonly string[]): ReadonlySet<string> {
  if (!tanlangan.size) return tanlangan;
  const bor = new Set(mavjud);
  const qolgan = [...tanlangan].filter((id) => bor.has(id));
  return qolgan.length === tanlangan.size ? tanlangan : new Set(qolgan);
}

/** So'rov tanasi: takrorsiz, tartib saqlanadi. */
export function kopOchirishTanasi(ids: Iterable<string>) {
  return { ids: [...new Set(ids)] };
}

/** 404 javobidagi topilmagan id'lar (`{ ids: [...] }`, envelope ichida ham bo'lishi mumkin); yo'q bo'lsa bo'sh. */
export function topilmaganIdlar(tana: unknown): string[] {
  const obyekt = tana && typeof tana === "object" ? (tana as Record<string, unknown>) : {};
  const ichki = obyekt.data && typeof obyekt.data === "object" ? (obyekt.data as Record<string, unknown>) : {};
  const ids = Array.isArray(obyekt.ids) ? obyekt.ids : Array.isArray(ichki.ids) ? ichki.ids : [];
  return ids.filter((id): id is string => typeof id === "string");
}

/** 200 javobidagi o'chirilganlar soni (`{ deleted }`, envelope ichida ham); kelmasa — yuborilganlar soni. */
export function ochirilganSoni(tana: unknown, yuborilgan: number) {
  const obyekt = tana && typeof tana === "object" ? (tana as Record<string, unknown>) : {};
  const ichki = obyekt.data && typeof obyekt.data === "object" ? (obyekt.data as Record<string, unknown>) : {};
  const son = Number(obyekt.deleted ?? ichki.deleted);
  return Number.isFinite(son) && son >= 0 ? son : yuborilgan;
}
