import { create } from "zustand";
import {
  mockBildirishnoma,
  mockChek,
  mockFiliallar,
  mockKompaniya,
  mockOlchovBirliklari,
  mockProfil,
} from "@/Pages/SozlamalarUchot/mockData";
import type {
  BildirishnomaSozlama,
  ChekSozlama,
  Filial,
  Kompaniya,
  OlchovBirligi,
  Profil,
} from "@/Pages/SozlamalarUchot/types";

// Sozlamalar uchoti uchun MOCK holat (backendsiz).
type SozlamalarStore = {
  profil: Profil;
  kompaniya: Kompaniya;
  filiallar: Filial[];
  olchovBirliklari: OlchovBirligi[];
  chek: ChekSozlama;
  bildirishnoma: BildirishnomaSozlama;

  profilSaqlash: (profil: Profil) => void;
  kompaniyaSaqlash: (kompaniya: Kompaniya) => void;
  chekSaqlash: (chek: ChekSozlama) => void;
  bildirishnomaOzgartir: (kalit: keyof BildirishnomaSozlama) => void;
  filialSaqlash: (filial: Filial) => void;
  filialOchirish: (id: string) => void;
  asosiyFilialQilish: (id: string) => void;
  olchovSaqlash: (birlik: OlchovBirligi) => void;
  olchovOchirish: (id: string) => void;
};

export const useSozlamalarStore = create<SozlamalarStore>((set) => ({
  profil: mockProfil,
  kompaniya: mockKompaniya,
  filiallar: mockFiliallar,
  olchovBirliklari: mockOlchovBirliklari,
  chek: mockChek,
  bildirishnoma: mockBildirishnoma,

  profilSaqlash: (profil) => set({ profil }),
  kompaniyaSaqlash: (kompaniya) => set({ kompaniya }),
  chekSaqlash: (chek) => set({ chek }),

  bildirishnomaOzgartir: (kalit) =>
    set((state) => ({
      bildirishnoma: { ...state.bildirishnoma, [kalit]: !state.bildirishnoma[kalit] },
    })),

  filialSaqlash: (filial) =>
    set((state) => ({
      filiallar: state.filiallar.some((f) => f.id === filial.id)
        ? state.filiallar.map((f) => (f.id === filial.id ? filial : f))
        : [...state.filiallar, filial],
    })),

  filialOchirish: (id) =>
    set((state) => ({ filiallar: state.filiallar.filter((f) => f.id !== id) })),

  asosiyFilialQilish: (id) =>
    set((state) => ({
      filiallar: state.filiallar.map((f) => ({ ...f, asosiy: f.id === id })),
    })),

  olchovSaqlash: (birlik) =>
    set((state) => ({
      olchovBirliklari: state.olchovBirliklari.some((o) => o.id === birlik.id)
        ? state.olchovBirliklari.map((o) => (o.id === birlik.id ? birlik : o))
        : [...state.olchovBirliklari, birlik],
    })),

  olchovOchirish: (id) =>
    set((state) => ({ olchovBirliklari: state.olchovBirliklari.filter((o) => o.id !== id) })),
}));
