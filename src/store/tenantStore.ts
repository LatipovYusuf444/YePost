import { create } from "zustand";
import {
  joriyFoydalanuvchiniOlish,
  obunaApi,
  tarifApi,
  workspaceApi,
} from "@/api/tenantApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  JoriyFoydalanuvchi,
  Obuna,
  ObunaYaratishMalumoti,
  Tarif,
  TarifSaqlashMalumoti,
  Workspace,
  WorkspaceSaqlashMalumoti,
} from "@/types/tenant";

type TenantState = {
  profil: JoriyFoydalanuvchi | null;
  workspacelar: Workspace[];
  tariflar: Tarif[];
  obunalar: Obuna[];
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  malumotlarniYuklash: () => Promise<void>;
  workspaceOlish: (id: string) => Promise<Workspace | null>;
  workspaceYaratish: (data: WorkspaceSaqlashMalumoti) => Promise<boolean>;
  workspaceYangilash: (id: string, data: Partial<WorkspaceSaqlashMalumoti>) => Promise<boolean>;
  workspaceOchirish: (id: string) => Promise<boolean>;
  tarifOlish: (id: string) => Promise<Tarif | null>;
  tarifYaratish: (data: TarifSaqlashMalumoti) => Promise<boolean>;
  tarifYangilash: (id: string, data: Partial<TarifSaqlashMalumoti>) => Promise<boolean>;
  tarifOchirish: (id: string) => Promise<boolean>;
  obunaOlish: (id: string) => Promise<Obuna | null>;
  obunaYaratish: (data: ObunaYaratishMalumoti) => Promise<boolean>;
  xatolikniTozalash: () => void;
};

function almashtirish<T extends { id: string }>(royxat: T[], yangi: T) {
  return royxat.map((item) => (item.id === yangi.id ? yangi : item));
}

export const useTenantStore = create<TenantState>((set) => ({
  profil: null,
  workspacelar: [],
  tariflar: [],
  obunalar: [],
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

      const [workspacelar, tariflar, obunalar] = await Promise.all([
        workspaceApi.royxat(),
        tarifApi.royxat(),
        obunaApi.royxat(),
      ]);
      set({ profil, workspacelar, tariflar, obunalar, yuklanmoqda: false });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  workspaceOlish: async (id) => {
    try {
      return await workspaceApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  workspaceYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await workspaceApi.yaratish(data);
      set((state) => ({ workspacelar: [item, ...state.workspacelar], amalBajarilmoqda: false }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  workspaceYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await workspaceApi.yangilash(id, data);
      set((state) => ({ workspacelar: almashtirish(state.workspacelar, item), amalBajarilmoqda: false }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  workspaceOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await workspaceApi.ochirish(id);
      set((state) => ({ workspacelar: state.workspacelar.filter((item) => item.id !== id), amalBajarilmoqda: false }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  tarifOlish: async (id) => {
    try {
      return await tarifApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  tarifYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await tarifApi.yaratish(data);
      set((state) => ({ tariflar: [item, ...state.tariflar], amalBajarilmoqda: false }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  tarifYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await tarifApi.yangilash(id, data);
      set((state) => ({ tariflar: almashtirish(state.tariflar, item), amalBajarilmoqda: false }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  tarifOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await tarifApi.ochirish(id);
      set((state) => ({ tariflar: state.tariflar.filter((item) => item.id !== id), amalBajarilmoqda: false }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  obunaOlish: async (id) => {
    try {
      return await obunaApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  obunaYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = await obunaApi.yaratish(data);
      set((state) => ({ obunalar: [item, ...state.obunalar], amalBajarilmoqda: false }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  xatolikniTozalash: () => set({ xatolik: null }),
}));
