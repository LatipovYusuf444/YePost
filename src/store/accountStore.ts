import { create } from "zustand";
import {
  accountFiliallari,
  foydalanuvchilarApi,
  vakolatlarApi,
} from "@/api/accountsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { joriyFoydalanuvchiniOlish } from "@/api/tenantApi";
import type {
  AccountFoydalanuvchi,
  AccountVakolati,
  FoydalanuvchiYangilashMalumoti,
  FoydalanuvchiYaratishMalumoti,
  VakolatYangilashMalumoti,
  VakolatYaratishMalumoti,
} from "@/types/account";
import type { Filial } from "@/types/ombor";
import type { JoriyFoydalanuvchi } from "@/types/tenant";

type AccountState = {
  profil: JoriyFoydalanuvchi | null;
  foydalanuvchilar: AccountFoydalanuvchi[];
  vakolatlar: AccountVakolati[];
  filiallar: Filial[];
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  malumotlarniYuklash: () => Promise<void>;
  foydalanuvchiOlish: (id: string) => Promise<AccountFoydalanuvchi | null>;
  foydalanuvchiYaratish: (
    data: FoydalanuvchiYaratishMalumoti
  ) => Promise<boolean>;
  foydalanuvchiYangilash: (
    id: string,
    data: FoydalanuvchiYangilashMalumoti
  ) => Promise<boolean>;
  foydalanuvchiOchirish: (id: string) => Promise<boolean>;
  vakolatOlish: (id: string) => Promise<AccountVakolati | null>;
  vakolatYaratish: (data: VakolatYaratishMalumoti) => Promise<boolean>;
  vakolatYangilash: (
    id: string,
    data: VakolatYangilashMalumoti
  ) => Promise<boolean>;
  vakolatOchirish: (id: string) => Promise<boolean>;
  xatolikniTozalash: () => void;
};

function almashtirish<T extends { id: string }>(royxat: T[], yangi: T) {
  return royxat.map((item) => (item.id === yangi.id ? yangi : item));
}

export const useAccountStore = create<AccountState>((set) => ({
  profil: null,
  foydalanuvchilar: [],
  vakolatlar: [],
  filiallar: [],
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,

  malumotlarniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const profil = await joriyFoydalanuvchiniOlish();
      if (profil.role !== "DIREKTOR") {
        set({ profil, yuklanmoqda: false });
        return;
      }

      const [foydalanuvchilar, vakolatlar, filiallar] = await Promise.all([
        foydalanuvchilarApi.royxat(),
        vakolatlarApi.royxat(),
        accountFiliallari(),
      ]);
      set({
        profil,
        foydalanuvchilar,
        vakolatlar,
        filiallar,
        yuklanmoqda: false,
      });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  foydalanuvchiOlish: async (id) => {
    try {
      return await foydalanuvchilarApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  foydalanuvchiYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await foydalanuvchilarApi.yaratish(data);
      set((state) => ({
        foydalanuvchilar: [item, ...state.foydalanuvchilar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  foydalanuvchiYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await foydalanuvchilarApi.yangilash(id, data);
      set((state) => ({
        foydalanuvchilar: almashtirish(state.foydalanuvchilar, item),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  foydalanuvchiOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await foydalanuvchilarApi.ochirish(id);
      set((state) => ({
        foydalanuvchilar: state.foydalanuvchilar.filter((item) => item.id !== id),
        vakolatlar: state.vakolatlar.filter((item) => item.userId !== id),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  vakolatOlish: async (id) => {
    try {
      return await vakolatlarApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  vakolatYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await vakolatlarApi.yaratish(data);
      set((state) => ({
        vakolatlar: [item, ...state.vakolatlar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  vakolatYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await vakolatlarApi.yangilash(id, data);
      set((state) => ({
        vakolatlar: almashtirish(state.vakolatlar, item),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  vakolatOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await vakolatlarApi.ochirish(id);
      set((state) => ({
        vakolatlar: state.vakolatlar.filter((item) => item.id !== id),
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
