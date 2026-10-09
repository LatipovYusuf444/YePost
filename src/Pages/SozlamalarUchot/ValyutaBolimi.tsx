import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CircleAlert, Info, LoaderCircle, Lock, RefreshCw, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import {
  kursniSongaAylantirish,
  valyutaApi,
  type AmaldagiKurs,
  type KursYozuvi,
} from "@/api/valyutaApi";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
import { useValyutaStore } from "@/lib/valyuta";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { BolimKarta, Maydon, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

const TARIX_KUNLARI = 90;
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

  const [yoniq, setYoniq] = useState(false);
  const [amaldagi, setAmaldagi] = useState<AmaldagiKurs | null>(null);
  const [royxat, setRoyxat] = useState<KursYozuvi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [rejimSaqlanmoqda, setRejimSaqlanmoqda] = useState(false);
  const [kursSaqlanmoqda, setKursSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [forma, setFormaXato] = useState<"" | "rate" | "date">("");
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
      // Rejim (ruxsat bo'lmasa) alohida o'qiladi: kurslar baribir ko'rsatiladi.
      const [rejim, joriy] = await Promise.all([
        valyutaApi.rejimniOlish().catch(() => null),
        valyutaApi.amaldagiKurs(),
      ]);
      const kurslar = await valyutaApi.kurslarRoyxati({ dateFrom: kunlarOldin(joriy.date, TARIX_KUNLARI) });
      setYoniq(rejim ? Boolean(rejim.enabled) : kursniSongaAylantirish(joriy.rate) !== null);
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

  async function rejimniOzgartirish() {
    if (!tahrirlaydi || rejimSaqlanmoqda) return;
    setRejimSaqlanmoqda(true);
    setXato("");
    setXabar("");
    try {
      const saqlangan = await valyutaApi.rejimniYangilash(!yoniq);
      setYoniq(Boolean(saqlangan.enabled));
      setXabar(t(saqlangan.enabled ? "valyuta.modeEnabledMessage" : "valyuta.modeDisabledMessage"));
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
      setFormaXato("date");
      return;
    }
    const kurs = kursniOqish(kursKiritma);
    if (!Number.isFinite(kurs) || kurs <= 0) {
      setFormaXato("rate");
      return;
    }
    setFormaXato("");

    setKursSaqlanmoqda(true);
    try {
      await valyutaApi.kursniBelgilash(sana, kurs);
      setXabar(t("valyuta.rateSavedMessage", { sana, kurs: kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) }));
      setKursKiritma("");
      await yuklash();
      void navbarniYangilash();
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setKursSaqlanmoqda(false);
    }
  }

  function qatorniTanlash(yozuv: KursYozuvi) {
    if (!tahrirlaydi) return;
    setSana(yozuv.date);
    setKursKiritma(String(kursniSongaAylantirish(yozuv.rate) ?? ""));
    setFormaXato("");
  }

  return (
    <div className="space-y-5">
      {xato && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
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
            <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800">{t("valyuta.modeLabel")}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{t(yoniq ? "valyuta.modeOnHint" : "valyuta.modeOffHint")}</p>
                {!tahrirlaydi && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <Lock size={12} aria-hidden /> {t("valyuta.readOnlyNotice")}
                  </p>
                )}
              </div>
              <Switch yoniq={yoniq} onChange={() => void rejimniOzgartirish()} disabled={!tahrirlaydi || rejimSaqlanmoqda} />
            </div>

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
            <Maydon label={t("valyuta.form.date")}>
              <input
                type="date"
                value={sana}
                onChange={(event) => {
                  setSana(event.target.value);
                  setFormaXato("");
                }}
                aria-invalid={forma === "date"}
                className={maydonKlass}
              />
            </Maydon>
            <Maydon label={t("valyuta.form.rate")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">1 $ =</span>
                <input
                  inputMode="decimal"
                  value={kursKiritma}
                  onChange={(event) => {
                    setKursKiritma(event.target.value.replace(/[^\d.,\s]/g, ""));
                    setFormaXato("");
                  }}
                  placeholder="12 650"
                  aria-invalid={forma === "rate"}
                  className={`${maydonKlass} pl-14 pr-14`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{t("valyuta.som")}</span>
              </div>
            </Maydon>
            <button
              type="submit"
              disabled={kursSaqlanmoqda}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {kursSaqlanmoqda && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
              {mavjudKurs ? t("valyuta.form.replace") : t("valyuta.form.save")}
            </button>
          </form>
          {forma === "date" && <p role="alert" className="mt-2 text-xs font-bold text-red-600">{t("valyuta.form.dateInvalid")}</p>}
          {forma === "rate" && <p role="alert" className="mt-2 text-xs font-bold text-red-600">{t("valyuta.form.rateInvalid")}</p>}
          {mavjudKurs && forma === "" && (
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
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("valyuta.history.date")}</th>
                  <th className="px-4 py-3 text-right">{t("valyuta.history.rate")}</th>
                  <th className="px-4 py-3">{t("valyuta.history.updatedAt")}</th>
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
            </table>
          </div>
        )}
      </BolimKarta>
    </div>
  );
}
