import { useEffect, useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { useOmborStore } from "@/store/omborStore";
import type { InventarizatsiyaTuri } from "@/types/ombor";
import { holat, modificationNomi, qoldiqMiqdori, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";

export default function Inventarizatsiya() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [modal,setModal]=useState(false);
  const [tanlanganId,setTanlanganId]=useState<string|null>(null);
  const [warehouseId,setWarehouseId]=useState("");
  const [type,setType]=useState<InventarizatsiyaTuri>("FULL");
  const [actuals,setActuals]=useState<Record<string,number>>({});
  const [note,setNote]=useState("");
  useEffect(()=>{void malumotlarniYuklash()},[malumotlarniYuklash]);
  const qoldiqlar=useMemo(()=>store.qoldiqlar.filter(x=>!warehouseId||x.warehouseId===warehouseId||x.warehouse?.id===warehouseId),[store.qoldiqlar,warehouseId]);
  function omborTanlash(id:string){setWarehouseId(id);setActuals({});void store.qoldiqlarniYuklash(id)}
  async function yaratish(){if(!warehouseId)return;const items=qoldiqlar.map(x=>({modificationId:x.modificationId,actualQuantity:actuals[x.modificationId]??qoldiqMiqdori(x)}));if(items.length===0)return;const ok=await store.inventarizatsiyaYaratish({warehouseId,type,note:note||undefined,items});if(ok)setModal(false)}
  return <div className="space-y-5">
    <header className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Qoldiqni tekshirish</p><h1 className="text-3xl font-black">Inventarizatsiya</h1></div><button onClick={()=>setModal(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white"><Plus size={17}/>Boshlash</button></header>
    {store.xatolik&&<div className="rounded-2xl bg-red-50 p-4 font-bold text-red-600">{store.xatolik}</div>}
    <div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-orange-50"><tr><th className="px-5 py-4">ID</th><th className="px-5 py-4">Ombor</th><th className="px-5 py-4">Turi</th><th className="px-5 py-4">Sana</th><th className="px-5 py-4">Holat</th><th className="px-5 py-4 text-right">Amal</th></tr></thead><tbody className="divide-y divide-orange-100">
      {store.inventarizatsiyalar.map(x=><tr key={x.id}><td className="px-5 py-4 font-bold text-orange-600">{x.id.slice(0,8)}</td><td className="px-5 py-4">{x.warehouse?.name??x.warehouseId}</td><td className="px-5 py-4">{x.type==="PARTIAL"?"Qisman":"To'liq"}</td><td className="px-5 py-4">{sana(x.createdAt)}</td><td className="px-5 py-4">{holat(x.status)}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={()=>setTanlanganId(x.id)} className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"><Eye size={14}/>Ko'rish</button>{String(x.status??"DRAFT").toUpperCase()==="DRAFT"&&<button onClick={()=>void store.inventarizatsiyaTasdiqlash(x.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Yakunlash</button>}</div></td></tr>)}
      {store.inventarizatsiyalar.length===0&&<tr><td colSpan={6} className="py-14 text-center text-gray-400">Inventarizatsiya hujjatlari mavjud emas</td></tr>}
    </tbody></table></div>
    {modal&&<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6"><h2 className="text-2xl font-black">Inventarizatsiya boshlash</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={warehouseId} onChange={(e)=>omborTanlash(e.target.value)} className="h-12 rounded-2xl border px-4"><option value="">Ombor *</option>{store.omborlar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={type} onChange={(e)=>setType(e.target.value as InventarizatsiyaTuri)} className="h-12 rounded-2xl border px-4"><option value="FULL">To'liq</option><option value="PARTIAL">Qisman</option></select></div>
      <div className="mt-5 space-y-2">{qoldiqlar.map((x,i)=><div key={`${x.modificationId}-${i}`} className="grid grid-cols-[1fr_100px_130px] items-center gap-3 rounded-xl bg-gray-50 p-3"><span className="font-bold">{modificationNomi(x.modification)}</span><span className="text-sm text-gray-500">Tizim: {qoldiqMiqdori(x)}</span><input type="number" min="0" value={actuals[x.modificationId]??qoldiqMiqdori(x)} onChange={(e)=>setActuals(v=>({...v,[x.modificationId]:Number(e.target.value)}))} className="h-10 rounded-xl border px-3" /></div>)}</div>
      <textarea value={note} onChange={(e)=>setNote(e.target.value)} className="mt-4 w-full rounded-2xl border p-4" placeholder="Izoh"/>
      <div className="mt-5 flex justify-end gap-3"><button onClick={()=>setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Yopish</button><button onClick={()=>void yaratish()} className="h-11 rounded-2xl bg-orange-500 px-5 font-black text-white">Qoralama saqlash</button></div>
    </div></div>}
    {tanlanganId&&<InventoryHujjatModal tur="inventarizatsiya" id={tanlanganId} onClose={()=>setTanlanganId(null)}/>}
  </div>
}
