import { create } from "zustand";
import { davrniYopishApi, type DavrniYopishHolati } from "@/api/davrniYopishApi";

// Yopilgan davr: hujjat oynalarida sana tanlagichning pastki chegarasi uchun.
// Faqat o'qiladi (GET /settings/period-close); o'qib bo'lmasa (masalan, rolga ruxsat yo'q) davr ochiq deb olinadi
// va backend o'zi rad etadi (423 errors.document.period_closed).
type DavrHolati = {
  holat: DavrniYopishHolati | null;
  yuklanmoqda: boolean;
  yuklash: (majburan?: boolean) => Promise<void>;
  belgilash: (holat: DavrniYopishHolati) => void;
};

let sorov: Promise<void> | null = null;

export const useDavrStore = create<DavrHolati>((set, get) => ({
  holat: null,
  yuklanmoqda: false,
  yuklash: async (majburan = false) => {
    if (sorov) return sorov;
    if (get().holat && !majburan) return;
    set({ yuklanmoqda: true });
    sorov = davrniYopishApi
      .olish()
      .then((holat) => set({ holat, yuklanmoqda: false }))
      .catch(() => set({ yuklanmoqda: false }))
      .finally(() => {
        sorov = null;
      });
    return sorov;
  },
  belgilash: (holat) => set({ holat }),
}));
