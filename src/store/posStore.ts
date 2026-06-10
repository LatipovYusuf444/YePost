import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: number;
  nom: string;
  narx: number;
  soni: number;
};

type PosState = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "soni">, quantity?: number) => void;
  updateQuantity: (productId: number, nextQuantity: number) => void;
  removeFromCart: (productId: number) => void;
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
                  ? { ...cartItem, soni: cartItem.soni + quantity }
                  : cartItem
              ),
            };
          }

          return {
            cart: [...state.cart, { ...item, soni: quantity }],
          };
        });
      },
      updateQuantity: (productId, nextQuantity) => {
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.id === productId ? { ...item, soni: Math.max(nextQuantity, 0) } : item
            )
            .filter((item) => item.soni > 0),
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
