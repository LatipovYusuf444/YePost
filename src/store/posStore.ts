import { canSellNegativeStock, limitedStockQuantity } from "../lib/negativeStock.ts";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { birlikTopish, savatchaBirlikQiymatlari, type SavatchaBaza, type TovarBirligi } from "../lib/kopBirlik.ts";
import { kursBilanOgirish, yaxlitHalfUp } from "../lib/yaxlitlash.ts";

export type CartItem = {
  id: string;
  modificationId: string;
  // Mahsulot (tovar kartochkasi) id'si: savatchadan mahsulotni tahrirlash oynasini ochish uchun. Eski qatorlarda yo'q bo'lishi mumkin.
  productId?: string;
  nom: string;
  narx: number;
  chakanaNarx: number;
  ulgurjiNarx: number;
  qoldiq: number;
  warehouseId?: string;
  warehouseName?: string;
  // Qator narx turi (chakana/ulgurji). Belgilanmagan bo'lsa — umumiy (Bosh sahifadagi) narx turi; `narx` shu turga mos hisoblangan.
  narxTuri?: "chakana" | "ulgurji";
  soni: number;
  // Kassir kiritgan haqiqiy sotuv narxi (bir dona uchun). Bo'sh bo'lsa — katalog narxi (`narx`).
  // Katalog narxidan farqi chegirma sifatida avtomatik hisoblanadi.
  sotuvNarxi?: number;
  // Dollarda saqlangan mahsulot (valyuta rejimi): savatcha hisobi so'mda (`narx` — kurs bo'yicha so'mdagi narx), lekin sotuv
  // backendga bu qator o'z valyutasida (USD, asl dollar narxi) yuboriladi.
  valyuta?: "USD";
  aslNarx?: number;
  aslUlgurjiNarx?: number;
  // Ulgurji narx so'mda alohida belgilangan (chakana dollarda): ulgurji tanlanganda qator so'mda ketadi.
  ulgurjiSomda?: boolean;
  // `narx` hisoblangan kurs (1 USD = necha so'm).
  kurs?: number;
  // Ko'p birlikli tovar: tovar birliklari (asosiy birlik birinchi) va tanlangan sotuv birligi ("" yoki yo'q — asosiy birlik).
  // Qator maydonlari (narx, qoldiq, soni) tanlangan birlikda; `baza` — asosiy birlikdagi qiymatlar (birlik almashganda shundan hisoblanadi).
  birliklar?: TovarBirligi[];
  birlikId?: string;
  baza?: SavatchaBaza;
};

function bazaOlish(item: Omit<CartItem, "soni">): SavatchaBaza {
  return {
    chakanaNarx: item.chakanaNarx,
    ulgurjiNarx: item.ulgurjiNarx,
    qoldiq: item.qoldiq,
    ...(item.aslNarx !== undefined ? { aslNarx: item.aslNarx } : {}),
    ...(item.aslUlgurjiNarx !== undefined ? { aslUlgurjiNarx: item.aslUlgurjiNarx } : {}),
    ...(item.kurs !== undefined ? { kurs: item.kurs } : {}),
  };
}

export type NarxTuri = "chakana" | "ulgurji";

// Qatorning narx turi: o'zining turi, bo'lmasa umumiy tur.
export function savatchaNarxTuri(item: Pick<CartItem, "narxTuri">, umumiy: NarxTuri): NarxTuri {
  return item.narxTuri ?? umumiy;
}

// Tanlangan tur bo'yicha katalog narxi (ulgurji narx belgilanmagan bo'lsa chakana narx). Ulgurji narx so'mda alohida belgilangan, lekin
// savatchada narxi yo'q bo'lsa ("Faqat dollar" rejimi) — 0: chakana dollar narxiga jimgina o'tilmaydi (ikki valyutada bunday qator
// so'mdagi ulgurji narxga ega, xatti-harakat o'zgarmaydi).
export function narxTurigaKoraNarx(item: Pick<CartItem, "chakanaNarx" | "ulgurjiNarx" | "ulgurjiSomda">, tur: NarxTuri) {
  return tur === "ulgurji" ? item.ulgurjiNarx || (item.ulgurjiSomda ? 0 : item.chakanaNarx) : item.chakanaNarx;
}

// Haqiqiy sotuv narxi: kassir kiritgan narx (katalog narxidan past ham, baland ham bo'lishi mumkin).
// Kiritilmagan yoki noto'g'ri (0, manfiy, son emas) bo'lsa katalog narxi olinadi.
export function savatchaSotuvNarxi(item: Pick<CartItem, "narx" | "sotuvNarxi">) {
  const narx = item.sotuvNarxi;
  return narx != null && Number.isFinite(narx) && narx > 0 ? narx : item.narx;
}

// Pul summasi tiyin/sent aniqligida (2 xona). Butun so'mgacha yaxlitlanmaydi: dollar narxli qatorda $0.50 farq yo'qolib ketmasin.
const pul = (son: number) => yaxlitHalfUp(son, 2);

// Avtomatik chegirma: sotuv narxi katalogdan past bo'lsa (katalog narxi − sotuv narxi) × miqdor. Masalan 18 000 → 17 800 bo'lsa, 1 dona uchun 200 so'm.
export function savatchaChegirma(item: Pick<CartItem, "narx" | "sotuvNarxi" | "soni">) {
  return Math.max(pul((item.narx - savatchaSotuvNarxi(item)) * item.soni), 0);
}

// Ustama: sotuv narxi katalogdan baland bo'lsa (sotuv narxi − katalog narxi) × miqdor. Masalan 13 500 → 19 000 bo'lsa, 1 dona uchun 5 500 so'm.
export function savatchaUstama(item: Pick<CartItem, "narx" | "sotuvNarxi" | "soni">) {
  return Math.max(pul((savatchaSotuvNarxi(item) - item.narx) * item.soni), 0);
}

// Dollar narxli qatorning so'mdagi narxlari asl dollar narx × kurs (yaxlitlanmagan). Avvalgi versiya backendning butun so'mgacha
// yaxlitlangan qiymatini saqlagan ($3.50 → 4): saqlangan savatcha ochilganda shu qatorlar to'g'ri narxga keltiriladi.
function dollarNarxlariniTuzatish<T extends Pick<CartItem, "chakanaNarx" | "ulgurjiNarx" | "aslNarx" | "aslUlgurjiNarx" | "kurs">>(qiymat: T): T {
  const kurs = Number(qiymat.kurs) || 0;
  if (!(kurs > 0)) return qiymat;
  return {
    ...qiymat,
    ...((qiymat.aslNarx ?? 0) > 0 ? { chakanaNarx: kursBilanOgirish(qiymat.aslNarx ?? 0, kurs) } : {}),
    ...((qiymat.aslUlgurjiNarx ?? 0) > 0 ? { ulgurjiNarx: kursBilanOgirish(qiymat.aslUlgurjiNarx ?? 0, kurs) } : {}),
  };
}

export function eskiSavatchaQatoriniTuzatish(item: CartItem): CartItem {
  if (item.valyuta !== "USD") return item;
  const tuzatilgan = dollarNarxlariniTuzatish(item);
  const narx = narxTurigaKoraNarx(tuzatilgan, item.narxTuri ?? "chakana");
  // Qo'lda yozilgan narx eski (yaxlitlangan) katalog narxiga teng bo'lsa — u aslida katalog narxi edi, tashlanadi.
  const sotuvNarxi = item.sotuvNarxi !== undefined && Math.round(item.sotuvNarxi) === Math.round(item.narx) ? undefined : item.sotuvNarxi;
  return {
    ...tuzatilgan,
    narx,
    sotuvNarxi,
    ...(item.baza ? { baza: dollarNarxlariniTuzatish(item.baza) } : {}),
  };
}

export type KatalogYangilanishi = Pick<CartItem, "nom" | "chakanaNarx" | "ulgurjiNarx" | "productId"> &
  Pick<CartItem, "valyuta" | "aslNarx" | "aslUlgurjiNarx" | "ulgurjiSomda" | "kurs" | "birliklar">;

type PosState = {
  cart: CartItem[];
  // Savatcha narxlari valyutasi: "Faqat dollar" rejimida dollar, qolganlarida so'm. Saqlanadi (savatcha ham saqlanadi).
  savatValyutasi: "UZS" | "USD";
  // Valyuta rejimi almashgan bo'lsa (masalan so'mdan "Faqat dollar"ga) eski valyutadagi narxlar boshqa valyuta sifatida o'qilib
  // ketmasligi uchun savatcha tozalanadi. `true` — mahsulotli savatcha tozalandi (kassirga aytiladi).
  savatValyutasiniMoslash: (valyuta: "UZS" | "USD") => boolean;
  // Bosh sahifada tanlangan narx turi (chakana/ulgurji): headerdagi tezkor qidiruv savatchaga shu narx bilan qo'shadi.
  narxTuri: NarxTuri;
  addToCart: (item: Omit<CartItem, "soni">, quantity?: number) => void;
  // Qatorning sotuv birligini almashtiradi (dona ↔ pochka): narx, qoldiq va miqdor yangi birlikda.
  setBirlik: (productId: string, birlikId: string) => void;
  updateQuantity: (productId: string, nextQuantity: number) => void;
  // Umumiy narx turi: barcha qatorlar shu turga o'tadi. `faqatBelgilanmaganlar` — faqat o'z turi yo'q (eski) qatorlar tenglashtiriladi.
  updatePriceType: (priceType: NarxTuri, faqatBelgilanmaganlar?: boolean) => void;
  // Bitta qatorning narx turini almashtiradi (chakana ↔ ulgurji): katalog narxi shu turga o'tadi.
  setItemNarxTuri: (productId: string, tur: NarxTuri) => void;
  setSotuvNarxi: (productId: string, narx?: number) => void;
  // Mahsulot tahrirlangach qator katalogdan yangilanadi: nom va narxlar yangi, miqdor, ombor va tanlangan birlik o'zgarmaydi.
  katalogdanYangilash: (cartId: string, yangi: KatalogYangilanishi) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
};

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      savatValyutasi: "UZS",
      savatValyutasiniMoslash: (valyuta) => {
        const { savatValyutasi, cart } = get();
        if (savatValyutasi === valyuta) return false;
        set({ savatValyutasi: valyuta, cart: [] });
        return cart.length > 0;
      },
      narxTuri: "chakana",
      addToCart: (item, quantity = 1) => {
        const canSellNegative = canSellNegativeStock();
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(item.qoldiq) || (!canSellNegative && item.qoldiq <= 0)) return;
        set((state) => {
          const exists = state.cart.find((cartItem) => cartItem.id === item.id);

          if (exists) {
            return {
              cart: state.cart.map((cartItem) => {
                if (cartItem.id !== item.id) return cartItem;
                const birlik = birlikTopish(item.birliklar, cartItem.birlikId);
                // Qator qo'shimcha birlikda bo'lsa, yangi (asosiy birlikdagi) qiymatlar shu birlikka o'giriladi.
                const tur = savatchaNarxTuri(cartItem, state.narxTuri);
                if (birlik && !birlik.asosiy) {
                  const qiymat = savatchaBirlikQiymatlari(bazaOlish(item), birlik, tur);
                  return { ...cartItem, ...item, ...qiymat, narxTuri: tur, baza: bazaOlish(item), birlikId: cartItem.birlikId, soni: limitedStockQuantity(cartItem.soni + quantity, qiymat.qoldiq, canSellNegative) };
                }
                // Qatorning o'z narx turi saqlanadi: qo'shilayotgan mahsulot umumiy tur bo'yicha narxlangan bo'lishi mumkin.
                return { ...cartItem, ...item, narx: narxTurigaKoraNarx(item, tur), narxTuri: tur, ...(item.birliklar?.length ? { baza: bazaOlish(item) } : {}), soni: limitedStockQuantity(cartItem.soni + quantity, item.qoldiq, canSellNegative) };
              }),
            };
          }

          return {
            cart: [...state.cart, { ...item, narxTuri: item.narxTuri ?? state.narxTuri, ...(item.birliklar?.length ? { baza: bazaOlish(item) } : {}), soni: limitedStockQuantity(quantity, item.qoldiq, canSellNegative) }],
          };
        });
      },
      updateQuantity: (productId, nextQuantity) => {
        if (!Number.isFinite(nextQuantity)) return;
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.id === productId
                ? { ...item, soni: limitedStockQuantity(nextQuantity, Number.isFinite(item.qoldiq) ? item.qoldiq : 0, canSellNegativeStock()) }
                : item
            )
            .filter((item) => item.soni > 0),
        }));
      },
      setBirlik: (productId, birlikId) => {
        set((state) => ({
          cart: state.cart.map((item) => {
            if (item.id !== productId || !item.baza) return item;
            const birlik = birlikTopish(item.birliklar, birlikId);
            const qiymat = savatchaBirlikQiymatlari(item.baza, birlik, savatchaNarxTuri(item, state.narxTuri));
            // Qo'shimcha birlikda (pochka, korobka) miqdor butun bo'lishi kerak (kasrli birlikdan tashqari); qoldiqdan oshmaydi.
            const butun = birlik && !birlik.asosiy && !birlik.kasr;
            const soni = limitedStockQuantity(butun ? Math.max(Math.round(item.soni), 1) : item.soni, qiymat.qoldiq, canSellNegativeStock());
            // Narxlar yangi birlikdagi; qo'lda yozilgan sotuv narxi (eski birlikdagi) tashlanadi.
            return { ...item, ...qiymat, birlikId: birlik && !birlik.asosiy ? birlik.unitId : "", sotuvNarxi: undefined, soni };
          }),
        }));
      },
      updatePriceType: (priceType, faqatBelgilanmaganlar = false) => {
        set((state) => ({
          narxTuri: priceType,
          cart: state.cart.map((item) => {
            // Sahifa ochilganda faqat o'z turi yo'q (eski) qatorlar umumiy turga tenglashadi; qatorning o'z turi saqlanadi.
            if (faqatBelgilanmaganlar && item.narxTuri) return item;
            const narx = narxTurigaKoraNarx(item, priceType);
            // Katalog narxi haqiqatan o'zgargandagina qo'lda kiritilgan sotuv narxi tashlab yuboriladi
            // (sahifa qayta ochilganda saqlangan narxlar yo'qolmasligi uchun).
            return { ...item, narx, narxTuri: priceType, sotuvNarxi: narx === item.narx ? item.sotuvNarxi : undefined };
          }),
        }));
      },
      setItemNarxTuri: (productId, tur) => {
        set((state) => ({
          cart: state.cart.map((item) => {
            if (item.id !== productId) return item;
            const narx = narxTurigaKoraNarx(item, tur);
            return { ...item, narx, narxTuri: tur, sotuvNarxi: narx === item.narx ? item.sotuvNarxi : undefined };
          }),
        }));
      },
      setSotuvNarxi: (productId, narx) => {
        set((state) => ({
          cart: state.cart.map((item) => (item.id === productId ? { ...item, sotuvNarxi: narx } : item)),
        }));
      },
      katalogdanYangilash: (cartId, yangi) => {
        set((state) => ({
          cart: state.cart.map((item) => {
            if (item.id !== cartId) return item;
            // Dollar maydonlari to'liq almashtiriladi: narx so'mga o'tkazilgan bo'lsa eski dollar narxi qolib ketmasin.
            const asos: CartItem = {
              ...item,
              nom: yangi.nom || item.nom,
              productId: yangi.productId ?? item.productId,
              chakanaNarx: yangi.chakanaNarx,
              ulgurjiNarx: yangi.ulgurjiNarx,
              valyuta: yangi.valyuta,
              aslNarx: yangi.aslNarx,
              aslUlgurjiNarx: yangi.aslUlgurjiNarx,
              ulgurjiSomda: yangi.ulgurjiSomda,
              kurs: yangi.kurs,
              birliklar: yangi.birliklar?.length ? yangi.birliklar : item.birliklar,
              // Katalog narxi o'zgardi: qo'lda yozilgan sotuv narxi tashlanadi, qator yangi narx bilan sotiladi.
              sotuvNarxi: undefined,
            };
            const tur = savatchaNarxTuri(item, state.narxTuri);
            const baza = bazaOlish({ ...asos, qoldiq: item.baza?.qoldiq ?? item.qoldiq });
            const birlik = birlikTopish(asos.birliklar, item.birlikId);
            if (birlik && !birlik.asosiy && item.baza) {
              // Qator qo'shimcha birlikda (pochka): narxlar shu birlikda qayta hisoblanadi, qoldiq va miqdor tegilmaydi.
              const qiymat = savatchaBirlikQiymatlari(baza, birlik, tur);
              return { ...asos, ...qiymat, qoldiq: item.qoldiq, baza };
            }
            return { ...asos, narx: narxTurigaKoraNarx(asos, tur), ...(item.baza ? { baza } : {}) };
          }),
        }));
      },
      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== productId),
        }));
      },
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "yepost-pos-cart",
      // `savatValyutasi` yo'q eski saqlangan savatcha so'mda bo'lgan (standart qiymat "UZS" qoladi).
      partialize: (state) => ({ cart: state.cart, savatValyutasi: state.savatValyutasi }),
      // v1: dollar narxli qatorlar yaxlitlanmagan so'm narxiga o'tkaziladi (avval $3.50 → 4 bo'lib saqlangan).
      version: 1,
      migrate: (saqlangan, versiya) => {
        const holat = (saqlangan ?? {}) as { cart?: CartItem[] };
        if (versiya < 1 && Array.isArray(holat.cart)) return { ...holat, cart: holat.cart.map(eskiSavatchaQatoriniTuzatish) } as PosState;
        return holat as PosState;
      },
    }
  )
);
