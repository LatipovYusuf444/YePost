// Chiqim (hisobdan chiqarish) hujjati tannarxi: katalogdagi `costPrice` O'Z valyutasida (`costCurrency`) ko'rsatiladi.
// Avval hammasi so'm deb chizilardi, shuning uchun dollarda kiritilgan tannarx ($0.73) "0.73 so'm" bo'lib qolgan edi.
// UI'siz yozilgan — testlarda to'g'ridan-to'g'ri ishlaydi.
import { narxValyutalari, type NarxValyutaManbasi, type NarxValyutasi } from "./narxValyutasi.ts";

type TannarxManbasi = { price?: (NarxValyutaManbasi & { costPrice?: number | string | null }) | null } | null;

export type ValyutaSummasi = { valyuta: NarxValyutasi; summa: number };

/** Mahsulot tannarxi va uning valyutasi (valyutasi yozilmagan narx so'm hisoblanadi). */
export function chiqimTannarxi(modification?: TannarxManbasi) {
  const narx = Number(modification?.price?.costPrice ?? 0);
  return {
    narx: Number.isFinite(narx) ? narx : 0,
    valyuta: narxValyutalari(modification?.price).cost,
  };
}

/**
 * Hujjat jami, valyutalar bo'yicha.
 * Qatorlar bitta valyutada bo'lsa backend jami (bo'lsa) shu valyutada olinadi; aralash valyutada bitta son bo'lmaydi,
 * shuning uchun har valyutaning summasi qatorlardan alohida hisoblanadi. Qator ma'lumoti bo'lmasa — so'm (avvalgidek).
 */
export function chiqimJamilari(
  qatorlar: ReadonlyArray<{ summa: number; valyuta: NarxValyutasi }>,
  backendJami?: number | string | null,
): ValyutaSummasi[] {
  const tartib: NarxValyutasi[] = [];
  const yigindi = new Map<NarxValyutasi, number>();
  for (const qator of qatorlar) {
    if (!yigindi.has(qator.valyuta)) tartib.push(qator.valyuta);
    yigindi.set(qator.valyuta, (yigindi.get(qator.valyuta) ?? 0) + (Number.isFinite(qator.summa) ? qator.summa : 0));
  }

  const backend = backendJami === undefined || backendJami === null ? null : Number(backendJami);
  const backendSon = backend !== null && Number.isFinite(backend) ? backend : null;

  if (tartib.length === 0) return [{ valyuta: "UZS", summa: backendSon ?? 0 }];
  if (tartib.length === 1) return [{ valyuta: tartib[0], summa: backendSon ?? yigindi.get(tartib[0]) ?? 0 }];
  return tartib.map((valyuta) => ({ valyuta, summa: yigindi.get(valyuta) ?? 0 }));
}
