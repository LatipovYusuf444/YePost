import { useEffect, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { crmApi } from "@/api/crmApi";
import { sozlamaPreferencelariApi, type BildirishnomaPreference } from "@/api/settingsPreferencesApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Bildirishnoma } from "@/types/crm";
import { BolimKarta, Switch } from "./UmumiyUI";

const qatorlar: Array<{ key: keyof Pick<BildirishnomaPreference, "newSale" | "lowStock" | "dailyReport" | "newCustomer">; nom: string; izoh: string }> = [
  { key: "newSale", nom: "Yangi savdo", izoh: "Har yangi sotuv haqida xabar." },
  { key: "lowStock", nom: "Kam qoldiq", izoh: "Mahsulot tugab qolganda ogohlantirish." },
  { key: "dailyReport", nom: "Kunlik hisobot", izoh: "Har kun oxirida umumiy hisobot." },
  { key: "newCustomer", nom: "Yangi xaridor", izoh: "Yangi mijoz qo'shilganda xabar." },
];
const defaultPreference: BildirishnomaPreference = { newSale: true, lowStock: true, dailyReport: false, newCustomer: true };

export default function BildirishnomaBolimi() {
  const [preference, setPreference] = useState(defaultPreference); const [items, setItems] = useState<Bildirishnoma[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true); const [amal, setAmal] = useState(""); const [xato, setXato] = useState("");
  async function xabarlarniYuklash() { setXato(""); try { setItems(await crmApi.bildirishnomalar()); } catch (error) { setXato(getApiErrorMessage(error)); } }
  useEffect(() => { Promise.all([sozlamaPreferencelariApi.bildirishnomaOlish(), crmApi.bildirishnomalar()]).then(([pref, notifications]) => { setPreference(pref); setItems(notifications); }).catch((error) => setXato(getApiErrorMessage(error))).finally(() => setYuklanmoqda(false)); }, []);
  async function preferenceAlmashtir(key: (typeof qatorlar)[number]["key"]) { const oldingi = preference; const yangi = { ...preference, [key]: !preference[key] }; setPreference(yangi); setAmal(key); setXato(""); try { setPreference(await sozlamaPreferencelariApi.bildirishnomaYangilash({ [key]: yangi[key] })); } catch (error) { setPreference(oldingi); setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  async function oqildi(id: string) { setAmal(id); try { await crmApi.bildirishnomaOqildi(id); await xabarlarniYuklash(); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  async function barchasi() { setAmal("all"); try { await crmApi.barchaBildirishnomalarOqildi(); await xabarlarniYuklash(); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  return <div className="space-y-5">
    <BolimKarta sarlavha="Bildirishnoma sozlamalari" izoh="Har bir tanlov real backendga darhol saqlanadi.">
      {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      {yuklanmoqda ? <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={18}/>Yuklanmoqda...</div> : <div className="space-y-2.5">{qatorlar.map((qator) => <div key={qator.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5"><div><p className="text-sm font-black text-gray-800">{qator.nom}</p><p className="text-xs text-gray-400">{qator.izoh}</p></div><div className="flex items-center gap-2">{amal === qator.key && <LoaderCircle className="animate-spin text-orange-500" size={16}/>}<Switch yoniq={preference[qator.key]} disabled={Boolean(amal)} onChange={() => void preferenceAlmashtir(qator.key)}/></div></div>)}</div>}
    </BolimKarta>
    <BolimKarta sarlavha="Bildirishnomalar" izoh="CRM notification endpointidan olingan real xabarlar." amal={<button type="button" disabled={amal === "all" || items.length === 0 || items.every((x) => x.isRead)} onClick={() => void barchasi()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-50 px-4 text-sm font-black text-orange-600 disabled:opacity-40"><CheckCheck size={16}/>Barchasini o'qish</button>}>
      {yuklanmoqda ? <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={18}/>Yuklanmoqda...</div> : <div className="divide-y divide-orange-100 overflow-hidden rounded-2xl border border-orange-100">{items.map((item) => <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.isRead ? "bg-white" : "bg-orange-50/50"}`}><span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Bell size={16}/></span><div className="min-w-0 flex-1"><p className="font-black text-slate-800">{item.title || "Bildirishnoma"}</p><p className="text-sm text-slate-500">{item.text || item.message || "Xabar matni berilmagan"}</p>{item.createdAt && <p className="mt-1 text-xs font-bold text-slate-400">{new Date(item.createdAt).toLocaleString("uz-UZ")}</p>}</div>{!item.isRead && <button type="button" disabled={amal === item.id} onClick={() => void oqildi(item.id)} className="rounded-lg px-3 py-2 text-xs font-black text-orange-600 hover:bg-orange-100 disabled:opacity-40">O'qildi</button>}</div>)}{items.length === 0 && <p className="p-10 text-center text-sm font-bold text-slate-400">Bildirishnoma mavjud emas</p>}</div>}
    </BolimKarta>
  </div>;
}
