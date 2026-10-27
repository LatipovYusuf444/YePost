import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { savatchaChegirma, savatchaSotuvNarxi, savatchaUstama, type CartItem } from "@/store/posStore";

// Savatchadagi mahsulot narxi: kassir haqiqiy sotuv narxini kiritadi, katalog narxidan farqi avtomatik hisoblanadi:
// past bo'lsa chegirma (18 000 → 17 800: 200 so'm chegirma), baland bo'lsa ustama (13 500 → 19 000: 5 500 so'm ustama).
// `jadval` — savatcha jadvali ustuni uchun: faqat maydonning o'zi (yorliq va izohlarsiz, chegirma/ustama alohida ustunda ko'rinadi).
export default function SotuvNarxiMaydoni({
  item,
  onChange,
  formatSumma,
  jadval = false,
  className,
}: {
  item: CartItem;
  // undefined — katalog narxiga qaytarish.
  onChange: (narx: number | undefined) => void;
  formatSumma: (value: number) => string;
  jadval?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("bosh_sahifa");
  const joriy = savatchaSotuvNarxi(item);
  const [matn, setMatn] = useState(String(joriy));
  const [fokus, setFokus] = useState(false);

  // Narx turi (chakana/ulgurji) yoki katalog narxi tashqaridan o'zgarsa, maydon ham yangilanadi.
  useEffect(() => {
    if (!fokus) setMatn(String(joriy));
  }, [joriy, fokus]);

  const kiritilgan = Number(matn) || 0;
  const chegirma = savatchaChegirma(item);
  const ustama = savatchaUstama(item);
  const birDonaChegirma = item.narx - joriy;
  const birDonaUstama = joriy - item.narx;

  function ozgardi(qiymat: string) {
    // Faqat raqamlar; 12 xonadan oshmaydi (tasodifiy juda uzun qiymat narxni buzmasin).
    const raqamlar = qiymat.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
    setMatn(raqamlar);
    const narx = Number(raqamlar);
    // 0 dan katta har qanday narx saqlanadi: katalog narxidan past (chegirma) ham, baland (ustama) ham.
    if (raqamlar && narx > 0) onChange(narx === item.narx ? undefined : narx);
  }

  if (jadval) {
    return (
      <input
        type="text"
        inputMode="numeric"
        aria-label={t("cart.salePriceLabel")}
        value={matn ? Number(matn).toLocaleString("uz-UZ") : ""}
        onFocus={(event) => {
          setFokus(true);
          event.currentTarget.select();
        }}
        onBlur={() => {
          setFokus(false);
          if (!matn || kiritilgan <= 0) setMatn(String(joriy));
        }}
        onChange={(event) => ozgardi(event.target.value)}
        className={`${className ?? ""} ${
          ustama > 0
            ? "!border-amber-300 !text-amber-700 focus:!border-amber-500 focus:!ring-amber-100"
            : chegirma > 0
              ? "!border-emerald-300 !text-emerald-700 focus:!border-emerald-500 focus:!ring-emerald-200"
              : ""
        }`}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="relative">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-500">
          {t("cart.salePriceLabel")}
          <input
            type="text"
            inputMode="numeric"
            value={matn ? Number(matn).toLocaleString("uz-UZ") : ""}
            onFocus={(event) => {
              setFokus(true);
              event.currentTarget.select();
            }}
            onBlur={() => {
              setFokus(false);
              // Bo'sh yoki noto'g'ri qiymat qoldirilsa, oxirgi to'g'ri narx tiklanadi.
              if (!matn || kiritilgan <= 0) setMatn(String(joriy));
            }}
            onChange={(event) => ozgardi(event.target.value)}
            className={`h-10 w-full min-w-0 rounded-lg border bg-white pl-2.5 text-right text-sm font-semibold tabular-nums text-[#0F172A] outline-none transition focus:ring-2 ${chegirma > 0 || ustama > 0 ? "pr-9" : "pr-2.5"} ${
              ustama > 0
                ? "border-amber-300 focus:border-amber-400 focus:ring-amber-100"
                : chegirma > 0
                  ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                  : "border-gold-100 focus:border-gold-400 focus:ring-gold-100"
            }`}
          />
        </label>
        {(chegirma > 0 || ustama > 0) && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title={t("cart.resetPrice")}
            aria-label={t("cart.resetPrice")}
            className="absolute bottom-1.5 right-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-gold-50 hover:text-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
          >
            <Undo2 size={13} aria-hidden />
          </button>
        )}
      </div>

      {ustama > 0 && (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold">
          <span className="text-[#94A3B8] line-through">{formatSumma(item.narx)}</span>
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-100">
            {t("cart.markup", { summa: formatSumma(ustama) })}
          </span>
          {item.soni > 1 && (
            <span className="text-[#94A3B8]">
              {t("cart.autoDiscountEach", { bir: formatSumma(birDonaUstama), soni: item.soni })}
            </span>
          )}
        </p>
      )}

      {chegirma > 0 && (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold">
          <span className="text-[#94A3B8] line-through">{formatSumma(item.narx)}</span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
            {t("cart.autoDiscount", { summa: formatSumma(chegirma) })}
          </span>
          {item.soni > 1 && (
            <span className="text-[#94A3B8]">
              {t("cart.autoDiscountEach", { bir: formatSumma(birDonaChegirma), soni: item.soni })}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
