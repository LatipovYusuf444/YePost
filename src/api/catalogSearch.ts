import type { MahsulotModifikatsiyasi, MahsulotNarxi } from "@/types/catalog";
import type { QoldiqValyutasi } from "@/types/savdo";

/** Qisqa kesh + umumiy in-flight so'rov: remount/ombor almashishi katalogni qayta yuklamaydi. */
export function katalogQidiruvYuklagich<T>(
  sahifaOlish: (q: string, page: number) => Promise<{ items: T[]; totalPages: number }>,
  vaqt = Date.now,
) {
  type Yozuv = { sorov: Promise<T[]>; tugadi: boolean; muddati: number };
  const kesh = new Map<string, Yozuv>();
  return {
    olish(q = "", majbur = false): Promise<T[]> {
      const mavjud = kesh.get(q);
      if (mavjud && (!mavjud.tugadi || (!majbur && vaqt() < mavjud.muddati))) return mavjud.sorov;
      const yozuv: Yozuv = { sorov: Promise.resolve([]), tugadi: false, muddati: 0 };
      yozuv.sorov = (async () => {
        try {
          const birinchi = await sahifaOlish(q, 1);
          const items = [...birinchi.items];
          // Barcha sahifalar lokal qidiruv uchun kerak, lekin backendga birdan yuborilmaydi.
          for (let page = 2; page <= birinchi.totalPages; page++) {
            items.push(...(await sahifaOlish(q, page)).items);
          }
          yozuv.tugadi = true;
          yozuv.muddati = vaqt() + 30_000;
          return items;
        } catch (error) {
          if (kesh.get(q) === yozuv) kesh.delete(q);
          throw error;
        }
      })();
      kesh.set(q, yozuv);
      return yozuv.sorov;
    },
    tozalash() { kesh.clear(); },
  };
}

export type KatalogQidiruvQatori = MahsulotModifikatsiyasi | {
  modificationId?: string;
  productId?: string;
  modification?: MahsulotModifikatsiyasi | null;
};

/** Search API qoldiq qatorini qaytaradi: variant, uning narxi va valyutasi `modification` ichida. */
export function katalogQidiruvQatoriniMoslash(qator: KatalogQidiruvQatori): MahsulotModifikatsiyasi | null {
  if ("modification" in qator || "modificationId" in qator) {
    const mod = qator.modification;
    const id = qator.modificationId || mod?.id;
    if (!id || !mod || (mod.id && mod.id !== id)) return null;
    return { ...mod, id, productId: qator.productId ?? mod.productId };
  }
  return "id" in qator && qator.id ? qator : null;
}

function musbatSon(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Bir xil moslash search va detail javoblariga ishlatiladi; USD kurssiz UZS narxga aylanmaydi. */
export function katalogNarxiniQoldiqqaMoslash(narx?: MahsulotNarxi | null) {
  const valyuta: QoldiqValyutasi | undefined = narx?.currency?.toUpperCase() === "USD" ? {
    currency: "USD",
    asl: Number(narx.retailPrice ?? 0),
    kurs: musbatSon(narx.rate),
    uzs: musbatSon(narx.retailPriceUzs),
    ulgurjiAsl: Number(narx.wholesalePrice ?? 0),
    ulgurjiUzs: musbatSon(narx.wholesalePriceUzs),
  } : undefined;
  const chakana = valyuta ? (valyuta.uzs ?? 0) : Number(narx?.retailPrice ?? narx?.wholesalePrice ?? 0);
  const ulgurji = valyuta ? (valyuta.ulgurjiUzs ?? 0) : Number(narx?.wholesalePrice ?? 0);
  return {
    narxAniq: Boolean(narx),
    sellingPrice: chakana,
    price: chakana,
    valyuta,
    modificationPrice: {
      costPrice: Number(narx?.costPrice ?? 0),
      retailPrice: chakana,
      wholesalePrice: ulgurji,
      sellingPrice: chakana,
    },
  };
}
