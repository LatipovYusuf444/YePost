import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ustunniKochirish } from "@/lib/sotuvUstunlari";

const BOSHLASH_MASOFASI = 5;

/**
 * Jadval sarlavhasidagi ustunlarni sudrab tartiblash: sichqoncha va barmoq (pointer events — iPad'da ham), klaviaturada ←/→.
 * Sudrash paytida `korinadigan` — oldindan ko'rish tartibi (sarlavha ham, qatorlar ham shu bilan chiziladi), qo'yib yuborilganda `onKochir`.
 * Ustunlar gorizontal: katak `touch-action: pan-y` — sahifani tik aylantirish ishlaydi, yon tomonga sudrash ustunni ko'chiradi.
 */
export function useUstunSudrash<K extends string>({ tartib, onKochir }: { tartib: readonly K[]; onKochir: (yangi: K[]) => void }) {
  const [oldindan, setOldindanHolati] = useState<{ kalit: K; tartib: K[] } | null>(null);
  // Qo'yib yuborilganda oxirgi oldindan ko'rish (holat hali yangilanmagan bo'lishi mumkin).
  const oldindanRef = useRef<{ kalit: K; tartib: K[] } | null>(null);
  const setOldindan = (yangi: { kalit: K; tartib: K[] } | null) => {
    oldindanRef.current = yangi;
    setOldindanHolati(yangi);
  };
  // Sudrash boshlangandagi kataklar markazlari: nishon shular bo'yicha (DOM hali yangilanmagan bo'lsa ham sakramaydi).
  const boshlanish = useRef<{ kalit: K; x: number; y: number; faol: boolean; markazlar: Array<{ kalit: K; x: number }> } | null>(null);
  const kataklar = useRef(new Map<K, HTMLElement>());
  const tutqichlar = useRef(new Map<K, HTMLElement>());
  const korinadigan = oldindan?.tartib ?? (tartib as K[]);

  function tugatish(saqlash: boolean) {
    const joriy = oldindanRef.current;
    boshlanish.current = null;
    setOldindan(null);
    if (saqlash && joriy && joriy.tartib.some((kalit, i) => kalit !== tartib[i])) onKochir(joriy.tartib);
  }

  // Yangi o'rin: ko'rsatkichdan chapda markazi qolgan boshqa ustunlar soni (boshlanishdagi o'lchamlar bo'yicha).
  function nishon(x: number, kalit: K, markazlar: Array<{ kalit: K; x: number }>): K[] {
    const orin = markazlar.filter((m) => m.kalit !== kalit && m.x < x).length;
    return ustunniKochirish(tartib, kalit, orin);
  }

  function katakProps(kalit: K) {
    return {
      ref: (el: HTMLElement | null) => {
        if (el) kataklar.current.set(kalit, el);
        else kataklar.current.delete(kalit);
      },
      "data-ustun-sudrash": kalit,
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        const markazlar = tartib.flatMap((k) => {
          const r = kataklar.current.get(k)?.getBoundingClientRect();
          return r ? [{ kalit: k, x: r.left + r.width / 2 }] : [];
        });
        boshlanish.current = { kalit, x: event.clientX, y: event.clientY, faol: false, markazlar };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const b = boshlanish.current;
        if (!b || b.kalit !== kalit) return;
        if (!b.faol) {
          if (Math.abs(event.clientX - b.x) < BOSHLASH_MASOFASI) return;
          // Avval tik harakat bo'lsa — bu sahifani aylantirish, sudrash emas.
          if (Math.abs(event.clientY - b.y) > Math.abs(event.clientX - b.x)) {
            boshlanish.current = null;
            return;
          }
          b.faol = true;
        }
        event.preventDefault();
        const joriy = oldindanRef.current?.tartib ?? (tartib as K[]);
        const yangi = nishon(event.clientX, kalit, b.markazlar);
        if (!oldindanRef.current || yangi.some((k, i) => k !== joriy[i])) setOldindan({ kalit, tartib: yangi });
      },
      onPointerUp: () => tugatish(true),
      onPointerCancel: () => tugatish(false),
      onLostPointerCapture: () => {
        if (boshlanish.current) tugatish(true);
      },
    };
  }

  // Klaviatura: tutqichda ←/→ — ustun bir joy suriladi, fokus o'sha tutqichda qoladi.
  function tutqichProps(kalit: K) {
    return {
      ref: (el: HTMLElement | null) => {
        if (el) tutqichlar.current.set(kalit, el);
        else tutqichlar.current.delete(kalit);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const yangi = ustunniKochirish(tartib, kalit, tartib.indexOf(kalit) + (event.key === "ArrowLeft" ? -1 : 1));
        if (yangi === tartib) return;
        onKochir(yangi);
        window.requestAnimationFrame(() => tutqichlar.current.get(kalit)?.focus());
      },
    };
  }

  return { korinadigan, sudralayotgan: oldindan?.kalit ?? null, katakProps, tutqichProps };
}
