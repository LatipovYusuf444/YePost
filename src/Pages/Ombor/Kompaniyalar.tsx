import { useState, type FormEvent } from "react";
import { Building2, Edit3, LoaderCircle, Plus, Trash2 } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { Kompaniya } from "@/types/ombor";

export default function Kompaniyalar() {
  const store = useOmborStore();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Kompaniya | null>(null);
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  function tozalash() {
    setEditing(null);
    setName("");
    setInn("");
    setAddress("");
    setPhone("");
    store.xatolikniTozalash();
  }

  function yangi() {
    tozalash();
    setModal(true);
  }

  async function tahrirlash(id: string) {
    store.xatolikniTozalash();
    const kompaniya = await store.kompaniyaOlish(id);
    if (!kompaniya) return;
    setEditing(kompaniya);
    setName(kompaniya.name);
    setInn(kompaniya.inn ?? "");
    setAddress(kompaniya.address ?? "");
    setPhone(kompaniya.phone ?? "");
    setModal(true);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      inn: inn.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
    };
    const ok = editing
      ? await store.kompaniyaYangilash(editing.id, data)
      : await store.kompaniyaYaratish(data);
    if (ok) setModal(false);
  }

  async function ochirish(id: string) {
    if (!window.confirm("Kompaniyani soft delete qilasizmi?")) return;
    await store.kompaniyaOchirish(id);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Tashkilot boshqaruvi
          </p>
          <h1 className="text-3xl font-black text-gray-950">Kompaniyalar</h1>
        </div>
        <button onClick={yangi} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white">
          <Plus size={17} /> Kompaniya qo'shish
        </button>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {store.kompaniyalar.map((item) => (
          <article key={item.id} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
            <Building2 className="text-orange-500" />
            <h2 className="mt-4 text-xl font-black">{item.name}</h2>
            <div className="mt-3 space-y-1 text-sm text-gray-500">
              <p>STIR: {item.inn ?? "—"}</p>
              <p>Telefon: {item.phone ?? "—"}</p>
              <p>Manzil: {item.address ?? "—"}</p>
            </div>
            <div className="mt-5 flex gap-2 border-t pt-4">
              <button onClick={() => void tahrirlash(item.id)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 font-bold text-orange-600"><Edit3 size={15}/>Tahrirlash</button>
              <button onClick={() => void ochirish(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={16}/></button>
            </div>
          </article>
        ))}
        {store.kompaniyalar.length === 0 && <div className="col-span-full rounded-2xl border border-dashed p-12 text-center text-gray-400">Kompaniya mavjud emas</div>}
      </div>
      {modal && (
        <AppModal>
          <form onSubmit={saqlash} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black">{editing ? "Kompaniyani tahrirlash" : "Yangi kompaniya"}</h2>
            {store.xatolik && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{store.xatolik}</div>}
            <div className="mt-5 space-y-3">
              <input value={name} onChange={(e)=>setName(e.target.value)} className="h-12 w-full rounded-2xl border px-4" placeholder="Kompaniya nomi *"/>
              <input value={inn} onChange={(e)=>setInn(e.target.value)} className="h-12 w-full rounded-2xl border px-4" placeholder="STIR"/>
              <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="h-12 w-full rounded-2xl border px-4" placeholder="+998..."/>
              <textarea value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full rounded-2xl border p-4" placeholder="Manzil"/>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Yopish</button>
              <button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50">{store.amalBajarilmoqda&&<LoaderCircle size={16} className="animate-spin"/>}Saqlash</button>
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
