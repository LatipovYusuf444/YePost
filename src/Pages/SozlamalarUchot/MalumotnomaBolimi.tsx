import { useEffect, useState } from "react";
import { LoaderCircle, Plus, Ruler, Trash2 } from "lucide-react";
import { birliklarApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { OlchovBirligi } from "@/types/catalog";
import { BolimKarta } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function MalumotnomaBolimi() {
  return (
    <BolimKarta sarlavha="Ma'lumotnoma" izoh="Kompaniyaning yordamchi ro'yxatlari real katalogdan olinadi.">
      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav><button type="button" className="inline-flex w-full items-center gap-2 rounded-xl bg-orange-50 px-3.5 py-2.5 text-sm font-bold text-[#FF6A00] ring-1 ring-orange-200"><Ruler size={16}/>O'lchov birligi</button></nav>
        <OlchovBirligiRoyxati />
      </div>
    </BolimKarta>
  );
}

function OlchovBirligiRoyxati() {
  const [olchovlar, setOlchovlar] = useState<OlchovBirligi[]>([]);
  const [tahrir, setTahrir] = useState<OlchovBirligi | null>(null);
  const [nomi, setNomi] = useState("");
  const [qisqa, setQisqa] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yuklash() {
    setYuklanmoqda(true); setXato("");
    try { setOlchovlar(await birliklarApi.royxat()); }
    catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setYuklanmoqda(false); }
  }
  useEffect(() => { void yuklash(); }, []);

  function boshla(birlik?: OlchovBirligi) {
    setTahrir(birlik ?? null);
    setNomi(birlik?.name ?? "");
    setQisqa(birlik?.shortName ?? "");
  }

  async function saqlash() {
    if (!nomi.trim()) { setXato("O'lchov birligi nomi majburiy."); return; }
    setSaqlanmoqda(true); setXato("");
    try {
      const payload = { name: nomi.trim(), shortName: qisqa.trim() || undefined };
      const saved = tahrir ? await birliklarApi.yangilash(tahrir.id, payload) : await birliklarApi.yaratish(payload);
      setOlchovlar((items) => items.some((x) => x.id === saved.id) ? items.map((x) => x.id === saved.id ? saved : x) : [saved, ...items]);
      boshla();
    } catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(false); }
  }

  async function ochirish(birlik: OlchovBirligi) {
    if (!window.confirm(`${birlik.name} o'lchov birligini o'chirasizmi?`)) return;
    setXato("");
    try { await birliklarApi.ochirish(birlik.id); setOlchovlar((items) => items.filter((x) => x.id !== birlik.id)); }
    catch (error) { setXato(getApiErrorMessage(error)); }
  }

  return <div className="min-w-0">
    {xato && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
      <input value="" disabled placeholder="Kod (backendda yo'q)" className={`${maydonKlass} bg-slate-50 text-slate-400 sm:max-w-[150px]`} />
      <input value={nomi} onChange={(e) => setNomi(e.target.value)} placeholder="Nomi (masalan: Dona)" className={maydonKlass}/>
      <input value={qisqa} onChange={(e) => setQisqa(e.target.value)} placeholder="Qisqa (dona)" className={`${maydonKlass} sm:max-w-[150px]`}/>
      <button type="button" disabled={saqlanmoqda} onClick={() => void saqlash()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-4 text-sm font-black text-white disabled:opacity-50"><Plus size={16}/>{tahrir ? "Yangilash" : "Qo'shish"}</button>
    </div>
    {yuklanmoqda ? <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={18}/>Yuklanmoqda...</div> : <div className="divide-y divide-orange-100 overflow-hidden rounded-2xl border border-orange-100">
      {olchovlar.map((birlik) => <div key={birlik.id} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50/40"><span className="flex h-9 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]"><Ruler size={16}/></span><div className="min-w-0 flex-1"><p className="font-black text-slate-800">{birlik.name}</p><p className="text-xs font-bold text-slate-400">{birlik.shortName || "Qisqa nom berilmagan"}</p></div><button type="button" onClick={() => boshla(birlik)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#FF6A00] hover:bg-orange-100">Tahrirlash</button><button type="button" onClick={() => void ochirish(birlik)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={15}/></button></div>)}
      {olchovlar.length === 0 && <p className="p-8 text-center text-sm font-bold text-slate-400">Backendda o'lchov birligi yo'q</p>}
    </div>}
    <p className="mt-3 text-xs font-semibold text-slate-400">Kod maydoni backend unit DTO'sida mavjud emas, shu sababli soxta saqlanmaydi.</p>
  </div>;
}
