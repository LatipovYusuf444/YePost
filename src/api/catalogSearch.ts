import type { MahsulotModifikatsiyasi, MahsulotNarxi } from "@/types/catalog";
import type { QoldiqValyutasi } from "@/types/savdo";

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
