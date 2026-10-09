import { create } from "zustand";
import { persist } from "zustand/middleware";
import { kursniSongaAylantirish, valyutaApi } from "@/api/valyutaApi";

// Butun loyiha uchun yagona valyuta moduli.
//
// Qoida: backenddagi barcha summalar so'mda (UZS) deb olinadi; mahsulot narxi esa o'z `currency`siga ega
// (UZS yoki USD). Dollar kursini ADMIN/DIREKTOR har kuni Sozlamalar → Valyuta bo'limida kiritadi (backend saqlaydi,
// Markaziy bankdan avtomatik olinmaydi). Valyuta rejimi (GET /settings/currency) yoqilgan va bugungi kurs kiritilgan
// bo'lsagina foydalanuvchi navbardan so'm/dollar ko'rinishini tanlay oladi; aks holda hamma narsa so'mda ko'rsatiladi.

export type Valyuta = "UZS" | "USD";

type ValyutaHolati = {
  /** Foydalanuvchi tanlagan ko'rinish. Haqiqiy ko'rsatiladigan valyuta uchun `korsatiladiganValyuta()` ni ishlating. */
  valyuta: Valyuta;
  /** Backenddagi valyuta rejimi (GET /settings/currency). */
  rejimYoniq: boolean;
  /** Bugun amal qiladigan kurs: 1 USD necha so'm. `kursBor` false bo'lsa ma'noga ega emas. */
  kurs: number;
  /** Backendda amal qiluvchi kurs kiritilganmi. */
  kursBor: boolean;
  /** Kurs aslida kiritilgan kun (YYYY-MM-DD). */
  kursSanasi: string | null;
  /** Kompaniya vaqt mintaqasidagi bugungi kun (YYYY-MM-DD) — backend javobidan. */
  bugun: string | null;
  yuklandi: boolean;
  valyutaniTanlash: (valyuta: Valyuta) => void;
  /** Rejim va amaldagi kursni backenddan qayta oladi (Sozlamalarda o'zgartirilgandan keyin ham chaqiriladi). */
  kursniYuklash: () => Promise<void>;
};

export const useValyutaStore = create<ValyutaHolati>()(
  persist(
    (set) => ({
      valyuta: "UZS",
      rejimYoniq: false,
      kurs: 0,
      kursBor: false,
      kursSanasi: null,
      bugun: null,
      yuklandi: false,
      valyutaniTanlash: (valyuta) => set({ valyuta }),
      kursniYuklash: async () => {
        const [rejim, amaldagi] = await Promise.allSettled([valyutaApi.rejimniOlish(), valyutaApi.amaldagiKurs()]);
        const kurs = amaldagi.status === "fulfilled" ? kursniSongaAylantirish(amaldagi.value.rate) : null;

        set((joriy) => ({
          // Rejim o'qilmasa (masalan, rolga ruxsat yo'q) bugungi kurs kiritilganligiga qarab baholanadi.
          rejimYoniq: rejim.status === "fulfilled" ? Boolean(rejim.value.enabled) : kurs !== null,
          // Kurs so'rovi yiqilsa oxirgi ma'lum kurs saqlanadi; muvaffaqiyatli, lekin bo'sh javob kursni o'chiradi.
          kurs: amaldagi.status === "fulfilled" ? (kurs ?? 0) : joriy.kurs,
          kursBor: amaldagi.status === "fulfilled" ? kurs !== null : joriy.kursBor,
          kursSanasi:
            amaldagi.status === "fulfilled" ? (kurs !== null ? (amaldagi.value.rateDate ?? null) : null) : joriy.kursSanasi,
          bugun: amaldagi.status === "fulfilled" ? (amaldagi.value.date ?? joriy.bugun) : joriy.bugun,
          yuklandi: true,
        }));
      },
    }),
    {
      name: "yepost-valyuta",
      // v2: avvalgi demo/qo'lda kiritilgan kurs endi ishlatilmaydi — faqat foydalanuvchi tanlovi qoladi.
      version: 2,
      migrate: (eski) => ({ valyuta: (eski as { valyuta?: Valyuta } | undefined)?.valyuta === "USD" ? "USD" : "UZS" }),
      // Kurs va rejim keshlanadi (sahifa ochilganda narxlar sakramasligi uchun), lekin har safar backenddan yangilanadi.
      partialize: (holat) => ({
        valyuta: holat.valyuta,
        rejimYoniq: holat.rejimYoniq,
        kurs: holat.kurs,
        kursBor: holat.kursBor,
        kursSanasi: holat.kursSanasi,
      }),
    }
  )
);

/** Komponentlar uchun: valyuta yoki kurs o'zgarganda qayta chizilishi kerak bo'lsa. */
export function useValyuta() {
  return useValyutaStore();
}

/** Hozir haqiqatan ko'rsatiladigan valyuta: rejim o'chiq yoki kurs yo'q bo'lsa doim so'm. */
export function korsatiladiganValyuta(): Valyuta {
  const { rejimYoniq, kursBor, valyuta } = useValyutaStore.getState();
  return rejimYoniq && kursBor ? valyuta : "UZS";
}

/** Summani manba valyutasidan hozir ko'rsatiladigan valyutaga o'giradi (kurs yo'q bo'lsa o'zgartirmaydi). */
export function summaniOgirish(summa: number, manba: Valyuta = "UZS", maqsad?: Valyuta) {
  const { kurs, kursBor } = useValyutaStore.getState();
  const nishon = maqsad ?? korsatiladiganValyuta();
  if (!Number.isFinite(summa) || manba === nishon || !kursBor) return summa;
  return manba === "UZS" ? summa / kurs : summa * kurs;
}

export function valyutaBelgisi(): string {
  return korsatiladiganValyuta() === "USD" ? "$" : "so'm";
}

/**
 * Narxni tanlangan valyutada matnga aylantiradi.
 *  - UZS: "1 250 000 so'm" (`yaxlit` bo'lsa butun songa yaxlitlanadi; `uzsBelgi` — tilga qarab "so'm"/"сум")
 *  - USD: "$98.43" (2 xonagacha kasr)
 * `manba` — berilgan summaning o'z valyutasi (odatda UZS; mahsulot narxida u `price.currency`).
 * Kurs kiritilmagan bo'lsa dollar narx o'girilmaydi: u o'z valyutasida ($) ko'rsatiladi.
 */
export function pulMatni(summa: number | string | null | undefined, manba: Valyuta = "UZS", yaxlit = false, uzsBelgi = "so'm") {
  const son = Number(summa ?? 0);
  const asl = Number.isFinite(son) ? son : 0;
  const nishon = korsatiladiganValyuta();
  const { kursBor } = useValyutaStore.getState();
  const qiymat = summaniOgirish(asl, manba, nishon);
  const belgi: Valyuta = manba !== nishon && !kursBor ? manba : nishon;
  if (belgi === "USD") {
    return `$${qiymat.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}`;
  }
  return `${(yaxlit ? Math.round(qiymat) : qiymat).toLocaleString("uz-UZ")} ${uzsBelgi}`;
}

/** Backenddan kelgan valyuta kodini ("USD" | "UZS" | boshqa) xavfsiz Valyuta'ga aylantiradi. */
export function valyutaKodi(qiymat?: string | null): Valyuta {
  return qiymat?.toUpperCase() === "USD" ? "USD" : "UZS";
}
