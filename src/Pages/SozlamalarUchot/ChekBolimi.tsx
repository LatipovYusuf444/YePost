import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { kompaniyalarApi } from "@/api/omborApi";
import { sozlamaPreferencelariApi, type ChekSozlamasi } from "@/api/settingsPreferencesApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Kompaniya } from "@/types/ombor";
import { BolimKarta, Maydon, SaqlashTugma, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

const boshlangich: ChekSozlamasi = { title: "", footerText: "", showLogo: true, showPhone: true, showAddress: true };
export default function ChekBolimi() {
  const [kompaniya, setKompaniya] = useState<Kompaniya | null>(null); const [chek, setChek] = useState<ChekSozlamasi>(boshlangich);
  const [yuklanmoqda, setYuklanmoqda] = useState(true); const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState(""); const [xabar, setXabar] = useState("");
  useEffect(() => { Promise.all([kompaniyalarApi.royxat(), sozlamaPreferencelariApi.chekOlish()]).then(([companies, receipt]) => { setKompaniya(companies[0] ?? null); setChek(receipt); }).catch((error) => setXato(getApiErrorMessage(error))).finally(() => setYuklanmoqda(false)); }, []);
  async function saqlash() { setSaqlanmoqda(true); setXato(""); setXabar(""); try { const saved = await sozlamaPreferencelariApi.chekYangilash({ title: chek.title.trim(), footerText: chek.footerText.trim(), showLogo: chek.showLogo, showPhone: chek.showPhone, showAddress: chek.showAddress }); setChek(saved); setXabar("Chek sozlamalari backendga saqlandi."); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setSaqlanmoqda(false); } }
  const sarlavha = chek.title || kompaniya?.name || "YePost Savdo";
  return <BolimKarta sarlavha="Chek sozlamalari" izoh="Sotuv chekida ko'rinadigan real backend sozlamalari." amal={xabar ? <span className="text-sm font-bold text-emerald-600">Saqlandi ✓</span> : undefined}>
    {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    {yuklanmoqda ? <div className="flex h-40 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>Yuklanmoqda...</div> : <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4"><Maydon label="Chek sarlavhasi"><input value={chek.title} onChange={(e) => setChek((s) => ({ ...s, title: e.target.value }))} placeholder={kompaniya?.name || "YePost Savdo"} className={maydonKlass}/></Maydon><Maydon label="Pastki matn"><textarea value={chek.footerText} onChange={(e) => setChek((s) => ({ ...s, footerText: e.target.value }))} rows={2} className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-sm font-semibold outline-none focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"/></Maydon><Qator label="Logotipni ko'rsatish" yoniq={chek.showLogo} onChange={() => setChek((s) => ({ ...s, showLogo: !s.showLogo }))}/><Qator label="Telefonni ko'rsatish" yoniq={chek.showPhone} onChange={() => setChek((s) => ({ ...s, showPhone: !s.showPhone }))}/><Qator label="Manzilni ko'rsatish" yoniq={chek.showAddress} onChange={() => setChek((s) => ({ ...s, showAddress: !s.showAddress }))}/></div>
      <div><p className="mb-2 text-sm font-bold text-slate-400">Oldindan ko'rish</p><div className="mx-auto max-w-[280px] rounded-2xl border border-dashed border-slate-300 bg-white p-5 font-mono text-xs text-slate-700 shadow-inner">{chek.showLogo && <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 font-black text-[#FF6A00]">Y</div>}<p className="text-center text-sm font-black text-slate-900">{sarlavha}</p>{chek.showAddress && kompaniya?.address && <p className="mt-1 text-center text-[11px]">{kompaniya.address}</p>}{chek.showPhone && kompaniya?.phone && <p className="text-center text-[11px]">{kompaniya.phone}</p>}<div className="my-2 border-t border-dashed border-slate-300"/><div className="flex justify-between"><span>Mahsulot</span><span>100 000</span></div><div className="my-2 border-t border-dashed border-slate-300"/><div className="flex justify-between font-black"><span>JAMI</span><span>100 000 {kompaniya?.currency || "UZS"}</span></div>{chek.footerText && <p className="mt-3 text-center text-[11px] text-slate-500">{chek.footerText}</p>}</div></div>
    </div>}
    <div className="mt-6 flex justify-end"><SaqlashTugma disabled={saqlanmoqda || yuklanmoqda} onClick={() => void saqlash()}/></div>
  </BolimKarta>;
}
function Qator({ label, yoniq, onChange }: { label: string; yoniq: boolean; onChange: () => void }) { return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-bold text-slate-600">{label}</span><Switch yoniq={yoniq} onChange={onChange}/></div>; }
