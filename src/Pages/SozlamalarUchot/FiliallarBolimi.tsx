import { useState, type FormEvent } from "react";
import { MapPin, Phone, Plus, Star, Trash2, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useSozlamalarStore } from "@/store/sozlamalarUchotStore";
import type { Filial } from "./types";
import { BolimKarta, Maydon } from "./UmumiyUI";
import { maydonKlass, yangiId } from "./yordamchilar";

export default function FiliallarBolimi() {
  const filiallar = useSozlamalarStore((s) => s.filiallar);
  const filialOchirish = useSozlamalarStore((s) => s.filialOchirish);
  const asosiyFilialQilish = useSozlamalarStore((s) => s.asosiyFilialQilish);

  const [modal, setModal] = useState<Filial | "yangi" | null>(null);

  function ochirish(filial: Filial) {
    if (filial.asosiy) {
      window.alert("Asosiy filialni o'chirib bo'lmaydi. Avval boshqasini asosiy qiling.");
      return;
    }
    if (window.confirm(`${filial.nomi} filialini o'chirasizmi?`)) filialOchirish(filial.id);
  }

  return (
    <BolimKarta
      sarlavha="Filiallar"
      izoh="Kompaniya filiallari va omborlari."
      amal={
        <button
          type="button"
          onClick={() => setModal("yangi")}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={16} />
          Filial qo'shish
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {filiallar.map((filial) => (
          <article
            key={filial.id}
            className="rounded-[20px] border border-orange-100 bg-orange-50/30 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-950">{filial.nomi}</h3>
                {filial.asosiy && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6A00] px-2 py-0.5 text-xs font-bold text-white">
                    <Star size={11} /> Asosiy
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!filial.asosiy && (
                  <button
                    type="button"
                    onClick={() => asosiyFilialQilish(filial.id)}
                    title="Asosiy qilish"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-orange-100 hover:text-[#FF6A00]"
                  >
                    <Star size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => ochirish(filial)}
                  title="O'chirish"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModal(filial)}
              className="mt-3 block w-full text-left"
            >
              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin size={14} className="text-orange-400" />
                {filial.manzil || "Manzil kiritilmagan"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <Phone size={14} className="text-orange-400" />
                {filial.telefon || "—"}
              </p>
              <span className="mt-2 inline-block text-xs font-bold text-[#FF6A00]">
                Tahrirlash uchun bosing
              </span>
            </button>
          </article>
        ))}
      </div>

      {modal && (
        <FilialModal
          boshlangich={modal === "yangi" ? null : modal}
          onYopish={() => setModal(null)}
        />
      )}
    </BolimKarta>
  );
}

function FilialModal({ boshlangich, onYopish }: { boshlangich: Filial | null; onYopish: () => void }) {
  const filialSaqlash = useSozlamalarStore((s) => s.filialSaqlash);
  const [nomi, setNomi] = useState(boshlangich?.nomi ?? "");
  const [manzil, setManzil] = useState(boshlangich?.manzil ?? "");
  const [telefon, setTelefon] = useState(boshlangich?.telefon ?? "");
  const [xato, setXato] = useState("");

  function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!nomi.trim()) {
      setXato("Filial nomi to'ldirilishi shart.");
      return;
    }
    filialSaqlash({
      id: boshlangich?.id ?? yangiId("fl"),
      nomi: nomi.trim(),
      manzil: manzil.trim(),
      telefon: telefon.trim(),
      asosiy: boshlangich?.asosiy ?? false,
    });
    onYopish();
  }

  return (
    <AppModal className="bg-[rgba(54,22,8,.45)] p-4 backdrop-blur-[3px]">
      <form
        onSubmit={saqlash}
        className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_34px_120px_rgba(92,38,8,.42)]"
      >
        <header className="flex items-center justify-between border-b border-orange-100 px-6 py-4">
          <h2 className="text-lg font-black text-gray-950">
            {boshlangich ? "Filialni tahrirlash" : "Yangi filial"}
          </h2>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-orange-500 hover:text-white"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          {xato && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{xato}</p>
          )}
          <Maydon label="Filial nomi *">
            <input value={nomi} onChange={(e) => setNomi(e.target.value)} className={maydonKlass} />
          </Maydon>
          <Maydon label="Manzil">
            <input value={manzil} onChange={(e) => setManzil(e.target.value)} className={maydonKlass} />
          </Maydon>
          <Maydon label="Telefon">
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className={maydonKlass}
            />
          </Maydon>
        </div>

        <footer className="flex justify-end gap-3 border-t border-orange-100 px-6 py-4">
          <button
            type="button"
            onClick={onYopish}
            className="rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-200"
          >
            Bekor qilish
          </button>
          <button className="rounded-2xl bg-[#FF6A00] px-6 py-2.5 text-sm font-black text-white hover:bg-[#EA580C]">
            Saqlash
          </button>
        </footer>
      </form>
    </AppModal>
  );
}
