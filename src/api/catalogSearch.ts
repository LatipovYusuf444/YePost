import type { MahsulotModifikatsiyasi, MahsulotNarxi } from "@/types/catalog";
import type { QoldiqValyutasi } from "@/types/savdo";
import { narxValyutalari } from "../lib/narxValyutasi.ts";
import { birliklarniMoslash } from "../lib/kopBirlik.ts";
import { parallelBajarish } from "../lib/parallelBajarish.ts";

// Butun katalog kerak bo'lgan ekranlar uchun: sahifalar shuncha tadan parallel olinadi (47 sahifa ketma-ket ~42 s edi).
const KATALOG_PARALLEL_SAHIFALAR = 5;

// Butun katalog (6 000+ tovar = 65 sahifa, ~5-10 s) har ochilishda qayta kutilmasligi uchun:
// YANGI muddat ichida keshdan beriladi; undan eski, lekin ENG_KOP_ESKILIK dan yosh nusxa darhol beriladi va fonda yangilanadi
// (stale-while-revalidate). Fondagi yangilanish tugagach obunachilar xabardor qilinadi (savdo qoldiqlari yangi narx bilan qayta yig'iladi).
// Narx/mahsulot/kurs o'zgarganda `tozalash()` hammasini tashlaydi — eski narx hech qachon berilmaydi.
export const KATALOG_YANGI_MUDDATI = 60_000;
export const KATALOG_ENG_KOP_ESKILIK = 5 * 60_000;
// Shtrix-kod/nom bo'yicha qisqa qidiruvlar ham shu keshda: cheksiz o'smasligi uchun eng eskilari o'chiriladi.
const KATALOG_KESH_CHEGARASI = 200;

/** Katalog keshi + umumiy in-flight so'rov: remount/ombor almashishi katalogni qayta yuklamaydi. */
export function katalogQidiruvYuklagich<T>(
  // `fon` — so'rovni hech kim kutmayapti (fondagi yangilash / oldindan isitish): xatosi foydalanuvchiga toast bo'lib chiqmasin.
  sahifaOlish: (q: string, page: number, fon: boolean) => Promise<{ items: T[]; totalPages: number }>,
  vaqt = Date.now,
  // Fon so'rovini (toastsiz) foydalanuvchi kutib qolsa (masalan oldindan isitish paytida "Yangi sotuv" ochildi), uning xatosi shu bilan ko'rsatiladi.
  fonXatosiniKorsatish?: (error: unknown) => void,
) {
  // `fon` — joriy so'rov xatosi hali hech kimga ko'rsatilmaydi.
  type Yozuv = { qiymat: T[] | null; olingan: number; sorov: Promise<T[]> | null; fon: boolean };
  const kesh = new Map<string, Yozuv>();
  const tinglovchilar = new Set<(q: string) => void>();

  async function hammaSahifalar(q: string, fon: boolean) {
    const birinchi = await sahifaOlish(q, 1, fon);
    const items = [...birinchi.items];
    // Barcha sahifalar lokal qidiruv uchun kerak, lekin backendga birdan yuborilmaydi: bir paytda cheklangan son.
    const sahifalar = Array.from({ length: Math.max(birinchi.totalPages - 1, 0) }, (_, indeks) => indeks + 2);
    const qolganlar = await parallelBajarish(sahifalar, KATALOG_PARALLEL_SAHIFALAR, (page) => sahifaOlish(q, page, fon));
    items.push(...qolganlar.flatMap((sahifa) => sahifa.items));
    return items;
  }

  function yuklash(q: string, yozuv: Yozuv, fon: boolean) {
    const sorov = hammaSahifalar(q, fon);
    yozuv.sorov = sorov;
    yozuv.fon = fon;
    // Chaqiruvchilardan oldin ro'yxatdan o'tadi: ular davom etganda kesh allaqachon yangilangan bo'ladi.
    sorov.then(
      (items) => {
        // O'rtada tozalangan (narx o'zgargan yoki sessiya almashgan) bo'lsa eski natija keshga yozilmaydi.
        if (kesh.get(q) !== yozuv) return;
        const almashdi = yozuv.qiymat !== null;
        yozuv.qiymat = items;
        yozuv.olingan = vaqt();
        yozuv.sorov = null;
        if (almashdi) for (const tinglovchi of [...tinglovchilar]) tinglovchi(q);
      },
      () => {
        if (kesh.get(q) !== yozuv) return;
        yozuv.sorov = null;
        // Xato yarim ro'yxatni keshga yozmaydi; oldingi to'liq nusxa (bo'lsa) qoladi.
        if (yozuv.qiymat === null) kesh.delete(q);
      },
    );
    return sorov;
  }

  function yozuvniOlish(q: string) {
    const mavjud = kesh.get(q);
    if (mavjud) return mavjud;
    if (kesh.size >= KATALOG_KESH_CHEGARASI) {
      const eng = [...kesh.entries()].filter(([kalit, yozuv]) => kalit !== "" && !yozuv.sorov)
        .sort((a, b) => a[1].olingan - b[1].olingan)[0];
      if (eng) kesh.delete(eng[0]);
    }
    const yozuv: Yozuv = { qiymat: null, olingan: 0, sorov: null, fon: false };
    kesh.set(q, yozuv);
    return yozuv;
  }

  return {
    /** `majbur` — yangi nusxa kutiladi. Bo'sh `q` (butun katalog) eskirgan bo'lsa darhol eski nusxa beriladi va fonda yangilanadi.
     * `fon` — chaqiruvchi natijani foydalanuvchiga ko'rsatmaydi (oldindan isitish): yangi so'rov xatosi toastsiz. */
    olish(q = "", majbur = false, fon = false): Promise<T[]> {
      const yozuv = yozuvniOlish(q);
      // Foydalanuvchi kutayotgan chaqiruv toastsiz (fon) so'rovga qo'shilsa: xato bo'lsa u bir marta ko'rsatiladi.
      const qoshilish = (sorov: Promise<T[]>) => {
        if (!fon && yozuv.fon && yozuv.sorov === sorov) {
          yozuv.fon = false;
          if (fonXatosiniKorsatish) sorov.catch(fonXatosiniKorsatish);
        }
        return sorov;
      };
      if (yozuv.sorov && (majbur || yozuv.qiymat === null)) return qoshilish(yozuv.sorov);
      if (!majbur && yozuv.qiymat) {
        const yoshi = vaqt() - yozuv.olingan;
        if (yoshi < KATALOG_YANGI_MUDDATI) return Promise.resolve(yozuv.qiymat);
        if (q === "" && yoshi < KATALOG_ENG_KOP_ESKILIK) {
          if (!yozuv.sorov) yuklash(q, yozuv, true);
          return Promise.resolve(yozuv.qiymat);
        }
      }
      return yozuv.sorov ? qoshilish(yozuv.sorov) : yuklash(q, yozuv, fon);
    },
    /** Qattiq: narx/mahsulot/kurs o'zgardi yoki sessiya almashdi — eski nusxa ham, ketayotgan so'rov natijasi ham ishlatilmaydi. */
    tozalash() { kesh.clear(); },
    /** Yumshoq: ma'lumot o'zgargan bo'lishi mumkin (masalan ombor hujjati) — keyingi chaqiruv eski nusxani beradi va fonda yangilaydi. */
    eskirtirish() {
      for (const yozuv of kesh.values()) {
        if (yozuv.qiymat) yozuv.olingan = Math.min(yozuv.olingan, vaqt() - KATALOG_YANGI_MUDDATI);
      }
    },
    /** Fonda yangi nusxa kelib, eskisini almashtirganda chaqiriladi. Qaytgan funksiya obunani bekor qiladi. */
    obuna(tinglovchi: (q: string) => void) {
      tinglovchilar.add(tinglovchi);
      return () => { tinglovchilar.delete(tinglovchi); };
    },
  };
}

export type KatalogQidiruvQatori = MahsulotModifikatsiyasi | {
  modificationId?: string;
  productId?: string;
  modification?: MahsulotModifikatsiyasi | null;
  // Tovar birliklari va (pochka shtrix-kodi o'qilgan bo'lsa) shu birlik.
  units?: unknown;
  unitId?: string | null;
  // Qoldiq: warehouseId berilsa shu ombor bo'yicha, berilmasa hamma omborlar yig'indisi (asosiy birlikda).
  quantity?: number | string | null;
  // 2026-11-07: har ombor qoldig'i (faqat qoldig'i bor omborlar; hech qayerda yo'q bo'lsa []). `quantity` — shularning yig'indisi.
  stockByWarehouse?: Array<{ warehouseId?: string | null; warehouseName?: string | null; quantity?: number | string | null }> | null;
};

/** Qidiruv qatoridagi qoldiq: `/reports/stock-balance` ni alohida so'rash shart emas. Noto'g'ri qiymat 0 hisoblanadi. */
export function katalogQidiruvQoldigi(qator: KatalogQidiruvQatori) {
  const son = Number((qator as { quantity?: unknown }).quantity ?? 0);
  return Number.isFinite(son) ? son : 0;
}

/**
 * Qidiruv qatoridagi har ombor qoldig'i (`stockByWarehouse`): ombor id → miqdor. Ro'yxatda yo'q ombor qoldig'i 0.
 * Maydon umuman kelmasa (eski backend) `null` — chaqiruvchi har ombor uchun alohida so'rovga qaytadi.
 */
export function katalogOmborQoldiqlari(qator: KatalogQidiruvQatori): Map<string, number> | null {
  const royxat = (qator as { stockByWarehouse?: unknown }).stockByWarehouse;
  if (!Array.isArray(royxat)) return null;
  const natija = new Map<string, number>();
  for (const yozuv of royxat) {
    const id = String((yozuv as { warehouseId?: unknown } | null)?.warehouseId ?? "");
    const son = Number((yozuv as { quantity?: unknown } | null)?.quantity ?? 0);
    if (id) natija.set(id, (natija.get(id) ?? 0) + (Number.isFinite(son) ? son : 0));
  }
  return natija;
}

/**
 * Qidiruv javobida narx valyutasi `modification.price` da yozilmagan bo'lishi mumkin, lekin u birliklarda keladi (`units[].currency` —
 * chakana, `units[].wholesaleCurrency` — ulgurji; asosiy birlikniki narxning o'zi). Shunday holatda valyuta shu yerdan olinadi: aks holda
 * "Faqat dollar" do'konidagi $0.17 narx so'mdagi narx deb o'qilardi. Narxda valyuta aniq yozilgan bo'lsa o'zgartirilmaydi.
 */
function birlikValyutasiBilan(narx: MahsulotNarxi | null | undefined, units: unknown): MahsulotNarxi | null | undefined {
  if (!narx || !Array.isArray(units)) return narx;
  const royxat = units.filter((unit): unit is Record<string, unknown> => Boolean(unit) && typeof unit === "object");
  const asosiy = royxat.find((unit) => unit.isBase === true) ?? royxat[0];
  if (!asosiy) return narx;
  const kod = (qiymat: unknown) => {
    const matn = typeof qiymat === "string" ? qiymat.trim().toUpperCase() : "";
    return matn === "USD" || matn === "UZS" ? matn : null;
  };
  const chakana = kod(asosiy.currency);
  const ulgurji = kod(asosiy.wholesaleCurrency) ?? chakana;
  const yozilgan = (qiymat: unknown) => kod(qiymat) !== null;
  const chakanaYoq = !yozilgan(narx.retailCurrency) && !yozilgan(narx.currency);
  const ulgurjiYoq = !yozilgan(narx.wholesaleCurrency) && !yozilgan(narx.currency);
  if (!(chakanaYoq && chakana) && !(ulgurjiYoq && ulgurji)) return narx;
  return {
    ...narx,
    ...(chakanaYoq && chakana ? { retailCurrency: chakana } : {}),
    ...(ulgurjiYoq && ulgurji ? { wholesaleCurrency: ulgurji } : {}),
  };
}

/** Search API qoldiq qatorini qaytaradi: variant, uning narxi va valyutasi `modification` ichida. */
export function katalogQidiruvQatoriniMoslash(qator: KatalogQidiruvQatori): MahsulotModifikatsiyasi | null {
  if ("modification" in qator || "modificationId" in qator) {
    const mod = qator.modification;
    const id = qator.modificationId || mod?.id;
    if (!id || !mod || (mod.id && mod.id !== id)) return null;
    const birliklar = "units" in qator ? birliklarniMoslash(qator.units) : [];
    const price = "units" in qator ? birlikValyutasiBilan(mod.price, qator.units) : mod.price;
    return {
      ...mod,
      ...(price !== mod.price ? { price } : {}),
      id,
      productId: qator.productId ?? mod.productId,
      ...(birliklar.length ? { birliklar } : {}),
      ...("unitId" in qator && qator.unitId ? { qidiruvBirligi: qator.unitId } : {}),
    };
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
