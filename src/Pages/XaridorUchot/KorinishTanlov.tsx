import { useState } from "react";
import { ChevronDown, LayoutGrid, Table2 } from "lucide-react";

export type Korinish = "karta" | "jadval";

const variantlar = [
  { kalit: "karta" as const, ikonka: LayoutGrid, nom: "Kartochka" },
  { kalit: "jadval" as const, ikonka: Table2, nom: "Jadval" },
];

// Ro'yxatni karta yoki jadval ko'rinishida ko'rsatish uchun ochiluvchi tanlov.
export default function KorinishTanlov({
  qiymat,
  onChange,
}: {
  qiymat: Korinish;
  onChange: (korinish: Korinish) => void;
}) {
  const [ochiq, setOchiq] = useState(false);
  const joriy = variantlar.find((v) => v.kalit === qiymat) ?? variantlar[0];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOchiq((oldingi) => !oldingi)}
        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-black text-[#FF6A00] shadow-sm transition hover:border-orange-200"
      >
        <LayoutGrid size={16} />
        Ko'rinish
        <ChevronDown size={15} className={`transition ${ochiq ? "rotate-180" : ""}`} />
      </button>

      {ochiq && (
        <>
          <button
            type="button"
            aria-label="Yopish"
            onClick={() => setOchiq(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(92,38,8,.16)]">
            {variantlar.map(({ kalit, ikonka: Ikonka, nom }) => (
              <button
                key={kalit}
                type="button"
                onClick={() => {
                  onChange(kalit);
                  setOchiq(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  joriy.kalit === kalit
                    ? "bg-[#FF6A00] text-white"
                    : "text-slate-600 hover:bg-orange-50 hover:text-[#FF6A00]"
                }`}
              >
                <Ikonka size={16} />
                {nom}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
