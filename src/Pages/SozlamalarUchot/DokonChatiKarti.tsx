import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, MessageCircle, QrCode, Send, User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import QrKod from "@/Components/common/QrKod";
import { integratsiyalarApi, type TelegramIntegratsiya } from "@/api/integrationsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { xatoKodi } from "@/api/xatoKodlari";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { dokonChatHolati, dokonChatUlandimi, type DokonChatHolati, type TelegramHavola } from "@/lib/telegramXabarnoma";

const HOLAT_RANGI: Record<DokonChatHolati, string> = {
  ulangan: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ulanmagan: "bg-slate-100 text-slate-500 ring-slate-200",
  notogri: "bg-red-50 text-red-600 ring-red-100",
  xato: "bg-amber-50 text-amber-700 ring-amber-100",
};

// Sozlamalar → Telegram bot → Do'kon chati: qarz eslatmalari va sotuv xabarlari boradigan chat.
// Mijoz/yetkazib beruvchi kartasidagi kabi bir martalik havola (7 kun, shaxsiy yoki guruh) va QR: POST /integrations/telegram/shop-link.
// Havola ochilgach ~5 soniyada GET /integrations/telegram qayta o'qiladi va `chatLinkedAt` yangilanganda "Ulangan" bo'ladi.
export default function DokonChatiKarti({ holat, onYangilandi }: { holat: TelegramIntegratsiya; onYangilandi: (yangi: TelegramIntegratsiya) => void }) {
  const { t } = useTranslation("sozlamalar_uchot");
  const [havola, setHavola] = useState<TelegramHavola | null>(null);
  const [havolaTuri, setHavolaTuri] = useState<"shaxsiy" | "guruh">("guruh");
  const [yaratilmoqda, setYaratilmoqda] = useState(false);
  const [nusxalandi, setNusxalandi] = useState(false);
  const [xato, setXato] = useState("");
  const faolRef = useRef(true);
  // Havola berilgan paytdagi chatLinkedAt: o'zgarsa chat ulangan.
  const oldingiUlanish = useRef<string | null>(null);

  useEffect(() => {
    faolRef.current = true;
    return () => {
      faolRef.current = false;
    };
  }, []);

  const tur = dokonChatHolati(holat);

  const tekshirish = useCallback(async () => {
    try {
      const yangi = await integratsiyalarApi.telegramOlish(true);
      if (!faolRef.current) return;
      if (dokonChatUlandimi(oldingiUlanish.current, yangi.chatLinkedAt)) {
        setHavola(null);
        onYangilandi(yangi);
      }
    } catch {
      // Fon tekshiruvi: keyingi urinishda qayta so'raladi.
    }
  }, [onYangilandi]);

  // Havola ko'rsatilgan: ~5 soniyada bir tekshiriladi (ko'pi bilan 5 daqiqa).
  useEffect(() => {
    if (!havola) return;
    let marta = 0;
    const interval = window.setInterval(() => {
      marta += 1;
      if (marta > 60) {
        window.clearInterval(interval);
        return;
      }
      void tekshirish();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [havola, tekshirish]);

  async function havolaYaratish() {
    if (yaratilmoqda) return;
    setYaratilmoqda(true);
    setXato("");
    setNusxalandi(false);
    try {
      oldingiUlanish.current = holat.chatLinkedAt ?? null;
      const yangi = await integratsiyalarApi.dokonChatHavolasi();
      if (faolRef.current) {
        setHavola(yangi);
        setHavolaTuri(yangi.groupUrl ? "guruh" : "shaxsiy");
      }
    } catch (error) {
      // Bot yoqilmagan yoki token saqlanmagan: 400 errors.integrations.invalid_bot_token.
      const kod = axios.isAxiosError(error) ? xatoKodi(error.response?.data) : undefined;
      if (faolRef.current) setXato(kod?.endsWith("invalid_bot_token") ? t("integratsiya.shopChat.botOff") : getApiErrorMessage(error));
    } finally {
      if (faolRef.current) setYaratilmoqda(false);
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
    <div data-testid="dokon-chati" className="mt-3 rounded-xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-black text-gray-800">
          <MessageCircle size={16} className="text-[#229ED9]" />
          {t("integratsiya.shopChat.title")}
        </p>
        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${HOLAT_RANGI[tur]}`}>{t(`integratsiya.shopChat.status.${tur}`)}</span>
      </div>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{t("integratsiya.shopChat.subtitle")}</p>
      {tur === "ulangan" && holat.chatLinkedAt && (
        <p className="mt-1 text-xs font-semibold text-slate-600">{t("integratsiya.shopChat.linkedAt", { vaqt: vaqtMatni(holat.chatLinkedAt) })}</p>
      )}
      {tur === "notogri" && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">{t("integratsiya.shopChat.hints.notogri")}</p>}
      {tur === "xato" && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">
          {t("integratsiya.shopChat.hints.xato", { xato: holat.chatLastError ?? "" })}
        </p>
      )}

      {xato && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600">{xato}</p>}

      {havola && (
        <div className="mt-3 rounded-2xl border border-sky-100 bg-white p-4">
          {guruhUrl && (
            <div role="tablist" aria-label={t("integratsiya.shopChat.linkTitle")} className="mb-4 inline-flex rounded-xl bg-slate-50 p-1 ring-1 ring-sky-100">
              {(["guruh", "shaxsiy"] as const).map((turi) => (
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
                  {t(turi === "guruh" ? "integratsiya.shopChat.groupLink" : "integratsiya.shopChat.personalLink")}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-sky-100">
              <QrKod qiymat={korsatilgan} olcham={152} aria-label={t("integratsiya.shopChat.qrAria")} />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
                <QrCode size={14} className="text-[#229ED9]" />
                {t("integratsiya.shopChat.linkTitle")}
              </p>
              <input
                readOnly
                value={korsatilgan}
                onFocus={(event) => event.currentTarget.select()}
                aria-label={t("integratsiya.shopChat.linkTitle")}
                className="h-10 w-full rounded-xl border border-sky-100 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#229ED9]"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void nusxalash()} className={`${tugmaKlassi} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`}>
                  {nusxalandi ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {nusxalandi ? t("integratsiya.shopChat.copied") : t("integratsiya.shopChat.copy")}
                </button>
                <a href={korsatilgan} target="_blank" rel="noopener noreferrer" className={`${tugmaKlassi} bg-[#229ED9] text-white hover:bg-[#1c8bc0]`}>
                  <ExternalLink size={15} />
                  {t("integratsiya.shopChat.openInTelegram")}
                </a>
              </div>
              <p className="text-xs font-semibold leading-5 text-slate-600">
                {t(havolaTuri === "guruh" && guruhUrl ? "integratsiya.shopChat.groupHint" : "integratsiya.shopChat.personalHint")}
              </p>
              <p className="text-xs font-semibold leading-5 text-slate-500">
                {havola.expiresAt ? t("integratsiya.shopChat.expires", { vaqt: vaqtMatni(havola.expiresAt) }) : t("integratsiya.shopChat.oneTime")}
              </p>
              <p className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                <LoaderCircle size={13} className="animate-spin" />
                {t("integratsiya.shopChat.waiting")}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void havolaYaratish()}
        disabled={yaratilmoqda}
        className={`${tugmaKlassi} mt-3 bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,.2)] hover:bg-[#1D4ED8]`}
      >
        {yaratilmoqda ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
        {yaratilmoqda ? t("integratsiya.shopChat.creating") : havola ? t("integratsiya.shopChat.newLink") : tur === "ulangan" ? t("integratsiya.shopChat.relink") : t("integratsiya.shopChat.link")}
      </button>
    </div>
  );
}
