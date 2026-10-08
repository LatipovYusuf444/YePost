import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type Variant = { id: string; label: string };

type Props = {
  sarlavha: string;
  variantlar: Variant[];
  tanlangan: string[];
  onOzgarish: (tanlangan: string[]) => void;
  qidiruvPlaceholder?: string;
  // Sarlavha yonidagi ikonka (ixtiyoriy).
  ikonka?: LucideIcon;
};

// Ko'p tanlovli filtr: hech narsa tanlanmasa "Barchasi" (filtr yo'q), tanlanganda esa tanlanganlar chip ko'rinishida chiqadi.
export default function KopTanlov({
  sarlavha,
  variantlar,
  tanlangan,
  onOzgarish,
  qidiruvPlaceholder: qidiruvPlaceholderProp,
  ikonka: Ikona,
}: Props) {
  const { t } = useTranslation("ombor_kichik");
  const qidiruvPlaceholder = qidiruvPlaceholderProp ?? t("kopTanlov.searchPlaceholder");
  const [ochiq, setOchiq] = useState(false);
  const [qidiruv, setQidiruv] = useState("");
  const konteynerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ochiq) return;
    function tashqigaBosish(event: MouseEvent) {
      if (!konteynerRef.current?.contains(event.target as Node)) {
        setOchiq(false);
        setQidiruv("");
      }
    }
    function escBosildi(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOchiq(false);
        setQidiruv("");
      }
    }
    document.addEventListener("mousedown", tashqigaBosish);
    document.addEventListener("keydown", escBosildi);
    return () => {
      document.removeEventListener("mousedown", tashqigaBosish);
      document.removeEventListener("keydown", escBosildi);
    };
  }, [ochiq]);

  const natijalar = variantlar.filter((variant) =>
    variant.label.toLowerCase().includes(qidiruv.trim().toLowerCase())
  );

  function almashtirish(id: string) {
    onOzgarish(
      tanlangan.includes(id) ? tanlangan.filter((item) => item !== id) : [...tanlangan, id]
    );
  }

  const tanlanganVariantlar = tanlangan
    .map((id) => variantlar.find((item) => item.id === id))
    .filter((variant): variant is Variant => Boolean(variant));
  const bor = tanlanganVariantlar.length > 0;

  return (
    <div className="min-w-0" ref={konteynerRef}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500">
        {Ikona && <Ikona size={13} aria-hidden className="shrink-0 text-gray-400" />}
        <span className="truncate">{sarlavha}</span>
        {bor && (
          <span className="rounded-full bg-orange-500 px-1.5 py-px text-[10px] font-black leading-4 text-white tabular-nums">{tanlanganVariantlar.length}</span>
        )}
      </p>
      <div className="relative">
        <div
          className={`flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border p-1.5 transition ${
            ochiq
              ? "border-orange-300 bg-white ring-4 ring-orange-50"
              : bor
                ? "border-orange-200 bg-orange-50/30 hover:border-orange-300"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
          }`}
        >
          {tanlanganVariantlar.map((variant) => (
            <span key={variant.id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white py-1 pl-2 pr-1 text-xs font-bold text-orange-700 shadow-sm ring-1 ring-orange-200">
              <span className="truncate">{variant.label}</span>
              <button type="button" onClick={() => almashtirish(variant.id)} className="cursor-pointer rounded-md p-0.5 text-orange-400 transition hover:bg-orange-50 hover:text-orange-700" aria-label={t("kopTanlov.removeAria", { label: variant.label })}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setOchiq((old) => !old)}
            aria-expanded={ochiq}
            aria-label={bor ? t("kopTanlov.addButton") : sarlavha}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
              bor ? "ml-auto text-gray-400 hover:bg-orange-50 hover:text-orange-600" : "min-h-8 flex-1 text-gray-400 hover:text-gray-600"
            }`}
          >
            {bor ? <Plus size={14} aria-hidden /> : <span className="text-sm font-semibold">{t("kopTanlov.all")}</span>}
            <ChevronDown size={15} aria-hidden className={`${bor ? "" : "ml-auto"} shrink-0 transition-transform ${ochiq ? "rotate-180" : ""}`} />
          </button>
        </div>

        {ochiq && (
          <div className="absolute left-0 top-full z-30 mt-1.5 w-full min-w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,.28)]">
            <div className="relative border-b border-slate-100 p-2">
              <Search size={14} className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={qidiruv}
                onChange={(event) => setQidiruv(event.target.value)}
                placeholder={qidiruvPlaceholder}
                autoFocus
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-2 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              {natijalar.length === 0 && <p className="px-2 py-4 text-center text-xs font-semibold text-gray-400">{t("kopTanlov.notFound")}</p>}
              {natijalar.map((variant) => {
                const belgilangan = tanlangan.includes(variant.id);
                return (
                  <label
                    key={variant.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition ${belgilangan ? "bg-orange-50 text-orange-700" : "text-gray-700 hover:bg-slate-50"}`}
                  >
                    <input type="checkbox" checked={belgilangan} onChange={() => almashtirish(variant.id)} className="sr-only" />
                    <span aria-hidden className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition ${belgilangan ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300 bg-white text-transparent"}`}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 truncate">{variant.label}</span>
                  </label>
                );
              })}
            </div>
            {bor && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-gray-500">
                <span>{t("kopTanlov.selectedCount", { count: tanlanganVariantlar.length })}</span>
                <button type="button" onClick={() => onOzgarish([])} className="cursor-pointer rounded-lg px-2 py-1 font-bold text-orange-600 transition hover:bg-orange-50">
                  {t("kopTanlov.clear")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
