import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, LayoutGrid, Table2 } from "lucide-react";

export type RoyxatKorinishi = "jadval" | "kartochka";

type KorinishTanlashProps = {
  qiymat: RoyxatKorinishi;
  onChange: (qiymat: RoyxatKorinishi) => void;
  sarlavha: string;
  jadvalMatni: string;
  kartochkaMatni: string;
};

// "Ko'rinish" tugmasi: ro'yxatni jadval yoki kartochka shaklida ko'rsatish uchun ochiladigan menyu.
export default function KorinishTanlash({ qiymat, onChange, sarlavha, jadvalMatni, kartochkaMatni }: KorinishTanlashProps) {
  const [ochiq, setOchiq] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ochiq) return;
    function tashqarigaBosish(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOchiq(false);
    }
    document.addEventListener("mousedown", tashqarigaBosish);
    return () => document.removeEventListener("mousedown", tashqarigaBosish);
  }, [ochiq]);

  const variantlar: Array<{ kalit: RoyxatKorinishi; matn: string; ikonka: typeof Table2 }> = [
    { kalit: "jadval", matn: jadvalMatni, ikonka: Table2 },
    { kalit: "kartochka", matn: kartochkaMatni, ikonka: LayoutGrid },
  ];
  const Joriy = qiymat === "jadval" ? Table2 : LayoutGrid;
  const Strelka = ochiq ? ChevronUp : ChevronDown;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOchiq((joriy) => !joriy)}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-600 shadow-sm ring-1 ring-orange-100 transition hover:text-orange-600"
        aria-expanded={ochiq}
        aria-haspopup="menu"
      >
        <Joriy size={17} className="text-orange-500" />
        {sarlavha}
        <Strelka size={16} className="text-orange-500" />
      </button>

      {ochiq && (
        <div role="menu" className="absolute right-0 z-30 mt-3 w-64 rounded-[22px] border border-orange-100 bg-white p-2.5 shadow-[0_18px_45px_rgba(15,23,42,.18)]">
          {variantlar.map(({ kalit, matn, ikonka: Ikonka }, index) => (
            <button
              key={kalit}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange(kalit);
                setOchiq(false);
              }}
              className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-black transition ${index > 0 ? "mt-1" : ""} ${
                qiymat === kalit ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <Ikonka size={18} />
              {matn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
