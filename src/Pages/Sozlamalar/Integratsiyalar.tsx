import { useEffect, useState, type FormEvent } from "react";
import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  MessageCircle,
  Printer,
  RefreshCw,
  Save,
} from "lucide-react";
import { integratsiyalarApi } from "@/api/integrationsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";

type FormaXatolari = {
  telegram?: string;
  printer?: string;
};

export default function Integratsiyalar() {
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramFaol, setTelegramFaol] = useState(false);
  const [crmBotFaol, setCrmBotFaol] = useState(false);
  const [tokenKorinsin, setTokenKorinsin] = useState(false);

  const [printerIp, setPrinterIp] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerFaol, setPrinterFaol] = useState(false);

  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState<"telegram" | "printer" | null>(
    null
  );
  const [xatolik, setXatolik] = useState("");
  const [muvaffaqiyat, setMuvaffaqiyat] = useState("");
  const [formaXatolari, setFormaXatolari] = useState<FormaXatolari>({});

  async function malumotlarniYuklash() {
    setYuklanmoqda(true);
    setXatolik("");
    setMuvaffaqiyat("");

    try {
      const [telegram, printer] = await Promise.all([
        integratsiyalarApi.telegramOlish(),
        integratsiyalarApi.printerOlish(),
      ]);

      setTelegramToken(telegram.botToken ?? "");
      setTelegramChatId(telegram.chatId ?? "");
      setTelegramFaol(Boolean(telegram.isActive));
      setCrmBotFaol(Boolean(telegram.crmBotEnabled));
      setPrinterIp(printer.ipAddress ?? "");
      setPrinterPort(String(printer.port ?? 9100));
      setPrinterFaol(Boolean(printer.isActive));
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }

  useEffect(() => {
    void malumotlarniYuklash();
  }, []);

  function telegramniTekshirish() {
    if (!telegramFaol) return "";
    if (!telegramToken.trim()) return "Bot token kiritilishi kerak.";
    if (!telegramChatId.trim()) return "Chat ID kiritilishi kerak.";
    return "";
  }

  function printerniTekshirish() {
    if (!printerFaol) return "";
    if (!printerIp.trim()) return "Printer IP manzili kiritilishi kerak.";
    const port = Number(printerPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return "Port 1 dan 65535 gacha butun son bo'lishi kerak.";
    }
    return "";
  }

  async function telegramniSaqlash(event: FormEvent) {
    event.preventDefault();
    setXatolik("");
    setMuvaffaqiyat("");
    const xato = telegramniTekshirish();
    setFormaXatolari((old) => ({ ...old, telegram: xato || undefined }));
    if (xato) return;

    setSaqlanmoqda("telegram");
    try {
      const data = await integratsiyalarApi.telegramYangilash({
        botToken: telegramToken.trim(),
        chatId: telegramChatId.trim(),
        isActive: telegramFaol,
        crmBotEnabled: crmBotFaol,
      });
      setTelegramToken(data.botToken ?? telegramToken.trim());
      setTelegramChatId(data.chatId ?? telegramChatId.trim());
      setTelegramFaol(Boolean(data.isActive));
      setCrmBotFaol(Boolean(data.crmBotEnabled));
      setMuvaffaqiyat("Telegram integratsiyasi saqlandi.");
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(null);
    }
  }

  async function printerniSaqlash(event: FormEvent) {
    event.preventDefault();
    setXatolik("");
    setMuvaffaqiyat("");
    const xato = printerniTekshirish();
    setFormaXatolari((old) => ({ ...old, printer: xato || undefined }));
    if (xato) return;

    setSaqlanmoqda("printer");
    try {
      const data = await integratsiyalarApi.printerYangilash({
        ipAddress: printerIp.trim(),
        port: Number(printerPort),
        isActive: printerFaol,
      });
      setPrinterIp(data.ipAddress ?? printerIp.trim());
      setPrinterPort(String(data.port ?? printerPort));
      setPrinterFaol(Boolean(data.isActive));
      setMuvaffaqiyat("Printer integratsiyasi saqlandi.");
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(null);
    }
  }

  if (yuklanmoqda) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl bg-white">
        <LoaderCircle className="animate-spin text-orange-500" size={34} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Tashqi xizmatlar
          </p>
          <h2 className="text-2xl font-black">Integratsiyalar</h2>
          <p className="mt-1 text-sm text-gray-500">
            Telegram xabarnomalari va ESC/POS chek printerini shu yerdan boshqaring.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void malumotlarniYuklash()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 font-bold text-gray-600 ring-1 ring-orange-100"
        >
          <RefreshCw size={16} />
          Qayta yuklash
        </button>
      </div>

      {xatolik && (
        <div className="flex justify-between rounded-2xl bg-red-50 p-4 font-bold text-red-600">
          <span>{xatolik}</span>
          <button onClick={() => setXatolik("")}>Yopish</button>
        </div>
      )}

      {muvaffaqiyat && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
          <CheckCircle2 size={18} />
          {muvaffaqiyat}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <form
          onSubmit={telegramniSaqlash}
          className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-4 border-b border-orange-50 p-6">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Bot size={25} />
              </div>
              <div>
                <h3 className="text-xl font-black">Telegram bot</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Buyurtma, sotuv va muhim holatlar bo'yicha xabar yuborish.
                </p>
              </div>
            </div>
            <Toggle checked={telegramFaol} onChange={setTelegramFaol} />
          </div>

          <div className="space-y-4 p-6">
            <label className="block text-sm font-bold text-gray-700">
              Bot token
              <div className="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-white px-4 focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-50">
                <MessageCircle size={17} className="text-orange-500" />
                <input
                  type={tokenKorinsin ? "text" : "password"}
                  value={telegramToken}
                  onChange={(event) => setTelegramToken(event.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent px-3 font-semibold outline-none"
                  placeholder="123456789:AAExampleBotTokenString"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setTokenKorinsin((value) => !value)}
                  className="text-gray-400 hover:text-orange-500"
                  aria-label={tokenKorinsin ? "Tokenni yashirish" : "Tokenni ko'rsatish"}
                >
                  {tokenKorinsin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="block text-sm font-bold text-gray-700">
              Chat ID
              <input
                value={telegramChatId}
                onChange={(event) => setTelegramChatId(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 px-4 font-semibold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                placeholder="-1001234567890"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 p-4 font-bold text-gray-700">
              <span>
                CRM bot
                <span className="block text-xs font-medium text-gray-400">
                  Ikki tomonlama chat uchun Open Lines rejimi.
                </span>
              </span>
              <Toggle checked={crmBotFaol} onChange={setCrmBotFaol} compact />
            </label>

            {formaXatolari.telegram && (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                {formaXatolari.telegram}
              </p>
            )}

            <button
              disabled={saqlanmoqda === "telegram"}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white shadow-lg shadow-orange-200 disabled:opacity-60"
            >
              {saqlanmoqda === "telegram" ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Telegramni saqlash
            </button>
          </div>
        </form>

        <form
          onSubmit={printerniSaqlash}
          className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-4 border-b border-orange-50 p-6">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Printer size={25} />
              </div>
              <div>
                <h3 className="text-xl font-black">ESC/POS printer</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Kassa cheklarini lokal tarmoqdagi printerga chiqarish.
                </p>
              </div>
            </div>
            <Toggle checked={printerFaol} onChange={setPrinterFaol} />
          </div>

          <div className="space-y-4 p-6">
            <label className="block text-sm font-bold text-gray-700">
              IP manzil
              <input
                value={printerIp}
                onChange={(event) => setPrinterIp(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 px-4 font-semibold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                placeholder="192.168.1.100"
              />
            </label>

            <label className="block text-sm font-bold text-gray-700">
              Port
              <input
                type="number"
                min="1"
                max="65535"
                value={printerPort}
                onChange={(event) => setPrinterPort(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 px-4 font-semibold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                placeholder="9100"
              />
            </label>

            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
              Odatda ESC/POS printerlar 9100 port orqali ishlaydi. Printer va
              kompyuter bir xil lokal tarmoqda bo'lishi kerak.
            </div>

            {formaXatolari.printer && (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                {formaXatolari.printer}
              </p>
            )}

            <button
              disabled={saqlanmoqda === "printer"}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white shadow-lg shadow-orange-200 disabled:opacity-60"
            >
              {saqlanmoqda === "printer" ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Printerni saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  compact = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full transition ${
        compact ? "h-7 w-12" : "h-8 w-14"
      } ${checked ? "bg-orange-500" : "bg-gray-200"}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block rounded-full bg-white shadow transition ${
          compact ? "h-5 w-5" : "h-6 w-6"
        } ${checked ? (compact ? "translate-x-6" : "translate-x-7") : "translate-x-1"}`}
      />
    </button>
  );
}
