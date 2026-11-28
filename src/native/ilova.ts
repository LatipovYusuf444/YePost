import { Capacitor } from "@capacitor/core";

/** Android ilovasi (Capacitor) ichida ishlayaptimi. Vebda doim false. */
export function nativIlovami() {
  return Capacitor.isNativePlatform();
}

/**
 * Faqat Android ilovada: brauzer API'larini native ko'prikka ulaydi va "Orqaga" tugmasini sozlaydi.
 * Vebda hech narsa qilmaydi va qo'shimcha kod yuklanmaydi (dinamik import).
 */
export async function nativIlovaniOrnatish() {
  if (!nativIlovami()) return;
  document.documentElement.classList.add("nativ-ilova");
  // Ilovada tablar/oynalar yo'q: "Yangi (alohida) oynada ochish" tugmalari hech narsa qilmasdi — yashiriladi.
  // Belgisi ExternalLink + sarlavhasi "oyna/окно/window" bo'lganlar; Telegram/hisobot havolalari (boshqa matn) qoladi.
  const uslub = document.createElement("style");
  uslub.textContent = [
    "[title*='oyna' i]",
    "[aria-label*='oyna' i]",
    "[title*='окн' i]",
    "[aria-label*='окн' i]",
    "[title*='window' i]",
    "[aria-label*='window' i]",
  ]
    .map((belgi) => `html.nativ-ilova button${belgi}:has(svg.lucide-external-link)`)
    .join(",\n")
    .concat(" { display: none !important; }");
  document.head.appendChild(uslub);
  const [{ fayllarniOrnatish }, { orqagaTugmasiniOrnatish }, { yangilanishniKuzatish }] = await Promise.all([
    import("./fayllar"),
    import("./orqagaTugmasi"),
    import("./yangilanish"),
  ]);
  fayllarniOrnatish();
  orqagaTugmasiniOrnatish();
  yangilanishniKuzatish();
}
