import { useState, type FormEvent } from "react";
import { Edit3, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useTenantStore } from "@/store/tenantStore";
import type { Workspace } from "@/types/tenant";

export default function KompaniyaSozlamalari() {
  const store = useTenantStore();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);

  function yangi() {
    setEditing(null);
    setName("");
    setSlug("");
    setIsActive(true);
    store.xatolikniTozalash();
    setModal(true);
  }

  async function tahrirlash(id: string) {
    store.xatolikniTozalash();
    const item = await store.workspaceOlish(id);
    if (!item) return;
    setEditing(item);
    setName(item.name);
    setSlug(item.slug);
    setIsActive(item.isActive);
    setModal(true);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    const data = { name: name.trim(), slug: slug.trim(), isActive };
    const ok = editing
      ? await store.workspaceYangilash(editing.id, data)
      : await store.workspaceYaratish(data);
    if (ok) setModal(false);
  }

  async function ochirish(id: string) {
    const joriy = id === store.profil?.workspaceId;
    const matn = joriy
      ? "Bu hozir foydalanilayotgan ish maydoni. O'chirilsa tizimdan foydalanish to'xtashi mumkin. Davom etasizmi?"
      : "Ish maydonini o'chirasizmi?";
    if (!window.confirm(matn)) return;
    await store.workspaceOchirish(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Ish maydonlari
          </p>
          <h2 className="text-2xl font-black">Ish maydonini boshqarish</h2>
        </div>
        <button
          onClick={yangi}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white"
        >
          <Plus size={17} />
          Ish maydoni qo'shish
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {store.workspacelar.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-orange-100 bg-white p-5"
          >
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="text-xl font-black">{item.name}</h3>
                <p className="text-sm text-gray-400">Manzil kaliti: {item.slug}</p>
              </div>
              <span
                className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${
                  item.isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.isActive ? "Faol" : "Faol emas"}
              </span>
            </div>
            {item.id === store.profil?.workspaceId && (
              <p className="mt-3 text-xs font-bold text-orange-600">
                Hozir foydalanilayotgan ish maydoni
              </p>
            )}
            <div className="mt-5 flex gap-2 border-t pt-4">
              <button
                onClick={() => void tahrirlash(item.id)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 font-bold text-orange-600"
              >
                <Edit3 size={15} />
                Tahrirlash
              </button>
              <button
                onClick={() => void ochirish(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"
                aria-label="Ish maydonini o'chirish"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4">
          <form
            onSubmit={saqlash}
            className="w-full max-w-lg rounded-[28px] bg-white p-6"
          >
            <h2 className="text-2xl font-black">
              {editing ? "Ish maydonini tahrirlash" : "Yangi ish maydoni"}
            </h2>
            {store.xatolik && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-600">
                {store.xatolik}
              </div>
            )}
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold">
                Ish maydoni nomi *
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border px-4"
                  placeholder="Masalan: Asosiy savdo tizimi"
                />
              </label>
              <label className="block text-sm font-bold">
                Manzil kaliti *
                <input
                  value={slug}
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border px-4"
                  placeholder="asosiy-savdo"
                />
              </label>
              <p className="text-xs text-gray-400">
                Manzil kaliti ish maydonini tizim ichida ajratib turadigan noyob nomdir.
              </p>
              <label className="flex items-center gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
                Ish maydoni faol
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="h-11 rounded-2xl bg-gray-100 px-5 font-bold"
              >
                Bekor qilish
              </button>
              <button
                disabled={store.amalBajarilmoqda}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50"
              >
                {store.amalBajarilmoqda && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
