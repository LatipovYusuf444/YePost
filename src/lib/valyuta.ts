import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_KURS, kursApi, type KursManbasi } from "@/api/kursApi";

// Butun loyiha uchun yagona valyuta moduli.
//
// Qoida: backenddagi barcha summalar so'mda (UZS) deb olinadi; mahsulot narxi esa o'z `currency`siga ega
// (UZS yoki USD). Foydalanuvchi navbardan ko'rsatiladigan valyutani tanlaydi — barcha narxlar shu valyutaga
// o'giriladi. Tanlangan valyuta UZS bo'lganda hamma matn avvalgidek (…so'm) ko'rinadi.

export type Valyuta = "UZS" | "USD";

type ValyutaHolati = {
  /** Ko'rsatiladigan valyuta. */
  valyuta: Valyuta;
  /** 1 USD necha so'm. */
  kurs: number;
  kursManbasi: KursManbasi;
  kursYangilangan: string | null;
  valyutaniTanlash: (valyuta: Valyuta) => void;
  /** Kursni qo'lda kiritish (kiritilgach avtomatik yangilanmaydi). */
  kursniBelgilash: (kurs: number) => void;
  /** Manbadan (hozircha demo) kursni olish; qo'lda kiritilgan kurs ustidan yozilmaydi. */
  kursniYuklash: (majburan?: boolean) => Promise<void>;
};

export const useValyutaStore = create<ValyutaHolati>()(
  persist(
    (set, get) => ({
      valyuta: "UZS",
      kurs: DEMO_KURS,
      kursManbasi: "demo",
      kursYangilangan: null,
      valyutaniTanlash: (valyuta) => set({ valyuta }),
      kursniBelgilash: (kurs) => {
        if (!Number.isFinite(kurs) || kurs <= 0) return;
        set({ kurs, kursManbasi: "qolda", kursYangilangan: new Date().toISOString() });
      },
      kursniYuklash: async (majburan = false) => {
        if (!majburan && get().kursManbasi === "qolda") return;
        try {
          const malumot = await kursApi.olish();
          if (Number.isFinite(malumot.kurs) && malumot.kurs > 0) {
            set({ kurs: malumot.kurs, kursManbasi: malumot.manba, kursYangilangan: malumot.yangilangan });
          }
        } catch {
          // Kurs olinmasa oxirgi saqlangan kurs bilan ishlaymiz.
        }
      },
    }),
    {
      name: "yepost-valyuta",
      partialize: (holat) => ({ valyuta: holat.valyuta, kurs: holat.kurs, kursManbasi: holat.kursManbasi, kursYangilangan: holat.kursYangilangan }),
    }
  )
);

/** Komponentlar uchun: valyuta yoki kurs o'zgarganda qayta chizilishi kerak bo'lsa. */
export function useValyuta() {
  return useValyutaStore();
}

/** Summani manba valyutasidan hozir ko'rsatiladigan valyutaga o'giradi. */
export function summaniOgirish(summa: number, manba: Valyuta = "UZS", maqsad?: Valyuta) {
  const { valyuta, kurs } = useValyutaStore.getState();
  const nishon = maqsad ?? valyuta;
  if (!Number.isFinite(summa) || manba === nishon) return summa;
  return manba === "UZS" ? summa / kurs : summa * kurs;
}

export function valyutaBelgisi(): string {
  return useValyutaStore.getState().valyuta === "USD" ? "$" : "so'm";
}

/**
 * Narxni tanlangan valyutada matnga aylantiradi.
 *  - UZS: "1 250 000 so'm" (`yaxlit` bo'lsa butun songa yaxlitlanadi; `uzsBelgi` — tilga qarab "so'm"/"сум")
 *  - USD: "$98.43" (2 xonagacha kasr)
 * `manba` — berilgan summaning o'z valyutasi (odatda UZS; mahsulot narxida u `price.currency`).
 */
export function pulMatni(summa: number | string | null | undefined, manba: Valyuta = "UZS", yaxlit = false, uzsBelgi = "so'm") {
  const son = Number(summa ?? 0);
  const qiymat = summaniOgirish(Number.isFinite(son) ? son : 0, manba);
  if (useValyutaStore.getState().valyuta === "USD") {
    return `$${qiymat.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}`;
  }
  return `${(yaxlit ? Math.round(qiymat) : qiymat).toLocaleString("uz-UZ")} ${uzsBelgi}`;
}

/** Backenddan kelgan valyuta kodini ("USD" | "UZS" | boshqa) xavfsiz Valyuta'ga aylantiradi. */
export function valyutaKodi(qiymat?: string | null): Valyuta {
  return qiymat?.toUpperCase() === "USD" ? "USD" : "UZS";
}
