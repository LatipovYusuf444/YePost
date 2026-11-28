import { useEffect, useRef, useState } from "react";
import { jonliObuna, type JonliKanal } from "@/lib/jonliHodisalar";
import type { OqimHolati } from "@/lib/jonliOqim";

/** Oqim ishlayotganda ham shu route'lar har 5 daqiqada so'raladi: hodisa yo'qolsa, ekran ko'pi bilan 5 daqiqa eskiradi. */
export const XAVFSIZLIK_POLLING_MS = 5 * 60_000;
/** Backend shu tabning oqimini yopsa (`closed: limit`) — sekin polling. */
export const SEKIN_POLLING_MS = 60_000;
const DEBOUNCE_MS = 300;

export type JonliHodisaFiltri = readonly string[] | ((nom: string, data: Record<string, unknown>) => boolean);

export type JonliYangilashSozlamasi = {
  /** Qaysi hodisalar shu ekranni yangilaydi (nomlar ro'yxati yoki filtr funksiyasi). */
  hodisalar: JonliHodisaFiltri;
  /**
   * Qayta olish (REST). Promise qaytarsa, hook so'rovlarni ketma-ket bajaradi: bir vaqtda bittasi, oraliqda kelgan
   * hodisalar bitta keyingi so'rovga yig'iladi — eski javob yangisini bosib ketmaydi, hodisa tashlab yuborilmaydi.
   */
  yangilash: () => unknown;
  /** Oqim ishlamaganda (ulanmagan, xato, eski backend) hozirgi polling oralig'i. */
  zaxiraMs: number;
  kanal?: JonliKanal;
  /** false — na oqim tinglanadi, na polling (masalan, ekran hali tayyor emas). */
  faol?: boolean;
};

/**
 * Ekranni jonli hodisalar bilan yangilash + zaxira polling:
 * - oqim `ulangan` — mos hodisa (va `open`/`resync`) kelganda `yangilash`, qo'shimcha har 5 daqiqada xavfsizlik pollingi;
 * - oqim yopiq/xato — avvalgidek `zaxiraMs` oralig'ida polling; `limit` — kamida 60 s.
 * Sahifa yashirin bo'lsa hech narsa so'ralmaydi (avvalgi polling kabi): kelgan hodisa eslab qolinadi va sahifa
 * ko'ringanda bir marta yangilanadi — "o'qildi" belgilari foydalanuvchi ko'rmagan xabarga qo'yilmaydi.
 * Dastlabki yuklash ekranning o'zida qoladi (bu hook faqat yangilaydi).
 */
export function useJonliYangilash({ hodisalar, yangilash, zaxiraMs, kanal = "workspace", faol = true }: JonliYangilashSozlamasi) {
  const [holat, setHolat] = useState<OqimHolati>("toxtagan");
  const yangilashRef = useRef(yangilash);
  const filtrRef = useRef(hodisalar);
  useEffect(() => {
    yangilashRef.current = yangilash;
    filtrRef.current = hodisalar;
  });

  // Ketma-ket bajaruvchi: ishlayotgan so'rov + ko'pi bilan bitta navbatdagi.
  const bajaruvchiRef = useRef<{ ishlayapti: boolean; navbat: boolean; yashirinda: boolean }>({ ishlayapti: false, navbat: false, yashirinda: false });
  const ishgaTushirRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    ishgaTushirRef.current = () => {
      const b = bajaruvchiRef.current;
      if (document.visibilityState !== "visible") {
        b.yashirinda = true;
        return;
      }
      if (b.ishlayapti) {
        b.navbat = true;
        return;
      }
      b.ishlayapti = true;
      let natija: unknown;
      try {
        natija = yangilashRef.current();
      } catch {
        natija = undefined;
      }
      void Promise.resolve(natija)
        .catch(() => undefined)
        .finally(() => {
          b.ishlayapti = false;
          if (b.navbat) {
            b.navbat = false;
            ishgaTushirRef.current();
          }
        });
    };
  }, []);

  useEffect(() => {
    if (!faol) return;
    let taymer: number | null = null;
    const rejalashtir = () => {
      if (taymer !== null) window.clearTimeout(taymer);
      taymer = window.setTimeout(() => {
        taymer = null;
        ishgaTushirRef.current();
      }, DEBOUNCE_MS);
    };
    const koringanda = () => {
      const b = bajaruvchiRef.current;
      if (document.visibilityState === "visible" && b.yashirinda) {
        b.yashirinda = false;
        rejalashtir();
      }
    };
    const bekor = jonliObuna(kanal, {
      hodisa: ({ nom, data }) => {
        const filtr = filtrRef.current;
        const mos = typeof filtr === "function" ? filtr(nom, data) : filtr.includes(nom);
        if (mos) rejalashtir();
      },
      hammasi: rejalashtir,
      holat: setHolat,
    });
    document.addEventListener("visibilitychange", koringanda);
    const bajaruvchi = bajaruvchiRef.current;
    return () => {
      bekor();
      document.removeEventListener("visibilitychange", koringanda);
      if (taymer !== null) window.clearTimeout(taymer);
      bajaruvchi.yashirinda = false;
    };
  }, [faol, kanal]);

  const oraliq = holat === "ulangan" ? XAVFSIZLIK_POLLING_MS : holat === "limit" ? Math.max(zaxiraMs, SEKIN_POLLING_MS) : zaxiraMs;

  useEffect(() => {
    if (!faol) return;
    const id = window.setInterval(() => {
      // Polling yashirin sahifada so'rov yubormaydi va "ko'ringanda yangila" belgisini ham qo'ymaydi (avvalgidek).
      if (document.visibilityState !== "visible") return;
      ishgaTushirRef.current();
    }, oraliq);
    return () => window.clearInterval(id);
  }, [faol, oraliq]);

  return holat;
}
