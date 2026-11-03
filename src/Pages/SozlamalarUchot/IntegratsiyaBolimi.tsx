import { useEffect, useState } from "react";
import { CreditCard, KeyRound, LoaderCircle, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { integratsiyalarApi, type PrinterIntegratsiya, type TolovIntegratsiyasi, type TolovProvayderi } from "@/api/integrationsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import { BolimKarta, SaqlashTugma, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

const provayderKalitlari: Record<TolovProvayderi, "payme" | "click" | "uzum"> = {
  PAYME: "payme",
  CLICK: "click",
  UZUM: "uzum",
};

// Server xatosini to'lov provayderi / printer maydoniga bog'lash (kalit — backend maydon nomi).
const TOLOV_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  merchantId: { maydonlar: ["merchantId"], kodlar: ["merchant"], sozlar: ["merchant"] },
  serviceId: { maydonlar: ["serviceId"], kodlar: ["service_id"], sozlar: ["service id", "serviceid"] },
  secretKey: { maydonlar: ["secretKey"], kodlar: ["secret"], sozlar: ["secret", "maxfiy kalit", "секрет"] },
};
const PRINTER_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  ipAddress: { maydonlar: ["ipAddress"], kodlar: ["ip_address", "invalid_ip"], sozlar: ["ip manzil", "ip address", "ipaddress", "ip-адрес", "ip адрес"] },
  port: { maydonlar: ["port"], kodlar: ["invalid_port", "port_invalid"], sozlar: ["port must", "port 1", "порт"] },
};
const xatoTanasi = (error: unknown) => (axios.isAxiosError(error) ? error.response?.data : undefined);

export default function IntegratsiyaBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const provayderlar: Array<{ id: TolovProvayderi; nomi: string; tavsif: string }> = (
    ["PAYME", "CLICK", "UZUM"] as TolovProvayderi[]
  ).map((id) => ({
    id,
    nomi: t(`integratsiya.providers.${provayderKalitlari[id]}.name`),
    tavsif: t(`integratsiya.providers.${provayderKalitlari[id]}.description`),
  }));

  const [tolovlar, setTolovlar] = useState<Record<TolovProvayderi, TolovIntegratsiyasi | null>>({ PAYME: null, CLICK: null, UZUM: null });
  const [sirlar, setSirlar] = useState<Record<TolovProvayderi, string>>({ PAYME: "", CLICK: "", UZUM: "" });
  const [printer, setPrinter] = useState<PrinterIntegratsiya>({});
  const [yuklanmoqda, setYuklanmoqda] = useState(true); const [saqlanmoqda, setSaqlanmoqda] = useState("");
  const [xato, setXato] = useState(""); const [xabar, setXabar] = useState("");
  const tolovXato = useMaydonXatolari(TOLOV_XATO_QOIDALARI); const printerXato = useMaydonXatolari(PRINTER_XATO_QOIDALARI);
  // To'lov maydon xatolari oxirgi saqlangan provayder kartasida ko'rsatiladi.
  const [xatoliProvayder, setXatoliProvayder] = useState<TolovProvayderi | "">("");
  const tolovMaydonXatosi = (provider: TolovProvayderi, maydon: string) => (xatoliProvayder === provider ? tolovXato.xato(maydon) : undefined);

  useEffect(() => {
    Promise.all([integratsiyalarApi.printerOlish(), ...provayderlar.map((p) => integratsiyalarApi.tolovOlish(p.id))])
      .then(([printerData, payme, click, uzum]) => { setPrinter(printerData as PrinterIntegratsiya); setTolovlar({ PAYME: payme as TolovIntegratsiyasi, CLICK: click as TolovIntegratsiyasi, UZUM: uzum as TolovIntegratsiyasi }); })
      .catch((error) => setXato(getApiErrorMessage(error))).finally(() => setYuklanmoqda(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function xabarlarniTozalash() { setXato(""); setXabar(""); }
  async function tolovSaqlash(provider: TolovProvayderi) {
    const item = tolovlar[provider]; if (!item) return; setSaqlanmoqda(provider); xabarlarniTozalash(); tolovXato.ornat({}); setXatoliProvayder(provider);
    try { const secretKey = sirlar[provider].trim(); const saved = await integratsiyalarApi.tolovYangilash(provider, { merchantId: item.merchantId?.trim() || "", serviceId: provider === "CLICK" ? item.serviceId?.trim() || "" : undefined, secretKey: secretKey || undefined, isActive: Boolean(item.isActive) }); setTolovlar((s) => ({ ...s, [provider]: saved })); setSirlar((s) => ({ ...s, [provider]: "" })); setXabar(t("integratsiya.savedProvider", { provider })); } catch (error) { if (!tolovXato.serverdan(xatoTanasi(error))) setXato(getApiErrorMessage(error)); } finally { setSaqlanmoqda(""); }
  }
  async function printerSaqlash() { setSaqlanmoqda("printer"); xabarlarniTozalash(); printerXato.ornat({}); try { setPrinter(await integratsiyalarApi.printerYangilash({ ipAddress: printer.ipAddress ?? undefined, port: Number(printer.port || 0) || undefined, isActive: Boolean(printer.isActive) })); setXabar(t("integratsiya.printerSaved")); } catch (error) { if (!printerXato.serverdan(xatoTanasi(error))) setXato(getApiErrorMessage(error)); } finally { setSaqlanmoqda(""); } }

  if (yuklanmoqda) return <BolimKarta sarlavha={t("integratsiya.title")} izoh={t("integratsiya.loadingSubtitle")}><div className="flex h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>{t("loadingGeneric")}</div></BolimKarta>;
  return <div className="space-y-5">
    {(tolovXato.tepadagi || printerXato.tepadagi || xato) && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{tolovXato.tepadagi || printerXato.tepadagi || xato}</p>}{xabar && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">{xabar}</p>}
    <BolimKarta sarlavha={t("integratsiya.paymentsTitle")} izoh={t("integratsiya.paymentsSubtitle")}><div className="space-y-3">{provayderlar.map((p) => { const item = tolovlar[p.id]; if (!item) return null; return <div key={p.id} className="rounded-2xl border border-orange-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB]"><CreditCard size={18}/></span><div><p className="font-black text-gray-800">{p.nomi}<StatusBelgi ulangan={Boolean(item.isActive)}/></p><p className="text-xs text-gray-400">{p.tavsif}</p></div></div><Switch yoniq={Boolean(item.isActive)} onChange={() => setTolovlar((s) => ({ ...s, [p.id]: { ...item, isActive: !item.isActive } }))}/></div><div className={`mt-3 grid gap-3 ${p.id === "CLICK" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}><XatoliMaydon xato={tolovMaydonXatosi(p.id, "merchantId")}><input value={item.merchantId ?? ""} onChange={(e) => { if (xatoliProvayder === p.id) tolovXato.tozala("merchantId"); setTolovlar((s) => ({ ...s, [p.id]: { ...item, merchantId: e.target.value } })); }} placeholder={t("integratsiya.merchantIdPlaceholder")} className={maydonKlass}/></XatoliMaydon>{p.id === "CLICK" && <XatoliMaydon xato={tolovMaydonXatosi(p.id, "serviceId")}><input value={item.serviceId ?? ""} onChange={(e) => { if (xatoliProvayder === p.id) tolovXato.tozala("serviceId"); setTolovlar((s) => ({ ...s, [p.id]: { ...item, serviceId: e.target.value } })); }} placeholder={t("integratsiya.serviceIdPlaceholder")} className={maydonKlass}/></XatoliMaydon>}<XatoliMaydon xato={tolovMaydonXatosi(p.id, "secretKey")}><div className="relative"><KeyRound size={16} className="absolute left-3 top-3.5 text-slate-400"/><input type="password" value={sirlar[p.id]} onChange={(e) => { if (xatoliProvayder === p.id) tolovXato.tozala("secretKey"); setSirlar((s) => ({ ...s, [p.id]: e.target.value })); }} placeholder={item.hasSecretKey ? t("integratsiya.secretKeySaved") : t("integratsiya.secretKeyPlaceholder")} className={`${maydonKlass} pl-10`}/></div></XatoliMaydon></div><div className="mt-3 flex justify-end"><SaqlashTugma disabled={saqlanmoqda === p.id} onClick={() => void tolovSaqlash(p.id)}/></div></div>; })}</div></BolimKarta>
    <BolimKarta sarlavha={t("integratsiya.printerTitle")} izoh={t("integratsiya.printerSubtitle")} amal={<SaqlashTugma disabled={saqlanmoqda === "printer"} onClick={() => void printerSaqlash()}/>}><div className="rounded-2xl border border-orange-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB]"><Printer size={18}/></span><div><p className="font-black text-gray-800">{t("integratsiya.printerTitle")}<StatusBelgi ulangan={Boolean(printer.isActive)}/></p><p className="text-xs text-gray-400">{t("integratsiya.printerCardDescription")}</p></div></div><Switch yoniq={Boolean(printer.isActive)} onChange={() => setPrinter((s) => ({ ...s, isActive: !s.isActive }))}/></div><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]"><XatoliMaydon xato={printerXato.xato("ipAddress")}><input value={printer.ipAddress ?? ""} onChange={(e) => { printerXato.tozala("ipAddress"); setPrinter((s) => ({ ...s, ipAddress: e.target.value })); }} placeholder="192.168.1.100" className={maydonKlass}/></XatoliMaydon><XatoliMaydon xato={printerXato.xato("port")}><input type="number" value={printer.port ?? ""} onChange={(e) => { printerXato.tozala("port"); setPrinter((s) => ({ ...s, port: e.target.value ? Number(e.target.value) : null })); }} placeholder="9100" className={maydonKlass}/></XatoliMaydon></div></div></BolimKarta>
  </div>;
}
function StatusBelgi({ ulangan }: { ulangan: boolean }) {
  const { t } = useTranslation("sozlamalar_uchot");
  return <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${ulangan ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{ulangan ? t("integratsiya.connected") : t("integratsiya.disconnected")}</span>;
}
