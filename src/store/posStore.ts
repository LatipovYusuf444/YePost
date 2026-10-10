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
};

// Haqiqiy sotuv narxi: katalog narxidan baland yoki noto'g'ri qiymat bo'lsa katalog narxi olinadi.
export function savatchaSotuvNarxi(item: Pick<CartItem, "narx" | "sotuvNarxi">) {
  const narx = item.sotuvNarxi;
  return narx != null && narx > 0 && narx < item.narx ? narx : item.narx;
}

// Avtomatik chegirma: (katalog narxi − sotuv narxi) × miqdor. Masalan 18 000 → 17 800 bo'lsa, 1 dona uchun 200 so'm.
export function savatchaChegirma(item: Pick<CartItem, "narx" | "sotuvNarxi" | "soni">) {
  return Math.round((item.narx - savatchaSotuvNarxi(item)) * item.soni);
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
        set((state) => {
          const exists = state.cart.find((cartItem) => cartItem.id === item.id);

          if (exists) {
            return {
              cart: state.cart.map((cartItem) =>
                cartItem.id === item.id
                  ? {
                      ...cartItem,
                      ...item,
                      soni: Math.min(cartItem.soni + quantity, item.qoldiq || cartItem.soni + quantity),
                    }
                  : cartItem
              ),
            };
          }

          return {
            cart: [...state.cart, { ...item, soni: Math.min(quantity, item.qoldiq || quantity) }],
          };
        });
      },
      updateQuantity: (productId, nextQuantity) => {
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.id === productId
                ? { ...item, soni: Math.min(Math.max(nextQuantity, 0), item.qoldiq || nextQuantity) }
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
