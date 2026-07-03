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
  soni: number;
};

type PosState = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "soni">, quantity?: number) => void;
  updateQuantity: (productId: string, nextQuantity: number) => void;
  updatePriceType: (priceType: "chakana" | "ulgurji") => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
};

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      cart: [],
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
          cart: state.cart.map((item) => ({
            ...item,
            narx: priceType === "ulgurji" ? item.ulgurjiNarx || item.chakanaNarx : item.chakanaNarx,
          })),
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
