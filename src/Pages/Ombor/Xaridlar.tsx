import { useEffect, useState, type FormEvent } from "react";
import { Eye, LoaderCircle, Plus, Trash2 } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import { holat, hujjatRaqami, modificationNomi, pul, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";

type Qator = { modificationId: string; quantity: number; price: number };

export default function Xaridlar() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [note, setNote] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [items, setItems] = useState<Qator[]>([
    { modificationId: "", quantity: 1, price: 0 },
  ]);

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    const toza = items.filter((item) => item.modificationId && item.quantity > 0);
    if (!supplierId || !warehouseId || toza.length === 0) return;
    const ok = await store.kirimYaratish({
      supplierId,
      warehouseId,
      responsibleId: responsibleId || undefined,
      note: note || undefined,
      items: toza,
    });
    if (ok) setModal(false);
  }

  async function supplierQoshish() {
    if (!supplierName.trim()) return;
    const ok = await store.yetkazibBeruvchiYaratish({
      name: supplierName.trim(),
      phone: supplierPhone.trim() || undefined,
    });
    if (ok) {
      setSupplierName("");
      setSupplierPhone("");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Tovar kirimi
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Kirim hujjatlari</h1>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} /> Yangi kirim
        </button>
      </header>
      {store.xatolik && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{store.xatolik}</div>}
      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-orange-50 text-orange-900/60">
              <tr><th className="px-5 py-4">Hujjat</th><th className="px-5 py-4">Yetkazib beruvchi</th><th className="px-5 py-4">Ombor</th><th className="px-5 py-4">Summa</th><th className="px-5 py-4">Sana</th><th className="px-5 py-4">Holat</th><th className="px-5 py-4 text-right">Amal</th></tr>
            </thead>
            <tbody className="divide-y divide-orange-100/70">
              {store.kirimlar.map((hujjat) => (
                <tr key={hujjat.id}>
                  <td className="px-5 py-4 font-bold text-orange-600">{hujjatRaqami(hujjat)}</td>
                  <td className="px-5 py-4">{hujjat.supplier?.name ?? hujjat.supplierId}</td>
                  <td className="px-5 py-4">{hujjat.warehouse?.name ?? hujjat.warehouseId}</td>
                  <td className="px-5 py-4 font-bold">{pul(hujjat.totalAmount ?? hujjat.total)}</td>
                  <td className="px-5 py-4">{sana(hujjat.createdAt)}</td>
                  <td className="px-5 py-4">{holat(hujjat.status)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setTanlanganId(hujjat.id)} className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"><Eye size={14}/>Ko'rish</button>
                    {String(hujjat.status ?? "DRAFT").toUpperCase() === "DRAFT" && (
                      <>
                        <button onClick={() => void store.kirimBekorQilish(hujjat.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Bekor qilish</button>
                        <button onClick={() => void store.kirimTasdiqlash(hujjat.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Tasdiqlash</button>
                      </>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
              {!store.yuklanmoqda && store.kirimlar.length === 0 && <tr><td colSpan={7} className="px-6 py-14 text-center text-gray-400">Kirim hujjatlari mavjud emas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <AppModal>
          <form onSubmit={saqlash} className="scrollbar-hidden max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Yangi kirim hujjati</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-12 rounded-2xl border px-4">
                <option value="">Yetkazib beruvchi *</option>
                {store.yetkazibBeruvchilar.map((item) => <option key={item.id} value={item.id}>{item.name ?? item.id}</option>)}
              </select>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-12 rounded-2xl border px-4">
                <option value="">Ombor *</option>
                {store.omborlar.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} className="h-12 rounded-2xl border px-4">
                <option value="">Mas'ul xodim</option>
                {store.xodimlar.map((item) => <option key={item.id} value={item.id}>{item.fullName ?? item.username ?? item.id}</option>)}
              </select>
            </div>
            <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
              <p className="text-sm font-black text-orange-700">
                Yetkazib beruvchi ro'yxatda yo'qmi?
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={supplierName}
                  onChange={(event) => setSupplierName(event.target.value)}
                  className="h-11 rounded-xl border border-orange-100 bg-white px-3"
                  placeholder="Yetkazib beruvchi nomi"
                />
                <input
                  value={supplierPhone}
                  onChange={(event) => setSupplierPhone(event.target.value)}
                  className="h-11 rounded-xl border border-orange-100 bg-white px-3"
                  placeholder="+998..."
                />
                <button
                  type="button"
                  onClick={() => void supplierQoshish()}
                  className="h-11 rounded-xl bg-orange-500 px-4 text-sm font-black text-white"
                >
                  Yaratish
                </button>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-2xl bg-gray-50 p-4 md:grid-cols-[1fr_120px_160px_44px]">
                  <select value={item.modificationId} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? {...row, modificationId:e.target.value} : row))} className="h-11 rounded-xl border px-3">
                    <option value="">Mahsulot modifikatsiyasi</option>
                    {store.modifikatsiyalar.map((mod) => <option key={mod.id} value={mod.id}>{modificationNomi(mod)} — {mod.barcode}</option>)}
                  </select>
                  <input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? {...row, quantity:Number(e.target.value)} : row))} className="h-11 rounded-xl border px-3" />
                  <input type="number" min="0" value={item.price} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? {...row, price:Number(e.target.value)} : row))} className="h-11 rounded-xl border px-3" placeholder="Tan narx" />
                  <button type="button" disabled={items.length === 1} onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))} className="flex h-11 items-center justify-center rounded-xl bg-red-50 text-red-500 disabled:opacity-30"><Trash2 size={16}/></button>
                </div>
              ))}
              <button type="button" onClick={() => setItems((rows) => [...rows, {modificationId:"", quantity:1, price:0}])} className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600">+ Mahsulot qo'shish</button>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-5 w-full rounded-2xl border p-4" placeholder="Izoh" />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Yopish</button>
              <button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50">{store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin"/>}Qoralama saqlash</button>
            </div>
          </form>
        </AppModal>
      )}
      {tanlanganId && <InventoryHujjatModal tur="kirim" id={tanlanganId} onClose={() => setTanlanganId(null)} />}
    </div>
  );
}
