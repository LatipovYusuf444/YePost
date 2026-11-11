import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { Check, ChevronDown, LayoutGrid, Search, SearchX, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { kategoriyalarniFiltrlash } from "@/lib/kategoriyaQidiruvi";
import type { Kategoriya } from "@/types/catalog";

// Header qidiruvidagi kategoriya tugmasi va menyusi. Menyuning eng tepasida qidiruv maydoni: yozilgan sari ro'yxat filtrlanadi
// (katta-kichik harf, kirill/lotin farq qilmaydi), ↑/↓ bilan tanlanadi, Enter tasdiqlaydi, Esc yopadi. "Barcha kategoriyalar" doim birinchi.
//
// Kursor (sichqoncha) bilan: tugmaga kelganda menyu ochiladi, tugma/menyudan chiqqach biroz kutib yopiladi (qidiruvga hali hech narsa
// yozilmagan bo'lsa). Bosish yoki klaviatura bilan ochilganda kursor darhol qidiruv maydoniga tushadi. Kursor bilan ochilganda mahsulot
// qidiruvida yozish/skanerlash davom etayotgan bo'lsa fokus olinmaydi (skaner kodi kategoriya qidiruviga tushib qolmasin) — kursor
// menyuga kirishi bilan fokus qidiruv maydoniga o'tadi.

// Kursor tugmaga kelgach shu vaqtdan keyin ochiladi (tasodifiy o'tishda chaqnamasligi uchun), chiqqach shu vaqtdan keyin yopiladi.
const HOVER_OCHISH_KECHIKISHI = 80;
const HOVER_YOPISH_KECHIKISHI = 220;

type Props = {
  kategoriyalar: readonly Kategoriya[];
  kategoriyaId: string;
  onTanlash: (id: string) => void;
  /** Mahsulot qidiruvi maydoni: menyu kursor bilan ochilganda u fokusda bo'lsa fokus o'sha yerda qoladi. */
  qidiruvInputRef: RefObject<HTMLInputElement | null>;
};

type Variant = { id: string; name: string };

export default function KategoriyaMenyusi({ kategoriyalar, kategoriyaId, onTanlash, qidiruvInputRef }: Props) {
  const { t } = useTranslation("topbar");
  const royxatId = useId();
  const [ochiq, setOchiq] = useState(false);
  const [soz, setSoz] = useState("");
  const [faol, setFaol] = useState(0);
  const sozRef = useRef<HTMLInputElement | null>(null);
  const royxatRef = useRef<HTMLDivElement | null>(null);
  const tugmaRef = useRef<HTMLButtonElement | null>(null);
  const hoverBilanOchilgan = useRef(false);
  // Kursor tugmaga kelganda mahsulot qidiruvi fokusda edimi (shunda menyu ochilganda fokus olinmaydi).
  const inputFokusdaEdi = useRef(false);
  const taymer = useRef<number | null>(null);

  const tanlangan = kategoriyalar.find((kategoriya) => kategoriya.id === kategoriyaId);
  // "Barcha kategoriyalar" doim birinchi, qolganlari qidiruv bo'yicha filtrlangan.
  const variantlar = useMemo<Variant[]>(
    () => [{ id: "", name: t("search.allCategories") }, ...kategoriyalarniFiltrlash(kategoriyalar, soz)],
    [kategoriyalar, soz, t]
  );
  const topilmadi = soz.trim() !== "" && variantlar.length === 1;

  useEffect(() => () => {
    if (taymer.current) window.clearTimeout(taymer.current);
  }, []);

  // Faol qator ko'rinib turishi uchun ro'yxat suriladi (↑/↓ bilan uzun ro'yxatda pastga tushganda).
  useEffect(() => {
    if (!ochiq) return;
    royxatRef.current?.querySelector<HTMLElement>(`[data-variant="${faol}"]`)?.scrollIntoView({ block: "nearest" });
  }, [faol, ochiq]);

  function taymerniTozalash() {
    if (taymer.current) window.clearTimeout(taymer.current);
    taymer.current = null;
  }

  function holat(ochildi: boolean) {
    taymerniTozalash();
    if (ochildi) {
      setSoz("");
      // Ochilganda tanlangan kategoriya faol bo'ladi (Enter uni qayta tanlaydi, ↓ keyingisiga o'tadi).
      setFaol(Math.max(kategoriyalar.findIndex((kategoriya) => kategoriya.id === kategoriyaId) + 1, 0));
    } else {
      hoverBilanOchilgan.current = false;
    }
    setOchiq(ochildi);
  }

  function tanlash(id: string) {
    holat(false);
    onTanlash(id);
  }

  function hoverOchish(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    taymerniTozalash();
    if (ochiq) return;
    inputFokusdaEdi.current = document.activeElement === qidiruvInputRef.current;
    taymer.current = window.setTimeout(() => {
      hoverBilanOchilgan.current = true;
      holat(true);
    }, HOVER_OCHISH_KECHIKISHI);
  }

  function hoverYopish(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    taymerniTozalash();
    // Qidiruvga yozilgan bo'lsa (foydalanuvchi menyu bilan ishlayapti) kursor chiqib ketsa ham yopilmaydi.
    if (!ochiq || !hoverBilanOchilgan.current || soz.trim()) return;
    taymer.current = window.setTimeout(() => holat(false), HOVER_YOPISH_KECHIKISHI);
  }

  function sozOzgardi(qiymat: string) {
    setSoz(qiymat);
    // Yozuv bo'lsa birinchi topilgan kategoriya faol (Enter darrov uni tanlaydi), bo'lmasa "Barcha kategoriyalar".
    setFaol(qiymat.trim() && kategoriyalarniFiltrlash(kategoriyalar, qiymat).length > 0 ? 1 : 0);
  }

  function klavish(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const qadam = event.key === "ArrowDown" ? 1 : -1;
      setFaol((joriy) => (joriy + qadam + variantlar.length) % variantlar.length);
    } else if (event.key === "Home" && event.ctrlKey) {
      event.preventDefault();
      setFaol(0);
    } else if (event.key === "End" && event.ctrlKey) {
      event.preventDefault();
      setFaol(variantlar.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const variant = variantlar[faol];
      if (variant) tanlash(variant.id);
    }
    // Esc — Radix Popover o'zi yopadi.
  }

  return (
    // modal={false}: menyu ochiq turganda sahifa bloklanmaydi, mahsulot qidiruvi ishlayveradi.
    <Popover open={ochiq} onOpenChange={holat} modal={false}>
      <PopoverTrigger asChild>
        <button
          ref={tugmaRef}
          type="button"
          onPointerEnter={hoverOchish}
          onPointerLeave={hoverYopish}
          // Kursor bilan ochilgan menyuda tugmani bosish uni yopmaydi — foydalanuvchi menyu bilan ishlamoqchi: fokus qidiruvga o'tadi.
          onClick={(event) => {
            if (ochiq && hoverBilanOchilgan.current) {
              event.preventDefault();
              hoverBilanOchilgan.current = false;
              sozRef.current?.focus();
            }
          }}
          aria-label={t("search.categoryAria")}
          title={t("search.categoryAria")}
          className="inline-flex min-w-0 items-center gap-2 px-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 sm:px-4"
        >
          <LayoutGrid size={18} className="shrink-0" aria-hidden />
          <span className={`max-w-20 truncate sm:max-w-52 ${tanlangan ? "" : "hidden sm:inline"}`}>
            {tanlangan?.name ?? t("search.category")}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 opacity-80 transition-transform duration-300 ${ochiq ? "rotate-180" : ""} ${tanlangan ? "hidden sm:block" : ""}`}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-kategoriya-menyusi=""
        align="start"
        sideOffset={10}
        collisionPadding={12}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          taymerniTozalash();
          // Kursor menyuga kirdi — foydalanuvchi kategoriya tanlamoqchi: kursor qidiruv maydoniga tushadi.
          if (document.activeElement !== sozRef.current) sozRef.current?.focus({ preventScroll: true });
        }}
        onPointerLeave={hoverYopish}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          // Kursor bilan ochilgan va mahsulot qidiruvida yozilayotgan bo'lsa fokus o'sha yerda qoladi; aks holda — qidiruv maydoniga.
          if (!(hoverBilanOchilgan.current && inputFokusdaEdi.current)) sozRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          // Menyu ichidagi fokus (qidiruv maydoni) yo'qolmasin: skaner uchun mahsulot qidiruviga qaytadi.
          if (!document.activeElement || document.activeElement === document.body) qidiruvInputRef.current?.focus({ preventScroll: true });
        }}
        // Kursor bilan ochilgan menyuda tugmani bosish "tashqarida bosish" deb hisoblanmaydi (yuqoridagi onClick boshqaradi).
        onInteractOutside={(event) => {
          if (tugmaRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        // Kenglik: 20rem, tor ekranda ekrandan oshmaydi. Balandlik: ekrandagi bo'sh joy (Radix hisoblaydi), ko'pi bilan 420 px.
        // Radix animatsiyalari data-state orqali: ochilish 300 ms yuqoridan sekin tushadi, yopilish tezroq (150 ms).
        className="z-[130] flex max-h-[min(420px,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-0 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,.28)] ring-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-300 data-[state=open]:ease-out data-[side=bottom]:data-[state=open]:slide-in-from-top-3 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=closed]:ease-in motion-reduce:animate-none"
      >
        <div className="shrink-0 border-b border-slate-100 p-2">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-gold-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-gold-100">
            <Search size={16} className="shrink-0 text-slate-400" aria-hidden />
            <input
              ref={sozRef}
              value={soz}
              onChange={(event) => sozOzgardi(event.target.value)}
              onKeyDown={klavish}
              placeholder={t("search.categorySearch")}
              aria-label={t("search.categorySearch")}
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded
              aria-controls={royxatId}
              aria-autocomplete="list"
              aria-activedescendant={`${royxatId}-${faol}`}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400"
            />
            {soz && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  sozOzgardi("");
                  sozRef.current?.focus();
                }}
                aria-label={t("posModal.clearSearchAria")}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div
          ref={royxatRef}
          id={royxatId}
          role="listbox"
          aria-label={t("search.categoryAria")}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
        >
          {variantlar.map((variant, index) => {
            const belgilangan = variant.id === kategoriyaId;
            const hammasi = index === 0;
            return (
              <div
                key={variant.id || "__hammasi__"}
                id={`${royxatId}-${index}`}
                data-variant={index}
                role="option"
                aria-selected={index === faol}
                // Bosilganda fokus qidiruv maydonida qoladi (klik tanlaydi va menyuni yopadi).
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  if (index !== faol) setFaol(index);
                }}
                onClick={() => tanlash(variant.id)}
                className={`flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  index === faol ? "bg-slate-100" : belgilangan ? "bg-gold-50" : ""
                } ${belgilangan ? "text-gold-700" : index === faol ? "text-slate-900" : "text-slate-700"} ${hammasi && variantlar.length > 1 ? "mb-1" : ""}`}
              >
                <span className="min-w-0 truncate">{variant.name}</span>
                {belgilangan && <Check size={16} className="shrink-0 text-gold-600" aria-hidden />}
              </div>
            );
          })}
          {topilmadi && (
            <p role="status" className="flex flex-col items-center gap-1.5 px-3 py-6 text-center text-sm font-semibold text-slate-400">
              <SearchX size={22} className="text-slate-300" aria-hidden />
              {t("search.categoryNotFound")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
