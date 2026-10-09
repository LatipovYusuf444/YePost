import { useEffect, useState, type SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, CircleAlert, Settings2, TrendingUp } from "lucide-react";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
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


// Kurs backenddan qayta olinadigan oraliq (varaq qayta ko'ringanda ham darhol yangilanadi).
const YANGILASH_ORALIGI = 15 * 60 * 1000;

// Navbar: ko'rsatiladigan valyuta (so'm / dollar) va bugungi dollar kursi.
// Valyuta rejimi (Sozlamalar → Valyuta) o'chiq bo'lsa hech narsa ko'rsatilmaydi va hamma narx so'mda chiqadi.
// Kursni ADMIN/DIREKTOR har kuni Sozlamalarda qo'lda kiritadi — bu yerda faqat ko'rsatiladi.
export default function ValyutaTanlash() {
  const { t } = useTranslation("topbar");
  const navigate = useNavigate();
  const profil = useAuthProfileStore((holat) => holat.profil);
  const { valyuta, rejimYoniq, kurs, kursBor, kursSanasi, valyutaniTanlash, kursniYuklash } = useValyuta();
  const [ochiq, setOchiq] = useState(false);
  const kursniOzgartira = foydalanuvchiKursniOzgartiraOladimi(profil);

  useEffect(() => {
    void kursniYuklash();
    const oraliq = window.setInterval(() => void kursniYuklash(), YANGILASH_ORALIGI);
    const koringanda = () => {
      if (document.visibilityState === "visible") void kursniYuklash();
    };
    document.addEventListener("visibilitychange", koringanda);
    return () => {
      window.clearInterval(oraliq);
      document.removeEventListener("visibilitychange", koringanda);
    };
  }, [kursniYuklash]);

  if (!rejimYoniq) return null;

  // Kurs kiritilmagan bo'lsa dollar ko'rinishi mumkin emas: doim so'm.
  const korinadi: Valyuta = kursBor ? valyuta : "UZS";
  const joriy = VARIANTLAR.find((item) => item.kod === korinadi) ?? VARIANTLAR[0];
  const kursKorinishi = kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 });
  // Hisob-kitob namunasi: 1 000 000 so'm necha dollar.
  const namuna = kursBor ? (1_000_000 / kurs).toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) : "";

  function sozlamalargaOtish() {
    setOchiq(false);
    navigate("/sozlamalar?bolim=valyuta");
  }

  return (
    <div className="relative flex shrink-0 items-center gap-2">
      <span
        className={`hidden h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold 2xl:flex ${kursBor ? "border-white/10 bg-white/5 text-white/70" : "border-amber-300/30 bg-amber-400/10 text-amber-200"}`}
        title={t("currency.rateLabel")}
      >
        {kursBor ? (
          <>
            <TrendingUp size={14} className="text-emerald-300" />1 $ = <span className="text-white">{kursKorinishi}</span> {t("currency.som")}
          </>
        ) : (
          <>
            <CircleAlert size={14} />
            {t("currency.noRate")}
          </>
        )}
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
              {kursBor ? (
                <>
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
                </>
              ) : (
                <p className="relative mt-2 flex items-center gap-2 text-lg font-black">
                  <CircleAlert size={20} /> {t("currency.noRate")}
                </p>
              )}
            </div>

            <div className="p-3">
              <div role="radiogroup" aria-label={t("currency.title")} className="grid gap-2">
                {VARIANTLAR.map((item) => {
                  const faol = item.kod === korinadi;
                  const ochirilgan = item.kod === "USD" && !kursBor;
                  return (
                    <button
                      key={item.kod}
                      type="button"
                      role="radio"
                      aria-checked={faol}
                      disabled={ochirilgan}
                      onClick={() => {
                        valyutaniTanlash(item.kod);
                        setOchiq(false);
                      }}
                      className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

              {/* Kurs faqat ko'rsatiladi: uni ADMIN/DIREKTOR Sozlamalarda kiritadi */}
              <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-wide ${kursBor ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {kursBor ? t("currency.badgeServer") : t("currency.badgeNoRate")}
                  </span>
                  <p className="flex-1 text-xs leading-5 text-slate-500">
                    {kursBor ? t("currency.sourceServer") : kursniOzgartira ? t("currency.noRateAdminHint") : t("currency.noRateHint")}
                    {kursBor && kursSanasi && (
                      <span className="mt-0.5 block font-semibold text-slate-400">{t("currency.rateDate", { sana: kursSanasi })}</span>
                    )}
                  </p>
                </div>
                {kursniOzgartira && (
                  <button
                    type="button"
                    onClick={sozlamalargaOtish}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 active:scale-[.98]"
                  >
                    <Settings2 size={15} /> {kursBor ? t("currency.changeRate") : t("currency.setRate")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
