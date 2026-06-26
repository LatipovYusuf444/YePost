import { useState, type FormEvent } from "react";
import { Edit3, LoaderCircle, Plus, Trash2 } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useTenantStore } from "@/store/tenantStore";
import type { Tarif, TarifTuri } from "@/types/tenant";
import { tarifTuriMatni } from "./tenantMatnlari";

const barchaTurlar: TarifTuri[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"];

export default function TolovSozlamalari() {
  const store = useTenantStore();
  const mavjudTurlar = new Set(store.tariflar.map((item) => item.type));
  const boshTurlar = barchaTurlar.filter((item) => !mavjudTurlar.has(item));
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Tarif | null>(null);
  const [type, setType] = useState<TarifTuri>("FREE");
  const [name, setName] = useState("");
  const [maxBranches, setMaxBranches] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("0");
  const [isActive, setIsActive] = useState(true);

  function yangi() {
    const birinchi = boshTurlar[0];
    if (!birinchi) return;
    setEditing(null);
    setType(birinchi);
    setName("");
    setMaxBranches("");
    setMaxUsers("");
    setMonthlyPrice("0");
    setIsActive(true);
    store.xatolikniTozalash();
    setModal(true);
  }

  async function tahrirlash(id: string) {
    store.xatolikniTozalash();
    const item = await store.tarifOlish(id);
    if (!item) return;
    setEditing(item);
    setType(item.type);
    setName(item.name);
    setMaxBranches(item.maxBranches === null ? "" : String(item.maxBranches));
    setMaxUsers(item.maxUsers === null ? "" : String(item.maxUsers));
    setMonthlyPrice(String(item.monthlyPrice));
    setIsActive(item.isActive);
    setModal(true);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const data = {
      type,
      name: name.trim(),
      maxBranches: maxBranches === "" ? null : Number(maxBranches),
      maxUsers: maxUsers === "" ? null : Number(maxUsers),
      monthlyPrice: Number(monthlyPrice) || 0,
      isActive,
    };
    const ok = editing
      ? await store.tarifYangilash(editing.id, data)
      : await store.tarifYaratish(data);
    if (ok) setModal(false);
  }

  async function ochirish(id: string) {
    if (!window.confirm("Tarifni o'chirasizmi? Faol obunalarga ta'sirini tekshiring."))
      return;
    await store.tarifOchirish(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Tarif rejalari
          </p>
          <h2 className="text-2xl font-black">Tariflar</h2>
          <p className="text-sm text-gray-500">
            Har bir tarif turi tizimda faqat bir marta yaratiladi.
          </p>
        </div>
        <button
          onClick={yangi}
          disabled={boshTurlar.length === 0}
          title={boshTurlar.length === 0 ? "Barcha tarif turlari yaratilgan" : undefined}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <Plus size={17} />
          {boshTurlar.length === 0 ? "Barcha turlar mavjud" : "Tarif qo'shish"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {store.tariflar.map((item) => (
          <article key={item.id} className="rounded-2xl border border-orange-100 bg-white p-5">
            <div className="flex justify-between">
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
                {tarifTuriMatni[item.type]}
              </span>
              <span className={`text-xs font-bold ${item.isActive ? "text-emerald-600" : "text-gray-400"}`}>
                {item.isActive ? "Faol" : "Faol emas"}
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black">{tarifTuriMatni[item.type]} tarif</h3>
            <p className="mt-2 text-2xl font-black text-orange-600">
              {Number(item.monthlyPrice).toLocaleString("uz-UZ")} so'm
            </p>
            <div className="mt-3 text-sm text-gray-500">
              <p>Filiallar soni: {item.maxBranches ?? "Cheksiz"}</p>
              <p>Foydalanuvchilar soni: {item.maxUsers ?? "Cheksiz"}</p>
            </div>
            <div className="mt-5 flex gap-2 border-t pt-4">
              <button onClick={() => void tahrirlash(item.id)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 font-bold text-orange-600">
                <Edit3 size={15} /> Tahrirlash
              </button>
              <button onClick={() => void ochirish(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500" aria-label="Tarifni o'chirish">
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {modal && (
        <AppModal>
          <form onSubmit={saqlash} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black">
              {editing ? "Tarifni tahrirlash" : "Yangi tarif"}
            </h2>
            {store.xatolik && <div className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-600">{store.xatolik}</div>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Tarif turi
                <select value={type} onChange={(event) => setType(event.target.value as TarifTuri)} disabled={Boolean(editing)} className="mt-2 h-12 w-full rounded-2xl border px-4 disabled:bg-gray-100">
                  {(editing ? [editing.type] : boshTurlar).map((item) => (
                    <option key={item} value={item}>{tarifTuriMatni[item]}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Tarif nomi *
                <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4" placeholder="Tarif nomi" />
              </label>
              <label className="text-sm font-bold">
                Filiallar chegarasi
                <input type="number" min="0" value={maxBranches} onChange={(event) => setMaxBranches(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4" placeholder="Bo'sh qolsa cheksiz" />
              </label>
              <label className="text-sm font-bold">
                Foydalanuvchilar chegarasi
                <input type="number" min="0" value={maxUsers} onChange={(event) => setMaxUsers(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4" placeholder="Bo'sh qolsa cheksiz" />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Oylik narx
                <input type="number" min="0" value={monthlyPrice} onChange={(event) => setMonthlyPrice(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4" />
              </label>
              <label className="flex items-center gap-3 font-bold sm:col-span-2">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-5 w-5 accent-orange-500" />
                Tarif faol
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Bekor qilish</button>
              <button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50">
                {store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
                Saqlash
              </button>
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
