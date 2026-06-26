import { create } from "zustand";
import {
  filiallarniOlish,
  kassaKirimApi,
  qarzApi,
  xarajatApi,
} from "@/api/financeApi";
import type {
  KassaKirim,
  KassaKirimSaqlash,
  Qarz,
  QarzSaqlash,
  Xarajat,
  XarajatSaqlash,
} from "@/types/finance";
import type { Filial } from "@/types/ombor";

type FinanceStore = {
  xarajatlar: Xarajat[];
  qarzlar: Qarz[];
  kassaKirimlari: KassaKirim[];
  filiallar: Filial[];
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string;
  yuklash: () => Promise<void>;
  xatolikniTozalash: () => void;
  xarajatOlish: (id: string) => Promise<Xarajat | null>;
  xarajatSaqlash: (id: string | null, data: XarajatSaqlash) => Promise<boolean>;
  xarajatOchirish: (id: string) => Promise<boolean>;
  qarzOlish: (id: string) => Promise<Qarz | null>;
  qarzSaqlash: (id: string | null, data: QarzSaqlash) => Promise<boolean>;
  qarzOchirish: (id: string) => Promise<boolean>;
  kassaKirimOlish: (id: string) => Promise<KassaKirim | null>;
  kassaKirimSaqlash: (id: string | null, data: KassaKirimSaqlash) => Promise<boolean>;
  kassaKirimOchirish: (id: string) => Promise<boolean>;
};

function xabar(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return "Finance ma'lumotlarini server bilan almashishda xatolik yuz berdi.";
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  xarajatlar: [],
  qarzlar: [],
  kassaKirimlari: [],
  filiallar: [],
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: "",

  xatolikniTozalash: () => set({ xatolik: "" }),

  yuklash: async () => {
    set({ yuklanmoqda: true, xatolik: "" });
    try {
      const [xarajatlar, qarzlar, kassaKirimlari, filiallar] = await Promise.all([
        xarajatApi.royxat(),
        qarzApi.royxat(),
        kassaKirimApi.royxat(),
        filiallarniOlish(),
      ]);
      set({ xarajatlar, qarzlar, kassaKirimlari, filiallar });
    } catch (error) {
      set({ xatolik: xabar(error) });
    } finally {
      set({ yuklanmoqda: false });
    }
  },

  xarajatOlish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      return await xarajatApi.olish(id);
    } catch (error) {
      set({ xatolik: xabar(error) });
      return null;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  xarajatSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      if (id) await xarajatApi.yangilash(id, data);
      else await xarajatApi.yaratish(data);
      await get().yuklash();
      return true;
    } catch (error) {
      set({ xatolik: xabar(error) });
      return false;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  xarajatOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      await xarajatApi.ochirish(id);
      await get().yuklash();
      return true;
    } catch (error) {
      set({ xatolik: xabar(error) });
      return false;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  qarzOlish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      return await qarzApi.olish(id);
    } catch (error) {
      set({ xatolik: xabar(error) });
      return null;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  qarzSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      if (id) await qarzApi.yangilash(id, data);
      else await qarzApi.yaratish(data);
      await get().yuklash();
      return true;
    } catch (error) {
      set({ xatolik: xabar(error) });
      return false;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  qarzOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      await qarzApi.ochirish(id);
      await get().yuklash();
      return true;
    } catch (error) {
      set({ xatolik: xabar(error) });
      return false;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  kassaKirimOlish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      return await kassaKirimApi.olish(id);
    } catch (error) {
      set({ xatolik: xabar(error) });
      return null;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  kassaKirimSaqlash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      if (id) await kassaKirimApi.yangilash(id, data);
      else await kassaKirimApi.yaratish(data);
      await get().yuklash();
      return true;
    } catch (error) {
      set({ xatolik: xabar(error) });
      return false;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },

  kassaKirimOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: "" });
    try {
      await kassaKirimApi.ochirish(id);
      await get().yuklash();
      return true;
    } catch (error) {
      set({ xatolik: xabar(error) });
      return false;
    } finally {
      set({ amalBajarilmoqda: false });
    }
  },
}));
