import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { nativIlovami } from "@/native/ilova";
import { nativMatn } from "@/native/matnlar";

/**
 * Internet uzilganda ekran tepasida doimiy ogohlantirish, tiklanganda qisqa "Aloqa tiklandi".
 * Ma'lumot holati o'zgarmaydi: sotuv/to'lov faqat server javobidan keyin muvaffaqiyatli bo'ladi, qayta bosish
 * o'sha Idempotency-Key bilan ketadi (api/idempotentSorov) — bitta sotuv ikki marta yozilmaydi.
 */
export default function UlanishBanneri() {
  const [onlayn, setOnlayn] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [tiklandi, setTiklandi] = useState(false);
  const oldingi = useRef(onlayn);

  useEffect(() => {
    const yangilash = (holat: boolean) => setOnlayn(holat);
    const onOnline = () => yangilash(true);
    const onOffline = () => yangilash(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Android'da WebView hodisalaridan tashqari tizimning tarmoq holati ham tinglanadi (Wi-Fi <-> mobil almashganda aniqroq).
    let bekor = false;
    let tozalash: (() => void) | undefined;
    if (nativIlovami()) {
      void import("@capacitor/network").then(async ({ Network }) => {
        if (bekor) return;
        const holat = await Network.getStatus();
        if (!bekor) yangilash(holat.connected);
        const tinglovchi = await Network.addListener("networkStatusChange", (s) => yangilash(s.connected));
        if (bekor) void tinglovchi.remove();
        else tozalash = () => void tinglovchi.remove();
      });
    }

    return () => {
      bekor = true;
      tozalash?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (oldingi.current === onlayn) return;
    oldingi.current = onlayn;
    if (!onlayn) {
      setTiklandi(false);
      return;
    }
    setTiklandi(true);
    const taymer = window.setTimeout(() => setTiklandi(false), 3000);
    return () => window.clearTimeout(taymer);
  }, [onlayn]);

  if (onlayn && !tiklandi) return null;

  return (
    <div
      role={onlayn ? "status" : "alert"}
      aria-live="assertive"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[2147483000] flex items-start justify-center gap-2 px-4 py-2 text-center text-[13px] font-semibold leading-snug text-white shadow-lg ${
        onlayn ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {onlayn ? <Wifi size={16} className="mt-px shrink-0" aria-hidden /> : <WifiOff size={16} className="mt-px shrink-0" aria-hidden />}
      <span>{onlayn ? nativMatn("online") : nativMatn("offline")}</span>
    </div>
  );
}
