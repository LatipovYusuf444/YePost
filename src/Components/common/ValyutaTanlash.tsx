import { useEffect, useState, type FormEvent, type SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, ChevronDown, RotateCcw, TrendingUp } from "lucide-react";
import { useValyuta, type Valyuta } from "@/lib/valyuta";

function UzBayroq(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 14" {...props}>
      <rect width="20" height="14" fill="#0099B5" />
      <rect width="20" height="4.4" y="9.6" fill="#1EB53A" />
      <rect width="20" height="4.4" y="4.8" fill="#fff" />
      <rect width="20" height="0.8" y="4.8" fill="#CE1126" />
      <rect width="20" height="0.8" y="9.2" fill="#CE1126" />
      <circle cx="3.2" cy="2.4" r="1.25" fill="#fff" />
      <circle cx="3.7" cy="2.4" r="1.05" fill="#0099B5" />
    </svg>
  );
}

function AqshBayroq(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 14" {...props}>
      <rect width="20" height="14" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((qator) => (
        <rect key={qator} width="20" height="1.077" y={qator * 1.077} fill="#B22234" />
      ))}
      <rect width="8.4" height="7.54" fill="#3C3B6E" />
      {[0, 1, 2, 3].flatMap((qator) =>
        [0, 1, 2].map((ustun) => (
          <circle key={`${qator}-${ustun}`} cx={1.5 + ustun * 2.7 + (qator % 2) * 1.35} cy={1.2 + qator * 1.7} r="0.42" fill="#fff" />
        ))
      )}
    </svg>
  );
}

const VARIANTLAR: { kod: Valyuta; belgi: string; Bayroq: (props: SVGProps<SVGSVGElement>) => React.JSX.Element }[] = [
  { kod: "UZS", belgi: "so'm", Bayroq: UzBayroq },
  { kod: "USD", belgi: "$", Bayroq: AqshBayroq },
];

function BayroqBelgisi({ Bayroq, katta = false }: { Bayroq: (props: SVGProps<SVGSVGElement>) => React.JSX.Element; katta?: boolean }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-[5px] shadow-sm ring-1 ring-black/10 ${katta ? "h-[26px] w-9" : "h-3.5 w-5 rounded-[3px]"}`}>
      <Bayroq className="h-full w-full" />
    </span>
  );
}

function kursniOqish(matn: string) {
  return Number(matn.replace(/\s/g, "").replace(",", "."));
}

// Navbar: ko'rsatiladigan valyuta (so'm / dollar) va dollar kursi.
// Kurs hozircha demo (backendda endpoint yo'q) — `@/api/kursApi` ichida real API'ga almashtiriladi.
export default function ValyutaTanlash() {
  const { t } = useTranslation("topbar");
  const { valyuta, kurs, kursManbasi, valyutaniTanlash, kursniBelgilash, kursniYuklash } = useValyuta();
  const [ochiq, setOchiq] = useState(false);
  const [kursMatni, setKursMatni] = useState(String(kurs));
  const [xato, setXato] = useState(false);

  useEffect(() => {
    void kursniYuklash();
  }, [kursniYuklash]);

  useEffect(() => {
    if (!ochiq) return;
    setKursMatni(String(kurs));
    setXato(false);
  }, [ochiq, kurs]);

  function kursniSaqlash(event: FormEvent) {
    event.preventDefault();
    const yangi = kursniOqish(kursMatni);
    if (!Number.isFinite(yangi) || yangi <= 0) {
      setXato(true);
      return;
    }
    kursniBelgilash(yangi);
    setOchiq(false);
  }

  const joriy = VARIANTLAR.find((item) => item.kod === valyuta) ?? VARIANTLAR[0];
  const kursKorinishi = kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 });
  // Hisob-kitob namunasi: 1 000 000 so'm necha dollar.
  const namuna = (1_000_000 / kurs).toLocaleString("uz-UZ", { maximumFractionDigits: 2 });
  const manbaBelgisi = kursManbasi === "qolda" ? t("currency.badgeManual") : kursManbasi === "backend" ? t("currency.badgeServer") : t("currency.badgeDemo");

  return (
    <div className="relative flex shrink-0 items-center gap-2">
      <span className="hidden h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 2xl:flex" title={t("currency.rateLabel")}>
        <TrendingUp size={14} className="text-emerald-300" />1 $ = <span className="text-white">{kursKorinishi}</span> {t("currency.som")}
      </span>
      <button
        type="button"
        onClick={() => setOchiq((qiymat) => !qiymat)}
        aria-label={t("currency.title")}
        aria-haspopup="dialog"
        aria-expanded={ochiq}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-slate-900/70 px-3 text-sm font-bold text-slate-100 shadow-sm backdrop-blur-md transition-colors hover:bg-slate-900/90"
      >
        <BayroqBelgisi Bayroq={joriy.Bayroq} />
        {joriy.kod}
        <ChevronDown size={14} className={`shrink-0 opacity-60 transition-transform ${ochiq ? "rotate-180" : ""}`} />
      </button>

      {ochiq && (
        <>
          <button type="button" aria-label={t("currency.close")} className="fixed inset-0 z-100 cursor-default" onClick={() => setOchiq(false)} />
          <div role="dialog" aria-label={t("currency.title")} className="absolute right-0 top-12 z-101 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-[0_24px_60px_rgba(15,23,42,.22)]">
            {/* Sarlavha: joriy kurs */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 px-5 pb-4 pt-5 text-white">
              <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
              <span aria-hidden className="pointer-events-none absolute -bottom-12 right-14 h-24 w-24 rounded-full bg-white/10" />
              <p className="relative text-[11px] font-black uppercase tracking-[.16em] text-white/70">{t("currency.title")}</p>
              <div className="relative mt-2 flex items-center gap-2.5">
                <BayroqBelgisi Bayroq={AqshBayroq} katta />
                <span className="text-lg font-black">1 $</span>
                <ArrowRight size={16} className="text-white/60" />
                <BayroqBelgisi Bayroq={UzBayroq} katta />
                <span className="text-lg font-black">{kursKorinishi}</span>
              </div>
              <p className="relative mt-1.5 text-xs font-semibold text-white/70">
                1 000 000 {t("currency.som")} ≈ ${namuna}
              </p>
            </div>

            <div className="p-3">
              <div role="radiogroup" aria-label={t("currency.title")} className="grid gap-2">
                {VARIANTLAR.map((item) => {
                  const faol = item.kod === valyuta;
                  return (
                    <button
                      key={item.kod}
                      type="button"
                      role="radio"
                      aria-checked={faol}
                      onClick={() => {
                        valyutaniTanlash(item.kod);
                        setOchiq(false);
                      }}
                      className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                        faol ? "border-orange-300 bg-orange-50/70 shadow-sm ring-2 ring-orange-100" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-slate-50"
                      }`}
                    >
                      <BayroqBelgisi Bayroq={item.Bayroq} katta />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-slate-900">{t(`currency.${item.kod}`)}</span>
                        <span className="block text-xs font-semibold text-slate-400">
                          {item.kod} · {item.belgi}
                        </span>
                      </span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full transition ${faol ? "bg-orange-500 text-white" : "border border-slate-200 text-transparent group-hover:border-orange-300"}`}>
                        <Check size={14} strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={kursniSaqlash} className="mt-3 rounded-2xl bg-slate-50 p-3">
                <label htmlFor="valyuta-kursi" className="text-xs font-bold text-slate-500">
                  {t("currency.rateLabel")}
                </label>
                <div className="mt-1.5 flex gap-2">
                  <div className={`flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-bold transition focus-within:ring-4 ${xato ? "border-red-300 focus-within:ring-red-100" : "border-slate-200 focus-within:border-orange-400 focus-within:ring-orange-100"}`}>
                    <BayroqBelgisi Bayroq={AqshBayroq} />
                    <span className="shrink-0 text-slate-400">1 $ =</span>
                    <input
                      id="valyuta-kursi"
                      inputMode="decimal"
                      value={kursMatni}
                      onChange={(event) => {
                        setKursMatni(event.target.value.replace(/[^\d.,\s]/g, ""));
                        setXato(false);
                      }}
                      className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none"
                    />
                    <span className="shrink-0 text-xs text-slate-400">{t("currency.som")}</span>
                  </div>
                  <button type="submit" className="h-11 shrink-0 rounded-xl bg-orange-500 px-4 text-sm font-black text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 active:scale-[.98]">
                    {t("currency.save")}
                  </button>
                </div>
                {xato && <p className="mt-1.5 px-1 text-xs font-semibold text-red-500">{t("currency.rateInvalid")}</p>}

                <div className="mt-3 flex items-start gap-2.5">
                  <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-wide ${kursManbasi === "demo" ? "bg-amber-100 text-amber-700" : kursManbasi === "qolda" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>{manbaBelgisi}</span>
                  <p className="flex-1 text-xs leading-5 text-slate-500">{kursManbasi === "qolda" ? t("currency.sourceManual") : kursManbasi === "backend" ? t("currency.sourceServer") : t("currency.sourceDemo")}</p>
                  {kursManbasi === "qolda" && (
                    <button type="button" onClick={() => void kursniYuklash(true)} title={t("currency.reset")} aria-label={t("currency.reset")} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-orange-600">
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
