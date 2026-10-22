import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { kursniSongaAylantirish, valyutaApi } from "@/api/valyutaApi";

// Butun loyiha uchun yagona valyuta moduli.
//
// Qoida (backend, 2026-10-22): valyuta rejimi yoqilgani "hammasini dollarda ko'rsat" degani emas. Har bir HUJJAT o'z valyutasida ko'rsatiladi
// (sale.currency, qatorda items[].currency, to'lovda payments[].currency) — hech qachon ko'rinish valyutasiga o'girilmaydi. JAMI summalar
// va hisobotlar esa GET /settings/currency dagi `reportCurrency` bo'yicha (Sozlamalar → Valyuta). Backenddagi barcha summalar so'mda
// (UZS) deb olinadi; mahsulot narxi o'z `currency`siga ega. Dollar kursini ADMIN/DIREKTOR Sozlamalar → Valyuta bo'limida kiritadi.
// Foydalanuvchi tanlaydigan "ko'rinish valyutasi" yo'q: eskisi hujjatlarni (so'mdagi sotuvni ham) dollarga aylantirib yuborardi.

export type Valyuta = "UZS" | "USD";

type ValyutaHolati = {
  /** Hisobot valyutasi (GET /settings/currency → `reportCurrency`): jami summalar va hisobotlar shu valyutada. Hujjatlarga ta'sir qilmaydi. */
  hisobotValyutasi: Valyuta;
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
  /** Rejim, hisobot valyutasi va amaldagi kursni backenddan qayta oladi (Sozlamalarda o'zgartirilgandan keyin ham chaqiriladi). */
  kursniYuklash: () => Promise<void>;
};

export const useValyutaStore = create<ValyutaHolati>()(
  persist(
    (set) => ({
      hisobotValyutasi: "UZS",
      rejimYoniq: false,
      kurs: 0,
      kursBor: false,
      kursSanasi: null,
      bugun: null,
      yuklandi: false,
      kursniYuklash: async () => {
        const [rejim, amaldagi] = await Promise.allSettled([valyutaApi.rejimniOlish(), valyutaApi.amaldagiKurs()]);
        const kurs = amaldagi.status === "fulfilled" ? kursniSongaAylantirish(amaldagi.value.rate) : null;

        set((joriy) => ({
          // Rejim o'qilmasa (masalan, rolga ruxsat yo'q) bugungi kurs kiritilganligiga qarab baholanadi.
          rejimYoniq: rejim.status === "fulfilled" ? Boolean(rejim.value.enabled) : kurs !== null,
          // Hisobot valyutasi o'qilmasa (rolga ruxsat yo'q yoki so'rov yiqilgan) oxirgi ma'lum qiymat saqlanadi.
          hisobotValyutasi: rejim.status === "fulfilled" ? valyutaKodi(rejim.value.reportCurrency) : joriy.hisobotValyutasi,
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
      // v3: foydalanuvchining "ko'rinish valyutasi" tanlovi olib tashlandi (u so'mdagi hujjatlarni ham dollarga aylantirardi); eski saqlangan
      // qiymatlar (shu jumladan tanlangan dollar) tashlab yuboriladi, rejim va hisobot valyutasi backenddan qayta o'qiladi.
      version: 3,
      migrate: () => ({}),
      // Kurs, rejim va hisobot valyutasi keshlanadi (sahifa ochilganda narxlar sakramasligi uchun), lekin har safar backenddan yangilanadi.
      partialize: (holat) => ({
        hisobotValyutasi: holat.hisobotValyutasi,
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

/**
 * Kurs va rejim shu seansda hali o'qilmagan bo'lsa o'qiydi. Ularni sarlavhadagi valyuta tanlagich o'qiydi, u esa tor ekranda (ixcham sarlavha)
 * menyu ochilmaguncha chizilmaydi: shunda saqlangan (eskirgan yoki bo'sh) qiymat qoladi va dollar tanlovi ko'rinmaydi.
 */
export function useKursniTayyorlash() {
  useEffect(() => {
    const { yuklandi, kursniYuklash } = useValyutaStore.getState();
    if (!yuklandi) void kursniYuklash();
  }, []);
}

/** JAMI summalar va hisobotlar valyutasi: hisobot valyutasi (`reportCurrency`); rejim o'chiq yoki kurs yo'q bo'lsa doim so'm. Hujjatlar uchun emas. */
export function korsatiladiganValyuta(): Valyuta {
  const { rejimYoniq, kursBor, hisobotValyutasi } = useValyutaStore.getState();
  return rejimYoniq && kursBor ? hisobotValyutasi : "UZS";
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
 * Summani O'Z valyutasida matnga aylantiradi, hech qanday o'girishsiz (hujjatlar: sotuv, to'lov, qaytarish — `currency`si bilan).
 *  - UZS: "1 250 000 so'm" (`yaxlit` bo'lsa butun songa yaxlitlanadi; `uzsBelgi` — tilga qarab "so'm"/"сум")
 *  - USD: "$98.43" (2 xonagacha kasr)
 */
export function oziValyutadaMatn(summa: number | string | null | undefined, valyuta: Valyuta, yaxlit = false, uzsBelgi = "so'm") {
  const son = Number(summa ?? 0);
  const qiymat = Number.isFinite(son) ? son : 0;
  if (valyuta === "USD") return `$${qiymat.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}`;
  return `${(yaxlit ? Math.round(qiymat) : qiymat).toLocaleString("uz-UZ")} ${uzsBelgi}`;
}

/**
 * Summani matnga aylantiradi: dollar summa ($, narxning o'z valyutasi — `manba`) o'z valyutasida qoladi; so'm summa (backend jami summalari,
 * `manba` berilmasa) hisobot valyutasida ko'rsatiladi (`korsatiladiganValyuta()`: odatda so'm, `reportCurrency` dollar bo'lsa bugungi kurs bilan $).
 * Hujjatni (sotuv, to'lov) so'mda ham o'z valyutasida ko'rsatish uchun `oziValyutadaMatn` ishlating.
 */
export function pulMatni(summa: number | string | null | undefined, manba: Valyuta = "UZS", yaxlit = false, uzsBelgi = "so'm") {
  const son = Number(summa ?? 0);
  const asl = Number.isFinite(son) ? son : 0;
  if (manba === "USD") return oziValyutadaMatn(asl, "USD");
  const nishon = korsatiladiganValyuta();
  const qiymat = summaniOgirish(asl, manba, nishon);
  return oziValyutadaMatn(qiymat, nishon, yaxlit, uzsBelgi);
}

/** Backenddan kelgan valyuta kodini ("USD" | "UZS" | boshqa) xavfsiz Valyuta'ga aylantiradi. */
export function valyutaKodi(qiymat?: string | null): Valyuta {
  return qiymat?.toUpperCase() === "USD" ? "USD" : "UZS";
}
