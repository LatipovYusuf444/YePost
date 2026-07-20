import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { InstagramIkonka, TelegramIkonka, WhatsappIkonka } from "./IjtimoiyIkonkalar";
import type { IjtimoiyTarmoqlar } from "./types";

type Kalit = keyof IjtimoiyTarmoqlar;

// Har bir tarmoqning to'liq havolasi.
function tarmoqLink(kalit: Kalit, qiymat: string) {
  const v = qiymat.trim();
  if (kalit === "telegram") return `https://t.me/${v.replace(/^@/, "")}`;
  if (kalit === "whatsapp") return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}

const konfig: { kalit: Kalit; ikonka: ReactNode; rang: string }[] = [
  { kalit: "telegram", ikonka: <TelegramIkonka size={16} />, rang: "bg-[#E7F3FB] text-[#229ED9]" },
  { kalit: "whatsapp", ikonka: <WhatsappIkonka size={16} />, rang: "bg-[#E6F6EC] text-[#25D366]" },
  { kalit: "instagram", ikonka: <InstagramIkonka size={16} />, rang: "bg-[#FCE9F1] text-[#E1306C]" },
];

// Ijtimoiy tarmoq ikonlari: 1 marta bosilsa o'sha tarmoq havolasi ko'rinadi,
// 2 marta bosilsa havola nusxalanadi. Faqat bosilgan tarmoqники (hammasi emas).
// Havola portal orqali chiqadi — jadval katagi (overflow) uni kesib qo'ymasligi uchun.
export default function IjtimoiyIkonlar({ ijtimoiy }: { ijtimoiy: IjtimoiyTarmoqlar }) {
  const [faol, setFaol] = useState<Kalit | null>(null);
  const [joy, setJoy] = useState<{ top: number; left: number } | null>(null);
  const [nusxalandi, setNusxalandi] = useState(false);
  const taymer = useRef<number | null>(null);

  function yopish() {
    setFaol(null);
    setJoy(null);
    setNusxalandi(false);
  }

  function bosildi(event: MouseEvent<HTMLButtonElement>, kalit: Kalit, link: string) {
    event.stopPropagation();
    const quti = event.currentTarget.getBoundingClientRect();
    const yangiJoy = {
      top: Math.min(quti.bottom + 8, window.innerHeight - 76),
      left: Math.max(12, Math.min(quti.left, window.innerWidth - 330)),
    };

    if (taymer.current) {
      // 2-marta bosish — havolani nusxalash
      window.clearTimeout(taymer.current);
      taymer.current = null;
      void navigator.clipboard?.writeText(link);
      setFaol(kalit);
      setJoy(yangiJoy);
      setNusxalandi(true);
      window.setTimeout(() => setNusxalandi(false), 1400);
    } else {
      // 1-marta bosish — havolani ko'rsatish
      taymer.current = window.setTimeout(() => {
        taymer.current = null;
        setNusxalandi(false);
        setFaol((oldingi) => (oldingi === kalit ? null : kalit));
        setJoy(yangiJoy);
      }, 220);
    }
  }

  async function nusxalash(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setNusxalandi(true);
      window.setTimeout(() => setNusxalandi(false), 1600);
    } catch {
      setNusxalandi(false);
    }
  }

  const faolLink = faol ? tarmoqLink(faol, ijtimoiy[faol]) : "";

  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {konfig.map((t) => {
        const qiymat = ijtimoiy[t.kalit].trim();
        const link = qiymat ? tarmoqLink(t.kalit, qiymat) : "";
        return (
          <button
            key={t.kalit}
            type="button"
            title={qiymat ? `${t.kalit}: ${qiymat}` : `${t.kalit} kiritilmagan`}
            aria-label={qiymat ? `${t.kalit} havolasini ochish` : `${t.kalit} kiritilmagan`}
            aria-expanded={faol === t.kalit}
            disabled={!qiymat}
            onClick={(event) => qiymat && bosildi(event, t.kalit, link)}
            className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all duration-200 outline-none ${t.rang} ${
              faol === t.kalit
                ? "-translate-y-0.5 scale-105 ring-2 ring-[#FF6A00] ring-offset-2 shadow-md"
                : qiymat
                  ? "opacity-85 hover:-translate-y-1 hover:scale-110 hover:opacity-100 hover:shadow-lg active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#FF6A00] focus-visible:ring-offset-2"
                  : "cursor-default opacity-45"
            }`}
          >
            {t.ikonka}
            {qiymat && (
              <span className="pointer-events-none absolute inset-0 rounded-xl bg-current opacity-0 transition-opacity duration-200 group-hover:opacity-[0.08]" />
            )}
          </button>
        );
      })}

      {faol &&
        joy &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Yopish"
              onClick={yopish}
              className="fixed inset-0 cursor-default"
              style={{ zIndex: 100000 }}
            />
            <div
              role="dialog"
              aria-label={`${faol} havolasi`}
              className="fixed flex max-w-[calc(100vw-24px)] animate-in items-center gap-2 whitespace-nowrap rounded-2xl border border-orange-100 bg-white p-2 shadow-[0_18px_50px_rgba(92,38,8,.22)] duration-200 fade-in zoom-in-95"
              style={{ top: joy.top, left: joy.left, zIndex: 100001 }}
            >
              <a
                href={faolLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={yopish}
                className="inline-flex h-9 max-w-[210px] items-center rounded-xl bg-orange-50 px-3 text-xs font-bold text-[#FF6A00] outline-none transition hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
              >
                <span className="truncate">Ochish · {faolLink}</span>
              </a>
              <button
                type="button"
                onClick={() => void nusxalash(faolLink)}
                className={`h-9 rounded-xl px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-offset-1 ${
                  nusxalandi
                    ? "bg-emerald-50 text-emerald-600 focus-visible:ring-emerald-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:ring-slate-400"
                }`}
              >
                {nusxalandi ? "Nusxalandi ✓" : "Nusxalash"}
              </button>
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
