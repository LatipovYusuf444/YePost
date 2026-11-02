import { create } from "zustand";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { AUTH_SESSION_CHANGED_EVENT, authTokenlarniOlish } from "@/lib/authTokenStorage";
import type { IshlabChiqarishSozlamasi } from "@/types/ishlabChiqarish";

// Menyu shu holatga qarab ko'rinadi. O'qib bo'lmasa (403, tarmoq) modul o'chiq deb qabul qilinadi: ekran yiqilmaydi, toast chiqmaydi.
const ESKIRISH_MUDDATI = 5 * 60 * 1000;

type Holat = {
  sozlama: IshlabChiqarishSozlamasi | null;
  enabled: boolean;
  loaded: boolean;
  load: (majbur?: boolean) => Promise<void>;
  saqlash: (tana: Partial<IshlabChiqarishSozlamasi>) => Promise<IshlabChiqarishSozlamasi>;
};

let oxirgiYuklash = 0;
let sessiya = 0;
const boshlangich = { sozlama: null, enabled: false, loaded: false };

export const useIshlabChiqarishStore = create<Holat>((set) => ({
  ...boshlangich,
  load: async (majbur = false) => {
    if (!majbur && Date.now() - oxirgiYuklash < ESKIRISH_MUDDATI) return;
    oxirgiYuklash = Date.now();
    const joriy = sessiya;
    try {
      const sozlama = await ishlabChiqarishApi.sozlamaOlish();
      if (joriy === sessiya) set({ sozlama, enabled: sozlama?.enabled === true, loaded: true });
    } catch {
      if (joriy === sessiya) set({ sozlama: null, enabled: false, loaded: true });
    }
  },
  saqlash: async (tana) => {
    const sozlama = await ishlabChiqarishApi.sozlamaSaqlash(tana);
    set({ sozlama, enabled: sozlama?.enabled === true, loaded: true });
    return sozlama;
  },
}));

if (typeof window !== "undefined") {
  let joriy = authTokenlarniOlish();
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, () => {
    const yangi = authTokenlarniOlish();
    if (yangi.username !== joriy.username || yangi.expiresAt !== joriy.expiresAt) {
      sessiya += 1;
      oxirgiYuklash = 0;
      useIshlabChiqarishStore.setState(boshlangich);
    }
    joriy = yangi;
  });
}
