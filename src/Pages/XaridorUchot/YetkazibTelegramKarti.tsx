import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, QrCode, RefreshCw, Send, Unlink, User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import QrKod from "@/Components/common/QrKod";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { yetkazibBeruvchilarApi } from "@/api/partnersApi";
import { telegramApi } from "@/api/telegramApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { xatoKodi } from "@/api/xatoKodlari";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import {
  mijozTelegramHolati,
  mijozTelegramTuri,
  xabarTuri,
  xabarXatoMatni,
  type MijozTelegramHolati,
  type SotuvXabarTuri,
  type TelegramHavola,
  type XabarnomaYozuvi,
} from "@/lib/telegramXabarnoma";
import { TELEGRAM_HOLAT_RANGI } from "./telegramHolati";
import type { YetkazibBeruvchi } from "./types";

const XABAR_RANGI: Record<SotuvXabarTuri, string> = {
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

// Kartada ko'rsatiladigan oxirgi xabarlar soni.
const XABARLAR_SONI = 10;

// Yetkazib beruvchi kartasi → Telegram bot (mijoz kartasidagi bilan bir xil): bir martalik ulash havolasi (7 kun), QR, holat va botdan uzish.
// POST/DELETE /partners/suppliers/:id/telegram-link; holat yetkazib beruvchi obyektidagi telegramChatId/LinkedAt/Notify/Blocked maydonlaridan.
// Pastda yuborilgan xabarlar: GET /notification-logs?supplierId= (kirim, to'lov, boshlang'ich qarz). Xabarlarni backend o'zi yuboradi.
export default function YetkazibTelegramKarti({ beruvchi }: { beruvchi: YetkazibBeruvchi }) {
  const { t } = useTranslation("xaridor_uchot");
  const [bot, setBot] = useState<MijozTelegramHolati>(() => beruvchi.telegramBot ?? mijozTelegramHolati({}));
  const [havola, setHavola] = useState<TelegramHavola | null>(null);
  const [havolaTuri, setHavolaTuri] = useState<"shaxsiy" | "guruh">("shaxsiy");
  const [jarayon, setJarayon] = useState<"" | "yaratilmoqda" | "yangilanmoqda">("");
  const [uzishOchiq, setUzishOchiq] = useState(false);
  const [nusxalandi, setNusxalandi] = useState(false);
  const [xato, setXato] = useState("");
  const [xabarlar, setXabarlar] = useState<XabarnomaYozuvi[]>([]);
  const [xabarlarHolati, setXabarlarHolati] = useState<"yuklanmoqda" | "tayyor" | "xato">("yuklanmoqda");
  const faolRef = useRef(true);

  useEffect(() => {
    faolRef.current = true;
    return () => {
      faolRef.current = false;
    };
  }, []);

  // Yetkazib beruvchi almashganda holat qayta o'rnatiladi (faqat id kuzatiladi: ota komponent har safar yangi obyekt yasashi mumkin).
  const boshlangichHolat = useRef(beruvchi.telegramBot);
  boshlangichHolat.current = beruvchi.telegramBot;
  useEffect(() => {
    setBot(boshlangichHolat.current ?? mijozTelegramHolati({}));
    setHavola(null);
    setXato("");
  }, [beruvchi.id]);

  const tur = mijozTelegramTuri(bot);
  const ulangan = bot.ulangan;

  const xabarlarniYuklash = useCallback(async () => {
    try {
      const royxat = await telegramApi.xabarnomalar({ supplierId: beruvchi.id, pageSize: XABARLAR_SONI });
      if (!faolRef.current) return;
      setXabarlar(royxat.slice(0, XABARLAR_SONI));
      setXabarlarHolati("tayyor");
    } catch {
      if (faolRef.current) setXabarlarHolati("xato");
    }
  }, [beruvchi.id]);

  useEffect(() => {
    setXabarlarHolati("yuklanmoqda");
    void xabarlarniYuklash();
  }, [xabarlarniYuklash]);

  // Serverdan qayta o'qiydi (fon rejimida: xato toasti chiqmaydi). `jim` — avtomatik tekshiruv, tugma holatini o'zgartirmaydi.
  const yangilash = useCallback(
    async (jim = false) => {
      if (!jim) setJarayon("yangilanmoqda");
      try {
        const yangi = await yetkazibBeruvchilarApi.olish(beruvchi.id, true);
        if (faolRef.current) setBot(mijozTelegramHolati(yangi));
        if (!jim) void xabarlarniYuklash();
      } catch (error) {
        if (!jim && faolRef.current) setXato(getApiErrorMessage(error));
      } finally {
        if (!jim && faolRef.current) setJarayon("");
      }
    },
    [beruvchi.id, xabarlarniYuklash]
  );

  // Havola ko'rsatilgan va hali ulanmagan: ~5 soniyada bir tekshiriladi (ko'pi bilan 5 daqiqa).
  useEffect(() => {
    if (!havola || ulangan) return;
    let marta = 0;
    const interval = window.setInterval(() => {
      marta += 1;
      if (marta > 60) {
        window.clearInterval(interval);
        return;
      }
      void yangilash(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [havola, ulangan, yangilash]);

  useEffect(() => {
    if (ulangan) setHavola(null);
  }, [ulangan]);

  async function havolaYaratish() {
    if (jarayon) return;
    setJarayon("yaratilmoqda");
    setXato("");
    setNusxalandi(false);
    try {
      const yangi = await telegramApi.yetkazibHavolasi(beruvchi.id);
      if (faolRef.current) {
        setHavola(yangi);
        setHavolaTuri("shaxsiy");
      }
    } catch (error) {
      // Do'konda bot yoqilmagan: 400 errors.integrations.invalid_bot_token — "Avval sozlamalarda botni ulang".
      const kod = axios.isAxiosError(error) ? xatoKodi(error.response?.data) : undefined;
      if (faolRef.current) setXato(kod?.endsWith("invalid_bot_token") ? t("yetkazibDetails.telegram.botOff") : getApiErrorMessage(error));
    } finally {
      if (faolRef.current) setJarayon("");
    }
  }

  async function uzish() {
    try {
      await telegramApi.yetkazibniUzish(beruvchi.id);
      if (faolRef.current) {
        setHavola(null);
        setBot(mijozTelegramHolati({}));
      }
      await yangilash(true);
      return true;
    } catch (error) {
      if (faolRef.current) setXato(getApiErrorMessage(error));
      return false;
    }
  }

  const guruhUrl = havola?.groupUrl ?? null;
  const korsatilgan = havola ? (havolaTuri === "guruh" && guruhUrl ? guruhUrl : havola.url) : "";

  async function nusxalash() {
    if (!korsatilgan) return;
    try {
      await navigator.clipboard.writeText(korsatilgan);
      setNusxalandi(true);
      window.setTimeout(() => {
        if (faolRef.current) setNusxalandi(false);
      }, 2000);
    } catch {
      // Clipboard ruxsat etilmasa havola maydondan qo'lda nusxalanadi.
    }
  }

  const tugmaKlassi =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section data-testid="yetkazib-telegram" className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100/80 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F3FB] text-[#229ED9]">
            <Send size={14} />
          </span>
          {t("telegramBot.title")}
        </h2>
        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${TELEGRAM_HOLAT_RANGI[tur]}`}>{t(`telegramBot.status.${tur}`)}</span>
      </div>

      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{t("yetkazibDetails.telegram.subtitle")}</p>

      {ulangan && bot.ulanganVaqt && (
        <p className="mt-2 text-sm font-semibold text-slate-700">{t("telegramBot.linkedAt", { vaqt: vaqtMatni(bot.ulanganVaqt) })}</p>
      )}
      {tur === "ochirgan" && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">{t("yetkazibDetails.telegram.hints.ochirgan")}</p>}
      {tur === "bloklagan" && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">{t("yetkazibDetails.telegram.hints.bloklagan")}</p>}

      {xato && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600">{xato}</p>}

      {havola && !ulangan && (
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
          {guruhUrl && (
            <div role="tablist" aria-label={t("telegramBot.linkTitle")} className="mb-4 inline-flex rounded-xl bg-white p-1 ring-1 ring-sky-100">
              {(["shaxsiy", "guruh"] as const).map((turi) => (
                <button
                  key={turi}
                  type="button"
                  role="tab"
                  aria-selected={havolaTuri === turi}
                  onClick={() => {
                    setHavolaTuri(turi);
                    setNusxalandi(false);
                  }}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition ${
                    havolaTuri === turi ? "bg-[#229ED9] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {turi === "guruh" ? <Users size={14} /> : <User size={14} />}
                  {t(turi === "guruh" ? "telegramBot.groupLink" : "telegramBot.personalLink")}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-sky-100">
              <QrKod qiymat={korsatilgan} olcham={152} aria-label={t("telegramBot.qrAria")} />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
                <QrCode size={14} className="text-[#229ED9]" />
                {t(havolaTuri === "guruh" && guruhUrl ? "telegramBot.groupLinkTitle" : "telegramBot.linkTitle")}
              </p>
              <input
                readOnly
                value={korsatilgan}
                onFocus={(event) => event.currentTarget.select()}
                aria-label={t("telegramBot.linkTitle")}
                className="h-10 w-full rounded-xl border border-sky-100 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#229ED9]"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void nusxalash()} className={`${tugmaKlassi} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`}>
                  {nusxalandi ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {nusxalandi ? t("telegramBot.copied") : t("telegramBot.copy")}
                </button>
                <a href={korsatilgan} target="_blank" rel="noopener noreferrer" className={`${tugmaKlassi} bg-[#229ED9] text-white hover:bg-[#1c8bc0]`}>
                  <ExternalLink size={15} />
                  {t("telegramBot.openInTelegram")}
                </a>
              </div>
              {havolaTuri === "guruh" && guruhUrl && (
                <p className="text-xs font-semibold leading-5 text-slate-600">{t("yetkazibDetails.telegram.groupHint")}</p>
              )}
              <p className="text-xs font-semibold leading-5 text-slate-500">
                {havola.expiresAt ? t("yetkazibDetails.telegram.expires", { vaqt: vaqtMatni(havola.expiresAt) }) : t("yetkazibDetails.telegram.oneTime")}
              </p>
              <p className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                <LoaderCircle size={13} className="animate-spin" />
                {t("yetkazibDetails.telegram.waiting")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {!ulangan && (
          <button
            type="button"
            onClick={() => void havolaYaratish()}
            disabled={jarayon !== ""}
            className={`${tugmaKlassi} bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,.2)] hover:bg-[#1D4ED8]`}
          >
            {jarayon === "yaratilmoqda" ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
            {jarayon === "yaratilmoqda" ? t("telegramBot.creating") : havola ? t("telegramBot.newLink") : t("telegramBot.createLink")}
          </button>
        )}
        {(ulangan || tur === "bloklagan") && (
          <button type="button" onClick={() => setUzishOchiq(true)} className={`${tugmaKlassi} bg-red-50 text-red-600 ring-1 ring-red-100 hover:bg-red-100`}>
            <Unlink size={15} />
            {t("telegramBot.disconnect")}
          </button>
        )}
        <button
          type="button"
          onClick={() => void yangilash()}
          disabled={jarayon !== ""}
          className={`${tugmaKlassi} bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50`}
        >
          <RefreshCw size={15} className={jarayon === "yangilanmoqda" ? "animate-spin" : ""} />
          {t("telegramBot.refresh")}
        </button>
      </div>

      <div className="mt-5 border-t border-orange-100/80 pt-4">
        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{t("yetkazibDetails.telegram.history")}</p>
        {xabarlarHolati === "yuklanmoqda" ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <LoaderCircle size={14} className="animate-spin" />
            {t("openingDebt.loading")}
          </p>
        ) : xabarlarHolati === "xato" ? (
          <p className="text-sm font-semibold text-slate-400">{t("yetkazibDetails.telegram.historyError")}</p>
        ) : xabarlar.length === 0 ? (
          <p className="text-sm font-semibold text-slate-400">{t("yetkazibDetails.telegram.historyEmpty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white">
            {xabarlar.map((element) => {
              const elementTuri = xabarTuri(element);
              const elementXatosi = xabarXatoMatni(element);
              return (
                <li key={element.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                    {t(`yetkazibDetails.telegram.events.${element.event}`, { defaultValue: element.event })}
                    {element.attempts > 1 && (
                      <span className="ml-2 text-xs font-semibold text-slate-400">{t("yetkazibDetails.telegram.attempts", { soni: element.attempts })}</span>
                    )}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${XABAR_RANGI[elementTuri]}`}>
                    {t(`yetkazibDetails.telegram.logStatus.${elementTuri}`)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-slate-400">{vaqtMatni(element.sentAt ?? element.createdAt)}</span>
                  {elementXatosi && <span className="basis-full text-xs font-medium leading-5 text-red-500">{elementXatosi}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {uzishOchiq && (
        <TasdiqlashOynasi
          ikonka={<Unlink size={24} />}
          sarlavha={t("yetkazibDetails.telegram.disconnectConfirm.title")}
          nom={beruvchi.nomi || beruvchi.id}
          tavsif={t("yetkazibDetails.telegram.disconnectConfirm.description")}
          ortgaMatni={t("telegramBot.disconnectConfirm.no")}
          tasdiqMatni={t("telegramBot.disconnectConfirm.yes")}
          jarayonMatni={t("telegramBot.disconnectConfirm.working")}
          onTasdiq={uzish}
          onYopish={() => setUzishOchiq(false)}
        />
      )}
    </section>
  );
}
