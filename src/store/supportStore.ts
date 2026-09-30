import { create } from "zustand";
import { supportApi } from "@/api/supportApi";
import { crmIlovalarApi } from "@/api/crmAttachmentsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { QollabQuvvatlashXabari } from "@/types/support";

type SupportState = {
  xabarlar: QollabQuvvatlashXabari[];
  nextCursor: string | null;
  yuklanmoqda: boolean;
  eskilarYuklanmoqda: boolean;
  yuborilmoqda: boolean;
  xatolik: string | null;
  ulanmagan: boolean;
  oqilmaganSoni: number;
  xabarlarniYuklash: () => Promise<void>;
  eskiXabarlarniYuklash: () => Promise<void>;
  xabarYuborish: (text: string, fayllar?: File[]) => Promise<boolean>;
  oqilganDebBelgilash: () => Promise<void>;
  oqilmaganSoniniYangilash: () => Promise<void>;
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
  nextCursor: null,
  // Chat ochilganda darhol yuklash boshlanadi (SupportChatOynasi mount
  // effekti orqali) — shu sababli boshlang'ich holat ham "yuklanmoqda"
  // qilib qo'yiladi, aks holda birinchi render'da bir lahzaga "xabar
  // yo'q" bo'sh holati chaqib o'tib ketardi.
  yuklanmoqda: true,
  eskilarYuklanmoqda: false,
  yuborilmoqda: false,
  xatolik: null,
  ulanmagan: false,
  oqilmaganSoni: 0,

  xabarlarniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const { items, nextCursor } = await supportApi.xabarlar({ limit: 30 });
      // Backend yangi xabarlarni birinchi qaytaradi; UI eskidan yangiga
      // qarab ko'rsatishi uchun teskari tartibga o'giriladi.
      set({ xabarlar: [...items].reverse(), nextCursor, yuklanmoqda: false, ulanmagan: false });
      void get().oqilganDebBelgilash();
    } catch (error) {
      if (backendUlanmaganmi(error)) {
        set({ xabarlar: [], nextCursor: null, yuklanmoqda: false, ulanmagan: true });
        return;
      }
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  eskiXabarlarniYuklash: async () => {
    const { nextCursor, eskilarYuklanmoqda } = get();
    if (!nextCursor || eskilarYuklanmoqda) return;
    set({ eskilarYuklanmoqda: true });
    try {
      const { items, nextCursor: keyingiCursor } = await supportApi.xabarlar({
        cursor: nextCursor,
        limit: 30,
      });
      set((holat) => ({
        xabarlar: [...[...items].reverse(), ...holat.xabarlar],
        nextCursor: keyingiCursor,
        eskilarYuklanmoqda: false,
      }));
    } catch (error) {
      set({ eskilarYuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  xabarYuborish: async (text, fayllar) => {
    const matn = text.trim();
    if (!matn && !fayllar?.length) return false;
    set({ yuborilmoqda: true, xatolik: null });
    try {
      const ilovalar = fayllar?.length
        ? await Promise.all(fayllar.map((fayl) => crmIlovalarApi.yuklash(fayl)))
        : [];
      const xabar = await supportApi.xabarYuborish(
        matn,
        ilovalar.length ? ilovalar.map((ilova) => ilova.id) : undefined
      );
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

  oqilganDebBelgilash: async () => {
    try {
      await supportApi.oqilganDebBelgilash();
      set({ oqilmaganSoni: 0 });
    } catch {
      // Jimgina o'tkazib yuboriladi — o'qilgan belgisi fon jarayoni, alohida xato ko'rsatilmaydi.
    }
  },

  oqilmaganSoniniYangilash: async () => {
    try {
      const { count } = await supportApi.oqilmaganSoni();
      set({ oqilmaganSoni: count });
    } catch {
      // Backend hali ulanmagan yoki vaqtinchalik xato bo'lsa ham badge jimgina 0 qoladi.
    }
  },

  xatolikniTozalash: () => set({ xatolik: null }),
}));
