import { create } from "zustand";
import { AUTH_SESSION_CHANGED_EVENT, authTokenlarniOlish, type AuthTokenlar } from "@/lib/authTokenStorage";
import { parolniAlmashtirish, profilApi } from "@/api/authProfileApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  JoriyFoydalanuvchi,
  ParolAlmashtirishMalumoti,
  ProfilYangilashMalumoti,
} from "@/types/tenant";

type AuthProfileState = {
  profil: JoriyFoydalanuvchi | null;
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  muvaffaqiyat: string | null;
  profilniYuklash: () => Promise<void>;
  profilniYangilash: (data: ProfilYangilashMalumoti) => Promise<boolean>;
  parolniYangilash: (data: ParolAlmashtirishMalumoti) => Promise<boolean>;
  xabarlarniTozalash: () => void;
};

export const useAuthProfileStore = create<AuthProfileState>((set) => ({
  profil: null,
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,
  muvaffaqiyat: null,

  profilniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const profil = await profilApi.olish();
      set({ profil, yuklanmoqda: false });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  profilniYangilash: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null, muvaffaqiyat: null });
    try {
      const profil = await profilApi.yangilash(data);
      set({
        profil,
        amalBajarilmoqda: false,
        muvaffaqiyat: "Profil ma'lumotlari muvaffaqiyatli saqlandi.",
      });
      return true;
    } catch (error) {
      set({
        amalBajarilmoqda: false,
        xatolik: getApiErrorMessage(error),
      });
      return false;
    }
  },

  parolniYangilash: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null, muvaffaqiyat: null });
    try {
      await parolniAlmashtirish(data);
      set({
        amalBajarilmoqda: false,
        muvaffaqiyat: "Parol muvaffaqiyatli almashtirildi.",
      });
      return true;
    } catch (error) {
      set({
        amalBajarilmoqda: false,
        xatolik: getApiErrorMessage(error),
      });
      return false;
    }
  },

  xabarlarniTozalash: () => set({ xatolik: null, muvaffaqiyat: null }),
}));

// Login/logout bo'lganda oldingi foydalanuvchi profili (va roli) xotirada qolmasligi uchun.
if (typeof window !== "undefined") {
  let oldingiFoydalanuvchi = authTokenlarniOlish().username;
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, (event) => {
    const yangiFoydalanuvchi = (event as CustomEvent<AuthTokenlar>).detail.username;
    if (yangiFoydalanuvchi !== oldingiFoydalanuvchi) {
      useAuthProfileStore.setState({ profil: null, xatolik: null, muvaffaqiyat: null });
    }
    oldingiFoydalanuvchi = yangiFoydalanuvchi;
  });
}
