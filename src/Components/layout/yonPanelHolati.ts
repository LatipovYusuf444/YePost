import { useCallback, useEffect, useState } from "react";

// Yon panel holati: ochiq/yopiq va ekran rejimi.
// - "keng" (>= 1280px): panel kontentni suradi; tanlov localStorage'da saqlanadi (faqat UI sozlamasi).
// - "orta" (768–1279px): ochiq panel kontent ustiga chiqadi; har doim yopiq boshlanadi, saqlanmaydi.
// - "mobil" (< 768px): desktop panel yo'q, pastki dock + menyu varag'i ishlaydi.
export type YonPanelRejimi = "keng" | "orta" | "mobil";

export const YON_PANEL_KALITI = "yepost-sidebar";

function rejimniAniqlash(): YonPanelRejimi {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "keng";
  if (window.matchMedia("(min-width: 1280px)").matches) return "keng";
  if (window.matchMedia("(min-width: 768px)").matches) return "orta";
  return "mobil";
}

function saqlanganTanlov(): boolean {
  try {
    return window.localStorage.getItem(YON_PANEL_KALITI) === "ochiq";
  } catch {
    return false;
  }
}

function tanlovniSaqlash(ochiq: boolean) {
  try {
    window.localStorage.setItem(YON_PANEL_KALITI, ochiq ? "ochiq" : "yopiq");
  } catch {
    // Brauzer xotirasi yopiq bo'lsa (private rejim) tanlov shu sessiya bilan cheklanadi.
  }
}

export function useYonPanelHolati() {
  const [rejim, setRejim] = useState<YonPanelRejimi>(rejimniAniqlash);
  const [acik, setAcik] = useState(() => rejimniAniqlash() === "keng" && saqlanganTanlov());

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const keng = window.matchMedia("(min-width: 1280px)");
    const orta = window.matchMedia("(min-width: 768px)");
    const yangila = () => {
      const yangiRejim = rejimniAniqlash();
      setRejim(yangiRejim);
      // Keng ekranga qaytganda saqlangan tanlov tiklanadi; planshet/telefonda panel yopiq turadi.
      setAcik(yangiRejim === "keng" ? saqlanganTanlov() : false);
    };
    keng.addEventListener("change", yangila);
    orta.addEventListener("change", yangila);
    return () => {
      keng.removeEventListener("change", yangila);
      orta.removeEventListener("change", yangila);
    };
  }, []);

  const almashtirish = useCallback(() => {
    setAcik((joriy) => {
      const yangi = !joriy;
      if (rejimniAniqlash() === "keng") tanlovniSaqlash(yangi);
      return yangi;
    });
  }, []);

  const yopish = useCallback(() => setAcik(false), []);

  return { acik: rejim !== "mobil" && acik, rejim, almashtirish, yopish };
}
