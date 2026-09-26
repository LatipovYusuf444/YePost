import { create } from "zustand";
import {
  birliklarApi,
  getStandardUnits,
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
  StandardUnit,
} from "@/types/catalog";

type MahsulotlarState = {
  kategoriyalar: Kategoriya[];
  birliklar: OlchovBirligi[];
  standardBirliklar: StandardUnit[];
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
  standardBirlikniWorkspacegaOtkazish: (unit: StandardUnit) => Promise<string | null>;
  mahsulotOlish: (id: string) => Promise<Mahsulot | null>;
  mahsulotSaqlash: (id: string | null, data: MahsulotMalumoti) => Promise<boolean>;
  mahsulotNarxBilanYaratish: (
    data: MahsulotMalumoti,
    variant: ModifikatsiyaMalumoti
  ) => Promise<boolean>;
  mahsulotVariantlarBilanYaratish: (
    data: MahsulotMalumoti,
    variantlar: ModifikatsiyaMalumoti[]
  ) => Promise<boolean>;
  mahsulotOchirish: (id: string) => Promise<boolean>;
  modifikatsiyalarniYuklash: (productId: string) => Promise<void>;
  barchaModifikatsiyalarniYuklash: () => Promise<void>;
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

function mahsulotniBoyitish(mahsulot: Mahsulot, state: MahsulotlarState) {
  return {
    ...mahsulot,
    category:
      mahsulot.category ??
      state.kategoriyalar.find((kategoriya) => kategoriya.id === mahsulot.categoryId),
    unit: mahsulot.unit ?? state.birliklar.find((birlik) => birlik.id === mahsulot.unitId),
  };
}

function mahsulotIdTekshirish(mahsulot: Mahsulot) {
  if (!mahsulot.id) {
    throw new Error("Backend mahsulot ID qaytarmadi. Mahsulot saqlanmadi.");
  }
}

function birlikMatniniNormallashtirish(value?: string | null) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function standardBirlikkaMosiniTopish(
  birliklar: OlchovBirligi[],
  standard: StandardUnit
) {
  const code = birlikMatniniNormallashtirish(standard.code);
  if (code) {
    const codeBoyicha = birliklar.find(
      (birlik) => birlikMatniniNormallashtirish(birlik.code) === code
    );
    if (codeBoyicha) return codeBoyicha;
  }

  const qisqaNomlar = [standard.shortNameUz, standard.shortNameRu]
    .map(birlikMatniniNormallashtirish)
    .filter(Boolean);
  const qisqaNomBoyicha = birliklar.find((birlik) =>
    qisqaNomlar.includes(birlikMatniniNormallashtirish(birlik.shortName))
  );
  if (qisqaNomBoyicha) return qisqaNomBoyicha;

  const nomlar = [standard.nameUz, standard.nameRu]
    .map(birlikMatniniNormallashtirish)
    .filter(Boolean);
  return birliklar.find((birlik) =>
    nomlar.includes(birlikMatniniNormallashtirish(birlik.name))
  );
}

const standardBirlikSorovlari = new Map<number, Promise<string>>();

export const useMahsulotlarStore = create<MahsulotlarState>((set, get) => ({
  kategoriyalar: [],
  birliklar: [],
  standardBirliklar: [],
  mahsulotlar: [],
  modifikatsiyalar: {},
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,

  yuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const [kategoriyalar, birliklar, mahsulotlar, standardBirliklar] = await Promise.all([
        kategoriyalarApi.royxat(),
        birliklarApi.royxat(),
        mahsulotlarApi.royxat(),
        getStandardUnits().catch(() => []),
      ]);
      set({
        kategoriyalar,
        birliklar,
        standardBirliklar,
        mahsulotlar: mahsulotlar.map((mahsulot) => ({
          ...mahsulot,
          category:
            mahsulot.category ??
            kategoriyalar.find((kategoriya) => kategoriya.id === mahsulot.categoryId),
          unit: mahsulot.unit ?? birliklar.find((birlik) => birlik.id === mahsulot.unitId),
        })),
        yuklanmoqda: false,
      });
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
  standardBirlikniWorkspacegaOtkazish: async (standard) => {
    const mavjud = standardBirlikkaMosiniTopish(get().birliklar, standard);
    if (mavjud) return mavjud.id;

    const davomEtayotganSorov = standardBirlikSorovlari.get(standard.id);
    if (davomEtayotganSorov) {
      try {
        return await davomEtayotganSorov;
      } catch (error) {
        set({ xatolik: getApiErrorMessage(error) });
        return null;
      }
    }

    const sorov = (async () => {
      const qaytaTekshirilgan = standardBirlikkaMosiniTopish(get().birliklar, standard);
      if (qaytaTekshirilgan) return qaytaTekshirilgan.id;

      const code = standard.code?.trim();
      const item = await birliklarApi.yaratish({
        ...(code ? { code } : {}),
        name: standard.nameUz.trim(),
        shortName: standard.shortNameUz.trim(),
      });
      if (typeof item.id !== "string" || !item.id.trim()) {
        throw new Error("Backend workspace o'lchov birligi UUID qiymatini qaytarmadi.");
      }
      set((state) => ({
        birliklar: state.birliklar.some((birlik) => birlik.id === item.id)
          ? state.birliklar
          : [item, ...state.birliklar],
      }));
      return item.id;
    })();

    standardBirlikSorovlari.set(standard.id, sorov);
    try {
      return await sorov;
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    } finally {
      standardBirlikSorovlari.delete(standard.id);
    }
  },

  mahsulotOlish: async (id) => {
    try { return await mahsulotlarApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  mahsulotSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const response = id ? await mahsulotlarApi.yangilash(id, data) : await mahsulotlarApi.yaratish(data);
      const item = mahsulotniBoyitish(response, get());
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
      const mahsulot = mahsulotniBoyitish(await mahsulotlarApi.yaratish(data), get());
      mahsulotIdTekshirish(mahsulot);

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
          if (mahsulot.id) await mahsulotlarApi.ochirish(mahsulot.id);
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
  mahsulotVariantlarBilanYaratish: async (data, variantlar) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const mahsulot = mahsulotniBoyitish(await mahsulotlarApi.yaratish(data), get());
      mahsulotIdTekshirish(mahsulot);

      try {
        const modifikatsiyalar = await modifikatsiyalarApi.yaratishKoplab(mahsulot.id, variantlar);
        set((state) => ({
          mahsulotlar: [mahsulot, ...state.mahsulotlar],
          modifikatsiyalar: {
            ...state.modifikatsiyalar,
            [mahsulot.id]: modifikatsiyalar,
          },
          amalBajarilmoqda: false,
        }));
        return true;
      } catch (variantXatosi) {
        try {
          if (mahsulot.id) await mahsulotlarApi.ochirish(mahsulot.id);
        } catch {
          // Variantlardan biri yaratilmasa asosiy xato ko'rsatiladi.
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
  barchaModifikatsiyalarniYuklash: async () => {
    try {
      const items = await modifikatsiyalarApi.barchasi();
      const guruhlar: Record<string, MahsulotModifikatsiyasi[]> = {};
      for (const mahsulot of get().mahsulotlar) guruhlar[mahsulot.id] = [];
      for (const item of items) {
        if (item.productId) (guruhlar[item.productId] ??= []).push(item);
      }
      set({ modifikatsiyalar: guruhlar });
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
