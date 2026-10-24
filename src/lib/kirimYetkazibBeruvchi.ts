import type { NomliEntity } from "../types/ombor.ts";

type YetkazibBeruvchi = NomliEntity & { partner?: { id: string } | null };
type Kirim = { supplierId?: string; supplier?: YetkazibBeruvchi | null };

function nomi(item?: YetkazibBeruvchi | null): string {
  return item?.name?.trim() || item?.fullName?.trim() || "";
}

export function kirimYetkazibBeruvchiNomi(hujjat: Kirim, royxat: readonly YetkazibBeruvchi[] = []): string {
  const nom = nomi(hujjat.supplier);
  if (nom || !hujjat.supplierId) return nom;
  return nomi(royxat.find(item => item.id === hujjat.supplierId || item.partner?.id === hujjat.supplierId));
}

// Ma'lumotnomada yo'q eski yetkazib beruvchini alohida GET bilan to'ldiramiz.
// Bir ro'yxatdagi bir xil supplierId bir marta olinadi; saqlash payloadiga tegilmaydi.
export async function kirimYetkazibBeruvchilariniToldirish<T extends Kirim>(
  hujjatlar: readonly T[],
  olish: (id: string) => Promise<YetkazibBeruvchi>,
): Promise<T[]> {
  const sorovlar = new Map<string, Promise<YetkazibBeruvchi | null>>();
  return Promise.all(hujjatlar.map(async hujjat => {
    if (nomi(hujjat.supplier) || !hujjat.supplierId) return hujjat;
    const id = hujjat.supplierId;
    let sorov = sorovlar.get(id);
    if (!sorov) {
      sorov = Promise.resolve().then(() => olish(id)).catch(() => null);
      sorovlar.set(id, sorov);
    }
    const supplier = await sorov;
    return supplier && nomi(supplier) ? { ...hujjat, supplier: { ...hujjat.supplier, ...supplier } } : hujjat;
  }));
}
