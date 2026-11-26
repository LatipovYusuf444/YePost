import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2, RotateCcw, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QISQA_KARTALAR,
  QISQA_MATNLAR,
  STANDART_QISQA,
  teng,
  type QisqaKarta,
  type QisqaKorinish,
  type QisqaMatn,
} from "@/lib/qisqaKorinish";
import { modalUstiQatlami } from "@/Components/common/modalQatlamlari";
import { QisqaKonteksti } from "./qisqaKonteksti";

/** Sotuv tafsiloti ichidagi bo'limlarga rejim va foydalanuvchi tanlovini beradi (useQisqaKorinishi orqali o'qiladi). */
export function QisqaKorinishBeruvchi({ qisqa, korinish, children }: { qisqa: boolean; korinish?: QisqaKorinish; children: ReactNode }) {
  const qiymat = useMemo(() => ({ qisqa, korinish: korinish ?? STANDART_QISQA }), [korinish, qisqa]);
  return <QisqaKonteksti.Provider value={qiymat}>{children}</QisqaKonteksti.Provider>;
}

type Bolim = "kartalar" | "matnlar";

/** To'liq | Qisqa almashtirgichi (Sotuv tafsiloti oynasi uchun; Sotuv yaratishda shu ko'rinishdagi tugmalar ichkarida). */
export function KorinishAlmashtirgich({ korinish, onChange }: { korinish: "toliq" | "qisqa"; onChange: (yangi: "toliq" | "qisqa") => void }) {
  const { t } = useTranslation("savdo_yangi");
  return (
    <div role="radiogroup" aria-label={t("viewMode.label")} data-sotuv-korinish className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1 ring-2 ring-slate-200">
      {(["toliq", "qisqa"] as const).map((kalit) => {
        const faol = korinish === kalit;
        const Ikonka = kalit === "toliq" ? Maximize2 : Minimize2;
        return (
          <button
            key={kalit}
            type="button"
            role="radio"
            aria-checked={faol}
            data-korinish={kalit}
            title={t(kalit === "toliq" ? "viewMode.fullTitle" : "viewMode.shortTitle")}
            onClick={() => onChange(kalit)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
              faol ? "bg-[#2563EB] text-white shadow-[0_4px_10px_rgba(37,99,235,.30)]" : "text-slate-600 hover:bg-white hover:text-[#2563EB]"
            )}
          >
            <Ikonka size={14} aria-hidden />
            {t(kalit === "toliq" ? "viewMode.full" : "viewMode.short")}
          </button>
        );
      })}
    </div>
  );
}

/** "⚙ Ko'rinishni sozlash" tugmasi + paneli (faqat Qisqa rejimda ko'rsatiladi). */
export function KorinishSozlash({
  korinish,
  onSaqlash,
  joriyOyna,
}: {
  korinish: QisqaKorinish;
  onSaqlash: (yangi: QisqaKorinish) => void;
  joriyOyna: "yaratish" | "tafsilot";
}) {
  const { t } = useTranslation("savdo_yangi");
  const [ochiq, setOchiq] = useState(false);
  const tugmaRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={tugmaRef}
        type="button"
        data-korinish-sozlash
        aria-haspopup="dialog"
        aria-expanded={ochiq}
        onClick={() => setOchiq((joriy) => !joriy)}
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold ring-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
          ochiq ? "bg-[#EFF6FF] text-[#2563EB] ring-blue-300" : "bg-white text-slate-700 ring-slate-200 hover:text-[#2563EB] hover:ring-blue-200"
        )}
      >
        <Settings2 size={15} aria-hidden />
        {t("viewMode.panel.open")}
      </button>
      {ochiq && (
        <KorinishSozlashPaneli
          tugmaRef={tugmaRef}
          korinish={korinish}
          joriyOyna={joriyOyna}
          onYopish={() => setOchiq(false)}
          onSaqlash={(yangi) => {
            onSaqlash(yangi);
            setOchiq(false);
          }}
        />
      )}
    </>
  );
}

function KorinishSozlashPaneli({
  tugmaRef,
  korinish,
  joriyOyna,
  onYopish,
  onSaqlash,
}: {
  tugmaRef: RefObject<HTMLButtonElement | null>;
  korinish: QisqaKorinish;
  joriyOyna: "yaratish" | "tafsilot";
  onYopish: () => void;
  onSaqlash: (yangi: QisqaKorinish) => void;
}) {
  const { t } = useTranslation("savdo_yangi");
  // Qoralama tanlov: "Bekor qilish" — avvalgi saqlangan tanlov o'zgarmaydi; "Standartga qaytarish" faqat taklif (saqlash bilan qo'llanadi).
  const [qoralama, setQoralama] = useState<QisqaKorinish>(korinish);
  const [bolim, setBolim] = useState<Bolim>("kartalar");
  const [joy, setJoy] = useState<{ top: number; right: number; maxHeight: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Kompyuterda tugma ostida (pastga sig'masa yuqoriroq siljiydi — Saqlash/Bekor doim ekranda), telefonda pastdan chiquvchi panel.
  useLayoutEffect(() => {
    const joylash = () => {
      const tugma = tugmaRef.current;
      if (!tugma || window.innerWidth < 640) {
        setJoy(null);
        return;
      }
      const r = tugma.getBoundingClientRect();
      const balandlik = Math.min(560, window.innerHeight - 16);
      const top = Math.max(8, Math.min(r.bottom + 8, window.innerHeight - 8 - balandlik));
      setJoy({ top, right: Math.max(8, window.innerWidth - r.right), maxHeight: window.innerHeight - 8 - top });
    };
    joylash();
    window.addEventListener("resize", joylash);
    return () => window.removeEventListener("resize", joylash);
  }, [tugmaRef]);

  // Tashqariga bosilsa — bekor qilish (saqlanmagan tanlov tashlanadi).
  useEffect(() => {
    const tashqari = (event: PointerEvent) => {
      const nishon = event.target as Node;
      if (panelRef.current?.contains(nishon) || tugmaRef.current?.contains(nishon)) return;
      onYopish();
    };
    document.addEventListener("pointerdown", tashqari, true);
    return () => document.removeEventListener("pointerdown", tashqari, true);
  }, [onYopish, tugmaRef]);

  // Klaviatura: ochilganda fokus panelga o'tadi; Esc — faqat panelni yopadi (ostidagi oyna yopilmaydi), fokus tugmaga qaytadi.
  useEffect(() => {
    const tugma = tugmaRef.current;
    const qatlamniChiqarish = modalUstiQatlami();
    panelRef.current?.querySelector<HTMLElement>("[data-korinish-element]")?.focus({ preventScroll: true });
    const klaviatura = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onYopish();
    };
    window.addEventListener("keydown", klaviatura);
    return () => {
      window.removeEventListener("keydown", klaviatura);
      qatlamniChiqarish();
      // Fokus panel bilan birga yo'qolgan bo'lsa (Esc, Bekor, Saqlash) — tugmaga qaytadi; boshqa joyga bosilgan bo'lsa tegilmaydi.
      const faol = document.activeElement;
      if (tugma?.isConnected && (!faol || faol === document.body)) tugma.focus({ preventScroll: true });
    };
  }, [onYopish, tugmaRef]);

  const elementlar =
    bolim === "kartalar"
      ? QISQA_KARTALAR.map(({ kalit, qamrov }) => ({ kalit, qamrov, yoqiq: qoralama.kartalar[kalit] }))
      : QISQA_MATNLAR.map(({ kalit, qamrov }) => ({ kalit, qamrov, yoqiq: qoralama.matnlar[kalit] }));

  function almashtirish(kalit: string) {
    setQoralama((joriy) =>
      bolim === "kartalar"
        ? { ...joriy, kartalar: { ...joriy.kartalar, [kalit as QisqaKarta]: !joriy.kartalar[kalit as QisqaKarta] } }
        : { ...joriy, matnlar: { ...joriy.matnlar, [kalit as QisqaMatn]: !joriy.matnlar[kalit as QisqaMatn] } }
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t("viewMode.panel.title")}
      data-korinish-paneli
      style={joy ? { top: joy.top, right: joy.right, maxHeight: joy.maxHeight } : undefined}
      className={cn(
        "fixed z-[100005] flex flex-col overflow-hidden bg-white shadow-[0_24px_70px_rgba(15,23,42,.28)] ring-1 ring-slate-200",
        joy ? "w-[360px] rounded-2xl" : "inset-x-0 bottom-0 max-h-[80dvh] rounded-t-[24px]"
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{t("viewMode.panel.title")}</p>
          <p className="text-[11px] font-semibold leading-4 text-slate-500">{t("viewMode.panel.subtitle")}</p>
        </div>
        <button type="button" onClick={onYopish} aria-label={t("viewMode.panel.cancel")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>

      <div role="tablist" className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(["kartalar", "matnlar"] as const).map((kalit) => (
          <button
            key={kalit}
            type="button"
            role="tab"
            aria-selected={bolim === kalit}
            data-panel-bolim={kalit}
            onClick={() => setBolim(kalit)}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-extrabold transition",
              bolim === kalit ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {t(`viewMode.panel.${kalit}`)}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {elementlar.map(({ kalit, qamrov, yoqiq }) => (
          <li key={kalit}>
            <button
              type="button"
              role="switch"
              aria-checked={yoqiq}
              data-korinish-element={kalit}
              onClick={() => almashtirish(kalit)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-800">{t(`viewMode.${bolim}.${kalit}`)}</span>
                {qamrov !== "ikkalasi" && (
                  <span className={cn("block text-[11px] font-semibold", qamrov === joriyOyna ? "text-slate-400" : "text-amber-600")}>
                    {t(qamrov === "yaratish" ? "viewMode.panel.onlyCreate" : "viewMode.panel.onlyDetail")}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full transition", yoqiq ? "bg-[#2563EB]" : "bg-slate-300")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", yoqiq ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-slate-100 px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-panel-bekor onClick={onYopish} className="h-10 rounded-xl text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
            {t("viewMode.panel.cancel")}
          </button>
          <button
            type="button"
            data-panel-saqlash
            onClick={() => onSaqlash(qoralama)}
            className="h-10 rounded-xl bg-[#2563EB] text-xs font-extrabold text-white shadow-sm transition hover:bg-[#1D4ED8]"
          >
            {t("viewMode.panel.save")}
          </button>
        </div>
        <button
          type="button"
          data-panel-standart
          disabled={teng(qoralama, STANDART_QISQA)}
          onClick={() => setQoralama(STANDART_QISQA)}
          className="mx-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <RotateCcw size={13} aria-hidden />
          {t("viewMode.panel.reset")}
        </button>
      </div>
    </div>,
    document.body
  );
}
