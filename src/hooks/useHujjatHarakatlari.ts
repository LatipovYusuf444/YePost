import { useCallback, useEffect, useRef, useState } from "react";
import { hujjatHarakatlariniOlish } from "@/api/hujjatHarakatlariApi";
import type { HujjatHarakati } from "@/lib/hujjatHarakatlari";

/**
 * Hujjat (sotuv) bilan bo'lgan ombor harakatlari: GET /reports/stock-movement?documentIds=<id>. `yoniq` false bo'lsa so'rov yuborilmaydi
 * (masalan, qoralama sotuvda ombor harakati yo'q); `kalit` o'zgarsa (masalan, sotuv holati) harakatlar qayta o'qiladi.
 * Xato toasti chiqmaydi: `xato` belgisini chaqiruvchi o'zi ko'rsatadi.
 */
export function useHujjatHarakatlari(hujjatId: string, yoniq: boolean, kalit = "") {
  const [harakatlar, setHarakatlar] = useState<HujjatHarakati[] | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState(false);
  const faolRef = useRef(true);
  const sorovTartibi = useRef(0);

  useEffect(() => {
    faolRef.current = true;
    return () => {
      faolRef.current = false;
    };
  }, []);

  const yangilash = useCallback(async () => {
    if (!yoniq) return;
    const tartib = (sorovTartibi.current += 1);
    setYuklanmoqda(true);
    try {
      const royxat = await hujjatHarakatlariniOlish(hujjatId);
      // Eskirgan javob yangisini bosib ketmasin (tez-tez bosilganda).
      if (faolRef.current && tartib === sorovTartibi.current) {
        setHarakatlar(royxat);
        setXato(false);
      }
    } catch {
      if (faolRef.current && tartib === sorovTartibi.current) setXato(true);
    } finally {
      if (faolRef.current && tartib === sorovTartibi.current) setYuklanmoqda(false);
    }
  }, [hujjatId, yoniq]);

  useEffect(() => {
    setHarakatlar(null);
    setXato(false);
    void yangilash();
  }, [yangilash, kalit]);

  return { harakatlar, yuklanmoqda, xato, yangilash };
}
