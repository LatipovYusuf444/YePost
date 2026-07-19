import { useState } from "react";
import { Plus, Ruler, Trash2 } from "lucide-react";
import { useSozlamalarStore } from "@/store/sozlamalarUchotStore";
import type { OlchovBirligi } from "./types";
import { BolimKarta } from "./UmumiyUI";
import { maydonKlass, yangiId } from "./yordamchilar";

type Malumotnoma = "olchov";

const malumotnomalar: { id: Malumotnoma; nom: string; icon: typeof Ruler }[] = [
  { id: "olchov", nom: "O'lchov birligi", icon: Ruler },
];

// Ma'lumotnoma — kompaniyaning yordamchi ro'yxatlari (reference). Hozircha: O'lchov birligi.
export default function MalumotnomaBolimi() {
  const [tanlangan, setTanlangan] = useState<Malumotnoma>("olchov");

  return (
    <BolimKarta sarlavha="Ma'lumotnoma" izoh="Kompaniyaning yordamchi ro'yxatlari.">
      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        {/* Ma'lumotnomalar ro'yxati */}
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {malumotnomalar.map((m) => {
            const Ikonka = m.icon;
            const faol = tanlangan === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setTanlangan(m.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition md:w-full ${
                  faol
                    ? "bg-orange-50 text-[#FF6A00] ring-1 ring-orange-200"
                    : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                <Ikonka size={16} />
                {m.nom}
              </button>
            );
          })}
        </nav>

        {tanlangan === "olchov" && <OlchovBirligiRoyxati />}
      </div>
    </BolimKarta>
  );
}

function OlchovBirligiRoyxati() {
  const olchovlar = useSozlamalarStore((s) => s.olchovBirliklari);
  const olchovSaqlash = useSozlamalarStore((s) => s.olchovSaqlash);
  const olchovOchirish = useSozlamalarStore((s) => s.olchovOchirish);

  const [tahrir, setTahrir] = useState<OlchovBirligi | null>(null);
  const [kod, setKod] = useState("");
  const [nomi, setNomi] = useState("");
  const [qisqa, setQisqa] = useState("");

  function boshla(birlik?: OlchovBirligi) {
    setTahrir(birlik ?? { id: "", kod: "", nomi: "", qisqa: "" });
    setKod(birlik?.kod ?? "");
    setNomi(birlik?.nomi ?? "");
    setQisqa(birlik?.qisqa ?? "");
  }

  function saqlash() {
    if (!nomi.trim()) return;
    olchovSaqlash({
      id: tahrir?.id || yangiId("ob"),
      kod: kod.trim(),
      nomi: nomi.trim(),
      qisqa: qisqa.trim() || nomi.trim().toLowerCase(),
    });
    setTahrir(null);
    setKod("");
    setNomi("");
    setQisqa("");
  }

  return (
    <div className="min-w-0">
      {/* Qo'shish / tahrirlash qatori */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          onFocus={() => !tahrir && boshla()}
          placeholder="Kod (796)"
          className={`${maydonKlass} sm:max-w-[110px]`}
        />
        <input
          value={nomi}
          onChange={(e) => setNomi(e.target.value)}
          onFocus={() => !tahrir && boshla()}
          placeholder="Nomi (masalan: Dona)"
          className={maydonKlass}
        />
        <input
          value={qisqa}
          onChange={(e) => setQisqa(e.target.value)}
          onFocus={() => !tahrir && boshla()}
          placeholder="Qisqa (dona)"
          className={`${maydonKlass} sm:max-w-[150px]`}
        />
        <button
          type="button"
          onClick={saqlash}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-4 text-sm font-black text-white hover:bg-[#EA580C]"
        >
          <Plus size={16} />
          {tahrir?.id ? "Yangilash" : "Qo'shish"}
        </button>
      </div>

      {/* Ro'yxat */}
      <div className="divide-y divide-orange-100 overflow-hidden rounded-2xl border border-orange-100">
        {olchovlar.map((birlik) => (
          <div key={birlik.id} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50/40">
            <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-black text-[#FF6A00]">
              {birlik.kod || <Ruler size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-800">{birlik.nomi}</p>
              <p className="text-xs font-bold text-slate-400">{birlik.qisqa}</p>
            </div>
            <button
              type="button"
              onClick={() => boshla(birlik)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#FF6A00] transition hover:bg-orange-100"
            >
              Tahrirlash
            </button>
            <button
              type="button"
              onClick={() => olchovOchirish(birlik.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
              aria-label="O'chirish"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {olchovlar.length === 0 && (
          <p className="p-8 text-center text-sm font-bold text-slate-400">O'lchov birligi yo'q</p>
        )}
      </div>
    </div>
  );
}
