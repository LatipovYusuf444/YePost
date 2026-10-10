import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MahsulotModifikatsiyasi } from "@/types/ombor";
import { modifikatsiyaQidiruvi, modificationNomi } from "./omborYordamchilari";

export type MahsulotVarianti = {
  // Tanlanadigan qiymat (modificationId).
  id: string;
  modification?: MahsulotModifikatsiyasi;
  // Masalan, boshqa qatorda allaqachon tanlangan: ko'rinadi, lekin tanlab bo'lmaydi.
  disabled?: boolean;
};

type Props = {
  value: string;
  variantlar: MahsulotVarianti[];
  onChange: (id: string) => void;
  placeholder: string;
  // Matn maydonining sinflari (qatordagi boshqa maydonlar bilan bir xil ko'rinish uchun).
  className: string;
  // Tanlangan mahsulot `variantlar`da bo'lmasa, shu nom ko'rsatiladi.
  tanlanganNomi?: string;
  disabled?: boolean;
  // Har bir musbat o'zgarish maydonga fokus beradi va ro'yxatni ochadi (masalan, yangi qator qo'shilganda).
  ochishSorovi?: number;
  ariaLabel?: string;
};

// Mahsulot tanlash (AppSelect o'rniga): yozib qidiriladi, ↑/↓ bilan yuriladi, Enter — belgilangan mahsulotni tanlaydi,
// Escape — ro'yxatni yopadi. Aniq mos kelgan (shtrix-kod/artikul, keyin nom) mahsulot ro'yxat boshiga chiqadi.
export default function MahsulotTanlov({
  value,
  variantlar,
  onChange,
  placeholder,
  className,
  tanlanganNomi,
  disabled = false,
  ochishSorovi = 0,
  ariaLabel,
}: Props) {
  const { t } = useTranslation("ombor_kichik");
  const royxatId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menyuRef = useRef<HTMLDivElement | null>(null);
  const [ochiq, setOchiq] = useState(false);
  // null — yozilmayapti (tanlangan mahsulot nomi ko'rinadi), aks holda qidiruv matni.
  const [qidiruv, setQidiruv] = useState<string | null>(null);
  const [faol, setFaol] = useState(-1);
  const [joy, setJoy] = useState({ top: 0, left: 0, width: 0, maxHeight: 256 });

  const tanlangan = variantlar.find((variant) => variant.id === value);
  const tanlanganMatn = value ? (tanlangan ? modificationNomi(tanlangan.modification) : (tanlanganNomi ?? "")) : "";
  const moslari = useMemo(
    () => modifikatsiyaQidiruvi(variantlar, qidiruv ?? "", (variant) => variant.modification),
    [variantlar, qidiruv]
  );

  const joyniYangilash = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const oraliq = 6;
    const chekka = 10;
    const kerakli = 256;
    const kenglik = Math.min(Math.max(rect.width, 280), window.innerWidth - chekka * 2);
    const pastda = window.innerHeight - rect.bottom - oraliq - chekka;
    const tepada = rect.top - oraliq - chekka;
    const yuqoriga = pastda < Math.min(kerakli, 150) && tepada > pastda;
    const maxHeight = Math.max(80, Math.min(kerakli, yuqoriga ? tepada : pastda));
    setJoy({
      left: Math.min(Math.max(chekka, rect.left), window.innerWidth - kenglik - chekka),
      top: yuqoriga ? Math.max(chekka, rect.top - oraliq - maxHeight) : rect.bottom + oraliq,
      width: kenglik,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!ochiq) return;
    joyniYangilash();
    window.addEventListener("resize", joyniYangilash);
    window.addEventListener("scroll", joyniYangilash, true);
    return () => {
      window.removeEventListener("resize", joyniYangilash);
      window.removeEventListener("scroll", joyniYangilash, true);
    };
  }, [ochiq, joyniYangilash]);

  useEffect(() => {
    if (!ochiq) return;
    function tashqarigaBosish(event: MouseEvent) {
      const nishon = event.target as Node;
      if (!inputRef.current?.contains(nishon) && !menyuRef.current?.contains(nishon)) {
        setOchiq(false);
        setQidiruv(null);
      }
    }
    document.addEventListener("mousedown", tashqarigaBosish);
    return () => document.removeEventListener("mousedown", tashqarigaBosish);
  }, [ochiq]);

  useEffect(() => {
    if (!ochishSorovi) return;
    inputRef.current?.focus();
    setOchiq(true);
    setQidiruv(null);
    setFaol(-1);
  }, [ochishSorovi]);

  function yopish() {
    setOchiq(false);
    setQidiruv(null);
    setFaol(-1);
  }

  function tanlash(variant: MahsulotVarianti) {
    if (variant.disabled) return;
    onChange(variant.id);
    yopish();
  }

  function klavish(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!ochiq) {
        setOchiq(true);
        return;
      }
      if (moslari.length === 0) return;
      const keyingi =
        event.key === "ArrowDown"
          ? (faol + 1) % moslari.length
          : faol <= 0
            ? moslari.length - 1
            : faol - 1;
      setFaol(keyingi);
      window.requestAnimationFrame(() => {
        document.getElementById(`${royxatId}-variant-${keyingi}`)?.scrollIntoView({ block: "nearest" });
      });
    } else if (event.key === "Enter") {
      // Enter faqat belgilangan mahsulotni tanlaydi; hech narsa belgilanmagan bo'lsa hech narsa qilmaydi.
      event.preventDefault();
      event.stopPropagation();
      if (!ochiq) {
        if ((qidiruv ?? "").trim()) {
          setOchiq(true);
          setFaol(0);
        }
        return;
      }
      const belgilangan = moslari[faol];
      if (belgilangan) tanlash(belgilangan);
    } else if (event.key === "Escape" && ochiq) {
      // Faqat ro'yxat yopiladi (oyna yopilmasligi uchun hodisa to'xtatiladi).
      event.preventDefault();
      event.stopPropagation();
      yopish();
    } else if (event.key === "Tab") {
      yopish();
    }
  }

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
        value={qidiruv ?? tanlanganMatn}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        role="combobox"
        aria-expanded={ochiq}
        aria-controls={royxatId}
        aria-autocomplete="list"
        aria-activedescendant={ochiq && faol >= 0 ? `${royxatId}-variant-${faol}` : undefined}
        onChange={(event) => {
          setQidiruv(event.target.value);
          setFaol(event.target.value.trim() ? 0 : -1);
          setOchiq(true);
        }}
        onFocus={(event) => {
          setOchiq(true);
          setQidiruv(null);
          event.currentTarget.select();
        }}
        onKeyDown={klavish}
        className={`${className} pr-9`}
      />
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${ochiq ? "rotate-180 text-orange-500" : ""}`}
      />
      {ochiq &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menyuRef}
            id={royxatId}
            role="listbox"
            style={{ position: "fixed", top: joy.top, left: joy.left, width: joy.width, maxHeight: joy.maxHeight }}
            className="z-[100000] overflow-y-auto rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.18)]"
          >
            {moslari.map((variant, index) => {
              const tanlanganmi = variant.id === value;
              const klavishFaol = index === faol && !tanlanganmi;
              return (
                <button
                  key={variant.id}
                  id={`${royxatId}-variant-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === faol}
                  tabIndex={-1}
                  disabled={variant.disabled}
                  // Sichqoncha bosilganda maydon fokusi yo'qolmasin.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => {
                    if (index !== faol) setFaol(index);
                  }}
                  onClick={() => tanlash(variant)}
                  className={`flex min-h-9 w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    tanlanganmi
                      ? "bg-orange-500 text-white"
                      : klavishFaol
                        ? "bg-orange-50 text-orange-600"
                        : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words">{modificationNomi(variant.modification)}</span>
                  {variant.modification?.barcode && (
                    <span className={`shrink-0 text-xs font-semibold ${tanlanganmi ? "text-white/80" : "text-slate-400"}`}>
                      {variant.modification.barcode}
                    </span>
                  )}
                </button>
              );
            })}
            {moslari.length === 0 && (
              <p role="status" className="px-3 py-2.5 text-xs font-semibold text-slate-400">
                {t("mahsulotTanlov.empty")}
              </p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
