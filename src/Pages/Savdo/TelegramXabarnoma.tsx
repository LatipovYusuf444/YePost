import { useCallback, useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, RefreshCw, RotateCw, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { telegramApi } from "@/api/telegramApi";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { xatolikXabari } from "@/lib/toast";
import {
  navbatdaBormi,
  sotuvXabarHolati,
  xabarTuri,
  xabarXatoMatni,
  type SotuvXabarTuri,
  type XabarnomaYozuvi,
} from "@/lib/telegramXabarnoma";
import type { Sotuv } from "@/types/savdo";
import { sotuvHolati, sotuvRaqami } from "./savdoYordamchilari";

const BELGI_RANGI: Record<SotuvXabarTuri, string> = {
  yuborildi: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  navbatda: "bg-sky-50 text-sky-700 ring-sky-100",
  xato: "bg-red-50 text-red-600 ring-red-100",
  bloklangan: "bg-red-50 text-red-600 ring-red-100",
  ulanmagan: "bg-slate-100 text-slate-500 ring-slate-200",
  ochirilgan: "bg-slate-100 text-slate-500 ring-slate-200",
  mijozOchirgan: "bg-amber-50 text-amber-700 ring-amber-100",
  otkazilgan: "bg-slate-100 text-slate-500 ring-slate-200",
  yuborilmagan: "bg-slate-100 text-slate-500 ring-slate-200",
};

const TARIX_CHEGARASI = 5;
const NAVBAT_QAYTA_SORASH = 2500;
const NAVBAT_QAYTA_SORASH_SONI = 8;

// Sotuv kartasi: server nakladnoy PDF (GET /sales/:id/nakladnoy.pdf) va mijozga Telegram xabari holati.
// Holat GET /notification-logs?saleId= dan olinadi, "Qayta yuborish" — POST /sales/:id/notify.
// Qoralama sotuvda karta ko'rsatilmaydi; mijozsiz (chakana) sotuvga xabar yuborilmaydi, faqat PDF bor.
export default function TelegramXabarnomaKarti({ sotuv }: { sotuv: Sotuv }) {
  const { t } = useTranslation("savdo_tafsilot");
  const holat = sotuvHolati(sotuv);
  const tasdiqlangan = holat === "CONFIRMED";
  const korsatiladi = holat !== "DRAFT";
  const mijozId = sotuv.customerId ?? sotuv.customer?.id ?? "";

  const [yozuvlar, setYozuvlar] = useState<XabarnomaYozuvi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [yuklashXatosi, setYuklashXatosi] = useState(false);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [pdfYuklanmoqda, setPdfYuklanmoqda] = useState(false);
  const [navbatgaQoyildi, setNavbatgaQoyildi] = useState(false);
  const faolRef = useRef(true);
  const sorovTartibi = useRef(0);

  useEffect(() => {
    faolRef.current = true;
    return () => {
      faolRef.current = false;
    };
  }, []);

  const yuklash = useCallback(
    async (jim = false) => {
      if (!korsatiladi || !mijozId) return [] as XabarnomaYozuvi[];
      const tartib = (sorovTartibi.current += 1);
      if (!jim) setYuklanmoqda(true);
      try {
        const royxat = await telegramApi.xabarnomalar({ saleId: sotuv.id, pageSize: 20 });
        // Eskirgan javob yangisini bosib ketmasin (tez-tez bosilganda).
        if (faolRef.current && tartib === sorovTartibi.current) {
          setYozuvlar(royxat);
          setYuklashXatosi(false);
        }
        return royxat;
      } catch {
        if (faolRef.current && tartib === sorovTartibi.current) setYuklashXatosi(true);
        return [] as XabarnomaYozuvi[];
      } finally {
        if (faolRef.current && !jim) setYuklanmoqda(false);
      }
    },
    [korsatiladi, mijozId, sotuv.id]
  );

  // Sotuv ochilganda va holati (tasdiqlandi/bekor qilindi) o'zgarganda yozuvlar qayta o'qiladi.
  useEffect(() => {
    setYozuvlar([]);
    setYuklashXatosi(false);
    void yuklash();
  }, [yuklash, holat]);

  // Navbatdagi (QUEUED) yozuv bor: backend yuborib bo'lguncha qisqa vaqt oraliqda qayta so'raladi.
  const navbatda = navbatdaBormi(yozuvlar);
  useEffect(() => {
    if (!navbatda) return;
    let marta = 0;
    const interval = window.setInterval(() => {
      marta += 1;
      if (marta > NAVBAT_QAYTA_SORASH_SONI) {
        window.clearInterval(interval);
        return;
      }
      void yuklash(true);
    }, NAVBAT_QAYTA_SORASH);
    return () => window.clearInterval(interval);
  }, [navbatda, yuklash]);

  async function qaytaYuborish() {
    if (yuborilmoqda) return;
    setYuborilmoqda(true);
    setNavbatgaQoyildi(false);
    try {
      await telegramApi.sotuvniQaytaYuborish(sotuv.id);
      if (faolRef.current) setNavbatgaQoyildi(true);
      await yuklash(true);
    } catch {
      // Xato toasti (qoralama / mijozsiz / topilmadi / bot yoqilmagan) umumiy interceptor orqali ko'rsatiladi.
    } finally {
      if (faolRef.current) setYuborilmoqda(false);
    }
  }

  async function nakladnoyniYuklash() {
    if (pdfYuklanmoqda) return;
    setPdfYuklanmoqda(true);
    try {
      await telegramApi.nakladnoyYuklash(sotuv.id, sotuvRaqami(sotuv));
    } catch (error) {
      xatolikXabari(getApiErrorMessage(error));
    } finally {
      if (faolRef.current) setPdfYuklanmoqda(false);
    }
  }

  if (!korsatiladi) return null;

  const { tur, yozuv } = sotuvXabarHolati(yozuvlar);
  const sabab = yozuv ? xabarXatoMatni(yozuv) : null;
  const tarix = yozuvlar.slice(0, TARIX_CHEGARASI);

  return (
    <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(37,99,235,.08)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-orange-100 pb-3">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">{t("telegramXabar.title")}</h2>
        {tasdiqlangan && (
          <button
            type="button"
            onClick={() => void nakladnoyniYuklash()}
            disabled={pdfYuklanmoqda}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2563EB] px-3.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(37,99,235,.22)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pdfYuklanmoqda ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfYuklanmoqda ? t("telegramXabar.pdfLoading") : t("telegramXabar.pdfButton")}
          </button>
        )}
      </div>

      {!mijozId ? (
        <p className="mt-4 text-sm font-medium leading-6 text-slate-400">{t("telegramXabar.noCustomer")}</p>
      ) : (
        <div className="mt-4 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E7F3FB] text-[#229ED9]">
              <Send size={15} />
            </span>
            <span className="text-sm font-bold text-slate-500">{t("telegramXabar.label")}</span>
            {yuklanmoqda && yozuvlar.length === 0 ? (
              <LoaderCircle size={16} className="animate-spin text-slate-300" />
            ) : yuklashXatosi && yozuvlar.length === 0 ? (
              <span className="text-xs font-semibold text-slate-400">{t("telegramXabar.loadError")}</span>
            ) : (
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${BELGI_RANGI[tur]}`}>{t(`telegramXabar.status.${tur}`)}</span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void yuklash()}
                disabled={yuklanmoqda}
                aria-label={t("telegramXabar.refresh")}
                title={t("telegramXabar.refresh")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <RefreshCw size={15} className={yuklanmoqda ? "animate-spin" : ""} />
              </button>
              {tasdiqlangan && (
                <button
                  type="button"
                  onClick={() => void qaytaYuborish()}
                  disabled={yuborilmoqda}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-orange-50 hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {yuborilmoqda ? <LoaderCircle size={13} className="animate-spin" /> : <RotateCw size={13} />}
                  {t("telegramXabar.resend")}
                </button>
              )}
            </div>
          </div>

          {yozuv && (
            <p className="text-xs font-semibold leading-5 text-slate-500">
              {sabab ?? t(`telegramXabar.reason.${tur}`, { defaultValue: "" })}
            </p>
          )}
          {navbatgaQoyildi && <p role="status" className="text-xs font-bold text-emerald-600">{t("telegramXabar.queued")}</p>}

          {tarix.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{t("telegramXabar.history")}</p>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white">
                {tarix.map((element) => {
                  const elementTuri = xabarTuri(element);
                  const elementXatosi = xabarXatoMatni(element);
                  return (
                    <li key={element.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                        {t(`telegramXabar.events.${element.event}`, { defaultValue: element.event })}
                        {element.attempts > 1 && (
                          <span className="ml-2 text-xs font-semibold text-slate-400">{t("telegramXabar.attempts", { soni: element.attempts })}</span>
                        )}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${BELGI_RANGI[elementTuri]}`}>{t(`telegramXabar.status.${elementTuri}`)}</span>
                      <span className="text-xs font-semibold tabular-nums text-slate-400">{vaqtMatni(element.sentAt ?? element.createdAt)}</span>
                      {elementXatosi && <span className="basis-full text-xs font-medium leading-5 text-red-500">{elementXatosi}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
