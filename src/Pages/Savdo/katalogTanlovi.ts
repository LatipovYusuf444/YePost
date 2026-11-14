// Savdo yaratishdagi "Katalog" oynasining hisob-kitobi (UI'siz — testlarda to'g'ridan-to'g'ri ishlaydi).
import { qidiruvKorinishi } from "../../lib/kategoriyaQidiruvi.ts";

export type KatalogTanlovi = { kalit: string; miqdor: number };

type Variant = { value: string; searchLabel?: string; kodlar?: string[]; nomlar?: string[]; disabled?: boolean; label?: unknown };

/**
 * Katalog qatorlari: qidiruv (nom, shtrix-kod, artikul; kirill/lotin farqisiz), "faqat qoldig'i bor" va kategoriya (variantlar to'plami;
 * null — hammasi) bo'yicha. Sotib bo'lmaydiganlar (qoldig'i yo'q) oxirida.
 */
export function katalogFiltrlash(
  variantlar: readonly Variant[],
  p: { qidiruv: string; faqatQoldiq: boolean; kategoriya: ReadonlySet<string> | null; qoldiqSoni: (kalit: string) => number; modificationId: (kalit: string) => string }
) {
  const soz = qidiruvKorinishi(p.qidiruv);
  return variantlar
    .map((option) => ({ option, nom: option.searchLabel ?? (typeof option.label === "string" ? option.label : option.value) }))
    .filter(({ option, nom }) => {
      if (p.kategoriya && !p.kategoriya.has(p.modificationId(option.value))) return false;
      if (p.faqatQoldiq && !(p.qoldiqSoni(option.value) > 0)) return false;
      if (!soz) return true;
      return [nom, ...(option.nomlar ?? []), ...(option.kodlar ?? [])].some((matn) => qidiruvKorinishi(matn).includes(soz));
    })
    .sort((a, b) => Number(Boolean(a.option.disabled)) - Number(Boolean(b.option.disabled)));
}

/** Tanlanganlar jami: dona va summa (narx × miqdor). */
export function katalogJami(tanlangan: readonly KatalogTanlovi[], narx: (kalit: string) => number) {
  return tanlangan.reduce(
    (jami, item) => ({ miqdor: jami.miqdor + item.miqdor, summa: Math.round((jami.summa + item.miqdor * (narx(item.kalit) || 0)) * 100) / 100 }),
    { miqdor: 0, summa: 0 }
  );
}

/**
 * Tanlanganlarni savdo qatorlariga qo'shadi: shu tovar (asosiy birlikda) bor bo'lsa miqdori qo'shiladi, yangi qator ochilmaydi;
 * aks holda birinchi bo'sh qator to'ldiriladi, bo'sh qator bo'lmasa oxiriga qo'shiladi.
 */
export function katalogniQatorlargaQoshish<T>(
  qatorlar: readonly T[],
  tanlangan: readonly KatalogTanlovi[],
  q: { kalit: (qator: T) => string; asosiyBirlikda: (qator: T) => boolean; boshmi: (qator: T) => boolean; miqdorQosh: (qator: T, miqdor: number) => T; yangi: (kalit: string, miqdor: number) => T }
): T[] {
  const natija = [...qatorlar];
  for (const { kalit, miqdor } of tanlangan) {
    if (!(miqdor > 0)) continue;
    const bor = natija.findIndex((qator) => q.kalit(qator) === kalit && q.asosiyBirlikda(qator));
    if (bor >= 0) {
      natija[bor] = q.miqdorQosh(natija[bor], miqdor);
      continue;
    }
    const bosh = natija.findIndex(q.boshmi);
    if (bosh >= 0) natija[bosh] = q.yangi(kalit, miqdor);
    else natija.push(q.yangi(kalit, miqdor));
  }
  return natija;
}
