import { create } from "zustand";
import {
  mijozKompaniyalariRoyxatiniOlish,
  mijozlarRoyxatiniOlish,
  katalogModifikatsiyalariniQoldiqTanlovigaOlish,
  omborlarRoyxatiniOlish,
  omborQoldiqlariniOlish,
  qaytarishlarRoyxatiniOlish,
  qaytarishTafsilotiniOlish,
  qaytarishniBekorQilish,
  qaytarishniYangilash,
  qaytarishniTasdiqlash,
  qaytarishYaratish,
  sotuvlarRoyxatiniOlish,
  sotuvniBekorQilish,
  sotuvniTasdiqlash,
  sotuvTafsilotiniOlish,
  sotuvYaratish,
  xodimlarRoyxatiniOlish,
} from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  MijozTanlovi,
  OmborTanlovi,
  Qaytarish,
  QaytarishYaratishMalumoti,
  QoldiqTanlovi,
  Sotuv,
  SotuvYaratishMalumoti,
  XodimTanlovi,
} from "@/types/savdo";

function qoldiqlarniKatalogBilanBirlashtirish(
  stockQoldiqlar: QoldiqTanlovi[],
  katalogQoldiqlar: QoldiqTanlovi[]
) {
  const map = new Map<string, QoldiqTanlovi>();

  for (const item of katalogQoldiqlar) {
    map.set(item.modificationId, item);
  }

  for (const item of stockQoldiqlar) {
    const katalogItem = map.get(item.modificationId);
    const modification = item.modification ?? katalogItem?.modification;

    map.set(item.modificationId, {
      ...katalogItem,
      ...item,
      modification: modification
        ? {
            ...katalogItem?.modification,
            ...item.modification,
            id: modification.id,
            product: item.modification?.product ?? katalogItem?.modification?.product,
            price: item.modification?.price ?? katalogItem?.modification?.price,
          }
        : undefined,
      sellingPrice:
        item.sellingPrice ??
        item.price ??
        katalogItem?.sellingPrice ??
        katalogItem?.price,
      price:
        item.price ??
        item.sellingPrice ??
        katalogItem?.price ??
        katalogItem?.sellingPrice,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const aName = a.modification?.product?.name ?? a.modification?.name ?? a.modificationId;
    const bName = b.modification?.product?.name ?? b.modification?.name ?? b.modificationId;
    return aName.localeCompare(bName, "uz");
  });
}

function sotuvniBoglanganMalumotlarBilanBoyitish(
  sotuv: Sotuv,
  malumotlar: {
    mijozlar: MijozTanlovi[];
    mijozKompaniyalari: MijozTanlovi[];
    xodimlar: XodimTanlovi[];
    omborlar: OmborTanlovi[];
  }
) {
  const customer = sotuv.customer ?? malumotlar.mijozlar.find((item) => item.id === sotuv.customerId);
  const clientCompany =
    sotuv.clientCompany ??
    malumotlar.mijozKompaniyalari.find((item) => item.id === sotuv.clientCompanyId);
  const responsible =
    sotuv.responsible ?? malumotlar.xodimlar.find((item) => item.id === sotuv.responsibleId);
  const warehouse = sotuv.warehouse ?? malumotlar.omborlar.find((item) => item.id === sotuv.warehouseId);

  return {
    ...sotuv,
    customer,
    clientCompany,
    responsible,
    warehouse,
  };
}

type SavdoState = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
  omborlar: OmborTanlovi[];
  mijozlar: MijozTanlovi[];
  mijozKompaniyalari: MijozTanlovi[];
  xodimlar: XodimTanlovi[];
  qoldiqlar: QoldiqTanlovi[];
  tanlanganSotuv: Sotuv | null;
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  boshlangichMalumotlarniYuklash: () => Promise<void>;
  qoldiqlarniYuklash: (warehouseId?: string) => Promise<void>;
  sotuvTafsilotiniYuklash: (sotuvId: string) => Promise<Sotuv | null>;
  yangiSotuvYaratish: (malumot: SotuvYaratishMalumoti) => Promise<Sotuv | null>;
  sotuvniTasdiqlash: (sotuvId: string) => Promise<boolean>;
  sotuvniBekorQilish: (sotuvId: string) => Promise<boolean>;
  yangiQaytarishYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<boolean>;
  qaytarishTafsilotiniYuklash: (qaytarishId: string) => Promise<Qaytarish | null>;
  qaytarishniYangilash: (
    qaytarishId: string,
    malumot: Partial<QaytarishYaratishMalumoti>
  ) => Promise<Qaytarish | null>;
  qaytarishniTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  qaytarishniBekorQilish: (qaytarishId: string) => Promise<boolean>;
  tanlanganSotuvniTozalash: () => void;
  xatolikniTozalash: () => void;
};

export const useSavdoStore = create<SavdoState>((set, get) => ({
  sotuvlar: [],
  qaytarishlar: [],
  omborlar: [],
  mijozlar: [],
  mijozKompaniyalari: [],
  xodimlar: [],
  qoldiqlar: [],
  tanlanganSotuv: null,
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,

  boshlangichMalumotlarniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });

    try {
      const [
        sotuvlar,
        qaytarishlar,
        omborlar,
        mijozlar,
        mijozKompaniyalari,
        xodimlar,
        stockQoldiqlar,
        katalogQoldiqlar,
      ] = await Promise.all([
        sotuvlarRoyxatiniOlish(),
        qaytarishlarRoyxatiniOlish(),
        omborlarRoyxatiniOlish(),
        mijozlarRoyxatiniOlish(),
        mijozKompaniyalariRoyxatiniOlish(),
        xodimlarRoyxatiniOlish(),
        omborQoldiqlariniOlish(),
        katalogModifikatsiyalariniQoldiqTanlovigaOlish(),
      ]);

      const qoldiqlar = qoldiqlarniKatalogBilanBirlashtirish(
        stockQoldiqlar,
        katalogQoldiqlar
      );
      const boglanganMalumotlar = { mijozlar, mijozKompaniyalari, xodimlar, omborlar };

      set({
        sotuvlar: sotuvlar.map((sotuv) =>
          sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, boglanganMalumotlar)
        ),
        qaytarishlar,
        omborlar,
        mijozlar,
        mijozKompaniyalari,
        xodimlar,
        qoldiqlar,
        yuklanmoqda: false,
      });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  qoldiqlarniYuklash: async (warehouseId) => {
    try {
      const [stockQoldiqlar, katalogQoldiqlar] = await Promise.all([
        omborQoldiqlariniOlish(warehouseId),
        katalogModifikatsiyalariniQoldiqTanlovigaOlish(),
      ]);
      set({
        qoldiqlar: qoldiqlarniKatalogBilanBirlashtirish(
          stockQoldiqlar,
          katalogQoldiqlar
        ),
      });
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
    }
  },

  sotuvTafsilotiniYuklash: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const sotuv = await sotuvTafsilotiniOlish(sotuvId);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, get());
      set({ tanlanganSotuv: boyitilgan, amalBajarilmoqda: false });
      return boyitilgan;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  yangiSotuvYaratish: async (malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const sotuv = await sotuvYaratish(malumot);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, get());
      set((state) => ({
        sotuvlar: [boyitilgan, ...state.sotuvlar],
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      return boyitilgan;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  sotuvniTasdiqlash: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await sotuvniTasdiqlash(sotuvId);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(yangilangan, get());
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? boyitilgan : sotuv
        ),
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  sotuvniBekorQilish: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await sotuvniBekorQilish(sotuvId);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(yangilangan, get());
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? boyitilgan : sotuv
        ),
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  yangiQaytarishYaratish: async (malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const qaytarish = await qaytarishYaratish(malumot);
      set((state) => ({
        qaytarishlar: [qaytarish, ...state.qaytarishlar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  qaytarishTafsilotiniYuklash: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const qaytarish = await qaytarishTafsilotiniOlish(qaytarishId);
      set({ amalBajarilmoqda: false });
      return qaytarish;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  qaytarishniYangilash: async (qaytarishId, malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const yangilangan = await qaytarishniYangilash(qaytarishId, malumot);
      set((state) => ({
        qaytarishlar: state.qaytarishlar.map((qaytarish) =>
          qaytarish.id === qaytarishId ? yangilangan : qaytarish
        ),
        amalBajarilmoqda: false,
      }));
      return yangilangan;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  qaytarishniTasdiqlash: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await qaytarishniTasdiqlash(qaytarishId);
      set((state) => ({
        qaytarishlar: state.qaytarishlar.map((qaytarish) =>
          qaytarish.id === qaytarishId ? yangilangan : qaytarish
        ),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  qaytarishniBekorQilish: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await qaytarishniBekorQilish(qaytarishId);
      set((state) => ({
        qaytarishlar: state.qaytarishlar.map((qaytarish) =>
          qaytarish.id === qaytarishId ? yangilangan : qaytarish
        ),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  tanlanganSotuvniTozalash: () => set({ tanlanganSotuv: null }),
  xatolikniTozalash: () => set({ xatolik: null }),
}));
