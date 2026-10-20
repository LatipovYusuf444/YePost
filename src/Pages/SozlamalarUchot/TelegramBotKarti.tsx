import { useEffect, useState } from "react";
import { KeyRound, LoaderCircle, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { integratsiyalarApi, type TelegramIntegratsiya, type TelegramIntegratsiyaSaqlash } from "@/api/integrationsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { botTokenKerakmi } from "@/lib/telegramXabarnoma";
import { BolimKarta, SaqlashTugma, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

type Forma = {
  isActive: boolean;
  chatId: string;
  crmBotEnabled: boolean;
  sendOnSale: boolean;
  sendOnPayment: boolean;
  sendOnCancel: boolean;
  attachPdf: boolean;
};

// Xabar tugmalari backendda standart holatda yoqilgan (default true): javobda bo'lmasa ham yoqilgan deb olinadi.
function formaga(holat: TelegramIntegratsiya): Forma {
  return {
    isActive: Boolean(holat.isActive),
    chatId: holat.chatId ?? "",
    crmBotEnabled: Boolean(holat.crmBotEnabled),
    sendOnSale: holat.sendOnSale ?? true,
    sendOnPayment: holat.sendOnPayment ?? true,
    sendOnCancel: holat.sendOnCancel ?? true,
    attachPdf: holat.attachPdf ?? true,
  };
}

const XABAR_TUGMALARI = ["sendOnSale", "sendOnPayment", "sendOnCancel", "attachPdf"] as const;

// Sozlamalar → Integratsiya → Telegram bot: GET/PATCH /integrations/telegram.
// Backend tokenni qaytarmaydi (faqat oxirgi 4 belgisi): token maydoni bo'sh turadi va PATCH'ga faqat YANGI token yozilganda qo'shiladi.
export default function TelegramBotKarti() {
  const { t } = useTranslation("sozlamalar_uchot");
  const [holat, setHolat] = useState<TelegramIntegratsiya>({});
  const [forma, setForma] = useState<Forma>(() => formaga({}));
  const [token, setToken] = useState("");
  const [tokenXatosi, setTokenXatosi] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [xabar, setXabar] = useState("");

  useEffect(() => {
    let faol = true;
    integratsiyalarApi
      .telegramOlish()
      .then((javob) => {
        if (!faol) return;
        setHolat(javob);
        setForma(formaga(javob));
      })
      .catch((error) => {
        if (faol) setXato(getApiErrorMessage(error));
      })
      .finally(() => {
        if (faol) setYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
  }, []);

  function ozgartirish<K extends keyof Forma>(kalit: K, qiymat: Forma[K]) {
    setForma((joriy) => ({ ...joriy, [kalit]: qiymat }));
    setXabar("");
  }

  async function saqlash() {
    if (saqlanmoqda) return;
    setXato("");
    setXabar("");
    const yangiToken = token.trim();
    // Maydon bo'sh bo'lsa eski token saqlanadi: faqat saqlangan token (botTokenLast4) yo'q bo'lsa token so'raladi. Chat ID majburiy emas.
    if (botTokenKerakmi({ yoniq: forma.isActive, yangiToken, oxirgi4: holat.botTokenLast4 })) {
      setTokenXatosi(true);
      setXato(t("integratsiya.botTokenRequired"));
      return;
    }
    setSaqlanmoqda(true);
    const tana: TelegramIntegratsiyaSaqlash = {
      // Bo'sh token yuborilmaydi (backend 400 beradi); yuborilmasa eski token saqlanadi.
      ...(yangiToken ? { botToken: yangiToken } : {}),
      // Bo'sh Chat ID ham yuboriladi (backend qabul qiladi, avval yozilgan bo'lsa tozalanadi).
      chatId: forma.chatId.trim(),
      isActive: forma.isActive,
      crmBotEnabled: forma.crmBotEnabled,
      sendOnSale: forma.sendOnSale,
      sendOnPayment: forma.sendOnPayment,
      sendOnCancel: forma.sendOnCancel,
      attachPdf: forma.attachPdf,
    };
    try {
      const saqlangan = await integratsiyalarApi.telegramYangilash(tana);
      const yangi = { ...holat, ...saqlangan };
      setHolat(yangi);
      setForma(formaga(yangi));
      setToken("");
      setTokenXatosi(false);
      setXabar(t("integratsiya.telegramSaved"));
    } catch (error) {
      // Noto'g'ri token: 400 errors.integrations.invalid_bot_token — token maydoni yozilgan holda qoladi.
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  const oxirgi4 = holat.botTokenLast4 ?? "";
  const botNomi = (holat.botUsername ?? "").replace(/^@/, "");

  return (
    <BolimKarta
      sarlavha={t("integratsiya.telegramTitle")}
      izoh={t("integratsiya.telegramSubtitle")}
      amal={<SaqlashTugma disabled={saqlanmoqda || yuklanmoqda} onClick={() => void saqlash()} />}
    >
      {yuklanmoqda ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400">
          <LoaderCircle className="animate-spin" size={20} />
          {t("loadingGeneric")}
        </div>
      ) : (
        <div className="space-y-4">
          {xato && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
          {xabar && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">{xabar}</p>}

          <div className="rounded-2xl border border-orange-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                  <Send size={18} />
                </span>
                <div>
                  <p className="font-black text-gray-800">
                    {t("integratsiya.telegramTitle")}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${forma.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                      {forma.isActive ? t("integratsiya.connected") : t("integratsiya.disconnected")}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">{t("integratsiya.telegramCardDescription")}</p>
                  {botNomi && (
                    <a
                      href={`https://t.me/${botNomi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block text-xs font-bold text-sky-600 hover:underline"
                    >
                      {t("integratsiya.botUsername", { nom: botNomi })}
                    </a>
                  )}
                </div>
              </div>
              <Switch yoniq={forma.isActive} disabled={saqlanmoqda} onChange={() => ozgartirish("isActive", !forma.isActive)} />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid content-start gap-1.5">
                <span className="text-xs font-bold text-slate-400">{t("integratsiya.botTokenLabel")}</span>
                <div className="relative">
                  <KeyRound size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    autoComplete="off"
                    value={token}
                    disabled={saqlanmoqda}
                    onChange={(event) => {
                      setToken(event.target.value);
                      setTokenXatosi(false);
                      setXabar("");
                    }}
                    aria-invalid={tokenXatosi || undefined}
                    placeholder={oxirgi4 ? `••••${oxirgi4}` : t("integratsiya.botTokenPlaceholder")}
                    className={`${maydonKlass} pl-10 ${tokenXatosi ? "!border-red-400 !ring-4 !ring-red-100" : ""}`}
                  />
                </div>
                <span className="text-[11px] font-semibold leading-4 text-slate-400">
                  {oxirgi4 ? t("integratsiya.botTokenSaved", { oxirgi4 }) : t("integratsiya.botTokenHint")}
                </span>
              </label>
              <label className="grid content-start gap-1.5">
                <span className="text-xs font-bold text-slate-400">{t("integratsiya.chatIdLabel")}</span>
                <input
                  value={forma.chatId}
                  disabled={saqlanmoqda}
                  onChange={(event) => ozgartirish("chatId", event.target.value)}
                  placeholder={t("integratsiya.chatIdPlaceholder")}
                  className={maydonKlass}
                />
                <span className="text-[11px] font-semibold leading-4 text-slate-400">{t("integratsiya.chatIdHint")}</span>
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600">
              <input
                type="checkbox"
                checked={forma.crmBotEnabled}
                disabled={saqlanmoqda}
                onChange={(event) => ozgartirish("crmBotEnabled", event.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
              {t("integratsiya.crmBotEnabled")}
            </label>
          </div>

          <div className="rounded-2xl border border-orange-100 p-4">
            <p className="font-black text-gray-800">{t("integratsiya.customerMessagesTitle")}</p>
            <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-400">{t("integratsiya.customerMessagesHint")}</p>
            <div className="mt-3 space-y-2">
              {XABAR_TUGMALARI.map((kalit) => (
                <div key={kalit} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-bold text-slate-700">{t(`integratsiya.${kalit}`)}</span>
                  <Switch yoniq={forma[kalit]} disabled={saqlanmoqda} onChange={() => ozgartirish(kalit, !forma[kalit])} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </BolimKarta>
  );
}
