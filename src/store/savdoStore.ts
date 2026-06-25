import { create } from "zustand";
import {
  mijozKompaniyalariRoyxatiniOlish,
  mijozlarRoyxatiniOlish,
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

export const useSavdoStore = create<SavdoState>((set) => ({
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
        qoldiqlar,
      ] = await Promise.all([
        sotuvlarRoyxatiniOlish(),
        qaytarishlarRoyxatiniOlish(),
        omborlarRoyxatiniOlish(),
        mijozlarRoyxatiniOlish(),
        mijozKompaniyalariRoyxatiniOlish(),
        xodimlarRoyxatiniOlish(),
        omborQoldiqlariniOlish(),
      ]);

      set({
        sotuvlar,
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
      const qoldiqlar = await omborQoldiqlariniOlish(warehouseId);
      set({ qoldiqlar });
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
    }
  },

  sotuvTafsilotiniYuklash: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const sotuv = await sotuvTafsilotiniOlish(sotuvId);
      set({ tanlanganSotuv: sotuv, amalBajarilmoqda: false });
      return sotuv;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  yangiSotuvYaratish: async (malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const sotuv = await sotuvYaratish(malumot);
      set((state) => ({
        sotuvlar: [sotuv, ...state.sotuvlar],
        tanlanganSotuv: sotuv,
        amalBajarilmoqda: false,
      }));
      return sotuv;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  sotuvniTasdiqlash: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await sotuvniTasdiqlash(sotuvId);
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? yangilangan : sotuv
        ),
        tanlanganSotuv: yangilangan,
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
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? yangilangan : sotuv
        ),
        tanlanganSotuv: yangilangan,
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
