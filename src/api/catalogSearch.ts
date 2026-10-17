import type { MahsulotModifikatsiyasi, MahsulotNarxi } from "@/types/catalog";
import type { QoldiqValyutasi } from "@/types/savdo";
import { narxValyutalari } from "../lib/narxValyutasi.ts";

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

/**
 * Backend narx valyutasini (retailCurrency / wholesaleCurrency) yubormagan, lekin kurs va so'mdagi qiymatni (…PriceUzs) yuborgan bo'lsa:
 * so'mdagi qiymat narxning kursga ko'paytirilgan qiymatiga teng bo'lsa narx dollarda ekani aniq (so'mdagi narxda …PriceUzs narxning o'ziga teng).
 * Aks holda xom dollar narx (masalan 1.19) so'm sifatida o'qilib, savatchada "1 uzs" bo'lib qolardi.
 */
export function narxValyutasiniAniqlash(
  narx: unknown,
  uzs: unknown,
  kurs: number | null,
  belgilangan: "UZS" | "USD"
): "UZS" | "USD" {
  if (belgilangan === "USD") return belgilangan;
  const asl = Number(narx);
  const som = musbatSon(uzs);
  if (!kurs || !som || !(asl > 0) || Math.abs(som - asl) <= 1) return belgilangan;
  return Math.abs(som - asl * kurs) <= Math.max(1, asl * kurs * 0.01) ? "USD" : belgilangan;
}

/**
 * Bir xil moslash search va detail javoblariga ishlatiladi; USD kurssiz UZS narxga aylanmaydi.
 * Har bir narxning valyutasi alohida (retailCurrency / wholesaleCurrency): masalan chakana so'mda, ulgurji dollarda bo'lishi mumkin.
 */
export function katalogNarxiniQoldiqqaMoslash(narx?: MahsulotNarxi | null) {
  const belgilangan = narxValyutalari(narx);
  const kurs = musbatSon(narx?.rate);
  const valyutalar = {
    ...belgilangan,
    retail: narxValyutasiniAniqlash(narx?.retailPrice, narx?.retailPriceUzs, kurs, belgilangan.retail),
    wholesale: narxValyutasiniAniqlash(narx?.wholesalePrice, narx?.wholesalePriceUzs, kurs, belgilangan.wholesale),
  };
  const chakanaUsd = valyutalar.retail === "USD";
  const ulgurjiUsd = valyutalar.wholesale === "USD";
  const valyuta: QoldiqValyutasi | undefined = narx && (chakanaUsd || ulgurjiUsd) ? {
    currency: valyutalar.retail,
    asl: chakanaUsd ? Number(narx.retailPrice ?? 0) : 0,
    kurs: musbatSon(narx.rate),
    uzs: chakanaUsd ? musbatSon(narx.retailPriceUzs) : null,
    ulgurjiCurrency: valyutalar.wholesale,
    ulgurjiAsl: ulgurjiUsd ? Number(narx.wholesalePrice ?? 0) : 0,
    ulgurjiUzs: ulgurjiUsd ? musbatSon(narx.wholesalePriceUzs) : musbatSon(narx.wholesalePrice),
  } : undefined;
  // So'mdagi narxlar: dollar narx kurs bilan o'giriladi (kurs yo'q bo'lsa 0 — sotuvga qo'shib bo'lmaydi), so'm narx o'zgarmaydi.
  const ulgurji = ulgurjiUsd ? (valyuta?.ulgurjiUzs ?? 0) : Number(narx?.wholesalePrice ?? 0);
  const chakana = chakanaUsd ? (valyuta?.uzs ?? 0) : narx?.retailPrice != null ? Number(narx.retailPrice) : ulgurji;
  return {
    narxAniq: Boolean(narx),
    sellingPrice: chakana,
    price: chakana,
    valyuta,
    modificationPrice: {
      costPrice: Number(narx?.costPrice ?? 0),
      costCurrency: valyutalar.cost,
      retailPrice: chakana,
      wholesalePrice: ulgurji,
      sellingPrice: chakana,
    },
  };
}
