import { create } from "zustand";
import {
  birliklarApi,
  kategoriyalarApi,
  mahsulotlarApi,
  modifikatsiyalarApi,
} from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  Kategoriya,
  KategoriyaMalumoti,
  Mahsulot,
  MahsulotMalumoti,
  MahsulotModifikatsiyasi,
  ModifikatsiyaMalumoti,
  NarxMalumoti,
  OlchovBirligi,
  OlchovBirligiMalumoti,
} from "@/types/catalog";

type MahsulotlarState = {
  kategoriyalar: Kategoriya[];
  birliklar: OlchovBirligi[];
  mahsulotlar: Mahsulot[];
  modifikatsiyalar: Record<string, MahsulotModifikatsiyasi[]>;
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  yuklash: () => Promise<void>;
  kategoriyaOlish: (id: string) => Promise<Kategoriya | null>;
  kategoriyaSaqlash: (id: string | null, data: KategoriyaMalumoti) => Promise<boolean>;
  kategoriyaOchirish: (id: string) => Promise<boolean>;
  birlikOlish: (id: string) => Promise<OlchovBirligi | null>;
  birlikSaqlash: (id: string | null, data: OlchovBirligiMalumoti) => Promise<boolean>;
  birlikOchirish: (id: string) => Promise<boolean>;
  mahsulotOlish: (id: string) => Promise<Mahsulot | null>;
  mahsulotSaqlash: (id: string | null, data: MahsulotMalumoti) => Promise<boolean>;
  mahsulotNarxBilanYaratish: (
    data: MahsulotMalumoti,
    variant: ModifikatsiyaMalumoti
  ) => Promise<boolean>;
  mahsulotOchirish: (id: string) => Promise<boolean>;
  modifikatsiyalarniYuklash: (productId: string) => Promise<void>;
  modifikatsiyaOlish: (id: string) => Promise<MahsulotModifikatsiyasi | null>;
  narxOlish: (id: string) => Promise<MahsulotModifikatsiyasi["price"] | null>;
  modifikatsiyaSaqlash: (
    productId: string,
    id: string | null,
    data: ModifikatsiyaMalumoti
  ) => Promise<boolean>;
  modifikatsiyaOchirish: (productId: string, id: string) => Promise<boolean>;
  narxYangilash: (productId: string, id: string, data: NarxMalumoti) => Promise<boolean>;
  xatolikniTozalash: () => void;
};

function almashtir<T extends { id: string }>(items: T[], item: T) {
  return items.map((old) => (old.id === item.id ? item : old));
}

export const useMahsulotlarStore = create<MahsulotlarState>((set) => ({
  kategoriyalar: [],
  birliklar: [],
  mahsulotlar: [],
  modifikatsiyalar: {},
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,

  yuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const [kategoriyalar, birliklar, mahsulotlar] = await Promise.all([
        kategoriyalarApi.royxat(),
        birliklarApi.royxat(),
        mahsulotlarApi.royxat(),
      ]);
      set({ kategoriyalar, birliklar, mahsulotlar, yuklanmoqda: false });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  kategoriyaOlish: async (id) => {
    try { return await kategoriyalarApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  kategoriyaSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = id
        ? await kategoriyalarApi.yangilash(id, data)
        : await kategoriyalarApi.yaratish(data);
      set((state) => ({
        kategoriyalar: id ? almashtir(state.kategoriyalar, item) : [item, ...state.kategoriyalar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kategoriyaOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await kategoriyalarApi.ochirish(id);
      set((state) => ({
        kategoriyalar: state.kategoriyalar.filter((item) => item.id !== id),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  birlikOlish: async (id) => {
    try { return await birliklarApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  birlikSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = id ? await birliklarApi.yangilash(id, data) : await birliklarApi.yaratish(data);
      set((state) => ({
        birliklar: id ? almashtir(state.birliklar, item) : [item, ...state.birliklar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  birlikOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await birliklarApi.ochirish(id);
      set((state) => ({
        birliklar: state.birliklar.filter((item) => item.id !== id),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  mahsulotOlish: async (id) => {
    try { return await mahsulotlarApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  mahsulotSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = id ? await mahsulotlarApi.yangilash(id, data) : await mahsulotlarApi.yaratish(data);
      set((state) => ({
        mahsulotlar: id ? almashtir(state.mahsulotlar, item) : [item, ...state.mahsulotlar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  mahsulotNarxBilanYaratish: async (data, variant) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const mahsulot = await mahsulotlarApi.yaratish(data);

      try {
        const modifikatsiya = await modifikatsiyalarApi.yaratish(
          mahsulot.id,
          variant
        );
        set((state) => ({
          mahsulotlar: [mahsulot, ...state.mahsulotlar],
          modifikatsiyalar: {
            ...state.modifikatsiyalar,
            [mahsulot.id]: [modifikatsiya],
          },
          amalBajarilmoqda: false,
        }));
        return true;
      } catch (variantXatosi) {
        // Backend mahsulot va variantni alohida endpointlarda yaratadi.
        // Variant yaratilmasa yarimta mahsulot qolmasligi uchun mahsulot tozalanadi.
        try {
          await mahsulotlarApi.ochirish(mahsulot.id);
        } catch {
          // Asosiy xatoni foydalanuvchiga ko'rsatamiz.
        }
        throw variantXatosi;
      }
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  mahsulotOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await mahsulotlarApi.ochirish(id);
      set((state) => ({
        mahsulotlar: state.mahsulotlar.filter((item) => item.id !== id),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  modifikatsiyalarniYuklash: async (productId) => {
    try {
      const items = await modifikatsiyalarApi.royxat(productId);
      set((state) => ({ modifikatsiyalar: { ...state.modifikatsiyalar, [productId]: items } }));
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
    }
  },
  modifikatsiyaOlish: async (id) => {
    try { return await modifikatsiyalarApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  narxOlish: async (id) => {
    try { return await modifikatsiyalarApi.narxOlish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  modifikatsiyaSaqlash: async (productId, id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = id
        ? await modifikatsiyalarApi.yangilash(id, data)
        : await modifikatsiyalarApi.yaratish(productId, data);
      set((state) => ({
        modifikatsiyalar: {
          ...state.modifikatsiyalar,
          [productId]: id
            ? almashtir(state.modifikatsiyalar[productId] ?? [], item)
            : [item, ...(state.modifikatsiyalar[productId] ?? [])],
        },
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  modifikatsiyaOchirish: async (productId, id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await modifikatsiyalarApi.ochirish(id);
      set((state) => ({
        modifikatsiyalar: {
          ...state.modifikatsiyalar,
          [productId]: (state.modifikatsiyalar[productId] ?? []).filter((item) => item.id !== id),
        },
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  narxYangilash: async (productId, id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const price = await modifikatsiyalarApi.narxYangilash(id, data);
      set((state) => ({
        modifikatsiyalar: {
          ...state.modifikatsiyalar,
          [productId]: (state.modifikatsiyalar[productId] ?? []).map((item) =>
            item.id === id ? { ...item, price } : item
          ),
        },
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  xatolikniTozalash: () => set({ xatolik: null }),
}));
