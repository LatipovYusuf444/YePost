import { useEffect, useState } from "react";
import { Edit3, LoaderCircle, Lock, Plus, Ruler, Trash2, X } from "lucide-react";
import { birliklarApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { foydalanuvchiDirektormi } from "@/lib/roles";
import type { OlchovBirligi } from "@/types/catalog";
import { BolimKarta } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function OlchovBirligiBolimi() {
  const profil = useAuthProfileStore((s) => s.profil);
  const direktor = foydalanuvchiDirektormi(profil);

  const [olchovlar, setOlchovlar] = useState<OlchovBirligi[]>([]);
  const [tahrir, setTahrir] = useState<OlchovBirligi | null>(null);
  const [formOchiq, setFormOchiq] = useState(false);
  const [kod, setKod] = useState("");
  const [nomi, setNomi] = useState("");
  const [qisqa, setQisqa] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yuklash() {
    setYuklanmoqda(true);
    setXato("");
    try {
      setOlchovlar(await birliklarApi.royxat());
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }
  useEffect(() => {
    void yuklash();
  }, []);

  function boshla(birlik?: OlchovBirligi) {
    if (!direktor) return;
    setTahrir(birlik ?? null);
    setKod(birlik?.code ?? "");
    setNomi(birlik?.name ?? "");
    setQisqa(birlik?.shortName ?? "");
    setFormOchiq(true);
  }

  function yopish() {
    setFormOchiq(false);
    setTahrir(null);
    setKod("");
    setNomi("");
    setQisqa("");
  }

  async function saqlash() {
    if (!direktor) return;
    if (!nomi.trim()) {
      setXato("O'lchov birligi nomi majburiy.");
      return;
    }
    setSaqlanmoqda(true);
    setXato("");
    try {
      const payload = { code: kod.trim() || undefined, name: nomi.trim(), shortName: qisqa.trim() || undefined };
      const saved = tahrir ? await birliklarApi.yangilash(tahrir.id, payload) : await birliklarApi.yaratish(payload);
      setOlchovlar((items) =>
        items.some((x) => x.id === saved.id) ? items.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...items]
      );
      yopish();
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  async function ochirish(birlik: OlchovBirligi) {
    if (!direktor) return;
    if (!window.confirm(`"${birlik.name}" o'lchov birligini o'chirasizmi?`)) return;
    setXato("");
    try {
      await birliklarApi.ochirish(birlik.id);
      setOlchovlar((items) => items.filter((x) => x.id !== birlik.id));
    } catch (error) {
      setXato(getApiErrorMessage(error));
    }
  }

  return (
    <BolimKarta
      sarlavha="O'lchov birligi"
      izoh="Mahsulot qo'shishda tanlanadigan birliklar (dona, kg, litr va h.k.) — real katalogdan olinadi."
      amal={
        direktor && !formOchiq ? (
          <button
            type="button"
            onClick={() => boshla()}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-[#FF6A00] px-5 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
          >
            <Plus size={16} />
            Qo'shish
          </button>
        ) : undefined
      }
    >
      {!direktor && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
          <Lock size={15} className="shrink-0 text-slate-400" />
          O'lchov birliklarini faqat direktor qo'sha, tahrirlay va o'chira oladi. Siz ro'yxatni faqat ko'rishingiz mumkin.
        </p>
      )}

      {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {formOchiq && direktor && (
        <div className="mb-5 rounded-2xl border border-orange-100 bg-[#FFF8EF]/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-black text-gray-800">{tahrir ? "Birlikni tahrirlash" : "Yangi o'lchov birligi"}</p>
            <button
              type="button"
              onClick={yopish}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition hover:bg-orange-500 hover:text-white"
              aria-label="Formani yopish"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_140px]">
            <input value={kod} onChange={(e) => setKod(e.target.value)} placeholder="Kod (796)" className={maydonKlass} />
            <input
              value={nomi}
              onChange={(e) => setNomi(e.target.value)}
              placeholder="Nomi (masalan: Dona)"
              className={maydonKlass}
              autoFocus
            />
            <input value={qisqa} onChange={(e) => setQisqa(e.target.value)} placeholder="Qisqa (dona)" className={maydonKlass} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={yopish}
              className="h-10 rounded-xl bg-white px-4 text-sm font-bold text-gray-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={saqlanmoqda}
              onClick={() => void saqlash()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-5 text-sm font-black text-white transition hover:bg-[#EA580C] disabled:opacity-50"
            >
              {saqlanmoqda && <LoaderCircle size={15} className="animate-spin" />}
              {tahrir ? "Yangilash" : "Qo'shish"}
            </button>
          </div>
        </div>
      )}

      {yuklanmoqda ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400">
          <LoaderCircle className="animate-spin" size={18} />
          Yuklanmoqda...
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {olchovlar.map((birlik) => (
            <article
              key={birlik.id}
              className="group rounded-[20px] border border-orange-100 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
                  <Ruler size={20} />
                </span>
                {direktor && (
                  <div className="flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => boshla(birlik)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF6A00] hover:bg-orange-100"
                      aria-label="Tahrirlash"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void ochirish(birlik)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                      aria-label="O'chirish"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-base font-black text-gray-900">{birlik.name}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                  {birlik.shortName || "Qisqa nom yo'q"}
                </span>
                {birlik.code && (
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#FF6A00]">
                    Kod: {birlik.code}
                  </span>
                )}
              </div>
            </article>
          ))}
          {olchovlar.length === 0 && (
            <div className="col-span-full rounded-[20px] border border-dashed border-orange-200 bg-orange-50/30 p-10 text-center">
              <Ruler className="mx-auto text-orange-300" size={30} />
              <p className="mt-3 text-sm font-bold text-slate-500">Backendda hali o'lchov birligi yo'q</p>
              {direktor && (
                <p className="mt-1 text-xs text-slate-400">Yuqoridagi "Qo'shish" tugmasi orqali birinchi birlikni yarating.</p>
              )}
            </div>
          )}
        </div>
      )}
    </BolimKarta>
  );
}
