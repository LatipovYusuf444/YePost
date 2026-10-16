import { useEffect } from "react";
import { create } from "zustand";
import { savdoSozlamalariApi } from "@/api/savdoSozlamalariApi";
import { kassaNarxTurlari, ruxsatEtilganNarxTuri, standartKassaNarxTuri } from "@/lib/savdoNarxTurlari";
import { usePosStore } from "@/store/posStore";
import type { SotuvNarxTuri } from "@/types/savdo";

type SavdoSozlamalariHolati = {
  /** Yoqilgan narx turlari; null — hali yuklanmagan yoki o'qib bo'lmadi (ikkala tur ochiq qoladi). */
  narxTurlari: SotuvNarxTuri[] | null;
  yuklanmoqda: boolean;
  yuklandi: boolean;
  /** Standart (birinchi) narx turi kassaga shu sozlama versiyasi uchun qo'llandimi. */
  standartQollandi: boolean;
  yuklash: (majbur?: boolean) => Promise<void>;
  belgilash: (turlar: SotuvNarxTuri[] | null) => void;
};

export const useSavdoSozlamalariStore = create<SavdoSozlamalariHolati>()((set, get) => ({
  narxTurlari: null,
  yuklanmoqda: false,
  yuklandi: false,
  standartQollandi: false,
  yuklash: async (majbur = false) => {
    const { yuklanmoqda, yuklandi } = get();
    if (yuklanmoqda || (yuklandi && !majbur)) return;
    set({ yuklanmoqda: true });
    try {
      set({ narxTurlari: await savdoSozlamalariApi.narxTurlariniOlish(), yuklandi: true, yuklanmoqda: false });
    } catch {
      // Sozlamani o'qib bo'lmasa kassa avvalgidek ishlaydi (chakana va ulgurji ochiq); o'chirilgan turni backend o'zi rad etadi.
      set({ yuklandi: true, yuklanmoqda: false });
    }
  },
  belgilash: (narxTurlari) => set({ narxTurlari, yuklandi: true, standartQollandi: false }),
}));

/**
 * Kassada tanlash mumkin bo'lgan narx turlari (Sozlamalar → Sotuv). Hozir tanlangan tur o'chirilgan bo'lsa,
 * ruxsat etilgan turga o'tkaziladi, shunda sotuvga o'chirilgan tur yuborilmaydi.
 */
export function useKassaNarxTurlari() {
  const narxTurlari = useSavdoSozlamalariStore((holat) => holat.narxTurlari);
  const standartQollandi = useSavdoSozlamalariStore((holat) => holat.standartQollandi);
  const yuklash = useSavdoSozlamalariStore((holat) => holat.yuklash);
  const narxTuri = usePosStore((holat) => holat.narxTuri);
  const updatePriceType = usePosStore((holat) => holat.updatePriceType);
  const ruxsat = kassaNarxTurlari(narxTurlari);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  // Sozlama yuklangach (yoki o'zgargach) bir marta: kassa standart (birinchi) narx turida boshlanadi.
  useEffect(() => {
    const holat = useSavdoSozlamalariStore.getState();
    // Bir nechta komponent (sarlavha, kassa, tanlash oynasi) shu hook'ni ishlatadi: faqat birinchisi qo'llaydi.
    if (!narxTurlari || standartQollandi || holat.standartQollandi || !holat.yuklandi) return;
    useSavdoSozlamalariStore.setState({ standartQollandi: true });
    const standart = standartKassaNarxTuri(narxTurlari);
    if (standart) updatePriceType(standart);
  }, [narxTurlari, standartQollandi, updatePriceType]);

  useEffect(() => {
    const kerakli = ruxsatEtilganNarxTuri(narxTuri, kassaNarxTurlari(narxTurlari));
    if (kerakli !== narxTuri) updatePriceType(kerakli);
  }, [narxTuri, narxTurlari, updatePriceType]);

  return ruxsat;
}
