import { useEffect, useReducer } from "react";
import { mahsulotBirliklariApi } from "@/api/catalogApi";
import type { TovarBirligi } from "@/lib/kopBirlik";

/** Mahsulot birliklari saqlanganda (Mahsulotlar → birliklar) yuboriladigan hodisa: kesh shu tovar uchun tozalanadi. */
export const TOVAR_BIRLIKLARI_HODISASI = "tovar-birliklari:ozgardi";

// Tovar birliklari keshi: bir tovar bir nechta qatorda yoki qayta ochilganda so'rov takrorlanmaydi, lekin uzoq turmaydi — koeffitsient
// (1 korobka = 12) boshqa joyda o'zgarishi mumkin, backend esa korobka qatorini doim hozirgi koeffitsient bilan hisoblaydi.
const MUDDAT = 60_000;
const sorovlar = new Map<string, { vaqt: number; sorov: Promise<TovarBirligi[]> }>();
const natijalar = new Map<string, TovarBirligi[]>();
const tinglovchilar = new Set<() => void>();

function xabarBerish() {
  for (const tinglovchi of tinglovchilar) tinglovchi();
}

function yuklash(productId: string, majburiy = false) {
  const bor = sorovlar.get(productId);
  if (bor && !majburiy && Date.now() - bor.vaqt < MUDDAT) return bor.sorov;
  const sorov = mahsulotBirliklariApi.olish(productId).then((royxat) => {
    natijalar.set(productId, royxat);
    xabarBerish();
    return royxat;
  }).catch(() => {
    // Xatolik kesh qilinmaydi; avval olingan ro'yxat (bo'lsa) qoladi.
    sorovlar.delete(productId);
    return natijalar.get(productId) ?? [];
  });
  sorovlar.set(productId, { vaqt: Date.now(), sorov });
  return sorov;
}

/** Bitta tovar birliklari (keshdan yoki serverdan): yangi qo'shilgan qatorga "Umumiy birlik"ni qo'yish uchun. Xatoda — bo'sh ro'yxat. */
export function tovarBirliklariniOlish(productId: string) {
  return productId ? yuklash(productId) : Promise.resolve([] as TovarBirligi[]);
}

/** Keshni tozalash (berilmasa — hammasi). */
export function tovarBirliklariKeshiniTozalash(productId?: string) {
  if (productId) sorovlar.delete(productId);
  else sorovlar.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener(TOVAR_BIRLIKLARI_HODISASI, (event) => {
    const productId = (event as CustomEvent<string | undefined>).detail;
    tovarBirliklariKeshiniTozalash(productId || undefined);
  });
}

/**
 * Saqlashdan oldin birliklarni serverdan qayta olish (keshsiz): ekrandagi jami backend hisoblaydigan jami bilan bir xil bo'lishi uchun.
 * Natija: productId → birliklar; olinmaganlar — oxirgi ma'lum ro'yxat yoki bo'sh.
 */
export async function tovarBirliklariniYangilash(productIds: readonly string[]) {
  const royxat = [...new Set(productIds.filter(Boolean))];
  const javoblar = await Promise.all(royxat.map((productId) => yuklash(productId, true)));
  return Object.fromEntries(royxat.map((productId, index) => [productId, javoblar[index]])) as Record<string, TovarBirligi[]>;
}

/** Berilgan tovarlarning birliklari (productId → birliklar); yuklanmaganlari hali yo'q. Yangilanganda komponent qayta chiziladi. */
export function useTovarBirliklari(productIds: readonly string[]) {
  const [, yangilash] = useReducer((son: number) => son + 1, 0);
  const kalit = [...new Set(productIds.filter(Boolean))].sort().join(",");
  useEffect(() => {
    tinglovchilar.add(yangilash);
    return () => { tinglovchilar.delete(yangilash); };
  }, []);
  useEffect(() => {
    for (const productId of kalit.split(",").filter(Boolean)) void yuklash(productId);
  }, [kalit]);
  const natija: Record<string, TovarBirligi[]> = {};
  for (const productId of kalit.split(",").filter(Boolean)) {
    const royxat = natijalar.get(productId);
    if (royxat) natija[productId] = royxat;
  }
  return natija;
}
