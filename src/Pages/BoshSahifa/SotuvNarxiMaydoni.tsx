import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import { yaxlitHalfUp } from "@/lib/yaxlitlash";
import { savatchaChegirma, savatchaSotuvNarxi, savatchaUstama, type CartItem } from "@/store/posStore";

// Maydonda narx 2 xonagacha ko'rinadi (3.5, 11 728.39); savatchadagi narxning o'zi yaxlitlanmaydi.
const maydonQiymati = (narx: number) => String(yaxlitHalfUp(narx, 2));

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
  const [matn, setMatn] = useState(maydonQiymati(joriy));
  const [fokus, setFokus] = useState(false);

  // Narx turi (chakana/ulgurji) yoki katalog narxi tashqaridan o'zgarsa, maydon ham yangilanadi.
  useEffect(() => {
    if (!fokus) setMatn(maydonQiymati(joriy));
  }, [joriy, fokus]);

  const kiritilgan = Number(matn) || 0;
  const chegirma = savatchaChegirma(item);
  const ustama = savatchaUstama(item);
  const birDonaChegirma = item.narx - joriy;
  const birDonaUstama = joriy - item.narx;

  function ozgardi(qiymat: string) {
    // SummaMaydoni toza raqam matnini beradi (guruhlarsiz, 2 xonagacha kasr: "3.5"); 12 butun xonadan oshmaydi.
    const [butun = "", kasr] = qiymat.split(".");
    const toza = kasr !== undefined ? `${butun.slice(0, 12)}.${kasr}` : butun.slice(0, 12);
    setMatn(toza);
    const narx = Number(toza);
    // 0 dan katta har qanday narx saqlanadi: katalog narxidan past (chegirma) ham, baland (ustama) ham.
    // Maydonda ko'ringan katalog narxi (2 xonagacha) qayta yozilsa — bu katalog narxining o'zi, chegirma emas.
    if (toza && narx > 0) onChange(narx === item.narx || narx === yaxlitHalfUp(item.narx, 2) ? undefined : narx);
  }

  if (jadval) {
    return (
      <SummaMaydoni
        aria-label={t("cart.salePriceLabel")}
        value={matn}
        onFocus={(event) => {
          setFokus(true);
          event.currentTarget.select();
        }}
        onBlur={() => {
          setFokus(false);
          if (!matn || kiritilgan <= 0) setMatn(maydonQiymati(joriy));
        }}
        onChange={ozgardi}
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
          <SummaMaydoni
            value={matn}
            onFocus={(event) => {
              setFokus(true);
              event.currentTarget.select();
            }}
            onBlur={() => {
              setFokus(false);
              // Bo'sh yoki noto'g'ri qiymat qoldirilsa, oxirgi to'g'ri narx tiklanadi.
              if (!matn || kiritilgan <= 0) setMatn(maydonQiymati(joriy));
            }}
            onChange={ozgardi}
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
