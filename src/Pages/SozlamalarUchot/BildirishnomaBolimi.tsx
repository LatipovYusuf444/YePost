import { useEffect, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { crmApi } from "@/api/crmApi";
import { sozlamaPreferencelariApi, type BildirishnomaPreference } from "@/api/settingsPreferencesApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Bildirishnoma } from "@/types/crm";
import { BolimKarta, Switch } from "./UmumiyUI";

type QatorKaliti = keyof Pick<BildirishnomaPreference, "newSale" | "lowStock" | "dailyReport" | "newCustomer">;
const qatorKalitlari: QatorKaliti[] = ["newSale", "lowStock", "dailyReport", "newCustomer"];
const defaultPreference: BildirishnomaPreference = { newSale: true, lowStock: true, dailyReport: false, newCustomer: true };

export default function BildirishnomaBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const qatorlar: Array<{ key: QatorKaliti; nom: string; izoh: string }> = qatorKalitlari.map((key) => ({
    key,
    nom: t(`bildirishnoma.rows.${key}.name`),
    izoh: t(`bildirishnoma.rows.${key}.description`),
  }));
  const [preference, setPreference] = useState(defaultPreference); const [items, setItems] = useState<Bildirishnoma[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true); const [amal, setAmal] = useState(""); const [xato, setXato] = useState("");
  async function xabarlarniYuklash() { setXato(""); try { setItems(await crmApi.bildirishnomalar()); } catch (error) { setXato(getApiErrorMessage(error)); } }
  useEffect(() => { Promise.all([sozlamaPreferencelariApi.bildirishnomaOlish(), crmApi.bildirishnomalar()]).then(([pref, notifications]) => { setPreference(pref); setItems(notifications); }).catch((error) => setXato(getApiErrorMessage(error))).finally(() => setYuklanmoqda(false)); }, []);
  async function preferenceAlmashtir(key: QatorKaliti) { const oldingi = preference; const yangi = { ...preference, [key]: !preference[key] }; setPreference(yangi); setAmal(key); setXato(""); try { setPreference(await sozlamaPreferencelariApi.bildirishnomaYangilash({ [key]: yangi[key] })); } catch (error) { setPreference(oldingi); setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  async function oqildi(id: string) { setAmal(id); try { await crmApi.bildirishnomaOqildi(id); await xabarlarniYuklash(); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  async function barchasi() { setAmal("all"); try { await crmApi.barchaBildirishnomalarOqildi(); await xabarlarniYuklash(); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  return <div className="space-y-5">
    <BolimKarta sarlavha={t("bildirishnoma.preferencesTitle")} izoh={t("bildirishnoma.preferencesSubtitle")}>
      {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      {yuklanmoqda ? <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={18}/>{t("loadingGeneric")}</div> : <div className="space-y-2.5">{qatorlar.map((qator) => <div key={qator.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5"><div><p className="text-sm font-black text-gray-800">{qator.nom}</p><p className="text-xs text-gray-400">{qator.izoh}</p></div><div className="flex items-center gap-2">{amal === qator.key && <LoaderCircle className="animate-spin text-orange-500" size={16}/>}<Switch yoniq={preference[qator.key]} disabled={Boolean(amal)} onChange={() => void preferenceAlmashtir(qator.key)}/></div></div>)}</div>}
    </BolimKarta>
    <BolimKarta sarlavha={t("bildirishnoma.listTitle")} izoh={t("bildirishnoma.listSubtitle")} amal={<button type="button" disabled={amal === "all" || items.length === 0 || items.every((x) => x.isRead)} onClick={() => void barchasi()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-50 px-4 text-sm font-black text-orange-600 disabled:opacity-40"><CheckCheck size={16}/>{t("bildirishnoma.markAllRead")}</button>}>
      {yuklanmoqda ? <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={18}/>{t("loadingGeneric")}</div> : <div className="divide-y divide-orange-100 overflow-hidden rounded-2xl border border-orange-100">{items.map((item) => <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.isRead ? "bg-white" : "bg-orange-50/50"}`}><span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Bell size={16}/></span><div className="min-w-0 flex-1"><p className="font-black text-slate-800">{item.title || t("bildirishnoma.defaultTitle")}</p><p className="text-sm text-slate-500">{item.text || item.message || t("bildirishnoma.noMessageText")}</p>{item.createdAt && <p className="mt-1 text-xs font-bold text-slate-400">{new Date(item.createdAt).toLocaleString("uz-UZ")}</p>}</div>{!item.isRead && <button type="button" disabled={amal === item.id} onClick={() => void oqildi(item.id)} className="rounded-lg px-3 py-2 text-xs font-black text-orange-600 hover:bg-orange-100 disabled:opacity-40">{t("bildirishnoma.markRead")}</button>}</div>)}{items.length === 0 && <p className="p-10 text-center text-sm font-bold text-slate-400">{t("bildirishnoma.empty")}</p>}</div>}
    </BolimKarta>
  </div>;
}
