import { create } from "zustand";
import { supportApi } from "@/api/supportApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { QollabQuvvatlashXabari } from "@/types/support";

type SupportState = {
  xabarlar: QollabQuvvatlashXabari[];
  yuklanmoqda: boolean;
  yuborilmoqda: boolean;
  xatolik: string | null;
  ulanmagan: boolean;
  xabarlarniYuklash: () => Promise<void>;
  xabarYuborish: (text: string) => Promise<boolean>;
  xatolikniTozalash: () => void;
};

// Backend hali "/support/*" endpointlarini taqdim etmagan bo'lsa (404),
// bo'lim "hali ulanmagan" holatida, bo'sh suhbat sifatida ko'rsatiladi —
// xato banneri bilan foydalanuvchini qo'rqitib yubormaslik uchun.
function backendUlanmaganmi(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
}

export const useSupportStore = create<SupportState>((set, get) => ({
  xabarlar: [],
  yuklanmoqda: false,
  yuborilmoqda: false,
  xatolik: null,
  ulanmagan: false,

  xabarlarniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const xabarlar = await supportApi.xabarlar({ limit: 100 });
      set({ xabarlar, yuklanmoqda: false, ulanmagan: false });
    } catch (error) {
      if (backendUlanmaganmi(error)) {
        set({ xabarlar: [], yuklanmoqda: false, ulanmagan: true });
        return;
      }
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  xabarYuborish: async (text) => {
    const matn = text.trim();
    if (!matn) return false;
    set({ yuborilmoqda: true, xatolik: null });
    try {
      const xabar = await supportApi.xabarYuborish(matn);
      set({ xabarlar: [...get().xabarlar, xabar], yuborilmoqda: false, ulanmagan: false });
      return true;
    } catch (error) {
      if (backendUlanmaganmi(error)) {
        set({
          yuborilmoqda: false,
          ulanmagan: true,
          xatolik: "Qo'llab-quvvatlash bo'limi hali backendga ulanmagan. Iltimos, birozdan so'ng qayta urinib ko'ring.",
        });
        return false;
      }
      set({ yuborilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  xatolikniTozalash: () => set({ xatolik: null }),
}));
