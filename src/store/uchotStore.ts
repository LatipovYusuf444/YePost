import { create } from "zustand";
import { mockAmaliyotlar } from "@/Pages/KassaUchot/mockData";
import type { KassaAmaliyoti } from "@/Pages/KassaUchot/types";
import { mockXaridorlar } from "@/Pages/XaridorUchot/mockData";
import type { Xaridor } from "@/Pages/XaridorUchot/types";

// Xaridor uchoti va Kassa uchoti uchun umumiy MOCK holat (backendsiz).
// Muhim: kassa amaliyoti xaridor qarziga (balans) ta'sir qiladi.
// balans manfiy = xaridor qarzdor.
//   "xaridor_tolovi" (tushum)      → qarz kamayadi  → balans += summa
//   "xaridorga_qaytarish" (chiqim) → qarz oshadi    → balans −= summa

// Amaliyotning xaridor balansiga ta'siri (delta). Faqat shu ikki tur ta'sir qiladi.
function amaliyotBalansDelta(a: KassaAmaliyoti): number {
  if (a.turi === "xaridor_tolovi") return a.summa;
  if (a.turi === "xaridorga_qaytarish") return -a.summa;
  return 0;
}

function balansTasiri(xaridorlar: Xaridor[], xaridorId: string, delta: number): Xaridor[] {
  if (!delta) return xaridorlar;
  return xaridorlar.map((x) => (x.id === xaridorId ? { ...x, balans: x.balans + delta } : x));
}

type UchotStore = {
  xaridorlar: Xaridor[];
  amaliyotlar: KassaAmaliyoti[];

  xaridorSaqlash: (xaridor: Xaridor) => void;
  xaridorOchirish: (id: string) => void;
  xaridorKompaniyasiniTozalash: (kompaniyaId: string) => void;

  amaliyotSaqlash: (amaliyot: KassaAmaliyoti) => void;
  amaliyotOchirish: (id: string) => void;
};

export const useUchotStore = create<UchotStore>((set) => ({
  // Seed'lar allaqachon "joriy holat" — qayta hisoblanmaydi.
  xaridorlar: mockXaridorlar,
  amaliyotlar: mockAmaliyotlar,

  xaridorSaqlash: (xaridor) =>
    set((state) => ({
      xaridorlar: state.xaridorlar.some((x) => x.id === xaridor.id)
        ? state.xaridorlar.map((x) => (x.id === xaridor.id ? xaridor : x))
        : [xaridor, ...state.xaridorlar],
    })),

  xaridorOchirish: (id) =>
    set((state) => ({ xaridorlar: state.xaridorlar.filter((x) => x.id !== id) })),

  xaridorKompaniyasiniTozalash: (kompaniyaId) =>
    set((state) => ({
      xaridorlar: state.xaridorlar.map((x) =>
        x.kompaniyaId === kompaniyaId ? { ...x, kompaniyaId: "" } : x
      ),
    })),

  amaliyotSaqlash: (yangi) =>
    set((state) => {
      const eski = state.amaliyotlar.find((a) => a.id === yangi.id);
      let xaridorlar = state.xaridorlar;

      // Tahrirlashda: avval eski amaliyotning ta'sirini bekor qilamiz.
      if (eski?.xaridorId) {
        xaridorlar = balansTasiri(xaridorlar, eski.xaridorId, -amaliyotBalansDelta(eski));
      }
      // Yangi amaliyot ta'sirini qo'llaymiz.
      if (yangi.xaridorId) {
        xaridorlar = balansTasiri(xaridorlar, yangi.xaridorId, amaliyotBalansDelta(yangi));
      }

      const amaliyotlar = eski
        ? state.amaliyotlar.map((a) => (a.id === yangi.id ? yangi : a))
        : [yangi, ...state.amaliyotlar];

      return { xaridorlar, amaliyotlar };
    }),

  amaliyotOchirish: (id) =>
    set((state) => {
      const eski = state.amaliyotlar.find((a) => a.id === id);
      let xaridorlar = state.xaridorlar;
      // O'chirilganda ta'sirini bekor qilamiz.
      if (eski?.xaridorId) {
        xaridorlar = balansTasiri(xaridorlar, eski.xaridorId, -amaliyotBalansDelta(eski));
      }
      return { xaridorlar, amaliyotlar: state.amaliyotlar.filter((a) => a.id !== id) };
    }),
}));
