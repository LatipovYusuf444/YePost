import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { SotuvNarxTuri } from "@/types/savdo";

export default function NarxTuriTanlovi({
  qiymat,
  onChange,
  holat,
  kichik = false,
  disabled = false,
}: {
  qiymat: SotuvNarxTuri | null;
  onChange: (tur: SotuvNarxTuri) => void;
  holat: (tur: SotuvNarxTuri) => { ruxsat: boolean; narxBor: boolean };
  kichik?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation("savdo_yangi");
  // Qator ichidagi ixcham tugmalarda qisqa yorliqlar ishlatiladi (matn kesilmasligi uchun).
  const turlar = [
    { tur: "COST", nom: t("priceTypes.cost"), qisqa: t("priceTypes.costShort") },
    { tur: "RETAIL", nom: t("priceTypes.retail"), qisqa: t("priceTypes.retailShort") },
    { tur: "WHOLESALE", nom: t("priceTypes.wholesale"), qisqa: t("priceTypes.wholesaleShort") },
  ] as const;
  return (
    <div
      role="radiogroup"
      aria-label={t("priceTypes.label")}
      className={cn("inline-flex gap-0.5 rounded-xl bg-slate-100 p-1", kichik && "mt-1.5 flex w-full")}
    >
      {turlar.map(({ tur, nom, qisqa }) => {
        const { ruxsat, narxBor } = holat(tur);
        const faol = qiymat === tur;
        const ochiq = ruxsat && narxBor && !disabled;
        return (
          <button
            key={tur}
            type="button"
            role="radio"
            aria-checked={faol}
            disabled={!ochiq && !faol}
            title={!ruxsat ? t("priceTypes.disabled") : !narxBor ? t("priceTypes.noPrice") : nom}
            onClick={() => ochiq && onChange(tur)}
            className={cn(
              "rounded-lg font-bold transition",
              kichik ? "flex-auto whitespace-nowrap px-1.5 py-1 text-center text-[10px]" : "px-4 py-2 text-xs",
              faol
                ? "bg-white text-[#2563EB] shadow-sm ring-2 ring-blue-200"
                : ochiq
                  ? "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  : "cursor-not-allowed text-slate-300"
            )}
          >
            {kichik ? qisqa : nom}
          </button>
        );
      })}
    </div>
  );
}
