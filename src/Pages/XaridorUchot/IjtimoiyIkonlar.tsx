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

  const bor = konfig.filter((t) => ijtimoiy[t.kalit].trim());
  if (bor.length === 0) return <span className="text-slate-400">—</span>;

  function yopish() {
    setFaol(null);
    setJoy(null);
    setNusxalandi(false);
  }

  function bosildi(event: MouseEvent<HTMLButtonElement>, kalit: Kalit, link: string) {
    event.stopPropagation();
    const quti = event.currentTarget.getBoundingClientRect();
    const yangiJoy = { top: quti.bottom + 6, left: quti.left };

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

  const faolLink = faol ? tarmoqLink(faol, ijtimoiy[faol]) : "";

  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {bor.map((t) => {
        const link = tarmoqLink(t.kalit, ijtimoiy[t.kalit]);
        return (
          <button
            key={t.kalit}
            type="button"
            title="1× havola, 2× nusxa"
            onClick={(event) => bosildi(event, t.kalit, link)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${t.rang} ${
              faol === t.kalit ? "ring-2 ring-[#FF6A00]" : "opacity-80 hover:opacity-100"
            }`}
          >
            {t.ikonka}
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
              className="fixed flex items-center gap-2 whitespace-nowrap rounded-xl border border-orange-100 bg-white px-3 py-2 shadow-[0_18px_50px_rgba(92,38,8,.22)]"
              style={{ top: joy.top, left: joy.left, zIndex: 100001 }}
            >
              <a
                href={faolLink}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[260px] truncate text-xs font-semibold text-[#FF6A00] hover:underline"
              >
                {faolLink}
              </a>
              {nusxalandi && (
                <span className="text-xs font-bold text-emerald-600">Nusxalandi ✓</span>
              )}
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
