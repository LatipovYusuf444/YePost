import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, MapPin, Phone, Plus, Star, Trash2, UserRound, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { filiallarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Filial, FilialYaratishMalumoti, NomliEntity } from "@/types/ombor";
import { BolimKarta, Maydon } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function FiliallarBolimi() {
  const [filiallar, setFiliallar] = useState<Filial[]>([]); const [masullar, setMasullar] = useState<NomliEntity[]>([]);
  const [modal, setModal] = useState<Filial | "yangi" | null>(null); const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState(""); const [amal, setAmal] = useState("");
  async function yuklash() { setYuklanmoqda(true); setXato(""); try { const [branches, people] = await Promise.all([filiallarApi.royxat(), filiallarApi.masullar()]); setFiliallar(branches); setMasullar(people); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setYuklanmoqda(false); } }
  useEffect(() => { void yuklash(); }, []);
  async function ochirish(filial: Filial) { if (!window.confirm(`${filial.name} filialini o'chirasizmi?`)) return; setAmal(filial.id); try { await filiallarApi.ochirish(filial.id); setFiliallar((items) => items.filter((item) => item.id !== filial.id)); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  async function asosiyQilish(filial: Filial) { setAmal(filial.id); setXato(""); try { const saved = await filiallarApi.asosiyQilish(filial.id); setFiliallar((items) => items.map((item) => ({ ...item, isPrimary: item.id === saved.id }))); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setAmal(""); } }
  const masulNomi = (id?: string | null) => masullar.find((x) => x.id === id)?.fullName || masullar.find((x) => x.id === id)?.username || "Biriktirilmagan";
  return <BolimKarta sarlavha="Filiallar" izoh="Kompaniya filiallari real backenddan olinadi." amal={<button type="button" onClick={() => setModal("yangi")} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"><Plus size={16}/>Filial qo'shish</button>}>
    {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    {yuklanmoqda ? <div className="flex h-40 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>Filiallar yuklanmoqda...</div> : <div className="grid gap-3 md:grid-cols-2">
      {filiallar.map((filial) => <article key={filial.id} className="rounded-[20px] border border-orange-100 bg-orange-50/30 p-4"><div className="flex items-start justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-black text-gray-950">{filial.name}</h3>{filial.isPrimary && <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white"><Star size={11}/>Asosiy</span>}<span className={`rounded-full px-2 py-0.5 text-xs font-bold ${filial.status === "INACTIVE" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"}`}>{filial.status === "INACTIVE" ? "Faol emas" : "Faol"}</span></div><div className="flex gap-1">{!filial.isPrimary && <button disabled={amal === filial.id} type="button" onClick={() => void asosiyQilish(filial)} title="Asosiy qilish" className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 disabled:opacity-40"><Star size={15}/></button>}<button disabled={amal === filial.id} type="button" onClick={() => void ochirish(filial)} title="O'chirish" className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40"><Trash2 size={15}/></button></div></div><button type="button" onClick={() => setModal(filial)} className="mt-3 block w-full space-y-1.5 text-left"><p className="flex items-center gap-1.5 text-sm text-gray-500"><MapPin size={14} className="text-orange-400"/>{filial.address || "Manzil kiritilmagan"}</p><p className="flex items-center gap-1.5 text-sm text-gray-500"><Phone size={14} className="text-orange-400"/>{filial.phone || "Telefon kiritilmagan"}</p><p className="flex items-center gap-1.5 text-sm text-gray-500"><UserRound size={14} className="text-orange-400"/>{masulNomi(filial.responsibleId)}</p><span className="mt-2 inline-block text-xs font-bold text-[#FF6A00]">Tahrirlash uchun bosing</span></button></article>)}
      {filiallar.length === 0 && <p className="md:col-span-2 rounded-2xl border border-dashed border-orange-200 p-12 text-center text-sm font-bold text-slate-400">Backendda filial mavjud emas</p>}
    </div>}
    {modal && (
      <FilialModal
        boshlangich={modal === "yangi" ? null : modal}
        masullar={masullar}
        onYopish={() => setModal(null)}
        onSaqlandi={(item) => {
          setFiliallar((items) => items.some((x) => x.id === item.id)
            ? items.map((x) => x.id === item.id ? item : item.isPrimary ? { ...x, isPrimary: false } : x)
            : item.isPrimary
              ? [{ ...item }, ...items.map((x) => ({ ...x, isPrimary: false }))]
              : [item, ...items]);
          setModal(null);
        }}
      />
    )}
  </BolimKarta>;
}

function FilialModal({ boshlangich, masullar, onYopish, onSaqlandi }: { boshlangich: Filial | null; masullar: NomliEntity[]; onYopish: () => void; onSaqlandi: (filial: Filial) => void }) {
  const [nomi, setNomi] = useState(boshlangich?.name ?? ""); const [manzil, setManzil] = useState(boshlangich?.address ?? "");
  const [telefon, setTelefon] = useState(boshlangich?.phone ?? ""); const [masulId, setMasulId] = useState(boshlangich?.responsibleId ?? "");
  const [asosiy, setAsosiy] = useState(Boolean(boshlangich?.isPrimary)); const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(boshlangich?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
  const [xato, setXato] = useState(""); const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  async function saqlash(event: FormEvent) { event.preventDefault(); if (!nomi.trim()) { setXato("Filial nomi to'ldirilishi shart."); return; } setSaqlanmoqda(true); setXato(""); const data: FilialYaratishMalumoti = { name: nomi.trim(), address: manzil.trim() || undefined, phone: telefon.trim() || undefined, responsibleId: masulId || null, isPrimary: asosiy, status }; try { onSaqlandi(boshlangich ? await filiallarApi.yangilash(boshlangich.id, data) : await filiallarApi.yaratish(data)); } catch (error) { setXato(getApiErrorMessage(error)); } finally { setSaqlanmoqda(false); } }
  return <AppModal className="bg-[rgba(54,22,8,.45)] p-4 backdrop-blur-[3px]"><form onSubmit={saqlash} className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_34px_120px_rgba(92,38,8,.42)]"><header className="flex items-center justify-between border-b border-orange-100 px-6 py-4"><h2 className="text-lg font-black text-gray-950">{boshlangich ? "Filialni tahrirlash" : "Yangi filial"}</h2><button type="button" onClick={onYopish} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-orange-500 hover:text-white"><X size={18}/></button></header><div className="space-y-4 px-6 py-5">{xato && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{xato}</p>}<Maydon label="Filial nomi *"><input value={nomi} onChange={(e) => setNomi(e.target.value)} className={maydonKlass}/></Maydon><Maydon label="Manzil"><input value={manzil} onChange={(e) => setManzil(e.target.value)} className={maydonKlass}/></Maydon><Maydon label="Telefon"><input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={maydonKlass}/></Maydon><Maydon label="Mas'ul shaxs"><AppSelect value={masulId} onChange={(e) => setMasulId(e.target.value)} className={maydonKlass}><option value="">Biriktirilmagan</option>{masullar.map((x) => <option key={x.id} value={x.id}>{x.fullName || x.username}</option>)}</AppSelect></Maydon><Maydon label="Holati"><AppSelect value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")} className={maydonKlass}><option value="ACTIVE">Faol</option><option value="INACTIVE">Faol emas</option></AppSelect></Maydon><label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={asosiy} onChange={(e) => setAsosiy(e.target.checked)} className="h-4 w-4 accent-orange-500"/>Asosiy filial</label></div><footer className="flex justify-end gap-3 border-t border-orange-100 px-6 py-4"><button type="button" onClick={onYopish} className="rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600">Bekor qilish</button><button disabled={saqlanmoqda} className="rounded-2xl bg-[#FF6A00] px-6 py-2.5 text-sm font-black text-white disabled:opacity-50">{saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}</button></footer></form></AppModal>;
}

