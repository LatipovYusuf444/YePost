import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, RotateCcw, type LucideIcon } from "lucide-react";

// Yon panel menyusini tartiblash rejimi: bandni (yoki bo'lim ichidagi bandni) bosib turib sudrash, ↑/↓ tugmalari, standart holat.
// Faqat ko'rinish: tanlangan tartib saqlanadi, marshrut va ruxsatlar o'zgarmaydi.

export const ASOSIY_KONTEYNER = "__asosiy";

export type TahrirBandi = { key: string; icon: LucideIcon; bolalar?: Array<{ key: string; icon: LucideIcon }> };

/** Oddiy rejimda bosib turilgan band: tahrir rejimi ochilgach shu band sudrashda davom etadi (sichqoncha qo'yib yuborilmagan bo'lsa). */
export type BoshlangichSudrash = { konteyner: string; kalit: string; clientY: number };

type Sudrash = { konteyner: string; indeks: number; maqsad: number; dy: number; siljish: number };

type Props = {
  menyular: TahrirBandi[];
  /** Ko'rinadigan tartibda `from` → `to` (konteyner: ASOSIY_KONTEYNER yoki bo'lim kaliti). */
  onKochirish: (konteyner: string, from: number, to: number) => void;
  onStandart: () => void;
  /** Standart tartibdan farq qiladimi ("Standart holat" tugmasi faqat shunda faol). */
  ozgartirilgan: boolean;
  boshlangich: BoshlangichSudrash | null;
  /** Sichqoncha hali bosilganmi (bosib turishdan keyin qo'yib yuborilgan bo'lsa sudrash boshlanmaydi). */
  bosilganmi: () => boolean;
};

const CHEKKA = 48;

export default function MenyuTahriri({ menyular, onKochirish, onStandart, ozgartirilgan, boshlangich, bosilganmi }: Props) {
  const { t } = useTranslation("nav");
  const ildizRef = useRef<HTMLDivElement>(null);
  const konteynerlar = useRef(new Map<string, HTMLElement>());
  const [sudrash, setSudrashHolati] = useState<Sudrash | null>(null);
  // Joriy sudrash ref'da ham: tugatishda tartib aynan bir marta saqlanadi (StrictMode updater'ni ikki marta chaqirishi mumkin).
  const sudrashRef = useRef<Sudrash | null>(null);
  const setSudrash = (yangi: Sudrash | null) => {
    sudrashRef.current = yangi;
    setSudrashHolati(yangi);
  };
  const [ochiqBolimlar, setOchiqBolimlar] = useState<Record<string, boolean>>({});
  const [elon, setElon] = useState("");
  const [fokus, setFokus] = useState<{ kalit: string; konteyner: string; yon: "up" | "down" } | null>(null);
  // Sudrash o'lchovlari (render bilan bog'liq emas): boshlanish nuqtasi, bandlar joyi, oxirgi sichqoncha holati.
  const ichki = useRef<{ boshY: number; boshScroll: number; markazlar: number[]; yuqori: number[]; past: number[]; oxirgiY: number; kadr: number } | null>(null);

  const nomi = (kalit: string) => t(`menu.${kalit}`);
  const konteynerBandlari = (konteyner: string) =>
    konteyner === ASOSIY_KONTEYNER ? menyular : menyular.find((menu) => menu.key === konteyner)?.bolalar ?? [];

  function navEl() {
    return ildizRef.current?.closest<HTMLElement>(".yp-nav") ?? null;
  }

  function boshlash(konteyner: string, indeks: number, clientY: number) {
    const el = konteynerlar.current.get(konteyner);
    const bandlar = el ? Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-tartib-band]")) : [];
    if (!bandlar[indeks]) return;
    const rects = bandlar.map((band) => band.getBoundingClientRect());
    const oraliq = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 4;
    ichki.current = {
      boshY: clientY,
      boshScroll: navEl()?.scrollTop ?? 0,
      markazlar: rects.map((rect) => rect.top + rect.height / 2),
      yuqori: rects.map((rect) => rect.top),
      past: rects.map((rect) => rect.bottom),
      oxirgiY: clientY,
      kadr: 0,
    };
    setSudrash({ konteyner, indeks, maqsad: indeks, dy: 0, siljish: rects[indeks].height + oraliq });
  }

  // Bosib turishdan kelgan sudrash: tahrir ro'yxati chizilgach o'sha band ushlangan holda davom etadi.
  useLayoutEffect(() => {
    if (!boshlangich || !bosilganmi()) return;
    const indeks = konteynerBandlari(boshlangich.konteyner).findIndex((band) => band.key === boshlangich.kalit);
    if (indeks >= 0) boshlash(boshlangich.konteyner, indeks, boshlangich.clientY);
    // Faqat bir marta, ochilganda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boshlangich]);

  // Sudrash davomida: sichqoncha/barmoq butun oynada kuzatiladi, chetga yaqinlashsa menyu o'zi aylanadi.
  useEffect(() => {
    if (!sudrash) return;
    const { konteyner, indeks } = sudrash;
    const n = konteynerBandlari(konteyner).length;

    function hisobla() {
      const s = ichki.current;
      if (!s) return;
      const nav = navEl();
      const dyXom = s.oxirgiY - s.boshY + ((nav?.scrollTop ?? 0) - s.boshScroll);
      // Band o'z ro'yxati chegarasidan (yarim balandligidan ortiq) chiqib ketmaydi: shunda eng tepa/eng past o'ringa ham yetadi.
      const yarim = (s.past[indeks] - s.yuqori[indeks]) / 2;
      const dy = Math.min(Math.max(dyXom, s.yuqori[0] - s.yuqori[indeks] - yarim), s.past[n - 1] - s.past[indeks] + yarim);
      const markaz = s.markazlar[indeks] + dy;
      let maqsad = indeks;
      for (let j = indeks + 1; j < n; j += 1) if (markaz > s.markazlar[j]) maqsad = j;
      if (maqsad === indeks) for (let j = indeks - 1; j >= 0; j -= 1) if (markaz < s.markazlar[j]) maqsad = j;
      const joriy = sudrashRef.current;
      if (joriy && (joriy.dy !== dy || joriy.maqsad !== maqsad)) setSudrash({ ...joriy, dy, maqsad });
    }

    function aylantirish() {
      const s = ichki.current;
      const nav = navEl();
      if (!s || !nav) return;
      const rect = nav.getBoundingClientRect();
      const qadam = s.oxirgiY < rect.top + CHEKKA ? -8 : s.oxirgiY > rect.bottom - CHEKKA ? 8 : 0;
      if (qadam) {
        nav.scrollTop += qadam;
        hisobla();
      }
      s.kadr = window.requestAnimationFrame(aylantirish);
    }

    function harakat(event: PointerEvent) {
      if (!ichki.current) return;
      event.preventDefault();
      ichki.current.oxirgiY = event.clientY;
      hisobla();
    }

    function tugatish(saqlansin: boolean) {
      window.cancelAnimationFrame(ichki.current?.kadr ?? 0);
      ichki.current = null;
      const joriy = sudrashRef.current;
      setSudrash(null);
      if (joriy && saqlansin && joriy.maqsad !== joriy.indeks) {
        const kalit = konteynerBandlari(joriy.konteyner)[joriy.indeks]?.key;
        onKochirish(joriy.konteyner, joriy.indeks, joriy.maqsad);
        if (kalit) setElon(t("sidebar.reorder.moved", { name: nomi(kalit), pos: joriy.maqsad + 1 }));
      }
    }

    const qoyibYuborish = () => tugatish(true);
    const bekor = () => tugatish(false);
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      bekor();
    };
    if (ichki.current) ichki.current.kadr = window.requestAnimationFrame(aylantirish);
    window.addEventListener("pointermove", harakat, { passive: false });
    window.addEventListener("pointerup", qoyibYuborish);
    window.addEventListener("pointercancel", bekor);
    window.addEventListener("keydown", escape, true);
    return () => {
      window.cancelAnimationFrame(ichki.current?.kadr ?? 0);
      window.removeEventListener("pointermove", harakat);
      window.removeEventListener("pointerup", qoyibYuborish);
      window.removeEventListener("pointercancel", bekor);
      window.removeEventListener("keydown", escape, true);
    };
    // Sudrash boshlanganda bir marta ulanadi (dy/maqsad o'zgarishi qayta ulamaydi).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sudrash?.konteyner, sudrash?.indeks, sudrash === null]);

  // ↑/↓ bosilgach fokus o'sha band tugmasida qoladi (band DOM'da joyini almashtiradi).
  useEffect(() => {
    if (!fokus) return;
    const tugma = ildizRef.current?.querySelector<HTMLButtonElement>(
      `[data-tartib-konteyner="${fokus.konteyner}"] > [data-tartib-band="${fokus.kalit}"] [data-tartib-tugma="${fokus.yon}"]`
    );
    (tugma && !tugma.disabled ? tugma : tugma?.parentElement?.querySelector<HTMLButtonElement>("[data-tartib-tugma]:not(:disabled)"))?.focus();
    setFokus(null);
  }, [fokus]);

  function tugmaBilan(konteyner: string, indeks: number, yon: "up" | "down") {
    const bandlar = konteynerBandlari(konteyner);
    const maqsad = yon === "up" ? indeks - 1 : indeks + 1;
    if (maqsad < 0 || maqsad >= bandlar.length) return;
    onKochirish(konteyner, indeks, maqsad);
    setElon(t("sidebar.reorder.moved", { name: nomi(bandlar[indeks].key), pos: maqsad + 1 }));
    setFokus({ kalit: bandlar[indeks].key, konteyner, yon });
  }

  function dastakBosildi(event: ReactPointerEvent<HTMLElement>, konteyner: string, indeks: number) {
    if (event.button !== 0) return;
    // Tugmalar (↑/↓, bo'limni ochish) o'z ishini qiladi.
    const nishon = event.target as HTMLElement;
    if (nishon.closest("button:not([data-tartib-dastak])")) return;
    // Sensorli ekranda faqat dastakdan (aks holda ro'yxatni barmoq bilan aylantirib bo'lmaydi); sichqonchada butun qatordan.
    if (event.pointerType !== "mouse" && !nishon.closest("[data-tartib-dastak]")) return;
    event.preventDefault();
    event.stopPropagation();
    boshlash(konteyner, indeks, event.clientY);
  }

  function siljishUslubi(konteyner: string, indeks: number): CSSProperties | undefined {
    if (!sudrash || sudrash.konteyner !== konteyner) return undefined;
    const { indeks: bosh, maqsad, dy, siljish } = sudrash;
    if (indeks === bosh) return { transform: `translateY(${dy}px)`, transition: "none", zIndex: 2 };
    if (bosh < maqsad && indeks > bosh && indeks <= maqsad) return { transform: `translateY(${-siljish}px)` };
    if (bosh > maqsad && indeks >= maqsad && indeks < bosh) return { transform: `translateY(${siljish}px)` };
    return undefined;
  }

  function boshqaruv(konteyner: string, indeks: number, soni: number, nom: string) {
    return (
      <span className="yp-edit-ctrls">
        <button type="button" data-tartib-tugma="up" disabled={indeks === 0} onClick={() => tugmaBilan(konteyner, indeks, "up")} aria-label={t("sidebar.reorder.up", { name: nom })} className="yp-edit-btn">
          <ArrowUp size={14} strokeWidth={2.25} />
        </button>
        <button type="button" data-tartib-tugma="down" disabled={indeks === soni - 1} onClick={() => tugmaBilan(konteyner, indeks, "down")} aria-label={t("sidebar.reorder.down", { name: nom })} className="yp-edit-btn">
          <ArrowDown size={14} strokeWidth={2.25} />
        </button>
        <span data-tartib-dastak className="yp-edit-grip" aria-hidden="true">
          <GripVertical size={16} />
        </span>
      </span>
    );
  }

  const konteynerRef = (konteyner: string) => (el: HTMLElement | null) => {
    if (el) konteynerlar.current.set(konteyner, el);
    else konteynerlar.current.delete(konteyner);
  };

  return (
    <div ref={ildizRef} className="yp-edit" data-sudrash={sudrash ? "true" : undefined}>
      <div className="yp-edit-head">
        <p className="yp-edit-title">{t("sidebar.reorder.title")}</p>
        <p className="yp-edit-hint">{t("sidebar.reorder.hint")}</p>
        <button type="button" onClick={onStandart} disabled={!ozgartirilgan} className="yp-edit-reset">
          <RotateCcw size={13} strokeWidth={2.25} aria-hidden="true" />
          {t("sidebar.reorder.reset")}
        </button>
      </div>

      <div ref={konteynerRef(ASOSIY_KONTEYNER)} data-tartib-konteyner={ASOSIY_KONTEYNER} role="list" aria-label={t("sidebar.reorder.title")} className="yp-edit-list">
        {menyular.map((menu, indeks) => {
          const Icon = menu.icon;
          const nom = nomi(menu.key);
          const ochiq = Boolean(ochiqBolimlar[menu.key]);
          const sudralmoqda = sudrash?.konteyner === ASOSIY_KONTEYNER && sudrash.indeks === indeks;
          return (
            <div key={menu.key} role="listitem" data-tartib-band={menu.key} data-sudralmoqda={sudralmoqda || undefined} style={siljishUslubi(ASOSIY_KONTEYNER, indeks)} className="yp-edit-band">
              <div className="yp-edit-row" onPointerDown={(event) => dastakBosildi(event, ASOSIY_KONTEYNER, indeks)} title={t("sidebar.reorder.drag", { name: nom })}>
                <span className="yp-icon"><Icon size={18} strokeWidth={2} /></span>
                <span className="yp-label">{nom}</span>
                {menu.bolalar && menu.bolalar.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOchiqBolimlar((joriy) => ({ ...joriy, [menu.key]: !ochiq }))}
                    aria-expanded={ochiq}
                    aria-label={t("sidebar.reorder.children", { name: nom })}
                    title={t("sidebar.reorder.children", { name: nom })}
                    className="yp-edit-btn"
                  >
                    <ChevronDown size={15} className="yp-chev" data-ochiq={ochiq || undefined} />
                  </button>
                )}
                {boshqaruv(ASOSIY_KONTEYNER, indeks, menyular.length, nom)}
              </div>

              {menu.bolalar && menu.bolalar.length > 1 && ochiq && (
                <div ref={konteynerRef(menu.key)} data-tartib-konteyner={menu.key} role="list" aria-label={t("sidebar.reorder.children", { name: nom })} className="yp-edit-sub">
                  {menu.bolalar.map((bola, bolaIndeks) => {
                    const BolaIcon = bola.icon;
                    const bolaNomi = nomi(bola.key);
                    const bolaSudralmoqda = sudrash?.konteyner === menu.key && sudrash.indeks === bolaIndeks;
                    return (
                      <div key={bola.key} role="listitem" data-tartib-band={bola.key} data-sudralmoqda={bolaSudralmoqda || undefined} style={siljishUslubi(menu.key, bolaIndeks)} className="yp-edit-band">
                        <div className="yp-edit-row yp-edit-row-child" onPointerDown={(event) => dastakBosildi(event, menu.key, bolaIndeks)} title={t("sidebar.reorder.drag", { name: bolaNomi })}>
                          <BolaIcon size={15} strokeWidth={2} className="shrink-0" />
                          <span className="yp-label">{bolaNomi}</span>
                          {boshqaruv(menu.key, bolaIndeks, menu.bolalar!.length, bolaNomi)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">{elon}</p>
    </div>
  );
}
