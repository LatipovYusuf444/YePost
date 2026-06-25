import { create } from "zustand";
import {
  mijozKompaniyalariApi,
  mijozlarApi,
  yetkazibBeruvchilarApi,
} from "@/api/partnersApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  Mijoz,
  MijozKompaniyasi,
  MijozKompaniyasiMalumoti,
  MijozMalumoti,
  YetkazibBeruvchi,
  YetkazibBeruvchiMalumoti,
} from "@/types/partner";

type MijozlarState = {
  mijozlar: Mijoz[];
  kompaniyalar: MijozKompaniyasi[];
  yetkazibBeruvchilar: YetkazibBeruvchi[];
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  yuklash: () => Promise<void>;
  mijozOlish: (id: string) => Promise<Mijoz | null>;
  mijozSaqlash: (id: string | null, data: MijozMalumoti) => Promise<boolean>;
  mijozOchirish: (id: string) => Promise<boolean>;
  kompaniyaOlish: (id: string) => Promise<MijozKompaniyasi | null>;
  kompaniyaSaqlash: (id: string | null, data: MijozKompaniyasiMalumoti) => Promise<boolean>;
  kompaniyaOchirish: (id: string) => Promise<boolean>;
  yetkazibBeruvchiOlish: (id: string) => Promise<YetkazibBeruvchi | null>;
  yetkazibBeruvchiSaqlash: (id: string | null, data: YetkazibBeruvchiMalumoti) => Promise<boolean>;
  yetkazibBeruvchiOchirish: (id: string) => Promise<boolean>;
  xatolikniTozalash: () => void;
};

function almashtir<T extends { id: string }>(items: T[], item: T) {
  return items.map((old) => (old.id === item.id ? item : old));
}

export const useMijozlarStore = create<MijozlarState>((set) => ({
  mijozlar: [],
  kompaniyalar: [],
  yetkazibBeruvchilar: [],
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,
  yuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const [mijozlar, kompaniyalar, yetkazibBeruvchilar] = await Promise.all([
        mijozlarApi.royxat(),
        mijozKompaniyalariApi.royxat(),
        yetkazibBeruvchilarApi.royxat(),
      ]);
      set({ mijozlar, kompaniyalar, yetkazibBeruvchilar, yuklanmoqda: false });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },
  mijozOlish: async (id) => {
    try { return await mijozlarApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  mijozSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = id ? await mijozlarApi.yangilash(id, data) : await mijozlarApi.yaratish(data);
      set((state) => ({
        mijozlar: id ? almashtir(state.mijozlar, item) : [item, ...state.mijozlar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) { set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) }); return false; }
  },
  mijozOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await mijozlarApi.ochirish(id);
      set((state) => ({ mijozlar: state.mijozlar.filter((item) => item.id !== id), amalBajarilmoqda: false }));
      return true;
    } catch (error) { set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) }); return false; }
  },
  kompaniyaOlish: async (id) => {
    try { return await mijozKompaniyalariApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  kompaniyaSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = id ? await mijozKompaniyalariApi.yangilash(id, data) : await mijozKompaniyalariApi.yaratish(data);
      set((state) => ({ kompaniyalar: id ? almashtir(state.kompaniyalar, item) : [item, ...state.kompaniyalar], amalBajarilmoqda: false }));
      return true;
    } catch (error) { set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) }); return false; }
  },
  kompaniyaOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await mijozKompaniyalariApi.ochirish(id);
      set((state) => ({ kompaniyalar: state.kompaniyalar.filter((item) => item.id !== id), amalBajarilmoqda: false }));
      return true;
    } catch (error) { set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) }); return false; }
  },
  yetkazibBeruvchiOlish: async (id) => {
    try { return await yetkazibBeruvchilarApi.olish(id); }
    catch (error) { set({ xatolik: getApiErrorMessage(error) }); return null; }
  },
  yetkazibBeruvchiSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const item = id ? await yetkazibBeruvchilarApi.yangilash(id, data) : await yetkazibBeruvchilarApi.yaratish(data);
      set((state) => ({ yetkazibBeruvchilar: id ? almashtir(state.yetkazibBeruvchilar, item) : [item, ...state.yetkazibBeruvchilar], amalBajarilmoqda: false }));
      return true;
    } catch (error) { set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) }); return false; }
  },
  yetkazibBeruvchiOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await yetkazibBeruvchilarApi.ochirish(id);
      set((state) => ({ yetkazibBeruvchilar: state.yetkazibBeruvchilar.filter((item) => item.id !== id), amalBajarilmoqda: false }));
      return true;
    } catch (error) { set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) }); return false; }
  },
  xatolikniTozalash: () => set({ xatolik: null }),
}));
