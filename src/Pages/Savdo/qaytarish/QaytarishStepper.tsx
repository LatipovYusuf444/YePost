import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  qadamlar: string[];
  // Hozirgi bosqich indeksi (0 dan boshlanadi).
  joriy: number;
  // Berilsa, bajarilgan bosqichlarga qaytish mumkin.
  onTanlash?: (indeks: number) => void;
};

// Bosqichlar ko'rsatkichi: ✓ bajarildi · ● hozirgi bosqich · ○ keyingi bosqich.
// Tor ekranda gorizontal aylantiriladi (joriy bosqich ko'rinib turadi).
export default function QaytarishStepper({ qadamlar, joriy, onTanlash }: Props) {
  const { t } = useTranslation("savdo_qaytarish");
  const oxirgi = qadamlar.length - 1;
  const ulush = oxirgi > 0 ? (Math.min(joriy, oxirgi) / oxirgi) * 100 : 0;
  const navRef = useRef<HTMLElement | null>(null);

  // Tor ekranda stepper gorizontal aylantiriladi: hozirgi bosqich doim ko'rinadigan qilib suriladi.
  useEffect(() => {
    const nav = navRef.current;
    const hozirgi = nav?.querySelector<HTMLElement>('[aria-current="step"]') ?? nav?.querySelector<HTMLElement>("li:last-child");
    if (!nav || !hozirgi || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: hozirgi.offsetLeft - (nav.clientWidth - hozirgi.offsetWidth) / 2, behavior: "smooth" });
  }, [joriy]);

  return (
    <nav ref={navRef} aria-label={t("wizard.stepperAria")} className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <p className="mb-3 text-xs font-bold text-slate-500 sm:hidden" aria-live="polite">
        {t("wizard.stepCounter", { joriy: joriy + 1, jami: qadamlar.length })} · {qadamlar[joriy]}
      </p>
      <ol className="relative flex min-w-[620px] items-start justify-between sm:min-w-0">
        {/* Ulovchi chiziq va uning to'lgan qismi */}
        <span aria-hidden className="absolute left-[calc(100%/12)] right-[calc(100%/12)] top-[19px] h-0.5 rounded-full bg-slate-200" />
        <span
          aria-hidden
          className="absolute left-[calc(100%/12)] top-[19px] h-0.5 rounded-full bg-linear-to-r from-orange-500 to-emerald-500 transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `calc((100% - 100% / 6) * ${ulush / 100})` }}
        />
        {qadamlar.map((nom, indeks) => {
          // Oxirgi bosqichga yetilganda (yakun ekrani) u ham "bajarildi" hisoblanadi.
          const tugallangan = joriy >= oxirgi && indeks === oxirgi;
          const holat = indeks < joriy || tugallangan ? "bajarildi" : indeks === joriy ? "hozirgi" : "keyingi";
          const bosish = indeks < joriy && onTanlash ? () => onTanlash(indeks) : undefined;
          return (
            <li key={nom} className="relative z-10 flex flex-1 flex-col items-center px-1 text-center" aria-current={holat === "hozirgi" ? "step" : undefined}>
              <button
                type="button"
                onClick={bosish}
                disabled={!bosish}
                aria-label={`${indeks + 1}. ${nom} — ${t(`wizard.stepState.${holat}`)}`}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black transition-all duration-300 motion-reduce:transition-none ${
                  holat === "bajarildi" || tugallangan
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200" + (bosish ? " cursor-pointer hover:scale-105" : "")
                    : holat === "hozirgi"
                      ? "border-orange-500 bg-white text-orange-600 shadow-[0_0_0_6px_rgba(37,99,235,.12)]"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {holat === "bajarildi" || tugallangan ? <Check size={18} strokeWidth={3} /> : holat === "hozirgi" ? <span className="h-3 w-3 rounded-full bg-orange-500" /> : indeks + 1}
              </button>
              <span className={`mt-2 text-xs font-extrabold leading-tight sm:text-[13px] ${holat === "keyingi" ? "text-slate-400" : "text-slate-800"}`}>{nom}</span>
              <span className={`mt-0.5 hidden text-[11px] font-semibold sm:block ${holat === "bajarildi" ? "text-emerald-600" : holat === "hozirgi" ? "text-orange-600" : "text-slate-300"}`}>
                {t(`wizard.stepState.${holat}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
