import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { kompaniyalarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Kompaniya } from "@/types/ombor";
import { BolimKarta, Maydon, SaqlashTugma } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function KompaniyaBolimi() {
  const [joriy, setJoriy] = useState<Kompaniya | null>(null);
  const [nomi, setNomi] = useState("");
  const [stir, setStir] = useState("");
  const [telefon, setTelefon] = useState("");
  const [manzil, setManzil] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xabar, setXabar] = useState("");
  const [xato, setXato] = useState("");

  useEffect(() => {
    let active = true;
    kompaniyalarApi.royxat().then((items) => {
      if (!active) return;
      const item = items[0] ?? null;
      setJoriy(item);
      setNomi(item?.name ?? "");
      setStir(item?.inn ?? "");
      setTelefon(item?.phone ?? "");
      setManzil(item?.address ?? "");
    }).catch((error) => active && setXato(getApiErrorMessage(error))).finally(() => active && setYuklanmoqda(false));
    return () => { active = false; };
  }, []);

  async function saqlash() {
    if (!nomi.trim()) { setXato("Kompaniya nomi majburiy."); return; }
    setSaqlanmoqda(true); setXato(""); setXabar("");
    try {
      const payload = { name: nomi.trim(), inn: stir.trim() || undefined, phone: telefon.trim() || undefined, address: manzil.trim() || undefined };
      const saved = joriy ? await kompaniyalarApi.yangilash(joriy.id, payload) : await kompaniyalarApi.yaratish(payload);
      setJoriy(saved);
      setXabar("Kompaniya ma'lumotlari backendga saqlandi.");
    } catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(false); }
  }

  return (
    <BolimKarta sarlavha="Kompaniya ma'lumotlari" izoh="Hujjatlar va cheklarda ishlatiladigan real tashkilot ma'lumotlari." amal={xabar ? <span className="text-sm font-bold text-emerald-600">Saqlandi ✓</span> : undefined}>
      {yuklanmoqda ? <div className="flex h-44 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>Yuklanmoqda...</div> : <>
        {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Maydon label="Kompaniya nomi"><input value={nomi} onChange={(e) => setNomi(e.target.value)} className={maydonKlass} /></Maydon>
          <Maydon label="STIR"><input value={stir} onChange={(e) => setStir(e.target.value)} className={maydonKlass} /></Maydon>
          <Maydon label="Telefon"><input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={maydonKlass} /></Maydon>
          <Maydon label="Valyuta"><select value="so'm" disabled className={`${maydonKlass} bg-slate-50 text-slate-400`} title="Kompaniya DTO'sida valyuta maydoni mavjud emas"><option>so'm</option></select></Maydon>
          <div className="sm:col-span-2"><Maydon label="Manzil"><input value={manzil} onChange={(e) => setManzil(e.target.value)} className={maydonKlass} /></Maydon></div>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-400">Valyuta backend kompaniya contractida mavjud emas; u soxta saqlanmasligi uchun read-only.</p>
        <div className="mt-6 flex justify-end"><SaqlashTugma onClick={() => void saqlash()} /></div>
        {saqlanmoqda && <p className="mt-3 text-right text-xs font-bold text-slate-400">Backendga saqlanmoqda...</p>}
      </>}
    </BolimKarta>
  );
}
