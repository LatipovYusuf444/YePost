import SmartTable from "@/Components/common/smart-table/SmartTable";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, CircleAlert, Info, LoaderCircle, Lock, RefreshCw, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import {
  kursniSongaAylantirish,
  rejimKodiniOlish,
  valyutaApi,
  type AmaldagiKurs,
  type KursYozuvi,
  type ValyutaRejimKodi,
} from "@/api/valyutaApi";
import { asosiyXatoKodi, xatoKodi } from "@/api/xatoKodlari";
import { tasdiqSorash } from "@/lib/tasdiqSorovi";
import { muvaffaqiyatXabari } from "@/lib/toast";
import { ENG_KAM_KURS, kursJudaKichik } from "@/lib/kursChegarasi";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
import { useValyutaStore, valyutaKodi, type Valyuta } from "@/lib/valyuta";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { BolimKarta, Maydon } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

const TARIX_KUNLARI = 90;
const KURS_KIRITMA_ID = "valyuta-kurs-kiritma";

// Do'kon valyuta rejimlari (Sozlamalar → Valyuta): tanlov kartalari shu tartibda; belgi — rejim valyutalari.
const REJIMLAR: { kod: ValyutaRejimKodi; belgi: string }[] = [
  { kod: "DUAL", belgi: "so'm·$" },
  { kod: "UZS_ONLY", belgi: "so'm" },
  { kod: "USD_ONLY", belgi: "$" },
];

// Kurs formasi xatolari: sana — so'rov manzilida (/settings/exchange-rates/:date), kurs — tanada (rate). Avval sana:
// "kelajak sanasiga kurs kiritib bo'lmaydi" kabi xabar sana maydoniga tushadi. ("date" so'zi "validate" ichida ham bor — ishlatilmaydi.)
const KURS_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  date: { maydonlar: ["date"], kodlar: ["invalid_date", "future_date", "date_in_future"], sozlar: ["sana", "date must", "invalid date", "future date", "дата", "дату"] },
  rate: { maydonlar: ["rate"], kodlar: ["invalid_rate", "rate_invalid", "rate_required"], sozlar: ["kurs", "rate must", "exchange rate", "курс"] },
};
const SANA_NAMUNASI = /^\d{4}-\d{2}-\d{2}$/;

function mahalliyBugun() {
  const hozir = new Date();
  const oy = String(hozir.getMonth() + 1).padStart(2, "0");
  const kun = String(hozir.getDate()).padStart(2, "0");
  return `${hozir.getFullYear()}-${oy}-${kun}`;
}

// "YYYY-MM-DD" dan kunlar ayirib, yana shu formatda qaytaradi (vaqt mintaqasiga bog'liq emas).
function kunlarOldin(sana: string, kunlar: number) {
  const boshi = new Date(`${sana}T00:00:00Z`);
  boshi.setUTCDate(boshi.getUTCDate() - kunlar);
  return boshi.toISOString().slice(0, 10);
}

function sanaToGri(sana: string) {
  if (!SANA_NAMUNASI.test(sana)) return false;
  const tekshiruv = new Date(`${sana}T00:00:00Z`);
  return !Number.isNaN(tekshiruv.getTime()) && tekshiruv.toISOString().slice(0, 10) === sana;
}

function kursniOqish(matn: string) {
  return Number(matn.replace(/\s/g, "").replace(",", "."));
}

function kursMatni(qiymat: number | string | null | undefined) {
  const son = kursniSongaAylantirish(qiymat);
  return son === null ? "—" : son.toLocaleString("uz-UZ", { maximumFractionDigits: 2 });
}

function vaqtMatni(qiymat?: string | null) {
  if (!qiymat) return "—";
  const sana = new Date(qiymat);
  return Number.isNaN(sana.getTime()) ? "—" : sana.toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" });
}

// Sozlamalar → Valyuta: valyuta rejimi va dollar kursi. Kursni ADMIN/DIREKTOR har kuni qo'lda kiritadi
// (Markaziy bankdan avtomatik olinmaydi). Kiritilgan kurs shu kundan keyingi kurs kiritilguncha amal qiladi.
export default function ValyutaBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const tahrirlaydi = foydalanuvchiKursniOzgartiraOladimi(profil);
  const navbarniYangilash = useValyutaStore((holat) => holat.kursniYuklash);

  // Do'kon valyuta rejimi: ikki valyuta / faqat so'm / faqat dollar. `yoniq` — ikki valyuta (hisobot valyutasi faqat shunda tanlanadi).
  // `null` — hali o'qilmagan (yoki o'qib bo'lmadi): hech bir karta "Tanlangan" deb ko'rsatilmaydi.
  const [rejim, setRejim] = useState<ValyutaRejimKodi | null>(null);
  const yoniq = rejim === "DUAL";
  // Rejimga o'tish uchun kurs kerak (errors.currency.rate_missing): kurs formasiga yo'naltiruvchi xabar.
  const [kursKerak, setKursKerak] = useState(false);
  const [hisobotValyutasi, setHisobotValyutasi] = useState<Valyuta>("UZS");
  const [amaldagi, setAmaldagi] = useState<AmaldagiKurs | null>(null);
  const [royxat, setRoyxat] = useState<KursYozuvi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [rejimSaqlanmoqda, setRejimSaqlanmoqda] = useState(false);
  const [kursSaqlanmoqda, setKursSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const fx = useMaydonXatolari(KURS_XATO_QOIDALARI);
  const [xabar, setXabar] = useState("");

  // Bo'sh bo'lsa kompaniya vaqt mintaqasidagi bugungi kun (backend javobidan) ishlatiladi.
  const [tanlanganSana, setSana] = useState("");
  const [kursKiritma, setKursKiritma] = useState("");
  const bugun = amaldagi?.date ?? mahalliyBugun();
  const sana = tanlanganSana || bugun;

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXato("");
    try {
      // Rejim kurslardan alohida o'qiladi va darhol ko'rsatiladi: kurs so'rovi yiqilsa ham noto'g'ri rejim "Tanlangan" bo'lib qolmaydi.
      const [rejim, joriy] = await Promise.all([
        valyutaApi.rejimniOlish().then((javob) => {
          setRejim(rejimKodiniOlish(javob));
          setHisobotValyutasi(valyutaKodi(javob.reportCurrency));
          return javob;
        }).catch(() => null),
        valyutaApi.amaldagiKurs(),
      ]);
      const kurslar = await valyutaApi.kurslarRoyxati({ dateFrom: kunlarOldin(joriy.date, TARIX_KUNLARI) });
      // Rejimni o'qishga ruxsat bo'lmasa (eski xatti-harakat) — kurs kiritilganligiga qarab.
      if (!rejim) setRejim(kursniSongaAylantirish(joriy.rate) !== null ? "DUAL" : "UZS_ONLY");
      setAmaldagi(joriy);
      setRoyxat([...kurslar].sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  // Shu kunga allaqachon kurs kiritilgan bo'lsa, forma uni almashtirishini ko'rsatadi.
  const mavjudKurs = useMemo(() => royxat.find((yozuv) => yozuv.date === sana) ?? null, [royxat, sana]);
  const joriyKurs = kursniSongaAylantirish(amaldagi?.rate);

  async function rejimniOzgartirish(yangi: ValyutaRejimKodi) {
    if (!tahrirlaydi || rejimSaqlanmoqda || rejim === null || yangi === rejim) return;
    const nom = t(`valyuta.modes.${yangi}.title`);
    // Rejim butun do'kon uchun: tasodifiy bosishdan oldin so'raladi.
    if (!(await tasdiqSorash(t("valyuta.modes.confirm", { nom }), { ha: t("valyuta.modes.confirmYes") })).rozi) return;
    setRejimSaqlanmoqda(true);
    setXato("");
    setXabar("");
    setKursKerak(false);
    try {
      const saqlangan = await valyutaApi.rejimniYangilash(yangi);
      const yangiRejim = saqlangan && (saqlangan.mode || typeof saqlangan.enabled === "boolean") ? rejimKodiniOlish(saqlangan) : yangi;
      setRejim(yangiRejim);
      if (saqlangan?.reportCurrency) setHisobotValyutasi(valyutaKodi(saqlangan.reportCurrency));
      // Rejim o'zgargach sahifa qayta yig'iladi (AsosiyPanel): xabar toast bilan ko'rsatiladi, aks holda yo'qolib ketardi.
      muvaffaqiyatXabari(t("valyuta.modes.saved", { nom: t(`valyuta.modes.${yangiRejim}.title`) }));
      void navbarniYangilash();
    } catch (error) {
      // Kurs kiritilmagan, do'konda esa boshqa valyutadagi narx/hujjat bor: kurs formasiga yo'naltiriladi.
      const kod = asosiyXatoKodi(xatoKodi(axios.isAxiosError(error) ? error.response?.data : undefined));
      if (kod === "errors.currency.rate_missing") setKursKerak(true);
      else setXato(getApiErrorMessage(error));
    } finally {
      setRejimSaqlanmoqda(false);
    }
  }

  function kursFormasigaOtish() {
    const maydon = document.getElementById(KURS_KIRITMA_ID);
    maydon?.scrollIntoView({ behavior: "smooth", block: "center" });
    maydon?.focus({ preventScroll: true });
  }

  async function hisobotValyutasiniOzgartirish(yangi: Valyuta) {
    if (!tahrirlaydi || rejimSaqlanmoqda || yangi === hisobotValyutasi) return;
    setRejimSaqlanmoqda(true);
    setXato("");
    setXabar("");
    try {
      const saqlangan = await valyutaApi.rejimniYangilash("DUAL", yangi);
      setHisobotValyutasi(valyutaKodi(saqlangan.reportCurrency ?? yangi));
      muvaffaqiyatXabari(t("valyuta.reportCurrency.savedMessage", { valyuta: t(yangi === "USD" ? "valyuta.reportCurrency.usd" : "valyuta.reportCurrency.uzs") }));
      // Navbar, jami summalar va hisobotlar yangi hisobot valyutasini darhol olsin.
      void navbarniYangilash();
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setRejimSaqlanmoqda(false);
    }
  }

  async function kursniSaqlash(event: FormEvent) {
    event.preventDefault();
    if (!tahrirlaydi || kursSaqlanmoqda) return;
    setXabar("");
    setXato("");

    if (!sanaToGri(sana)) {
      fx.ornat({ date: t("valyuta.form.dateInvalid") });
      return;
    }
    const kurs = kursniOqish(kursKiritma);
    if (!Number.isFinite(kurs) || kurs <= 0) {
      fx.ornat({ rate: t("valyuta.form.rateInvalid") });
      return;
    }
    if (kursJudaKichik(kurs)) {
      fx.ornat({ rate: t("valyuta.form.rateTooLow", { min: ENG_KAM_KURS.toLocaleString("uz-UZ") }) });
      return;
    }
    fx.ornat({});

    setKursSaqlanmoqda(true);
    try {
      await valyutaApi.kursniBelgilash(sana, kurs);
      muvaffaqiyatXabari(t("valyuta.rateSavedMessage", { sana, kurs: kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) }));
      setKursKiritma("");
      setKursKerak(false);
      await yuklash();
      void navbarniYangilash();
    } catch (error) {
      // Maydoniga bog'langan xato faqat maydon ostida; bog'lanmagani tepada.
      if (!fx.serverdan(axios.isAxiosError(error) ? error.response?.data : undefined)) setXato(getApiErrorMessage(error));
    } finally {
      setKursSaqlanmoqda(false);
    }
  }

  function qatorniTanlash(yozuv: KursYozuvi) {
    if (!tahrirlaydi) return;
    setSana(yozuv.date);
    setKursKiritma(String(kursniSongaAylantirish(yozuv.rate) ?? ""));
    fx.ornat({});
  }

  return (
    <div className="space-y-5">
      {(fx.tepadagi || xato) && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{fx.tepadagi || xato}</p>}
      {xabar && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{xabar}</p>}

      {/* Rejim */}
      <BolimKarta
        sarlavha={t("valyuta.title")}
        izoh={t("valyuta.subtitle")}
        amal={
          <button
            type="button"
            onClick={() => void yuklash()}
            disabled={yuklanmoqda}
            aria-label={t("valyuta.refresh")}
            title={t("valyuta.refresh")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-orange-600 disabled:opacity-50"
          >
            <RefreshCw size={16} className={yuklanmoqda ? "animate-spin" : ""} />
          </button>
        }
      >
        {yuklanmoqda && !amaldagi ? (
          <div className="flex h-24 items-center justify-center gap-2 text-sm font-bold text-slate-400">
            <LoaderCircle className="animate-spin" size={20} />
            {t("loadingGeneric")}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Do'kon valyutasi: ikki valyuta / faqat so'm / faqat dollar */}
            <div className="rounded-2xl bg-slate-50 px-5 py-4 lg:col-span-2">
              <p className="text-sm font-black text-slate-800">{t("valyuta.modes.label")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("valyuta.modes.hint")}</p>
              {!tahrirlaydi && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <Lock size={12} aria-hidden /> {t("valyuta.readOnlyNotice")}
                </p>
              )}
              <div role="radiogroup" aria-label={t("valyuta.modes.label")} className="mt-3 grid gap-3 sm:grid-cols-3">
                {REJIMLAR.map(({ kod, belgi }) => {
                  const tanlangan = rejim === kod;
                  return (
                    <button
                      key={kod}
                      type="button"
                      role="radio"
                      aria-checked={tanlangan}
                      onClick={() => void rejimniOzgartirish(kod)}
                      disabled={!tahrirlaydi || rejimSaqlanmoqda}
                      className={`relative flex min-w-0 flex-col items-start gap-2 rounded-2xl border-2 bg-white px-4 py-3.5 text-left transition disabled:cursor-not-allowed ${
                        tanlangan
                          ? "border-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,.14)]"
                          : "border-slate-200 enabled:hover:border-slate-300 enabled:hover:shadow-sm disabled:opacity-70"
                      }`}
                    >
                      <span className="flex w-full items-center gap-2.5">
                        <span
                          aria-hidden
                          className={`flex h-9 min-w-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-2 font-black ${belgi === "$" ? "text-base" : "text-[11px]"} ${tanlangan ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"}`}
                        >
                          {belgi}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-black text-slate-900">{t(`valyuta.modes.${kod}.title`)}</span>
                        {tanlangan && (rejimSaqlanmoqda ? <LoaderCircle size={17} className="shrink-0 animate-spin text-[#2563EB]" aria-hidden /> : <CheckCircle2 size={18} className="shrink-0 text-[#2563EB]" aria-label={t("valyuta.modes.active")} />)}
                      </span>
                      <span className="text-xs leading-5 text-slate-500">{t(`valyuta.modes.${kod}.desc`)}</span>
                    </button>
                  );
                })}
              </div>
              {kursKerak && (
                <div role="alert" className="mt-3 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                  <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-amber-800">{t("valyuta.modes.rateMissing")}</p>
                  {tahrirlaydi && (
                    <button
                      type="button"
                      onClick={kursFormasigaOtish}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-black text-white transition hover:bg-amber-600"
                    >
                      <TrendingUp size={14} aria-hidden /> {t("valyuta.modes.rateMissingAction")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {yoniq && (
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-slate-50 px-5 py-4 lg:col-span-2">
                <div className="min-w-0 max-w-xl">
                  <p className="text-sm font-black text-slate-800">{t("valyuta.reportCurrency.label")}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{t("valyuta.reportCurrency.hint")}</p>
                </div>
                <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200" role="group" aria-label={t("valyuta.reportCurrency.label")}>
                  {(["UZS", "USD"] as const).map((valyuta) => (
                    <button
                      key={valyuta}
                      type="button"
                      onClick={() => void hisobotValyutasiniOzgartirish(valyuta)}
                      disabled={!tahrirlaydi || rejimSaqlanmoqda}
                      aria-pressed={hisobotValyutasi === valyuta}
                      className={`rounded-lg px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed ${
                        hisobotValyutasi === valyuta ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-800 disabled:hover:text-slate-500"
                      }`}
                    >
                      {t(valyuta === "USD" ? "valyuta.reportCurrency.usd" : "valyuta.reportCurrency.uzs")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`rounded-2xl border px-5 py-4 ${joriyKurs !== null ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/60"}`}>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                {joriyKurs !== null ? <TrendingUp size={14} className="text-emerald-600" aria-hidden /> : <CircleAlert size={14} className="text-amber-600" aria-hidden />}
                {t("valyuta.currentRate")}
              </p>
              {joriyKurs !== null ? (
                <>
                  <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-950">
                    1 $ = {kursMatni(joriyKurs)} <span className="text-base font-bold text-slate-500">{t("valyuta.som")}</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {t("valyuta.effectiveSince", { sana: amaldagi?.rateDate ?? amaldagi?.date ?? "—" })}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-lg font-black text-amber-800">{t("valyuta.noRate")}</p>
                  <p className="mt-1 text-xs font-semibold text-amber-700">{t(tahrirlaydi ? "valyuta.noRateAdminHint" : "valyuta.noRateHint")}</p>
                </>
              )}
            </div>
          </div>
        )}
      </BolimKarta>

      {/* Kurs kiritish: faqat ADMIN/DIREKTOR */}
      {tahrirlaydi && (
        <BolimKarta sarlavha={t("valyuta.form.title")} izoh={t("valyuta.form.subtitle")}>
          <form onSubmit={(event) => void kursniSaqlash(event)} noValidate className="grid gap-4 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] sm:items-end">
            <XatoliMaydon xato={fx.xato("date")}>
            <Maydon label={t("valyuta.form.date")}>
              <input
                type="date"
                value={sana}
                onChange={(event) => {
                  setSana(event.target.value);
                  fx.tozala("date");
                }}
                aria-invalid={Boolean(fx.xato("date"))}
                className={maydonKlass}
              />
            </Maydon>
            </XatoliMaydon>
            <XatoliMaydon xato={fx.xato("rate")}>
            <Maydon label={t("valyuta.form.rate")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">1 $ =</span>
                <SummaMaydoni
                  id={KURS_KIRITMA_ID}
                  kasr={4}
                  value={kursKiritma}
                  onChange={(qiymat) => {
                    setKursKiritma(qiymat);
                    fx.tozala("rate");
                  }}
                  placeholder="12 650"
                  aria-invalid={Boolean(fx.xato("rate"))}
                  className={`${maydonKlass} pl-14 pr-14`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{t("valyuta.som")}</span>
              </div>
            </Maydon>
            </XatoliMaydon>
            <button
              type="submit"
              disabled={kursSaqlanmoqda}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {kursSaqlanmoqda && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
              {mavjudKurs ? t("valyuta.form.replace") : t("valyuta.form.save")}
            </button>
          </form>
          {mavjudKurs && !fx.bor && (
            <p className="mt-2 text-xs font-bold text-amber-700">
              {t("valyuta.form.willReplace", { sana: mavjudKurs.date, kurs: kursMatni(mavjudKurs.rate) })}
            </p>
          )}
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            <Info size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
            <span>
              {t("valyuta.form.rules")}
            </span>
          </p>
        </BolimKarta>
      )}

      {/* Kurslar tarixi */}
      <BolimKarta sarlavha={t("valyuta.history.title")} izoh={t("valyuta.history.subtitle", { kunlar: TARIX_KUNLARI })}>
        {royxat.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-400">
            {yuklanmoqda ? t("loadingGeneric") : t("valyuta.history.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <SmartTable tableId="SozlamalarUchot/ValyutaBolimi/table-1" replaceColumnControls><table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th data-column-id="h1" className="px-4 py-3">{t("valyuta.history.date")}</th>
                  <th data-column-id="h2" className="px-4 py-3 text-right">{t("valyuta.history.rate")}</th>
                  <th data-column-id="h3" className="px-4 py-3">{t("valyuta.history.updatedAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {royxat.map((yozuv) => {
                  const amalda = (amaldagi?.rateDate ?? null) === yozuv.date;
                  return (
                    <tr
                      key={yozuv.date}
                      onClick={() => qatorniTanlash(yozuv)}
                      className={tahrirlaydi ? "cursor-pointer transition hover:bg-orange-50/50" : undefined}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-bold tabular-nums text-slate-800">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={14} className="text-slate-400" aria-hidden />
                          {yozuv.date}
                          {yozuv.date === bugun && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-600">{t("valyuta.history.today")}</span>}
                          {amalda && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">{t("valyuta.history.active")}</span>}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums text-slate-900">{kursMatni(yozuv.rate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold tabular-nums text-slate-500">{vaqtMatni(yozuv.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></SmartTable>
          </div>
        )}
      </BolimKarta>
    </div>
  );
}
