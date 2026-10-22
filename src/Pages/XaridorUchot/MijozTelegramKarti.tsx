import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, QrCode, RefreshCw, Send, Unlink } from "lucide-react";
import { useTranslation } from "react-i18next";
import QrKod from "@/Components/common/QrKod";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { mijozlarApi } from "@/api/partnersApi";
import { telegramApi } from "@/api/telegramApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { mijozTelegramHolati, mijozTelegramTuri, type MijozTelegramHolati, type TelegramHavola } from "@/lib/telegramXabarnoma";
import { TELEGRAM_HOLAT_RANGI } from "./telegramHolati";
import type { Xaridor } from "./types";

const HOLAT_RANGI = TELEGRAM_HOLAT_RANGI;

// Mijoz kartasi → Telegram bot: botga ulash havolasi (bir martalik, 7 kun), QR, holat va botdan uzish.
// POST/DELETE /partners/customers/:id/telegram-link; holat mijoz obyektidagi telegramChatId/LinkedAt/Notify/Blocked maydonlaridan.
// `havolaBilanOchish` — ochilishi bilan (mijoz hali ulanmagan bo'lsa) ulash havolasi darhol yaratiladi (ro'yxatdagi "Havola" tugmasi).
export default function MijozTelegramKarti({ xaridor, havolaBilanOchish = false }: { xaridor: Xaridor; havolaBilanOchish?: boolean }) {
  const { t } = useTranslation("xaridor_uchot");
  const [bot, setBot] = useState<MijozTelegramHolati>(() => xaridor.telegramBot ?? mijozTelegramHolati({}));
  const [havola, setHavola] = useState<TelegramHavola | null>(null);
  const [jarayon, setJarayon] = useState<"" | "yaratilmoqda" | "yangilanmoqda">("");
  const [uzishOchiq, setUzishOchiq] = useState(false);
  const [nusxalandi, setNusxalandi] = useState(false);
  const [xato, setXato] = useState("");
  const faolRef = useRef(true);

  useEffect(() => {
    faolRef.current = true;
    return () => {
      faolRef.current = false;
    };
  }, []);

  // Mijoz almashganda kartadagi holat qayta o'rnatiladi (ota komponent har safar yangi obyekt yasasa, ko'rsatilgan havola yo'qolmasligi uchun faqat id kuzatiladi).
  const boshlangichHolat = useRef(xaridor.telegramBot);
  boshlangichHolat.current = xaridor.telegramBot;
  useEffect(() => {
    setBot(boshlangichHolat.current ?? mijozTelegramHolati({}));
    setHavola(null);
    setXato("");
  }, [xaridor.id]);

  const tur = mijozTelegramTuri(bot);

  // Holat o'zgarganda (ulandi, uzildi, yangilandi) mijozlar ro'yxati xabardor qilinadi: ro'yxatdagi Telegram ustuni eskirib qolmasin.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mijoz:telegram", { detail: { id: xaridor.id, holat: bot } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot]);

  // Mijozni serverdan qayta o'qiydi (fon rejimida: xato toasti chiqmaydi). `jim` — avtomatik tekshiruv, tugma holatini o'zgartirmaydi.
  const yangilash = useCallback(
    async (jim = false) => {
      if (!jim) setJarayon("yangilanmoqda");
      try {
        const mijoz = await mijozlarApi.olish(xaridor.id, true);
        if (faolRef.current) setBot(mijozTelegramHolati(mijoz));
      } catch (error) {
        if (!jim && faolRef.current) setXato(getApiErrorMessage(error));
      } finally {
        if (!jim && faolRef.current) setJarayon("");
      }
    },
    [xaridor.id]
  );

  // Havola ko'rsatilgan va mijoz hali ulanmagan: ulanish tezroq ko'rinishi uchun ~5 soniyada bir tekshiriladi (ko'pi bilan 5 daqiqa).
  const ulangan = bot.ulangan;
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

  // Mijoz ulangach havola kerak emas.
  useEffect(() => {
    if (ulangan) setHavola(null);
  }, [ulangan]);

  const avtomatikBajarildi = useRef(false);
  useEffect(() => {
    if (!havolaBilanOchish || avtomatikBajarildi.current) return;
    avtomatikBajarildi.current = true;
    if (!bot.ulangan) void havolaYaratish();
    // Faqat ochilganda bir marta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function havolaYaratish() {
    if (jarayon) return;
    setJarayon("yaratilmoqda");
    setXato("");
    setNusxalandi(false);
    try {
      const yangi = await telegramApi.mijozHavolasi(xaridor.id);
      if (faolRef.current) setHavola(yangi);
    } catch (error) {
      // Bot yoqilmagan bo'lsa 400 errors.integrations.invalid_bot_token: tushunarli matn toastda ham chiqadi.
      if (faolRef.current) setXato(getApiErrorMessage(error));
    } finally {
      if (faolRef.current) setJarayon("");
    }
  }

  async function uzish() {
    try {
      await telegramApi.mijozniUzish(xaridor.id);
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

  async function nusxalash() {
    if (!havola) return;
    try {
      await navigator.clipboard.writeText(havola.url);
      setNusxalandi(true);
      window.setTimeout(() => {
        if (faolRef.current) setNusxalandi(false);
      }, 2000);
    } catch {
      // Clipboard ruxsat etilmasa foydalanuvchi havolani maydondan o'zi nusxalaydi.
    }
  }

  const tugmaKlassi =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100/80 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F3FB] text-[#229ED9]">
            <Send size={14} />
          </span>
          {t("telegramBot.title")}
        </h2>
        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${HOLAT_RANGI[tur]}`}>{t(`telegramBot.status.${tur}`)}</span>
      </div>

      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{t("telegramBot.subtitle")}</p>

      {ulangan && bot.ulanganVaqt && (
        <p className="mt-2 text-sm font-semibold text-slate-700">{t("telegramBot.linkedAt", { vaqt: vaqtMatni(bot.ulanganVaqt) })}</p>
      )}
      {tur === "ochirgan" && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">{t("telegramBot.hints.ochirgan")}</p>}
      {tur === "bloklagan" && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">{t("telegramBot.hints.bloklagan")}</p>}

      {xato && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600">{xato}</p>}

      {havola && !ulangan && (
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-sky-100">
              <QrKod qiymat={havola.url} olcham={152} aria-label={t("telegramBot.qrAria")} />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
                <QrCode size={14} className="text-[#229ED9]" />
                {t("telegramBot.linkTitle")}
              </p>
              <input
                readOnly
                value={havola.url}
                onFocus={(event) => event.currentTarget.select()}
                aria-label={t("telegramBot.linkTitle")}
                className="h-10 w-full rounded-xl border border-sky-100 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#229ED9]"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void nusxalash()} className={`${tugmaKlassi} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`}>
                  {nusxalandi ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {nusxalandi ? t("telegramBot.copied") : t("telegramBot.copy")}
                </button>
                <a href={havola.url} target="_blank" rel="noopener noreferrer" className={`${tugmaKlassi} bg-[#229ED9] text-white hover:bg-[#1c8bc0]`}>
                  <ExternalLink size={15} />
                  {t("telegramBot.openInTelegram")}
                </a>
              </div>
              <p className="text-xs font-semibold leading-5 text-slate-500">
                {havola.expiresAt ? t("telegramBot.expires", { vaqt: vaqtMatni(havola.expiresAt) }) : t("telegramBot.oneTime")}
              </p>
              <p className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                <LoaderCircle size={13} className="animate-spin" />
                {t("telegramBot.waiting")}
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
          <button
            type="button"
            onClick={() => setUzishOchiq(true)}
            className={`${tugmaKlassi} bg-red-50 text-red-600 ring-1 ring-red-100 hover:bg-red-100`}
          >
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
      {!ulangan && <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">{t("telegramBot.phoneHint")}</p>}

      {uzishOchiq && (
        <TasdiqlashOynasi
          ikonka={<Unlink size={24} />}
          sarlavha={t("telegramBot.disconnectConfirm.title")}
          nom={`${xaridor.ism} ${xaridor.familiya}`.trim() || xaridor.id}
          tavsif={t("telegramBot.disconnectConfirm.description")}
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
