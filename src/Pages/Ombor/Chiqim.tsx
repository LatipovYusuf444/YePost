import { useEffect, useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { ChiqimSababi } from "@/types/ombor";
import { holat, modificationNomi, qoldiqMiqdori, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";

const sabablar: Record<ChiqimSababi, string> = {
  DAMAGE: "Shikastlangan",
  EXPIRY: "Muddati o'tgan",
  THEFT: "Yo'qolgan/o'g'irlangan",
  OTHER: "Boshqa",
};

export default function Chiqim() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState<ChiqimSababi>("OTHER");
  const [modificationId, setModificationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => { void malumotlarniYuklash(); }, [malumotlarniYuklash]);
  const qoldiqlar = useMemo(
    () => store.qoldiqlar.filter((item) => !warehouseId || item.warehouseId === warehouseId || item.warehouse?.id === warehouseId),
    [store.qoldiqlar, warehouseId]
  );

  async function yaratish() {
    if (!warehouseId || !modificationId || quantity <= 0) return;
    const ok = await store.chiqimYaratish({ warehouseId, reason, note: note || undefined, items: [{ modificationId, quantity }] });
    if (ok) setModal(false);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Hisobdan chiqarish</p><h1 className="text-3xl font-black">Ombordan chiqim</h1></div>
        <button onClick={() => setModal(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white"><Plus size={17}/>Yangi chiqim</button>
      </header>
      {store.xatolik && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-600">{store.xatolik}</div>}
      <div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-orange-50"><tr><th className="px-5 py-4">ID</th><th className="px-5 py-4">Ombor</th><th className="px-5 py-4">Sabab</th><th className="px-5 py-4">Sana</th><th className="px-5 py-4">Holat</th><th className="px-5 py-4 text-right">Amal</th></tr></thead>
          <tbody className="divide-y divide-orange-100">
            {store.chiqimlar.map((item) => <tr key={item.id}><td className="px-5 py-4 font-bold text-orange-600">{item.id.slice(0,8)}</td><td className="px-5 py-4">{item.warehouse?.name ?? item.warehouseId}</td><td className="px-5 py-4">{sabablar[item.reason as ChiqimSababi] ?? item.reason}</td><td className="px-5 py-4">{sana(item.createdAt)}</td><td className="px-5 py-4">{holat(item.status)}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={()=>setTanlanganId(item.id)} className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"><Eye size={14}/>Ko'rish</button>{String(item.status ?? "DRAFT").toUpperCase()==="DRAFT" && <><button onClick={() => void store.chiqimBekorQilish(item.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Bekor</button><button onClick={() => void store.chiqimTasdiqlash(item.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Tasdiqlash</button></>}</div></td></tr>)}
            {store.chiqimlar.length===0 && <tr><td colSpan={6} className="py-14 text-center text-gray-400">Chiqim hujjatlari mavjud emas</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && <AppModal><div className="w-full max-w-xl space-y-4 rounded-[28px] bg-white p-6 shadow-2xl"><h2 className="text-2xl font-black">Yangi chiqim</h2>
        <select value={warehouseId} onChange={(e)=>{setWarehouseId(e.target.value);void store.qoldiqlarniYuklash(e.target.value)}} className="h-12 w-full rounded-2xl border px-4"><option value="">Ombor *</option>{store.omborlar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={reason} onChange={(e)=>setReason(e.target.value as ChiqimSababi)} className="h-12 w-full rounded-2xl border px-4">{Object.entries(sabablar).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <select value={modificationId} onChange={(e)=>setModificationId(e.target.value)} className="h-12 w-full rounded-2xl border px-4"><option value="">Mahsulot *</option>{qoldiqlar.map((x,i)=><option key={`${x.modificationId}-${i}`} value={x.modificationId}>{modificationNomi(x.modification)} — {qoldiqMiqdori(x)}</option>)}</select>
        <input type="number" min="0.001" step="0.001" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} className="h-12 w-full rounded-2xl border px-4" placeholder="Miqdor"/>
        <textarea value={note} onChange={(e)=>setNote(e.target.value)} className="w-full rounded-2xl border p-4" placeholder="Izoh"/>
        <div className="flex justify-end gap-3"><button onClick={()=>setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Yopish</button><button onClick={()=>void yaratish()} className="h-11 rounded-2xl bg-orange-500 px-5 font-black text-white">Qoralama saqlash</button></div>
      </div></AppModal>}
      {tanlanganId&&<InventoryHujjatModal tur="chiqim" id={tanlanganId} onClose={()=>setTanlanganId(null)}/>}
    </div>
  );
}
