import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type TanlovVarianti = { value: string; label: string };

const tugmaKlass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-left text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100";

// Native <AppSelect> o'rniga — ochilgan ro'yxati ham yumaloq (dizaynga mos) tanlov.
// qidiruv=true bo'lsa — ro'yxat tepasida qidiruv maydoni chiqadi (yozib topiladi).
export default function Tanlov({
  qiymat,
  variantlar,
  onChange,
  placeholder = "Tanlang",
  qidiruv = false,
}: {
  qiymat: string;
  variantlar: TanlovVarianti[];
  onChange: (value: string) => void;
  placeholder?: string;
  qidiruv?: boolean;
}) {
  const [ochiq, setOchiq] = useState(false);
  const [soz, setSoz] = useState("");
  const joriy = variantlar.find((v) => v.value === qiymat) ?? null;

  const korinadigan = useMemo(() => {
    const q = soz.trim().toLowerCase();
    if (!q) return variantlar;
    return variantlar.filter((v) => v.label.toLowerCase().includes(q));
  }, [variantlar, soz]);

  function yopish() {
    setOchiq(false);
    setSoz("");
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOchiq((oldingi) => !oldingi)} className={tugmaKlass}>
        <span className={`truncate ${joriy ? "text-slate-800" : "text-slate-400"}`}>
          {joriy?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${ochiq ? "rotate-180" : ""}`}
        />
      </button>

      {ochiq && (
        <>
          <button
            type="button"
            aria-label="Yopish"
            onClick={yopish}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(92,38,8,.16)]">
            {qidiruv && (
              <div className="mb-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Search size={15} className="text-slate-400" />
                <input
                  autoFocus
                  value={soz}
                  onChange={(e) => setSoz(e.target.value)}
                  placeholder="Qidirish..."
                  className="h-9 min-w-0 flex-1 text-sm font-semibold outline-none"
                />
              </div>
            )}

            <div className="max-h-52 overflow-y-auto">
              {korinadigan.map((v) => {
                const tanlangan = v.value === qiymat;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => {
                      onChange(v.value);
                      yopish();
                    }}
                    className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      tanlangan
                        ? "bg-orange-50 text-[#FF6A00]"
                        : "text-slate-600 hover:bg-orange-50 hover:text-[#FF6A00]"
                    }`}
                  >
                    <span className="truncate">{v.label}</span>
                    {tanlangan && <Check size={15} className="shrink-0" />}
                  </button>
                );
              })}
              {korinadigan.length === 0 && (
                <p className="px-3 py-3 text-center text-sm font-semibold text-slate-400">
                  Topilmadi
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
