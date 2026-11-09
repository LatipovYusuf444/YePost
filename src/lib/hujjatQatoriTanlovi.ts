export type HujjatQatoriTanlovi = { modificationId?: string; productId?: string };
export type HujjatHisobotManbasi = { href: string; nom: string };
type Qator = { modificationId?: string; productId?: string; modification?: { id?: string; productId?: string; product?: { id?: string } } | null };

export function hujjatQatoriTanlangan(tanlov: HujjatQatoriTanlovi | undefined, qator: Qator) {
  if (!tanlov) return false;
  if (tanlov.modificationId) return tanlov.modificationId === (qator.modificationId || qator.modification?.id);
  return Boolean(tanlov.productId && tanlov.productId === (qator.productId || qator.modification?.productId || qator.modification?.product?.id));
}
