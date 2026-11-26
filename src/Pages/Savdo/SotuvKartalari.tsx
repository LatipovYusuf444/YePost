import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, EyeOff, GripVertical, RotateCcw } from "lucide-react";
import { useSotuvKartalari } from "@/hooks/useSotuvKartalari";
import { cn } from "@/lib/utils";
import {
  kartaniJoylash,
  kartaniQaytarish,
  kartaniSiljitish,
  kartaniYashirish,
  siljiyOladimi,
  sudrashNishoni,
  YASHIRILMAYDIGAN,
  type KartaZonasi,
  type SotuvKartasi as KartaKaliti,
} from "@/lib/sotuvKartalari";

type KartaProps = {
  kalit: KartaKaliti;
  nom: string;
  // Yashirilgan bo'lsa ham ko'rsatiladi (masalan, umumiy chegirma qo'llangan — ko'rinmay qolib ketmasin).
  majburiy?: boolean;
  children?: ReactNode;
};

/** Ko'chiriladigan karta (belgi): `SotuvKartalari` ichida ishlatiladi, o'zi hech narsa chizmaydi. */
export function SotuvKartasi(props: KartaProps) {
  void props;
  return null;
}

/** Mahsulotlar jadvali (belgi): kartalar uning tepasi va ostiga joylashadi. */
export function SotuvJadvali({ children }: { children?: ReactNode }) {
  void children;
  return null;
}

type Nishon = { zona: KartaZonasi; indeks: number };
type Sudrash = { kalit: KartaKaliti; x: number; y: number; faol: boolean; pointerId: number };

/**
 * Mahsulotlar jadvali (`SotuvJadvali` bolasi) va uning tepasi/ostidagi kartalar. Foydalanuvchi kartani ⋮⋮ tutqichdan sudrab jadval tepasiga yoki
 * ostiga qo'yadi, tartiblaydi yoki tutqich menyusidan ko'chiradi/yashiradi. Joylashuv foydalanuvchi bo'yicha saqlanadi.
 */
export default function SotuvKartalari({ children, ixcham = false }: { children: ReactNode; ixcham?: boolean }) {
  const { t } = useTranslation("savdo_yangi");
  const { joylashuv, ozgartirilgan, saqlash } = useSotuvKartalari();

  const kartalar = new Map<KartaKaliti, KartaProps>();
  let jadval: ReactNode = null;
  Children.forEach(children, (bola) => {
    if (isValidElement(bola) && bola.type === SotuvJadvali) {
      jadval = (bola as ReactElement<{ children?: ReactNode }>).props.children;
      return;
    }
    if (!isValidElement(bola) || bola.type !== SotuvKartasi) return;
    const props = (bola as ReactElement<KartaProps>).props;
    // Mazmuni yo'q karta (masalan, qo'shimcha birlikli tovar yo'q — Umumiy birlik) chizilmaydi.
    if (props.children === false || props.children === null || props.children === undefined) return;
    kartalar.set(props.kalit, props);
  });

  const [menyu, setMenyu] = useState<KartaKaliti | null>(null);
  const [sudralayotgan, setSudralayotgan] = useState<KartaKaliti | null>(null);
  const [nishon, setNishon] = useState<Nishon | null>(null);
  const sudrash = useRef<Sudrash | null>(null);
  const oxirgiY = useRef(0);
  const sudraldi = useRef(false);
  const zonaRef = useRef<Record<KartaZonasi, HTMLDivElement | null>>({ tepa: null, past: null });
  const menyuRef = useRef<HTMLDivElement | null>(null);

  // Menyu tashqarisiga bosilsa yopiladi.
  useEffect(() => {
    if (!menyu) return;
    const tashqari = (event: PointerEvent) => {
      const nishonEl = event.target as Node | null;
      if (menyuRef.current?.contains(nishonEl) || (nishonEl as Element | null)?.closest?.(`[data-karta-tutqich="${menyu}"]`)) return;
      setMenyu(null);
    };
    document.addEventListener("pointerdown", tashqari, true);
    return () => document.removeEventListener("pointerdown", tashqari, true);
  }, [menyu]);

  // Sudrash paytida oyna chetiga yaqinlashganda aylantirish (karta pastdan jadval tepasiga olib chiqilganda).
  useEffect(() => {
    if (!sudralayotgan) return;
    let kadr = 0;
    const aylantiruvchi = (zonaRef.current.past ?? zonaRef.current.tepa)?.closest<HTMLElement>("[data-sotuv-aylantirish]") ?? null;
    const qadam = () => {
      const y = oxirgiY.current;
      const chegara = aylantiruvchi?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
      const tezlik = y < chegara.top + 70 ? -14 : y > chegara.bottom - 70 ? 14 : 0;
      if (tezlik) {
        if (aylantiruvchi) aylantiruvchi.scrollTop += tezlik;
        else window.scrollBy(0, tezlik);
        nishonniHisoblash(y);
      }
      kadr = requestAnimationFrame(qadam);
    };
    kadr = requestAnimationFrame(qadam);
    return () => cancelAnimationFrame(kadr);
    // nishonniHisoblash faqat ref va state setter'larni o'qiydi.
  }, [sudralayotgan]);

  function nishonniHisoblash(y: number) {
    const joriy = sudrash.current;
    if (!joriy) return;
    const zonalar = (["tepa", "past"] as const).flatMap((zona) => {
      const el = zonaRef.current[zona];
      if (!el) return [];
      const rect = el.getBoundingClientRect();
      const ortalar = [...el.querySelectorAll<HTMLElement>(":scope > [data-karta-kalit]")]
        .filter((karta) => karta.dataset.kartaKalit !== joriy.kalit)
        .map((karta) => {
          const r = karta.getBoundingClientRect();
          return r.top + r.height / 2;
        });
      return [{ zona, tepa: rect.top, past: rect.bottom, ortalar }];
    });
    setNishon(sudrashNishoni(y, zonalar));
  }

  function tutqichBosildi(kalit: KartaKaliti, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    sudraldi.current = false;
    sudrash.current = { kalit, x: event.clientX, y: event.clientY, faol: false, pointerId: event.pointerId };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ba'zi brauzerlarda (sintetik hodisa) capture bo'lmaydi — sudrash baribir ishlaydi.
    }
  }

  function tutqichSurildi(event: ReactPointerEvent<HTMLButtonElement>) {
    const joriy = sudrash.current;
    if (!joriy || joriy.pointerId !== event.pointerId) return;
    oxirgiY.current = event.clientY;
    if (!joriy.faol) {
      if (Math.hypot(event.clientX - joriy.x, event.clientY - joriy.y) < 6) return;
      joriy.faol = true;
      sudraldi.current = true;
      setMenyu(null);
      setSudralayotgan(joriy.kalit);
    }
    event.preventDefault();
    nishonniHisoblash(event.clientY);
  }

  function sudrashTugadi(event: ReactPointerEvent<HTMLButtonElement>, bekor = false) {
    const joriy = sudrash.current;
    if (!joriy || joriy.pointerId !== event.pointerId) return;
    sudrash.current = null;
    if (joriy.faol && !bekor && nishon) saqlash(kartaniJoylash(joylashuv, joriy.kalit, nishon.zona, nishon.indeks));
    setSudralayotgan(null);
    setNishon(null);
  }

  function tutqichKlaviaturasi(kalit: KartaKaliti, event: ReactKeyboardEvent<HTMLButtonElement>) {
    // Alt+↑/↓ — menyusiz siljitish.
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    saqlash(kartaniSiljitish(joylashuv, kalit, event.key === "ArrowUp" ? -1 : 1));
  }

  function amal(yangi: typeof joylashuv) {
    setMenyu(null);
    if (yangi !== joylashuv) saqlash(yangi);
  }

  // Yashirilgan, lekin majburiy (qiymati qo'llangan) karta pastda ko'rsatib turiladi.
  const majburiyYashirinlar = joylashuv.yashirin.filter((kalit) => kartalar.get(kalit)?.majburiy);
  const yashirinlar = joylashuv.yashirin.filter((kalit) => kartalar.has(kalit) && !kartalar.get(kalit)?.majburiy);

  function zona(nomi: KartaZonasi) {
    const royxat = [...joylashuv[nomi], ...(nomi === "past" ? majburiyYashirinlar : [])].filter((kalit) => kartalar.has(kalit));
    const sudralmagan = royxat.filter((kalit) => kalit !== sudralayotgan);
    const chiziqOldidan = nishon?.zona === nomi ? (sudralmagan[nishon.indeks] ?? null) : undefined;
    const chiziq = <div key="__nishon" aria-hidden className="h-1.5 rounded-full bg-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,.15)]" />;
    const bosh = sudralayotgan && royxat.length === 0;
    return (
      <div
        ref={(el) => {
          zonaRef.current[nomi] = el;
        }}
        data-karta-zona={nomi}
        className={cn(
          "space-y-3",
          nomi === "tepa" ? (royxat.length > 0 || sudralayotgan ? "mt-3" : "") : "mt-4",
          sudralayotgan && "rounded-2xl outline-2 outline-offset-4 outline-dashed outline-blue-200"
        )}
      >
        {bosh && (
          <div
            className={cn(
              "flex h-14 items-center justify-center rounded-2xl border-2 border-dashed text-xs font-bold",
              nishon?.zona === nomi ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-slate-300 text-slate-400"
            )}
          >
            {t(nomi === "tepa" ? "cardLayout.dropTop" : "cardLayout.dropBottom")}
          </div>
        )}
        {royxat.map((kalit) => {
          const karta = kartalar.get(kalit)!;
          const yashirinda = joylashuv.yashirin.includes(kalit);
          return [
            chiziqOldidan === kalit && !bosh ? chiziq : null,
            <div
              key={kalit}
              data-karta-kalit={kalit}
              className={cn("relative flex items-stretch gap-1.5 transition-opacity", sudralayotgan === kalit && "opacity-40")}
            >
              <button
                type="button"
                data-karta-tutqich={kalit}
                aria-label={t("cardLayout.handle", { nom: karta.nom })}
                aria-haspopup="menu"
                aria-expanded={menyu === kalit}
                title={t("cardLayout.handleTitle")}
                onPointerDown={(event) => tutqichBosildi(kalit, event)}
                onPointerMove={tutqichSurildi}
                onPointerUp={(event) => sudrashTugadi(event)}
                onPointerCancel={(event) => sudrashTugadi(event, true)}
                onClick={() => {
                  if (sudraldi.current) {
                    sudraldi.current = false;
                    return;
                  }
                  setMenyu((joriy) => (joriy === kalit ? null : kalit));
                }}
                onKeyDown={(event) => tutqichKlaviaturasi(kalit, event)}
                // index.css dagi qatlamsiz `button { touch-action: manipulation }` Tailwind `touch-none` dan ustun — inline beriladi,
                // aks holda planshetda barmoq bilan sudrash sahifani aylantirib yuboradi (pointercancel).
                style={{ touchAction: "none" }}
                className={cn(
                  "flex w-6 shrink-0 touch-none select-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  sudralayotgan === kalit ? "cursor-grabbing" : "cursor-grab",
                  menyu === kalit && "bg-slate-200/70 text-slate-700"
                )}
              >
                <GripVertical size={16} />
              </button>
              <div className="min-w-0 flex-1">{karta.children}</div>
              {menyu === kalit && (
                <div
                  ref={menyuRef}
                  role="menu"
                  aria-label={karta.nom}
                  className="absolute left-7 top-0 z-40 w-60 rounded-2xl bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.22)] ring-1 ring-slate-200"
                >
                  <p className="px-3 pb-1 pt-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{karta.nom}</p>
                  <MenyuBandi ikonka={ArrowUp} matn={t("cardLayout.up")} ochiq={siljiyOladimi(joylashuv, kalit, -1)} onClick={() => amal(kartaniSiljitish(joylashuv, kalit, -1))} />
                  <MenyuBandi ikonka={ArrowDown} matn={t("cardLayout.down")} ochiq={siljiyOladimi(joylashuv, kalit, 1)} onClick={() => amal(kartaniSiljitish(joylashuv, kalit, 1))} />
                  <MenyuBandi
                    ikonka={ArrowUpToLine}
                    matn={t("cardLayout.toTop")}
                    ochiq={!joylashuv.tepa.includes(kalit) || joylashuv.tepa[0] !== kalit}
                    onClick={() => amal(kartaniJoylash(joylashuv, kalit, "tepa", 0))}
                  />
                  <MenyuBandi
                    ikonka={ArrowDownToLine}
                    matn={t("cardLayout.toBottom")}
                    ochiq={joylashuv.past[joylashuv.past.length - 1] !== kalit}
                    onClick={() => amal(kartaniJoylash(joylashuv, kalit, "past", joylashuv.past.length))}
                  />
                  {!YASHIRILMAYDIGAN.includes(kalit) && !yashirinda && (
                    <MenyuBandi ikonka={EyeOff} matn={t("cardLayout.hide")} ochiq onClick={() => amal(kartaniYashirish(joylashuv, kalit))} />
                  )}
                  {ozgartirilgan && (
                    <>
                      <div className="my-1 h-px bg-slate-100" />
                      <MenyuBandi ikonka={RotateCcw} matn={t("cardLayout.reset")} ochiq onClick={() => {
                        setMenyu(null);
                        saqlash(null);
                      }} />
                    </>
                  )}
                </div>
              )}
            </div>,
          ];
        })}
        {nishon?.zona === nomi && chiziqOldidan === null && !bosh && chiziq}
      </div>
    );
  }

  // Yangi sotuvning Qisqa rejimi: faqat foydalanuvchi "Ko'rinishni sozlash"da yoqqan kartalar (chaqiruvchi o'zi beradi), To'liq
  // rejimdagi joylashuv tartibida, tutqichsiz va "yashirilgan" qatorisiz. Yashirilgan kartaning holati formada qoladi va hisobda ishlaydi.
  if (ixcham) {
    const tepa = joylashuv.tepa.filter((kalit) => kartalar.has(kalit));
    const past = [...joylashuv.past, ...joylashuv.yashirin].filter((kalit) => kartalar.has(kalit));
    const chiz = (kalit: KartaKaliti) => (
      <div key={kalit} data-karta-kalit={kalit}>
        {kartalar.get(kalit)?.children}
      </div>
    );
    return (
      <>
        {tepa.length > 0 && <div className="mt-3 space-y-3">{tepa.map(chiz)}</div>}
        {jadval}
        {past.length > 0 && <div className="mt-4 space-y-3">{past.map(chiz)}</div>}
      </>
    );
  }

  return (
    <>
      {zona("tepa")}
      {jadval}
      {zona("past")}
      {yashirinlar.length > 0 && (
        <div data-yashirin-kartalar className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span>{t("cardLayout.hidden")}</span>
          {yashirinlar.map((kalit) => (
            <button
              key={kalit}
              type="button"
              onClick={() => saqlash(kartaniQaytarish(joylashuv, kalit))}
              title={t("cardLayout.restore")}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bold text-slate-600 ring-1 ring-slate-200 transition hover:text-[#2563EB] hover:ring-blue-200"
            >
              <RotateCcw size={12} />
              {kartalar.get(kalit)?.nom}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function MenyuBandi({ ikonka: Ikonka, matn, ochiq, onClick }: { ikonka: typeof ArrowUp; matn: string; ochiq: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={!ochiq}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-700"
    >
      <Ikonka size={15} className="shrink-0" />
      {matn}
    </button>
  );
}
