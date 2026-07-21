import { useEffect, useState } from "react";
import { CreditCard, LoaderCircle, Printer, Send } from "lucide-react";
import { integratsiyalarApi, type PrinterIntegratsiya, type TelegramIntegratsiya } from "@/api/integrationsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { BolimKarta, SaqlashTugma, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

const tolovTizimlari = [
  { id: "payme", nomi: "Payme", tavsif: "Payme orqali onlayn to'lovlarni qabul qilish." },
  { id: "click", nomi: "Click", tavsif: "Click to'lov tizimi integratsiyasi." },
  { id: "uzum", nomi: "Uzum Nasiya", tavsif: "Uzum orqali to'lov va bo'lib to'lash." },
];

export default function IntegratsiyaBolimi() {
  const [tg, setTg] = useState<TelegramIntegratsiya>({});
  const [printer, setPrinter] = useState<PrinterIntegratsiya>({});
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState<"telegram" | "printer" | "">("");
  const [xato, setXato] = useState("");
  const [xabar, setXabar] = useState("");

  useEffect(() => {
    Promise.all([integratsiyalarApi.telegramOlish(), integratsiyalarApi.printerOlish()])
      .then(([telegram, printerData]) => { setTg(telegram); setPrinter(printerData); })
      .catch((error) => setXato(getApiErrorMessage(error)))
      .finally(() => setYuklanmoqda(false));
  }, []);

  async function telegramSaqlash() {
    setSaqlanmoqda("telegram"); setXato(""); setXabar("");
    try { setTg(await integratsiyalarApi.telegramYangilash({ botToken: tg.botToken ?? undefined, chatId: tg.chatId ?? undefined, isActive: Boolean(tg.isActive), crmBotEnabled: Boolean(tg.crmBotEnabled) })); setXabar("Telegram integratsiyasi backendga saqlandi."); }
    catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(""); }
  }

  async function printerSaqlash() {
    setSaqlanmoqda("printer"); setXato(""); setXabar("");
    try { setPrinter(await integratsiyalarApi.printerYangilash({ ipAddress: printer.ipAddress ?? undefined, port: Number(printer.port || 0) || undefined, isActive: Boolean(printer.isActive) })); setXabar("Printer integratsiyasi backendga saqlandi."); }
    catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(""); }
  }

  if (yuklanmoqda) return <BolimKarta sarlavha="Integratsiya" izoh="Real integratsiyalar yuklanmoqda."><div className="flex h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>Yuklanmoqda...</div></BolimKarta>;

  return <div className="space-y-5">
    {xato && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    {xabar && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">{xabar}</p>}
    <BolimKarta sarlavha="To'lov tizimlari" izoh="To'lov integratsiyalari UI'da saqlanadi, ammo backend endpointlari hali mavjud emas.">
      <div className="space-y-3">{tolovTizimlari.map((t) => <div key={t.id} className="rounded-2xl border border-orange-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]"><CreditCard size={18}/></span><div><p className="font-black text-gray-800">{t.nomi}<StatusBelgi ulangan={false}/></p><p className="text-xs text-gray-400">{t.tavsif}</p></div></div><Switch yoniq={false} onChange={() => undefined} disabled/></div><p className="mt-2 text-xs font-bold text-amber-600">Backend endpoint mavjud emas — soxta ulanish o'chirildi.</p></div>)}</div>
    </BolimKarta>
    <BolimKarta sarlavha="Telegram bot" izoh="Bildirishnoma va CRM botining real backend sozlamalari." amal={<SaqlashTugma onClick={() => void telegramSaqlash()}/>}>
      <div className="rounded-2xl border border-orange-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500"><Send size={18}/></span><div><p className="font-black text-gray-800">Telegram bot<StatusBelgi ulangan={Boolean(tg.isActive)}/></p><p className="text-xs text-gray-400">Bot token va chat ID backenddan olinadi.</p></div></div><Switch yoniq={Boolean(tg.isActive)} onChange={() => setTg((s) => ({ ...s, isActive: !s.isActive }))}/></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={tg.botToken ?? ""} onChange={(e) => setTg((s) => ({ ...s, botToken: e.target.value }))} placeholder="Bot token" className={maydonKlass}/><input value={tg.chatId ?? ""} onChange={(e) => setTg((s) => ({ ...s, chatId: e.target.value }))} placeholder="Chat ID" className={maydonKlass}/></div><label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={Boolean(tg.crmBotEnabled)} onChange={(e) => setTg((s) => ({ ...s, crmBotEnabled: e.target.checked }))} className="h-4 w-4 accent-orange-500"/>CRM bot faol</label>{saqlanmoqda === "telegram" && <p className="mt-2 text-xs font-bold text-slate-400">Saqlanmoqda...</p>}</div>
    </BolimKarta>
    <BolimKarta sarlavha="Chek printeri" izoh="Tarmoq printerining real backend sozlamalari." amal={<SaqlashTugma onClick={() => void printerSaqlash()}/>}>
      <div className="rounded-2xl border border-orange-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]"><Printer size={18}/></span><div><p className="font-black text-gray-800">Tarmoq printeri<StatusBelgi ulangan={Boolean(printer.isActive)}/></p><p className="text-xs text-gray-400">IP manzil va port orqali ulanadi.</p></div></div><Switch yoniq={Boolean(printer.isActive)} onChange={() => setPrinter((s) => ({ ...s, isActive: !s.isActive }))}/></div><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]"><input value={printer.ipAddress ?? ""} onChange={(e) => setPrinter((s) => ({ ...s, ipAddress: e.target.value }))} placeholder="192.168.1.100" className={maydonKlass}/><input type="number" value={printer.port ?? ""} onChange={(e) => setPrinter((s) => ({ ...s, port: e.target.value ? Number(e.target.value) : null }))} placeholder="9100" className={maydonKlass}/></div>{saqlanmoqda === "printer" && <p className="mt-2 text-xs font-bold text-slate-400">Saqlanmoqda...</p>}</div>
    </BolimKarta>
  </div>;
}

function StatusBelgi({ ulangan }: { ulangan: boolean }) { return <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${ulangan ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{ulangan ? "Ulangan" : "Ulanmagan"}</span>; }
