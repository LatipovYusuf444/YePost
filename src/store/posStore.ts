import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  modificationId: string;
  nom: string;
  narx: number;
  chakanaNarx: number;
  ulgurjiNarx: number;
  qoldiq: number;
  warehouseId?: string;
  warehouseName?: string;
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
};

// Haqiqiy sotuv narxi: kassir kiritgan narx (katalog narxidan past ham, baland ham bo'lishi mumkin).
// Kiritilmagan yoki noto'g'ri (0, manfiy, son emas) bo'lsa katalog narxi olinadi.
export function savatchaSotuvNarxi(item: Pick<CartItem, "narx" | "sotuvNarxi">) {
  const narx = item.sotuvNarxi;
  return narx != null && Number.isFinite(narx) && narx > 0 ? narx : item.narx;
}

// Avtomatik chegirma: sotuv narxi katalogdan past bo'lsa (katalog narxi − sotuv narxi) × miqdor. Masalan 18 000 → 17 800 bo'lsa, 1 dona uchun 200 so'm.
export function savatchaChegirma(item: Pick<CartItem, "narx" | "sotuvNarxi" | "soni">) {
  return Math.max(Math.round((item.narx - savatchaSotuvNarxi(item)) * item.soni), 0);
}

// Ustama: sotuv narxi katalogdan baland bo'lsa (sotuv narxi − katalog narxi) × miqdor. Masalan 13 500 → 19 000 bo'lsa, 1 dona uchun 5 500 so'm.
export function savatchaUstama(item: Pick<CartItem, "narx" | "sotuvNarxi" | "soni">) {
  return Math.max(Math.round((savatchaSotuvNarxi(item) - item.narx) * item.soni), 0);
}

type PosState = {
  cart: CartItem[];
  // Bosh sahifada tanlangan narx turi (chakana/ulgurji): headerdagi tezkor qidiruv savatchaga shu narx bilan qo'shadi.
  narxTuri: "chakana" | "ulgurji";
  addToCart: (item: Omit<CartItem, "soni">, quantity?: number) => void;
  updateQuantity: (productId: string, nextQuantity: number) => void;
  updatePriceType: (priceType: "chakana" | "ulgurji") => void;
  setSotuvNarxi: (productId: string, narx?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
};

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      cart: [],
      narxTuri: "chakana",
      addToCart: (item, quantity = 1) => {
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(item.qoldiq) || item.qoldiq <= 0) return;
        set((state) => {
          const exists = state.cart.find((cartItem) => cartItem.id === item.id);

          if (exists) {
            return {
              cart: state.cart.map((cartItem) =>
                cartItem.id === item.id
                  ? {
                      ...cartItem,
                      ...item,
                      soni: Math.min(cartItem.soni + quantity, item.qoldiq),
                    }
                  : cartItem
              ),
            };
          }

          return {
            cart: [...state.cart, { ...item, soni: Math.min(quantity, item.qoldiq) }],
          };
        });
      },
      updateQuantity: (productId, nextQuantity) => {
        if (!Number.isFinite(nextQuantity)) return;
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.id === productId
                ? { ...item, soni: Math.min(Math.max(nextQuantity, 0), Number.isFinite(item.qoldiq) ? Math.max(0, item.qoldiq) : 0) }
                : item
            )
            .filter((item) => item.soni > 0),
        }));
      },
      updatePriceType: (priceType) => {
        set((state) => ({
          narxTuri: priceType,
          cart: state.cart.map((item) => {
            const narx = priceType === "ulgurji" ? item.ulgurjiNarx || item.chakanaNarx : item.chakanaNarx;
            // Katalog narxi haqiqatan o'zgargandagina qo'lda kiritilgan sotuv narxi tashlab yuboriladi
            // (sahifa qayta ochilganda saqlangan narxlar yo'qolmasligi uchun).
            return { ...item, narx, sotuvNarxi: narx === item.narx ? item.sotuvNarxi : undefined };
          }),
        }));
      },
      setSotuvNarxi: (productId, narx) => {
        set((state) => ({
          cart: state.cart.map((item) => (item.id === productId ? { ...item, sotuvNarxi: narx } : item)),
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
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
