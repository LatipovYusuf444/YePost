import { useEffect } from "react";
import { useOmborStore } from "@/store/omborStore";
import { holat, sana } from "./omborYordamchilari";

export default function AmalgaOshirilganlar() {
  const store=useOmborStore();
  const malumotlarniYuklash=store.malumotlarniYuklash;
  useEffect(()=>{void malumotlarniYuklash()},[malumotlarniYuklash]);
  const rows=[
    ...store.kirimlar.map(x=>({id:x.id,turi:"Kirim",ombor:x.warehouse?.name??x.warehouseId,status:x.status,createdAt:x.createdAt})),
    ...store.chiqimlar.map(x=>({id:x.id,turi:"Chiqim",ombor:x.warehouse?.name??x.warehouseId,status:x.status,createdAt:x.createdAt})),
    ...store.kochirishlar.map(x=>({id:x.id,turi:"Ko'chirish",ombor:`${x.sourceWarehouse?.name??x.sourceWarehouseId} → ${x.destWarehouse?.name??x.destWarehouseId}`,status:x.status,createdAt:x.createdAt})),
    ...store.inventarizatsiyalar.map(x=>({id:x.id,turi:"Inventarizatsiya",ombor:x.warehouse?.name??x.warehouseId,status:x.status,createdAt:x.createdAt})),
  ].filter(x=>String(x.status??"").toUpperCase()!=="DRAFT").sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return <div className="space-y-5"><header><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor hujjatlari</p><h1 className="text-3xl font-black">Amalga oshirilganlar</h1></header><div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-orange-50"><tr><th className="px-5 py-4">Hujjat</th><th className="px-5 py-4">Turi</th><th className="px-5 py-4">Ombor</th><th className="px-5 py-4">Sana</th><th className="px-5 py-4">Holat</th></tr></thead><tbody className="divide-y divide-orange-100">{rows.map(x=><tr key={`${x.turi}-${x.id}`}><td className="px-5 py-4 font-bold text-orange-600">{x.id.slice(0,8)}</td><td className="px-5 py-4">{x.turi}</td><td className="px-5 py-4">{x.ombor}</td><td className="px-5 py-4">{sana(x.createdAt)}</td><td className="px-5 py-4">{holat(x.status)}</td></tr>)}{rows.length===0&&<tr><td colSpan={5} className="py-14 text-center text-gray-400">Amalga oshirilgan hujjatlar mavjud emas</td></tr>}</tbody></table></div></div>
}
