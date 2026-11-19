import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { BoshlangichYonalish } from "@/lib/boshlangichQarz";

type Variant = { qiymat: BoshlangichYonalish; nom: string; izoh: string };

/**
 * Boshlang'ich hisob yo'nalishi: ikki karta (radio). DEBT — odatdagi (qizil o'q: qarz), CREDIT — teskari (yashil o'q: avans / bizga qarz).
 * Mijoz va yetkazib beruvchi oynalarida bir xil ko'rinadi; matnlar chaqiruvchidan.
 */
export default function YonalishTanlovi({ nom, qiymat, onChange, variantlar, disabled }: { nom: string; qiymat: BoshlangichYonalish; onChange: (qiymat: BoshlangichYonalish) => void; variantlar: [Variant, Variant]; disabled?: boolean }) {
  return (
    <fieldset className="grid gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-semibold text-slate-600">{nom}</legend>
      <div role="radiogroup" aria-label={nom} className="grid gap-2 sm:grid-cols-2">
        {variantlar.map((variant) => {
          const tanlangan = variant.qiymat === qiymat;
          const teskari = variant.qiymat === "CREDIT";
          const Ikonka = teskari ? ArrowDownLeft : ArrowUpRight;
          return (
            <button
              key={variant.qiymat}
              type="button"
              role="radio"
              aria-checked={tanlangan}
              data-yonalish={variant.qiymat}
              onClick={() => onChange(variant.qiymat)}
              className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                tanlangan
                  ? teskari ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100" : "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span aria-hidden className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tanlangan ? (teskari ? "bg-emerald-500 text-white" : "bg-blue-600 text-white") : "bg-slate-100 text-slate-400"}`}><Ikonka size={16} /></span>
              <span className="min-w-0">
                <span className={`block text-sm font-bold ${tanlangan ? "text-slate-900" : "text-slate-600"}`}>{variant.nom}</span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{variant.izoh}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
