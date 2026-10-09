import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Calculator, Check, Flag, MessageSquareText, PackageSearch, Receipt, ShieldCheck, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  qadamlar: string[];
  // Hozirgi bosqich indeksi (0 dan boshlanadi).
  joriy: number;
  // Har bir bosqich uchun foydalanuvchi tanlovi yoki backend ma'lumoti (masalan "11257617 · Mijoz", "2 dona").
  // Faqat bajarilgan va hozirgi bosqichda ko'rsatiladi.
  tafsilotlar?: Array<string | null | undefined>;
  // Berilsa, bajarilgan bosqichlarga qaytish mumkin.
  onTanlash?: (indeks: number) => void;
};

// Bosqichlar: sotuv → mahsulot → sabab → hisob-kitob → tasdiqlash → yakun.
const IKONKALAR: LucideIcon[] = [Receipt, PackageSearch, MessageSquareText, Calculator, ShieldCheck, Flag];

// Jarayon ko'rsatkichi: umumiy foiz va chiziq, har bir bosqich o'z ikonkasi, holat belgisi (✓ bajarildi / ● hozirgi / ○ keyingi)
// va shu bosqichdagi tanlov. Tor ekranda gorizontal aylantiriladi (hozirgi bosqich ko'rinib turadi).
export default function QaytarishStepper({ qadamlar, joriy, tafsilotlar, onTanlash }: Props) {
  const { t } = useTranslation("savdo_qaytarish");
  const jami = qadamlar.length;
  const oxirgi = jami - 1;
  const ulush = oxirgi > 0 ? Math.min(joriy, oxirgi) / oxirgi : 0;
  const foiz = Math.round(ulush * 100);
  const navRef = useRef<HTMLElement | null>(null);

  // Tor ekranda stepper gorizontal aylantiriladi: hozirgi bosqich doim ko'rinadigan qilib suriladi.
  useEffect(() => {
    const nav = navRef.current;
    const hozirgi = nav?.querySelector<HTMLElement>('[aria-current="step"]') ?? nav?.querySelector<HTMLElement>("li:last-child");
    if (!nav || !hozirgi || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: hozirgi.offsetLeft - (nav.clientWidth - hozirgi.offsetWidth) / 2, behavior: "smooth" });
  }, [joriy]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-black uppercase tracking-[0.14em] text-slate-400" aria-live="polite">
          {t("wizard.stepCounter", { joriy: Math.min(joriy + 1, jami), jami })}
          <span className="ml-2 normal-case tracking-normal text-slate-700">{qadamlar[Math.min(joriy, oxirgi)]}</span>
        </p>
        <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black tabular-nums text-orange-600 ring-1 ring-orange-100">{foiz}%</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={foiz} aria-label={t("wizard.stepperAria")}>
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-emerald-400 via-emerald-500 to-orange-500"
          initial={false}
          animate={{ width: `${foiz}%` }}
          transition={{ type: "spring", stiffness: 110, damping: 20 }}
        />
      </div>

      <nav ref={navRef} aria-label={t("wizard.stepperAria")} className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="relative flex min-w-[660px] items-start justify-between sm:min-w-0">
          {/* Ulovchi chiziq va uning to'lgan qismi (aylanalar markazlari orasida) */}
          <span aria-hidden className="absolute top-[22px] h-1 rounded-full bg-slate-100" style={{ left: `${50 / jami}%`, right: `${50 / jami}%` }} />
          <motion.span
            aria-hidden
            className="absolute top-[22px] h-1 rounded-full bg-linear-to-r from-emerald-400 via-emerald-500 to-orange-500"
            style={{ left: `${50 / jami}%` }}
            initial={false}
            animate={{ width: `${(100 - 100 / jami) * ulush}%` }}
            transition={{ type: "spring", stiffness: 110, damping: 20 }}
          />
          {qadamlar.map((nom, indeks) => {
            // Oxirgi bosqichga yetilganda (yakun ekrani) u ham "bajarildi" hisoblanadi.
            const tugallangan = joriy >= oxirgi && indeks === oxirgi;
            const holat = indeks < joriy || tugallangan ? "bajarildi" : indeks === joriy ? "hozirgi" : "keyingi";
            const bosish = indeks < joriy && onTanlash ? () => onTanlash(indeks) : undefined;
            const Ikona = IKONKALAR[indeks];
            const tafsilot = holat !== "keyingi" ? tafsilotlar?.[indeks] : null;
            return (
              <li key={nom} className="relative z-10 flex flex-1 flex-col items-center px-1 text-center" aria-current={holat === "hozirgi" ? "step" : undefined}>
                <span className="relative flex h-12 w-12 items-center justify-center">
                  {holat === "hozirgi" && (
                    <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-orange-400/30 [animation-duration:2.4s] motion-reduce:hidden" />
                  )}
                  <motion.button
                    type="button"
                    onClick={bosish}
                    disabled={!bosish}
                    aria-label={`${indeks + 1}. ${nom} — ${t(`wizard.stepState.${holat}`)}`}
                    initial={false}
                    animate={{ scale: holat === "hozirgi" ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className={`relative flex h-12 w-12 items-center justify-center rounded-full text-sm font-black transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none ${
                      holat === "bajarildi"
                        ? `bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200 ${bosish ? "cursor-pointer hover:shadow-emerald-300" : ""}`
                        : holat === "hozirgi"
                          ? "bg-linear-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-300/70"
                          : "bg-white text-slate-300 ring-2 ring-slate-200"
                    }`}
                  >
                    {holat === "bajarildi" ? <Check size={22} strokeWidth={3} /> : Ikona ? <Ikona size={20} /> : indeks + 1}
                  </motion.button>
                </span>
                <span
                  className={`mt-2.5 text-xs font-extrabold leading-tight sm:text-[13px] ${
                    holat === "keyingi" ? "text-slate-400" : holat === "hozirgi" ? "text-orange-700" : "text-slate-800"
                  }`}
                >
                  {nom}
                </span>
                {tafsilot && (
                  <span title={tafsilot} className="mt-0.5 max-w-[9.5rem] truncate text-[11px] font-semibold text-slate-400">
                    {tafsilot}
                  </span>
                )}
                <span
                  className={`mt-1.5 hidden rounded-full px-2 py-0.5 text-[10px] font-black sm:inline-flex ${
                    holat === "bajarildi" ? "bg-emerald-50 text-emerald-700" : holat === "hozirgi" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {t(`wizard.stepState.${holat}`)}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
