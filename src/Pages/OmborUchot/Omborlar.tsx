import { useState, type FormEvent } from "react";
import { Edit3, Plus, Trash2, Warehouse } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { mockOmborlar } from "./mockData";
import type { OmborItem } from "./types";

export default function Omborlar() {
  const [omborlar, setOmborlar] = useState<OmborItem[]>(mockOmborlar);
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirOmbor, setTahrirOmbor] = useState<OmborItem | null>(null);
  const [nomi, setNomi] = useState("");
  const [manzil, setManzil] = useState("");
  const [faol, setFaol] = useState(true);

  function modalniOchish(ombor?: OmborItem) {
    setTahrirOmbor(ombor ?? null);
    setNomi(ombor?.nomi ?? "");
    setManzil(ombor?.manzil ?? "");
    setFaol(ombor?.faol ?? true);
    setModalOchiq(true);
  }

  function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!nomi.trim()) return;

    setOmborlar((oldOmborlar) => {
      if (tahrirOmbor) {
        return oldOmborlar.map((ombor) =>
          ombor.id === tahrirOmbor.id ? { ...ombor, nomi: nomi.trim(), manzil: manzil.trim(), faol } : ombor
        );
      }
      return [
        { id: crypto.randomUUID(), nomi: nomi.trim(), manzil: manzil.trim(), faol },
        ...oldOmborlar,
      ];
    });
    setModalOchiq(false);
  }

  function ochirish(id: string) {
    if (!window.confirm("Omborni o'chirasizmi?")) return;
    setOmborlar((oldOmborlar) => oldOmborlar.filter((ombor) => ombor.id !== id));
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor uchoti</p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Omborlar</h1>
          <p className="mt-1 text-sm text-gray-500">Ombor punktlarini yaratish va tahrirlash.</p>
        </div>
        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Ombor qo'shish
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {omborlar.map((ombor) => (
          <article key={ombor.id} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <Warehouse size={22} />
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  ombor.faol ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                }`}
              >
                {ombor.faol ? "Faol" : "Faol emas"}
              </span>
            </div>
            <h2 className="mt-5 text-xl font-black text-gray-950">{ombor.nomi}</h2>
            <p className="mt-1 text-sm text-gray-400">{ombor.manzil || "Manzil kiritilmagan"}</p>
            <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => modalniOchish(ombor)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 text-sm font-bold text-orange-600"
              >
                <Edit3 size={15} />
                Tahrirlash
              </button>
              <button
                onClick={() => ochirish(ombor.id)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"
                aria-label="Omborni o'chirish"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
        {omborlar.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center">
            <Warehouse className="mx-auto text-orange-200" size={42} />
            <p className="mt-3 font-bold text-gray-500">Ombor mavjud emas</p>
          </div>
        )}
      </div>

      {modalOchiq && (
        <AppModal>
          <form onSubmit={saqlash} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-gray-950">
              {tahrirOmbor ? "Omborni tahrirlash" : "Yangi ombor"}
            </h2>
            <div className="mt-6 space-y-4">
              <label className="block space-y-2 text-sm font-bold text-gray-700">
                <span>Ombor nomi *</span>
                <input
                  value={nomi}
                  onChange={(event) => setNomi(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                  placeholder="Masalan: Markaziy ombor"
                />
              </label>
              <label className="block space-y-2 text-sm font-bold text-gray-700">
                <span>Manzil</span>
                <input
                  value={manzil}
                  onChange={(event) => setManzil(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                  placeholder="Ombor manzili"
                />
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={faol}
                  onChange={(event) => setFaol(event.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
                Ombor faol
              </label>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOchiq(false)}
                className="h-11 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button className="h-11 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white">
                Saqlash
              </button>
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
