import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { kompaniyalarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Kompaniya } from "@/types/ombor";
import { BolimKarta, Maydon, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function ChekBolimi() {
  const [kompaniya, setKompaniya] = useState<Kompaniya | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  useEffect(() => { kompaniyalarApi.royxat().then((items) => setKompaniya(items[0] ?? null)).catch((error) => setXato(getApiErrorMessage(error))).finally(() => setYuklanmoqda(false)); }, []);
  const sarlavha = kompaniya?.name || "YePost Savdo";
  return <BolimKarta sarlavha="Chek sozlamalari" izoh="Chek ko'rinishi saqlanishi uchun backend endpoint kerak.">
    {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">Backendda chek preference endpointi yo'q. Soxta saqlash o'chirildi; kompaniya ma'lumotlari real API'dan ko'rsatiladi.</p>
    {yuklanmoqda ? <div className="flex h-40 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>Yuklanmoqda...</div> : <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 opacity-70"><Maydon label="Chek sarlavhasi"><input value={sarlavha} disabled className={`${maydonKlass} bg-slate-50`}/></Maydon><Maydon label="Pastki matn"><textarea value="Xaridingiz uchun rahmat!" disabled rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold"/></Maydon><Qator label="Logotipni ko'rsatish"/><Qator label="Telefonni ko'rsatish"/><Qator label="Manzilni ko'rsatish"/></div>
      <div><p className="mb-2 text-sm font-bold text-slate-400">Oldindan ko'rish</p><div className="mx-auto max-w-[280px] rounded-2xl border border-dashed border-slate-300 bg-white p-5 font-mono text-xs text-slate-700 shadow-inner"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 font-black text-[#FF6A00]">Y</div><p className="text-center text-sm font-black text-slate-900">{sarlavha}</p>{kompaniya?.address && <p className="mt-1 text-center text-[11px]">{kompaniya.address}</p>}{kompaniya?.phone && <p className="text-center text-[11px]">{kompaniya.phone}</p>}<div className="my-2 border-t border-dashed border-slate-300"/><div className="flex justify-between"><span>Mahsulot</span><span>100 000</span></div><div className="my-2 border-t border-dashed border-slate-300"/><div className="flex justify-between font-black"><span>JAMI</span><span>100 000 so'm</span></div><p className="mt-3 text-center text-[11px] text-slate-500">Xaridingiz uchun rahmat!</p></div></div>
    </div>}
    <p className="mt-5 text-xs font-semibold text-slate-400">Backend uchun talab: GET/PATCH /api/v1/settings/receipt.</p>
  </BolimKarta>;
}
function Qator({ label }: { label: string }) { return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-bold text-slate-600">{label}</span><Switch yoniq onChange={() => undefined} disabled/></div>; }
