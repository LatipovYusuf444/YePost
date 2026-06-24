import { useState, type FormEvent } from "react";
import { Edit3, GitBranch, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useOmborStore } from "@/store/omborStore";
import type { Filial } from "@/types/ombor";

export default function FiliallarBoshqaruvi() {
  const store = useOmborStore();
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<Filial|null>(null);
  const [name,setName]=useState("");
  const [address,setAddress]=useState("");
  const [status,setStatus]=useState<"ACTIVE"|"INACTIVE">("ACTIVE");
  const [responsibleId,setResponsibleId]=useState("");

  function yangi(){setEditing(null);setName("");setAddress("");setStatus("ACTIVE");setResponsibleId("");store.xatolikniTozalash();setModal(true)}
  async function tahrirlash(id:string){store.xatolikniTozalash();const item=await store.filialOlish(id);if(!item)return;setEditing(item);setName(item.name);setAddress(item.address??"");setStatus(item.status==="INACTIVE"?"INACTIVE":"ACTIVE");setResponsibleId(item.responsibleId??"");setModal(true)}
  async function saqlash(e:FormEvent){e.preventDefault();if(!name.trim())return;const data={name:name.trim(),address:address.trim()||undefined,status,responsibleId:responsibleId||undefined};const ok=editing?await store.filialYangilash(editing.id,data):Boolean(await store.filialYaratish(data));if(ok)setModal(false)}
  async function ochirish(id:string){if(!window.confirm("Filialni soft delete qilasizmi?"))return;await store.filialOchirish(id)}

  return <div className="space-y-5">
    <header className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Filial boshqaruvi</p><h1 className="text-3xl font-black">Filiallar</h1></div><button onClick={yangi} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white"><Plus size={17}/>Filial qo'shish</button></header>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{store.filiallar.map(item=><article key={item.id} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm"><div className="flex justify-between"><GitBranch className="text-orange-500"/><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status==="INACTIVE"?"bg-gray-100 text-gray-500":"bg-emerald-50 text-emerald-600"}`}>{item.status==="INACTIVE"?"Faol emas":"Faol"}</span></div><h2 className="mt-4 text-xl font-black">{item.name}</h2><p className="mt-2 text-sm text-gray-500">{item.address??"Manzil kiritilmagan"}</p><p className="mt-1 text-xs text-gray-400">Mas'ul: {store.xodimlar.find(x=>x.id===item.responsibleId)?.fullName??"Biriktirilmagan"}</p><div className="mt-5 flex gap-2 border-t pt-4"><button onClick={()=>void tahrirlash(item.id)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 font-bold text-orange-600"><Edit3 size={15}/>Tahrirlash</button><button onClick={()=>void ochirish(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={16}/></button></div></article>)}{store.filiallar.length===0&&<div className="col-span-full rounded-2xl border border-dashed p-12 text-center text-gray-400">Filial mavjud emas</div>}</div>
    {modal&&<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4"><form onSubmit={saqlash} className="w-full max-w-lg rounded-[28px] bg-white p-6"><h2 className="text-2xl font-black">{editing?"Filialni tahrirlash":"Yangi filial"}</h2>{store.xatolik&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{store.xatolik}</div>}<div className="mt-5 space-y-3"><input value={name} onChange={e=>setName(e.target.value)} className="h-12 w-full rounded-2xl border px-4" placeholder="Filial nomi *"/><textarea value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-2xl border p-4" placeholder="Manzil"/><select value={status} onChange={e=>setStatus(e.target.value as "ACTIVE"|"INACTIVE")} className="h-12 w-full rounded-2xl border px-4"><option value="ACTIVE">Faol</option><option value="INACTIVE">Faol emas</option></select><select value={responsibleId} onChange={e=>setResponsibleId(e.target.value)} className="h-12 w-full rounded-2xl border px-4"><option value="">Mas'ul biriktirilmagan</option>{store.xodimlar.map(x=><option key={x.id} value={x.id}>{x.fullName??x.username??x.id}</option>)}</select></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Yopish</button><button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50">{store.amalBajarilmoqda&&<LoaderCircle size={16} className="animate-spin"/>}Saqlash</button></div></form></div>}
  </div>
}
