import { useEffect, useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { useOmborStore } from "@/store/omborStore";
import { holat, modificationNomi, qoldiqMiqdori, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";

export default function Kochirish() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [modal,setModal]=useState(false);
  const [tanlanganId,setTanlanganId]=useState<string|null>(null);
  const [sourceWarehouseId,setSource]=useState("");
  const [destWarehouseId,setDest]=useState("");
  const [modificationId,setModification]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [note,setNote]=useState("");
  useEffect(()=>{void malumotlarniYuklash()},[malumotlarniYuklash]);
  const qoldiqlar=useMemo(()=>store.qoldiqlar.filter(x=>!sourceWarehouseId||x.warehouseId===sourceWarehouseId||x.warehouse?.id===sourceWarehouseId),[sourceWarehouseId,store.qoldiqlar]);
  async function yaratish(){if(!sourceWarehouseId||!destWarehouseId||sourceWarehouseId===destWarehouseId||!modificationId)return;const ok=await store.kochirishYaratish({sourceWarehouseId,destWarehouseId,note:note||undefined,items:[{modificationId,quantity}]});if(ok)setModal(false)}
  return <div className="space-y-5">
    <header className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Tovar harakati</p><h1 className="text-3xl font-black">Omborlararo ko'chirish</h1></div><button onClick={()=>setModal(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white"><Plus size={17}/>Yangi ko'chirish</button></header>
    {store.xatolik&&<div className="rounded-2xl bg-red-50 p-4 font-bold text-red-600">{store.xatolik}</div>}
    <div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-orange-50"><tr><th className="px-5 py-4">ID</th><th className="px-5 py-4">Manba</th><th className="px-5 py-4">Qabul qiluvchi</th><th className="px-5 py-4">Sana</th><th className="px-5 py-4">Holat</th><th className="px-5 py-4 text-right">Amal</th></tr></thead><tbody className="divide-y divide-orange-100">
      {store.kochirishlar.map(x=>{const s=String(x.status??"DRAFT").toUpperCase();return <tr key={x.id}><td className="px-5 py-4 font-bold text-orange-600">{x.id.slice(0,8)}</td><td className="px-5 py-4">{x.sourceWarehouse?.name??x.sourceWarehouseId}</td><td className="px-5 py-4">{x.destWarehouse?.name??x.destWarehouseId}</td><td className="px-5 py-4">{sana(x.createdAt)}</td><td className="px-5 py-4">{holat(s)}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={()=>setTanlanganId(x.id)} className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"><Eye size={14}/>Ko'rish</button>{s==="DRAFT"&&<><button onClick={()=>void store.kochirishBekorQilish(x.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Bekor</button><button onClick={()=>void store.kochirishJonatish(x.id)} className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white">Jo'natish</button></>}{s==="SENT"&&<button onClick={()=>void store.kochirishQabulQilish(x.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Qabul qilish</button>}</div></td></tr>})}
      {store.kochirishlar.length===0&&<tr><td colSpan={6} className="py-14 text-center text-gray-400">Ko'chirish hujjatlari mavjud emas</td></tr>}
    </tbody></table></div>
    {modal&&<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4"><div className="w-full max-w-xl space-y-4 rounded-[28px] bg-white p-6"><h2 className="text-2xl font-black">Yangi ko'chirish</h2>
      <select value={sourceWarehouseId} onChange={(e)=>{setSource(e.target.value);void store.qoldiqlarniYuklash(e.target.value)}} className="h-12 w-full rounded-2xl border px-4"><option value="">Manba ombor *</option>{store.omborlar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select value={destWarehouseId} onChange={(e)=>setDest(e.target.value)} className="h-12 w-full rounded-2xl border px-4"><option value="">Qabul qiluvchi ombor *</option>{store.omborlar.filter(x=>x.id!==sourceWarehouseId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select value={modificationId} onChange={(e)=>setModification(e.target.value)} className="h-12 w-full rounded-2xl border px-4"><option value="">Mahsulot *</option>{qoldiqlar.map((x,i)=><option key={`${x.modificationId}-${i}`} value={x.modificationId}>{modificationNomi(x.modification)} — {qoldiqMiqdori(x)}</option>)}</select>
      <input type="number" min="0.001" step="0.001" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} className="h-12 w-full rounded-2xl border px-4"/>
      <textarea value={note} onChange={(e)=>setNote(e.target.value)} className="w-full rounded-2xl border p-4" placeholder="Izoh"/>
      <div className="flex justify-end gap-3"><button onClick={()=>setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Yopish</button><button onClick={()=>void yaratish()} className="h-11 rounded-2xl bg-orange-500 px-5 font-black text-white">Qoralama saqlash</button></div>
    </div></div>}
    {tanlanganId&&<InventoryHujjatModal tur="kochirish" id={tanlanganId} onClose={()=>setTanlanganId(null)}/>}
  </div>
}
