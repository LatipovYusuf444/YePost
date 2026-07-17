import { useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";

type Variant = { id: string; label: string };

type Props = {
  sarlavha: string;
  variantlar: Variant[];
  tanlangan: string[];
  onOzgarish: (tanlangan: string[]) => void;
  qidiruvPlaceholder?: string;
};

export default function KopTanlov({
  sarlavha,
  variantlar,
  tanlangan,
  onOzgarish,
  qidiruvPlaceholder = "Qidirish",
}: Props) {
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
    document.addEventListener("mousedown", tashqigaBosish);
    return () => document.removeEventListener("mousedown", tashqigaBosish);
  }, [ochiq]);

  const natijalar = variantlar.filter((variant) =>
    variant.label.toLowerCase().includes(qidiruv.trim().toLowerCase())
  );

  function almashtirish(id: string) {
    onOzgarish(
      tanlangan.includes(id) ? tanlangan.filter((item) => item !== id) : [...tanlangan, id]
    );
  }

  return (
    <div className="min-w-0" ref={konteynerRef}>
      <p className="mb-1.5 text-xs font-bold text-gray-500">{sarlavha}</p>
      <div className="relative">
        <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-2">
          {tanlangan.map((id) => {
            const variant = variantlar.find((item) => item.id === id);
            if (!variant) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                {variant.label}
                <button type="button" onClick={() => almashtirish(id)} className="text-orange-500 hover:text-orange-800" aria-label={`${variant.label} ni olib tashlash`}>
                  <X size={12} />
                </button>
              </span>
            );
          })}
          <button type="button" onClick={() => setOchiq((old) => !old)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-bold text-gray-400 hover:text-orange-600">
            <Plus size={13} /> Qo'shish
          </button>
        </div>

        {ochiq && (
          <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[220px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl">
            <div className="relative border-b border-gray-100 p-2">
              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={qidiruvPlaceholder} className="h-9 w-full rounded-xl border border-gray-200 pl-8 pr-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              {natijalar.length === 0 && <p className="px-2 py-3 text-center text-xs font-semibold text-gray-400">Topilmadi</p>}
              {natijalar.map((variant) => (
                <label key={variant.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-gray-700 hover:bg-orange-50">
                  <input type="checkbox" checked={tanlangan.includes(variant.id)} onChange={() => almashtirish(variant.id)} className="h-4 w-4 accent-orange-500" />
                  {variant.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
