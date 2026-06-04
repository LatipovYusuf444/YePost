import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Purchase = {
  id: number;
  ismi: string;
  sana: string;
  ozgartirilganSana: string;
  masul: string;
  yetkazibBeruvchi: string;
  summa: number;
  ombor: string;
};

export type PurchaseProduct = {
  id: number;
  purchaseId?: number;
  nomi: string;
  soni: number;
  kodi: string;
  shtrixKodi: string;
  olchovBirligi: string;
  narxi: number;
};

type OmborState = {
  purchases: Purchase[];
  products: PurchaseProduct[];
  addPurchase: (purchase: Omit<Purchase, "id">) => Purchase;
  addProduct: (product: Omit<PurchaseProduct, "id">) => PurchaseProduct;
  decreaseProductStock: (productId: number, quantity: number) => void;
  ensureMinimumStock: (minimum: number) => void;
};

const demoPurchases: Purchase[] = [
  {
    id: 1,
    ismi: "Ali Ashurmatov",
    sana: "20.11.2025",
    ozgartirilganSana: "14.04.2026",
    masul: "Dilorom Kosimova",
    yetkazibBeruvchi: "24.12.2020",
    summa: 150000,
    ombor: "Ombor nomi",
  },
  {
    id: 2,
    ismi: "Sardor Textile",
    sana: "21.11.2025",
    ozgartirilganSana: "15.04.2026",
    masul: "Javohir Karimov",
    yetkazibBeruvchi: "Premium Logistic",
    summa: 820000,
    ombor: "Asosiy ombor",
  },
  {
    id: 3,
    ismi: "Madina Market",
    sana: "22.11.2025",
    ozgartirilganSana: "16.04.2026",
    masul: "Sevara Azimova",
    yetkazibBeruvchi: "City Supply",
    summa: 430000,
    ombor: "Filial ombor",
  },
  {
    id: 4,
    ismi: "Ali Ashurmatov",
    sana: "24.11.2025",
    ozgartirilganSana: "18.04.2026",
    masul: "Dilorom Kosimova",
    yetkazibBeruvchi: "24.12.2020",
    summa: 150000,
    ombor: "Ombor nomi",
  },
  {
    id: 5,
    ismi: "Bekzod Optom",
    sana: "25.11.2025",
    ozgartirilganSana: "20.04.2026",
    masul: "Akmal Mirzaev",
    yetkazibBeruvchi: "East Trade",
    summa: 1250000,
    ombor: "Zaxira ombor",
  },
  {
    id: 6,
    ismi: "Ali Ashurmatov",
    sana: "26.11.2025",
    ozgartirilganSana: "21.04.2026",
    masul: "Dilorom Kosimova",
    yetkazibBeruvchi: "24.12.2020",
    summa: 150000,
    ombor: "Ombor nomi",
  },
];

const demoProducts: PurchaseProduct[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  purchaseId: 1,
  nomi: "Miss Dior",
  soni: 24 + index,
  kodi: "10297",
  shtrixKodi: "981638",
  olchovBirligi: "ml",
  narxi: 2000000,
}));

export const useOmborStore = create<OmborState>()(
  persist(
    (set) => ({
      purchases: demoPurchases,
      products: demoProducts,
      addPurchase: (purchase) => {
        const nextPurchase = { ...purchase, id: Date.now() };

        set((state) => ({
          purchases: [nextPurchase, ...state.purchases],
        }));

        return nextPurchase;
      },
      addProduct: (product) => {
        const nextProduct = { ...product, id: Date.now() };

        set((state) => ({
          products: [nextProduct, ...state.products],
        }));

        return nextProduct;
      },
      decreaseProductStock: (productId, quantity) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? { ...product, soni: Math.max(product.soni - quantity, 0) }
              : product
          ),
        }));
      },
      ensureMinimumStock: (minimum) => {
        set((state) => ({
          products: state.products.map((product) => ({
            ...product,
            soni: Math.max(product.soni, minimum),
          })),
        }));
      },
    }),
    {
      name: "yepost-ombor-demo",
    }
  )
);
