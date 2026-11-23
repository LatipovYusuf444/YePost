import { Boxes } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppSelect from "@/Components/ui/AppSelect";
import { cn } from "@/lib/utils";
import type { TovarBirligi } from "@/lib/kopBirlik";
import { asosiyBirlikdagiMiqdor, birlikNomi, hujjatBirliklari, qatorKoeffi, type UmumiyBirlikVarianti } from "@/lib/hujjatBirligi";

const son = (qiymat: number) => qiymat.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });

type PanelProps = {
  /** Qo'shimcha birliklar (korobka, qop...). Bo'sh bo'lsa panel ko'rinmaydi. */
  variantlar: UmumiyBirlikVarianti[];
  /** null — hali tanlanmagan; "" — asosiy birlik; aks holda unitId. */
  tanlangan: string | null;
  onTanlash: (unitId: string) => void;
  /** Ba'zi qatorlar o'z birligida qolgani haqida xabar. */
  xabar?: string;
  /** Sarlavha va izohni almashtirish (masalan inventarizatsiyada "Sanash birligi"). */
  sarlavha?: string;
  izoh?: string;
  className?: string;
};

/**
 * "Umumiy birlik": hamma qatorni (va keyin qo'shiladiganlarni) bir yo'la korobka/qop yoki asosiy birlikka o'tkazish — Yangi sotuvdagi
 * panel bilan bir xil ko'rinish. Shu birligi yo'q tovarlar o'z birligida qoladi (xabar bilan).
 */
export function UmumiyBirlikPaneli({ variantlar, tanlangan, onTanlash, xabar, sarlavha, izoh, className }: PanelProps) {
  const { t } = useTranslation("ombor_kichik");
  if (!variantlar.length) return null;
  const nom = sarlavha ?? t("hujjatBirligi.umumiy.label");
  return (
    <div data-umumiy-birlik className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-slate-50 p-3 ring-2 ring-slate-300", className)}>
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600">
        <Boxes size={16} aria-hidden className="text-blue-600" />
        {nom}
      </span>
      <div role="radiogroup" aria-label={nom} className="inline-flex flex-wrap gap-0.5 rounded-xl bg-slate-100 p-1">
        {[{ unitId: "", nom: t("hujjatBirligi.umumiy.base") }, ...variantlar].map((variant) => {
          const faol = tanlangan === variant.unitId;
          return (
            <button
              key={variant.unitId || "asosiy"}
              type="button"
              role="radio"
              aria-checked={faol}
              data-umumiy-birlik-variant={variant.unitId || "asosiy"}
              title={variant.unitId ? t("hujjatBirligi.umumiy.optionTitle", { unit: variant.nom }) : t("hujjatBirligi.umumiy.baseTitle")}
              onClick={() => onTanlash(variant.unitId)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition",
                faol ? "bg-white text-[#2563EB] shadow-sm ring-2 ring-blue-200" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              )}
            >
              {variant.nom}
            </button>
          );
        })}
      </div>
      <p className="min-w-[200px] flex-1 text-xs font-medium leading-5 text-slate-500">{izoh ?? t("hujjatBirligi.umumiy.hint")}</p>
      {xabar && (
        <p role="status" className="basis-full text-xs font-bold text-amber-600">
          {xabar}
        </p>
      )}
    </div>
  );
}

type TanlovProps = {
  /** Tovarning barcha birliklari (asosiy bilan). Yuklanmagan bo'lsa undefined. */
  birliklar: readonly TovarBirligi[] | undefined;
  /** "" — asosiy birlik. */
  value: string;
  onChange: (birlikId: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Saqlangan qator birligi nomi (birliklar yuklanguncha ko'rsatiladi). */
  zaxiraNomi?: string;
};

/** Qator birligi: tovarda bir nechta birlik bo'lsa tanlov ("korobka · 12 kg"), aks holda asosiy birlik nomi yozuv sifatida. */
export function QatorBirligiTanlovi({ birliklar, value, onChange, disabled, ariaLabel, className, zaxiraNomi }: TanlovProps) {
  const { t } = useTranslation("ombor_kichik");
  const royxat = hujjatBirliklari(birliklar);
  const asosiy = birliklar?.find((birlik) => birlik.asosiy);
  if (!royxat.length) {
    // Mahsulot tanlanmagan (yoki birliklari hali yuklanmagan) qatorda — "—".
    const nom = value && zaxiraNomi ? zaxiraNomi : birliklar ? birlikNomi(asosiy) || t("hujjatBirligi.baseFallback") : "—";
    return (
      <span data-qator-birligi="yagona" className={cn("flex h-12 items-center rounded-2xl border border-slate-100 bg-slate-50 px-3 text-sm font-bold text-slate-500", className)}>
        {nom}
      </span>
    );
  }
  // Asosiy birlik "" bilan tanlanadi (so'rovga unitId ketmaydi).
  const joriy = royxat.some((birlik) => !birlik.asosiy && birlik.unitId === value) ? value : "";
  return (
    <AppSelect
      value={joriy}
      disabled={disabled}
      aria-label={ariaLabel ?? t("hujjatBirligi.label")}
      data-qator-birligi="tanlov"
      onChange={(event) => onChange(event.target.value)}
      className={cn("h-12 w-full min-w-0 rounded-2xl text-sm font-semibold text-slate-700 [&>button]:min-w-0 [&>button]:rounded-2xl [&>button]:px-3", className)}
    >
      {royxat.map((birlik) =>
        birlik.asosiy ? (
          <option key={birlik.unitId} value="">{birlikNomi(birlik)}</option>
        ) : (
          <option key={birlik.unitId} value={birlik.unitId}>
            {t("hujjatBirligi.optionLabel", { unit: birlikNomi(birlik), factor: son(birlik.koeff), base: birlikNomi(asosiy) })}
          </option>
        )
      )}
    </AppSelect>
  );
}

type EkvivalentProps = {
  birliklar: readonly TovarBirligi[] | undefined;
  birlikId: string;
  miqdor: number;
  zaxiraKoeff?: number;
  className?: string;
};

/** Qo'shimcha birlikda kiritilgan miqdorning asosiy birlikdagi qiymati: "= 24 kg". Asosiy birlikda — hech narsa. */
export function AsosiyEkvivalent({ birliklar, birlikId, miqdor, zaxiraKoeff, className }: EkvivalentProps) {
  const { t } = useTranslation("ombor_kichik");
  const koeff = qatorKoeffi(birliklar, birlikId, zaxiraKoeff);
  if (!birlikId || koeff === 1 || !(miqdor > 0)) return null;
  const asosiy = birlikNomi(birliklar?.find((birlik) => birlik.asosiy)) || t("hujjatBirligi.baseFallback");
  return (
    <span data-asosiy-ekvivalent className={cn("block text-[11px] font-semibold text-slate-400", className)}>
      {t("hujjatBirligi.baseEquivalent", { qty: son(asosiyBirlikdagiMiqdor(miqdor, koeff)), unit: asosiy })}
    </span>
  );
}

/** Ko'rish oynalari uchun: "2 korobka" + ostida "= 24 kg" (birlikda kiritilgan qator), aks holda oddiy son. */
export function BirlikliMiqdor({ miqdor, birlikNomi: nom, asosiyMiqdor, asosiyNomi }: { miqdor: number; birlikNomi?: string | null; asosiyMiqdor: number; asosiyNomi?: string | null }) {
  if (!nom) return <>{son(asosiyMiqdor)}{asosiyNomi ? ` ${asosiyNomi}` : ""}</>;
  return (
    <>
      {son(miqdor)} {nom}
      <span className="block text-[11px] font-semibold text-slate-400">= {son(asosiyMiqdor)}{asosiyNomi ? ` ${asosiyNomi}` : ""}</span>
    </>
  );
}
