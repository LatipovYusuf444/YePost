import { useEffect } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { persist } from "zustand/middleware";
import { kursniSongaAylantirish, rejimKodiniOlish, rejimValyutasi, valyutaApi, type ValyutaRejimKodi } from "@/api/valyutaApi";
import { asosiyValyutaniBelgilash, valyutaYokiAsosiy } from "./asosiyValyuta.ts";

// Butun loyiha uchun yagona valyuta moduli.
//
// Qoida (backend, 2026-10-22): valyuta rejimi yoqilgani "hammasini dollarda ko'rsat" degani emas. Har bir HUJJAT o'z valyutasida ko'rsatiladi
// (sale.currency, qatorda items[].currency, to'lovda payments[].currency) — hech qachon ko'rinish valyutasiga o'girilmaydi. JAMI summalar
// va hisobotlar esa GET /settings/currency dagi `reportCurrency` bo'yicha (Sozlamalar → Valyuta). Backenddagi barcha summalar so'mda
// (UZS) deb olinadi; mahsulot narxi o'z `currency`siga ega. Dollar kursini ADMIN/DIREKTOR Sozlamalar → Valyuta bo'limida kiritadi.
// Foydalanuvchi tanlaydigan "ko'rinish valyutasi" yo'q: eskisi hujjatlarni (so'mdagi sotuvni ham) dollarga aylantirib yuborardi.
//
// Rejim (backend 11.11.2026): DUAL — ikki valyuta; UZS_ONLY — faqat so'm; USD_ONLY — faqat dollar. Bir valyutali rejimda valyuta tanlash
// maydonlari va navbardagi so'm/$ ko'rsatkichi yashiriladi, yangi yozuvlar rejim valyutasida yuboriladi (`standartValyuta()`), kurs so'ralmaydi,
// jami summalar o'girilmasdan shu valyutada ko'rsatiladi. Eski hujjatlar o'z valyutasida qoladi.

export type Valyuta = "UZS" | "USD";

type ValyutaHolati = {
  /** Hisobot valyutasi (GET /settings/currency → `reportCurrency`): jami summalar va hisobotlar shu valyutada. Hujjatlarga ta'sir qilmaydi. */
  hisobotValyutasi: Valyuta;
  /** Backenddagi valyuta rejimi (GET /settings/currency → `mode`). */
  rejim: ValyutaRejimKodi;
  /** Ikki valyuta rejimi (rejim === "DUAL"): valyuta tanlash maydonlari va kurs faqat shunda kerak. */
  rejimYoniq: boolean;
  /** Valyuta yuborilmagan yozuvlarga backend qo'yadigan valyuta (`defaultCurrency`); bir valyutali rejimda — rejim valyutasi. */
  asosiyValyuta: Valyuta;
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
      rejim: "UZS_ONLY",
      rejimYoniq: false,
      asosiyValyuta: "UZS",
      kurs: 0,
      kursBor: false,
      kursSanasi: null,
      bugun: null,
      yuklandi: false,
      kursniYuklash: async () => {
        const [rejim, amaldagi] = await Promise.allSettled([valyutaApi.rejimniOlish(), valyutaApi.amaldagiKurs()]);
        const kurs = amaldagi.status === "fulfilled" ? kursniSongaAylantirish(amaldagi.value.rate) : null;

        set((joriy) => {
          // Rejim o'qilmasa (masalan, rolga ruxsat yo'q): oxirgi ma'lum rejim; u ham bo'lmasa bugungi kurs kiritilganligiga qarab.
          const rejimKodi: ValyutaRejimKodi =
            rejim.status === "fulfilled"
              ? rejimKodiniOlish(rejim.value)
              : joriy.yuklandi || joriy.rejim !== "UZS_ONLY" ? joriy.rejim : kurs !== null ? "DUAL" : "UZS_ONLY";
          const yagona = rejimValyutasi(rejimKodi);
          return {
          rejim: rejimKodi,
          rejimYoniq: rejimKodi === "DUAL",
          // Bir valyutali rejimda hisobot va asosiy valyuta doim shu valyuta (backend ham shunday qaytaradi).
          hisobotValyutasi: yagona ?? (rejim.status === "fulfilled" ? valyutaKodi(rejim.value.reportCurrency) : joriy.hisobotValyutasi),
          asosiyValyuta: yagona ?? (rejim.status === "fulfilled" ? valyutaKodi(rejim.value.defaultCurrency) : joriy.asosiyValyuta),
          kurs: amaldagi.status === "fulfilled" ? (kurs ?? 0) : joriy.kurs,
          kursBor: amaldagi.status === "fulfilled" ? kurs !== null : joriy.kursBor,
          kursSanasi:
            amaldagi.status === "fulfilled" ? (kurs !== null ? (amaldagi.value.rateDate ?? null) : null) : joriy.kursSanasi,
          bugun: amaldagi.status === "fulfilled" ? (amaldagi.value.date ?? joriy.bugun) : joriy.bugun,
          yuklandi: true,
          };
        });
      },
    }),
    {
      name: "yepost-valyuta",
      // v3: foydalanuvchining "ko'rinish valyutasi" tanlovi olib tashlandi (u so'mdagi hujjatlarni ham dollarga aylantirardi); eski saqlangan
      // qiymatlar (shu jumladan tanlangan dollar) tashlab yuboriladi, rejim va hisobot valyutasi backenddan qayta o'qiladi.
      // v4: `enabled` o'rniga uch rejim (`mode`); eski keshlangan qiymatlar tashlanadi, backenddan qayta o'qiladi.
      version: 4,
      migrate: () => ({}),
      // Kurs, rejim va hisobot valyutasi keshlanadi (sahifa ochilganda narxlar sakramasligi uchun), lekin har safar backenddan yangilanadi.
      partialize: (holat) => ({
        hisobotValyutasi: holat.hisobotValyutasi,
        rejim: holat.rejim,
        rejimYoniq: holat.rejimYoniq,
        asosiyValyuta: holat.asosiyValyuta,
        kurs: holat.kurs,
        kursBor: holat.kursBor,
        kursSanasi: holat.kursSanasi,
      }),
    }
  )
);

// Valyutasi yozilmagan yozuvlar uchun asosiy valyuta (lib/asosiyValyuta) rejim bilan doim bir xil: "Faqat dollar" — USD, "Faqat so'm" —
// UZS, ikki valyuta — backend `defaultCurrency`. Saqlangan (persist) holat tiklanganda va har yangilanishda o'rnatiladi.
asosiyValyutaniBelgilash(holatValyutasi(useValyutaStore.getState()) ?? useValyutaStore.getState().asosiyValyuta);
useValyutaStore.subscribe((holat) => asosiyValyutaniBelgilash(holatValyutasi(holat) ?? holat.asosiyValyuta));

/** Komponentlar uchun: valyuta yoki kurs o'zgarganda qayta chizilishi kerak bo'lsa. */
export function useValyuta() {
  // Kurs so'rovi bir xil qiymat qaytarsa ham `set` yangi obyekt yaratadi: useShallow tengligi bo'yicha qayta chizilmaydi.
  return useValyutaStore(useShallow((holat) => ({
    hisobotValyutasi: holat.hisobotValyutasi,
    rejim: holat.rejim,
    rejimYoniq: holat.rejimYoniq,
    asosiyValyuta: holat.asosiyValyuta,
    kurs: holat.kurs,
    kursBor: holat.kursBor,
    kursSanasi: holat.kursSanasi,
    bugun: holat.bugun,
    yuklandi: holat.yuklandi,
    kursniYuklash: holat.kursniYuklash,
  })));
}

// Rejim va kurs backenddan qayta olinadigan oraliq (varaq qayta ko'ringanda ham darhol yangilanadi).
const KUZATISH_ORALIGI = 15 * 60 * 1000;

/**
 * Asosiy layout uchun: valyuta rejimi va kursni darhol, keyin har 15 daqiqada va varaq qayta ko'ringanda yuklaydi. Navbar valyuta
 * ko'rsatkichiga bog'liq emas (tor ekranda u menyu ochilmaguncha chizilmaydi): aks holda "Faqat dollar" do'konida formalar standart
 * so'm bilan yuborilib qolardi.
 */
export function useValyutaRejiminiKuzatish() {
  useEffect(() => {
    const yukla = () => void useValyutaStore.getState().kursniYuklash();
    yukla();
    const oraliq = window.setInterval(yukla, KUZATISH_ORALIGI);
    const koringanda = () => {
      if (document.visibilityState === "visible") yukla();
    };
    document.addEventListener("visibilitychange", koringanda);
    return () => {
      window.clearInterval(oraliq);
      document.removeEventListener("visibilitychange", koringanda);
    };
  }, []);
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

// Holatdan bir valyutali rejim valyutasi. `rejimYoniq` (ikki valyuta) ustun: uni to'g'ridan-to'g'ri o'rnatadigan eski kod/testlar ham to'g'ri ishlaydi.
function holatValyutasi(holat: Pick<ValyutaHolati, "rejim" | "rejimYoniq">): Valyuta | null {
  return holat.rejimYoniq ? null : rejimValyutasi(holat.rejim);
}

/** Bir valyutali rejim valyutasi (Faqat so'm → UZS, Faqat dollar → USD); ikki valyuta rejimida `null`. */
export function yagonaValyuta(): Valyuta | null {
  return holatValyutasi(useValyutaStore.getState());
}

/** Komponentlar uchun: bir valyutali rejim valyutasi yoki `null` (ikki valyuta). Rejim o'zgarsa qayta chiziladi. */
export function useYagonaValyuta(): Valyuta | null {
  return useValyutaStore(holatValyutasi);
}

/**
 * Yangi yozuv (savdo, to'lov, kirim, narx, kassa amali, boshlang'ich qarz...) uchun standart valyuta: bir valyutali rejimda — rejim
 * valyutasi (boshqasini backend rad etadi), ikki valyuta rejimida — backenddagi `defaultCurrency` (odatda so'm).
 */
export function standartValyuta(): Valyuta {
  const holat = useValyutaStore.getState();
  return holatValyutasi(holat) ?? holat.asosiyValyuta;
}

/** Komponentlar uchun `standartValyuta()`. */
export function useStandartValyuta(): Valyuta {
  return useValyutaStore((holat) => holatValyutasi(holat) ?? holat.asosiyValyuta);
}

/**
 * Formadagi valyuta: bir valyutali rejimda doim rejim valyutasi (tanlov yashirin, eski yoki boshqa qiymat yuborilmaydi), ikki valyuta
 * rejimida — tanlangan qiymat (bo'lmasa standart valyuta).
 */
export function ruxsatEtilganValyuta(tanlangan: Valyuta | string | null | undefined): Valyuta {
  return yagonaValyuta() ?? (tanlangan ? valyutaKodi(tanlangan) : standartValyuta());
}

/**
 * JAMI summalar va hisobotlar valyutasi: bir valyutali rejimda — shu valyuta; ikki valyuta rejimida — hisobot valyutasi (`reportCurrency`),
 * kurs yo'q bo'lsa so'm. Hujjatlar uchun emas.
 */
export function korsatiladiganValyuta(): Valyuta {
  const holat = useValyutaStore.getState();
  const { rejimYoniq, kursBor, hisobotValyutasi } = holat;
  const yagona = holatValyutasi(holat);
  if (yagona) return yagona;
  return rejimYoniq && kursBor ? hisobotValyutasi : "UZS";
}

/**
 * Summani manba valyutasidan hozir ko'rsatiladigan valyutaga o'giradi (kurs yo'q bo'lsa o'zgartirmaydi). Bir valyutali rejimda jami summalar
 * o'girilmaydi: do'konning summalari shu valyutada, kurs esa so'ralmaydi.
 */
export function summaniOgirish(summa: number, manba: Valyuta = "UZS", maqsad?: Valyuta) {
  const holat = useValyutaStore.getState();
  const { kurs, kursBor } = holat;
  const nishon = maqsad ?? korsatiladiganValyuta();
  if (!Number.isFinite(summa) || manba === nishon || !kursBor) return summa;
  if (holatValyutasi(holat) === nishon) return summa;
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
  // Bo'sh yoki noma'lum valyuta — do'konning asosiy valyutasi ("Faqat dollar" rejimida USD), doim "UZS" emas.
  return valyutaYokiAsosiy(qiymat);
}
