import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { savatchaChegirma, savatchaSotuvNarxi, savatchaUstama, type CartItem } from "@/store/posStore";

// Savatchadagi mahsulot narxi: kassir haqiqiy sotuv narxini kiritadi, katalog narxidan farqi avtomatik hisoblanadi:
// past bo'lsa chegirma (18 000 → 17 800: 200 so'm chegirma), baland bo'lsa ustama (13 500 → 19 000: 5 500 so'm ustama).
export default function SotuvNarxiMaydoni({
  item,
  onChange,
  formatSumma,
}: {
  item: CartItem;
  // undefined — katalog narxiga qaytarish.
  onChange: (narx: number | undefined) => void;
  formatSumma: (value: number) => string;
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

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B]">
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
            className={`h-8 w-28 rounded-lg bg-white px-2 text-right text-xs font-bold tabular-nums text-[#0F172A] outline-none ring-1 transition focus:ring-2 ${
              ustama > 0
                ? "ring-amber-300 focus:ring-amber-400"
                : chegirma > 0
                  ? "ring-emerald-300 focus:ring-emerald-400"
                  : "ring-gold-200 focus:ring-gold-400"
            }`}
          />
        </label>
        {(chegirma > 0 || ustama > 0) && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title={t("cart.resetPrice")}
            aria-label={t("cart.resetPrice")}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#94A3B8] shadow-sm transition hover:text-gold-600"
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
