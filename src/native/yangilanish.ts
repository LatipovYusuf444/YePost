import { App } from "@capacitor/app";
import { toast } from "sonner";
import { nativMatn } from "./matnlar";

/**
 * Android ilovasi sahifani vebdan ochadi: har yangi ochilishda oxirgi deploy keladi. Ilova uzoq ochiq tursa (kassada kun bo'yi),
 * yangi deploy shu yerda aniqlanadi va "Yangilash" taklif qilinadi — avtomatik qayta yuklanmaydi, chunki ochiq sotuv/forma yo'qolmasin.
 * Tekshiruv: ilova fondan qaytganda, internet tiklanganda va har 10 daqiqada.
 */

const TEKSHIRISH_ORALIGI_MS = 10 * 60_000;
const TOAST_ID = "ilova-yangi-versiya";
const ASOSIY_SKRIPT = /\/assets\/index-[\w-]+\.js/;

function joriySkript(): string | null {
  for (const skript of Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))) {
    const topilgan = new URL(skript.src, window.location.href).pathname.match(ASOSIY_SKRIPT);
    if (topilgan) return topilgan[0];
  }
  return null;
}

/** Serverdagi index.html qaysi asosiy skriptga ishora qiladi (Vite har buildda nomini o'zgartiradi). */
export function serverSkripti(html: string): string | null {
  return html.match(ASOSIY_SKRIPT)?.[0] ?? null;
}

export function yangilanishniKuzatish() {
  const joriy = joriySkript();
  // Dev server (vite) yoki noodatiy build: solishtiradigan narsa yo'q.
  if (!joriy) return;

  let taklifQilindi = false;
  let band = false;

  async function tekshirish() {
    if (taklifQilindi || band || !navigator.onLine) return;
    band = true;
    try {
      const javob = await fetch(`/?v=${Date.now()}`, { cache: "no-store", credentials: "omit" });
      if (!javob.ok) return;
      const yangi = serverSkripti(await javob.text());
      if (!yangi || yangi === joriy) return;
      taklifQilindi = true;
      toast.info(nativMatn("yangiVersiya"), {
        id: TOAST_ID,
        duration: Infinity,
        description: nativMatn("yangiVersiyaIzoh"),
        action: { label: nativMatn("yangilash"), onClick: () => window.location.reload() },
      });
    } catch {
      // Tarmoq xatosi — keyingi tekshiruvda qayta urinadi.
    } finally {
      band = false;
    }
  }

  void App.addListener("resume", () => void tekshirish());
  window.addEventListener("online", () => void tekshirish());
  window.setInterval(() => void tekshirish(), TEKSHIRISH_ORALIGI_MS);
}
