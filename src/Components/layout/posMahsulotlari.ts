import type { QoldiqTanlovi } from "@/types/savdo";

// POS mahsulot tanlash uchun umumiy yordamchilar: MahsulotTanlashModal (to'liq oyna) va headerdagi tezkor qidiruv
// bir xil qoida bo'yicha nom, narx va qoldiqni hisoblaydi.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Birinchi musbat qiymatni qaytaradi (backend ba'zan 0 yoki bo'sh yuboradi).
export function musbat(...qiymatlar: unknown[]) {
  for (const qiymat of qiymatlar) {
    const son = Number(qiymat);
    if (Number.isFinite(son) && son > 0) return son;
  }
  return 0;
}

// UUID ko'rinishidagi "nom" haqiqiy nom emas — bo'sh deb hisoblanadi.
export function toza(nom?: string | null) {
  const qiymat = nom?.trim() ?? "";
  return qiymat && !UUID.test(qiymat) ? qiymat : "";
}

export function mahsulotNomi(item: QoldiqTanlovi) {
  return toza(item.modification?.product?.name);
}

export function variantNomi(item: QoldiqTanlovi) {
  const variant = toza(item.modification?.name);
  return variant && variant !== "Asosiy variant" && variant !== mahsulotNomi(item) ? variant : "";
}

export function savatNomi(item: QoldiqTanlovi) {
  return [mahsulotNomi(item), variantNomi(item)].filter(Boolean).join(" / ") || toza(item.modification?.name);
}

export function qoldiqMiqdori(item: QoldiqTanlovi) {
  const raw = item as QoldiqTanlovi & {
    availableQuantity?: number;
    availableQty?: number;
    balanceQty?: number;
    qty?: number;
  };
  return Number(raw.quantity ?? raw.balance ?? raw.availableQuantity ?? raw.availableQty ?? raw.balanceQty ?? raw.qty ?? 0);
}

export function qoldiqNarxi(item: QoldiqTanlovi, narxTuri: "chakana" | "ulgurji") {
  const narx = item.modification?.price;
  const chakana = musbat(narx?.retailPrice, narx?.sellingPrice, item.sellingPrice, item.price, narx?.wholesalePrice);
  const ulgurji = musbat(narx?.wholesalePrice);
  return narxTuri === "ulgurji" && ulgurji > 0 ? ulgurji : chakana;
}

function narxlarniBirlashtirish(a?: QoldiqTanlovi["modification"], b?: QoldiqTanlovi["modification"]) {
  const narx = {
    costPrice: musbat(a?.price?.costPrice, b?.price?.costPrice),
    retailPrice: musbat(a?.price?.retailPrice, b?.price?.retailPrice),
    wholesalePrice: musbat(a?.price?.wholesalePrice, b?.price?.wholesalePrice),
    sellingPrice: musbat(a?.price?.sellingPrice, b?.price?.sellingPrice, a?.price?.retailPrice, b?.price?.retailPrice),
  };
  // Hech qanday narx yo'q bo'lsa, keyingi bosqichda katalogdan to'ldirish uchun undefined qoldiriladi.
  return narx.retailPrice || narx.wholesalePrice || narx.sellingPrice ? narx : undefined;
}

// Ombor qoldig'ini (miqdor) katalog ma'lumotlari (nom, narx) bilan birlashtiradi.
// Ikkala manbadan ham bo'sh/0 qiymatlar haqiqiy qiymatni bosib ketmaydi.
export function qoldiqBirlashtirish(omborQoldiq: QoldiqTanlovi[], katalog: QoldiqTanlovi[]) {
  const xarita = new Map<string, QoldiqTanlovi>();

  katalog.forEach((item) => {
    if (item.modificationId) xarita.set(item.modificationId, item);
  });

  omborQoldiq.forEach((item) => {
    if (!item.modificationId) return;
    const katalogdagi = xarita.get(item.modificationId);
    const mod = item.modification;
    const katMod = katalogdagi?.modification;
    const mahsulotNom = toza(mod?.product?.name) || toza(katMod?.product?.name);

    xarita.set(item.modificationId, {
      ...katalogdagi,
      ...item,
      sellingPrice: musbat(item.sellingPrice, item.price, katalogdagi?.sellingPrice, katalogdagi?.price),
      price: musbat(item.price, item.sellingPrice, katalogdagi?.price, katalogdagi?.sellingPrice),
      modification: {
        ...katMod,
        ...mod,
        id: mod?.id ?? katMod?.id ?? item.modificationId,
        name: toza(mod?.name) || toza(katMod?.name) || undefined,
        barcode: mod?.barcode || katMod?.barcode,
        article: mod?.article || katMod?.article,
        product: {
          id: mod?.product?.id || katMod?.product?.id || item.productId || "",
          name: mahsulotNom,
        },
        price: narxlarniBirlashtirish(mod, katMod),
      },
    });
  });

  return Array.from(xarita.values());
}

export function tanlovKaliti(modificationId: string, warehouseId: string) {
  return `${modificationId}::${warehouseId}`;
}
