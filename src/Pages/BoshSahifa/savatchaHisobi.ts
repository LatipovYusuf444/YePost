// Bosh sahifadagi savatcha jadvali uchun toza hisob-kitob funksiyalari (UI'siz, testlanadi).
import type { QoldiqTanlovi } from "../../types/savdo.ts";
import { savatchaChegirma, savatchaSotuvNarxi, type CartItem } from "../../store/posStore.ts";

export type JadvalXulosasi = { mahsulotlar: number; miqdor: number; chegirma: number; jami: number };

type NarxQatori = Pick<CartItem, "narx" | "sotuvNarxi" | "soni">;

// Savatcha xulosasi: qatorlar soni, umumiy miqdor, narx chegirmalari yig'indisi va sotuv narxlaridagi jami.
export function jadvalXulosasi(cart: ReadonlyArray<NarxQatori>): JadvalXulosasi {
  return {
    mahsulotlar: cart.length,
    miqdor: cart.reduce((jami, item) => jami + item.soni, 0),
    chegirma: cart.reduce((jami, item) => jami + savatchaChegirma(item), 0),
    jami: cart.reduce((jami, item) => jami + savatchaSotuvNarxi(item) * item.soni, 0),
  };
}

// Qator chegirmasi (so'm, butun qator uchun) → bir dona sotuv narxi. 0 yoki bo'sh chegirma — katalog narxiga qaytish (undefined).
// Sotuv narxi 0 bo'la olmaydi (savatcha 0 ni katalog narxi deb hisoblaydi), shuning uchun kamida 1 so'm qoladi.
export function chegirmadanSotuvNarxi(item: Pick<NarxQatori, "narx" | "soni">, chegirma: number): number | undefined {
  if (!Number.isFinite(chegirma) || chegirma <= 0 || item.soni <= 0 || item.narx <= 0) return undefined;
  const narx = Math.round((item.narx - chegirma / item.soni) * 10000) / 10000;
  return Math.max(narx, Math.min(1, item.narx));
}

// Foiz (0–100) → qator chegirmasi (so'm).
export function foizdanChegirma(item: Pick<NarxQatori, "narx" | "soni">, foiz: number) {
  if (!Number.isFinite(foiz) || foiz <= 0) return 0;
  return Math.round(item.narx * item.soni * Math.min(foiz, 100)) / 100;
}

// Qator chegirmasi foizda (katalog narxiga nisbatan), 2 xonagacha.
export function chegirmaFoizi(item: NarxQatori) {
  if (item.narx <= 0) return 0;
  const farq = item.narx - savatchaSotuvNarxi(item);
  return farq > 0 ? Math.round((farq / item.narx) * 10000) / 100 : 0;
}

function mahsulotIdsi(item: QoldiqTanlovi) {
  return item.modification?.product?.id || item.productId || "";
}

// Kategoriya tanlangan bo'lsa (mahsulot id'lari to'plami berilsa) faqat shu kategoriya mahsulotlari qoladi. `null` — filtr yo'q.
export function kategoriyaFiltri(royxat: QoldiqTanlovi[], mahsulotIdlari: ReadonlySet<string> | null) {
  if (!mahsulotIdlari) return royxat;
  return royxat.filter((item) => mahsulotIdlari.has(mahsulotIdsi(item)));
}

export type ShtrixNatijasi =
  | { holat: "topildi"; item: QoldiqTanlovi }
  | { holat: "topilmadi" };

// Skaner kodi bo'yicha aniq moslik: shtrix-kod yoki artikul (registrsiz, bo'sh joylarsiz).
export function shtrixKodTopish(royxat: QoldiqTanlovi[], matn: string): ShtrixNatijasi {
  const kod = matn.trim().toLowerCase();
  if (!kod) return { holat: "topilmadi" };
  const item = royxat.find((element) => {
    const barcode = element.modification?.barcode?.trim().toLowerCase();
    const article = element.modification?.article?.trim().toLowerCase();
    return barcode === kod || article === kod;
  });
  return item ? { holat: "topildi", item } : { holat: "topilmadi" };
}
