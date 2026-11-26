import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { variantniKorsatish } from "@/lib/variantniKorsatish";
import { klaviaturaYonalishi } from "@/lib/royxatKlaviaturasi";

export type TanlovVarianti = { value: string; label: string };

const tugmaKlass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-left text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100";

// Native <AppSelect> o'rniga — ochilgan ro'yxati ham yumaloq (dizaynga mos) tanlov.
// qidiruv=true bo'lsa — ro'yxat tepasida qidiruv maydoni chiqadi (yozib topiladi).
// Klaviatura (savdodagi mijoz tanlovidek): ↓/↑/Enter/Bo'shliq — ochadi; ochiqda ↑/↓ — yurish, Home/End — boshi/oxiri,
// Enter — tanlash, Esc — yopish (fokus tugmaga qaytadi), Tab — yopib keyingi maydonga o'tadi.
export default function Tanlov({
  qiymat,
  variantlar,
  onChange,
  placeholder,
  qidiruv = false,
}: {
  qiymat: string;
  variantlar: TanlovVarianti[];
  onChange: (value: string) => void;
  placeholder?: string;
  qidiruv?: boolean;
}) {
  const { t } = useTranslation("common");
  const [ochiq, setOchiq] = useState(false);
  const [soz, setSoz] = useState("");
  const [faol, setFaol] = useState(-1);
  const ildizRef = useRef<HTMLDivElement>(null);
  const tugmaRef = useRef<HTMLButtonElement>(null);
  const royxatRef = useRef<HTMLDivElement>(null);
  const royxatId = useId();
  const joriy = variantlar.find((v) => v.value === qiymat) ?? null;

  const korinadigan = useMemo(() => {
    const q = soz.trim().toLowerCase();
    if (!q) return variantlar;
    return variantlar.filter((v) => v.label.toLowerCase().includes(q));
  }, [variantlar, soz]);

  // Belgilangan variant ko'rinib tursin (uzun ro'yxatda ↓ bosilganda pastga aylanadi).
  useEffect(() => {
    if (!ochiq || faol < 0) return;
    variantniKorsatish(royxatRef.current, royxatRef.current?.querySelector<HTMLElement>(`[data-tanlov-indeks="${faol}"]`));
  }, [ochiq, faol]);

  // Tashqariga bosilsa yopiladi. Butun ekranni yopuvchi ko'rinmas qatlam ishlatilmaydi: u bosishni "yutardi" — ro'yxat ochiq
  // turganda boshqa maydon/tugma (masalan "Bank") birinchi bosishda ishlamasdi. Endi bosilgan joy ham darhol ishlaydi
  // (kompyuter, planshet, telefon — pointerdown barmoq va sichqonchada bir xil).
  useEffect(() => {
    if (!ochiq) return;
    const tashqari = (event: PointerEvent) => {
      if (ildizRef.current?.contains(event.target as Node)) return;
      setOchiq(false);
      setSoz("");
      setFaol(-1);
    };
    document.addEventListener("pointerdown", tashqari, true);
    return () => document.removeEventListener("pointerdown", tashqari, true);
  }, [ochiq]);

  function ochish() {
    setSoz("");
    const tanlangan = variantlar.findIndex((v) => v.value === qiymat);
    setFaol(tanlangan >= 0 ? tanlangan : variantlar.length ? 0 : -1);
    setOchiq(true);
  }

  function yopish(fokusQaytsin = false) {
    setOchiq(false);
    setSoz("");
    setFaol(-1);
    if (fokusQaytsin) tugmaRef.current?.focus();
  }

  function tanlash(value: string) {
    onChange(value);
    yopish(true);
  }

  function klaviatura(event: KeyboardEvent<HTMLElement>) {
    if (event.nativeEvent.isComposing) return;
    if (!ochiq) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key) && event.currentTarget === tugmaRef.current) {
        event.preventDefault();
        ochish();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      yopish(true);
      return;
    }
    if (event.key === "Tab") {
      yopish();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const variant = korinadigan[faol];
      if (variant) tanlash(variant.value);
      return;
    }
    const keyingi = klaviaturaYonalishi(event.key, faol, korinadigan.length);
    if (keyingi !== null) {
      event.preventDefault();
      setFaol(keyingi);
    }
  }

  const faolId = ochiq && faol >= 0 && korinadigan[faol] ? `${royxatId}-${faol}` : undefined;

  return (
    <div ref={ildizRef} className="relative">
      <button
        ref={tugmaRef}
        type="button"
        onClick={() => (ochiq ? yopish() : ochish())}
        onKeyDown={klaviatura}
        aria-haspopup="listbox"
        aria-expanded={ochiq}
        aria-controls={ochiq ? royxatId : undefined}
        aria-activedescendant={qidiruv ? undefined : faolId}
        className={tugmaKlass}
      >
        <span className={`truncate ${joriy ? "text-slate-800" : "text-slate-400"}`}>
          {joriy?.label ?? placeholder ?? t("select.placeholder")}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${ochiq ? "rotate-180" : ""}`}
        />
      </button>

      {ochiq && (
        <>
          <div data-tanlov-royxati className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.16)]">
            {qidiruv && (
              <div className="mb-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Search size={15} className="text-slate-400" />
                <input
                  autoFocus
                  value={soz}
                  onChange={(e) => {
                    setSoz(e.target.value);
                    // Yozilganda birinchi mos variant belgilanadi — Enter darrov tanlaydi.
                    setFaol(0);
                  }}
                  onKeyDown={klaviatura}
                  role="combobox"
                  aria-expanded
                  aria-controls={royxatId}
                  aria-activedescendant={faolId}
                  aria-autocomplete="list"
                  placeholder={t("select.searchPlaceholder")}
                  className="h-9 min-w-0 flex-1 text-sm font-semibold outline-none"
                />
              </div>
            )}

            <div ref={royxatRef} id={royxatId} role="listbox" className="max-h-52 overflow-y-auto">
              {korinadigan.map((v, indeks) => {
                const tanlangan = v.value === qiymat;
                const belgilangan = indeks === faol;
                return (
                  <button
                    key={v.value}
                    id={`${royxatId}-${indeks}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={tanlangan}
                    data-tanlov-indeks={indeks}
                    data-faol={belgilangan || undefined}
                    // Sichqoncha bilan tanlashda fokus qidiruvdan ketmasin; sichqoncha harakati belgini ham siljitadi.
                    onMouseDown={(event) => event.preventDefault()}
                    onPointerMove={(event) => {
                      // Faqat sichqoncha: iPad/planshetda bosish paytida mazmun o'zgarsa Safari "click"ni yubormaydi.
                      if (event.pointerType !== "mouse") return;
                      if (!belgilangan) setFaol(indeks);
                    }}
                    onClick={() => tanlash(v.value)}
                    className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      tanlangan
                        ? "bg-orange-50 text-[#2563EB]"
                        : belgilangan
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-orange-50 hover:text-[#2563EB]"
                    } ${belgilangan ? "ring-2 ring-inset ring-blue-200" : ""}`}
                  >
                    <span className="truncate">{v.label}</span>
                    {tanlangan && <Check size={15} className="shrink-0" />}
                  </button>
                );
              })}
              {korinadigan.length === 0 && (
                <p className="px-3 py-3 text-center text-sm font-semibold text-slate-400">
                  {t("select.notFound")}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
