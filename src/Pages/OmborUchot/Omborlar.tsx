import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  LayoutGrid,
  MapPin,
  Plus,
  Table2,
  Trash2,
  Warehouse,
} from "lucide-react";
import OmborJadvali from "./OmborJadvali";
import OmborModal from "./OmborModal";
import { mockOmborlar } from "./mockData";
import type { OmborItem } from "./types";

type Korinish = "jadval" | "kartochka";

const korinishlar: Array<{ id: Korinish; nom: string; icon: typeof Table2 }> = [
  { id: "jadval", nom: "Jadval", icon: Table2 },
  { id: "kartochka", nom: "Kartochka", icon: LayoutGrid },
];

export default function Omborlar() {
  const [omborlar, setOmborlar] = useState<OmborItem[]>(mockOmborlar);
  const [korinish, setKorinish] = useState<Korinish>("jadval");
  const [korinishMenu, setKorinishMenu] = useState(false);
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirOmbor, setTahrirOmbor] = useState<OmborItem | null>(null);
  const korinishMenuRef = useRef<HTMLDivElement | null>(null);

  const TanlanganIcon = korinishlar.find((item) => item.id === korinish)!.icon;

  useEffect(() => {
    if (!korinishMenu) return;
    function tashqigaBosish(event: MouseEvent) {
      if (!korinishMenuRef.current?.contains(event.target as Node)) setKorinishMenu(false);
    }
    document.addEventListener("mousedown", tashqigaBosish);
    return () => document.removeEventListener("mousedown", tashqigaBosish);
  }, [korinishMenu]);

  function modalniOchish(ombor?: OmborItem) {
    setTahrirOmbor(ombor ?? null);
    setModalOchiq(true);
  }

  function saqlash(ombor: OmborItem) {
    setOmborlar((oldOmborlar) => {
      const mavjud = oldOmborlar.some((item) => item.id === ombor.id);
      return mavjud
        ? oldOmborlar.map((item) => (item.id === ombor.id ? ombor : item))
        : [ombor, ...oldOmborlar];
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

        <div className="flex items-center gap-3">
          <div className="relative" ref={korinishMenuRef}>
            <button
              type="button"
              onClick={() => setKorinishMenu((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-gray-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"
            >
              <TanlanganIcon size={17} className="text-orange-500" />
              Ko'rinish
              {korinishMenu ? (
                <ChevronUp size={16} className="text-orange-500" />
              ) : (
                <ChevronDown size={16} className="text-orange-500" />
              )}
            </button>
            {korinishMenu && (
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-orange-100 bg-white p-2 shadow-xl">
                {korinishlar.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setKorinish(item.id);
                        setKorinishMenu(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${
                        korinish === item.id
                          ? "bg-orange-500 text-white"
                          : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      <Icon size={17} />
                      {item.nom}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => modalniOchish()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
          >
            <Plus size={17} />
            Ombor qo'shish
          </button>
        </div>
      </header>

      {korinish === "jadval" ? (
        <OmborJadvali omborlar={omborlar} onTahrirlash={modalniOchish} onOchirish={ochirish} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {omborlar.map((ombor) => (
            <article
              key={ombor.id}
              onClick={() => modalniOchish(ombor)}
              className="cursor-pointer rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
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
              {ombor.gps && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-400">
                  <MapPin size={12} />
                  {ombor.gps}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
                <Clock size={14} className="text-orange-400" />
                {ombor.ishlashVaqti || "—"}
              </p>
              <p className="mt-3 text-sm font-bold text-gray-600">
                {ombor.masulShaxs || "Mas'ul shaxs biriktirilmagan"}
              </p>
              <p className="text-sm text-gray-400">{ombor.masulShaxsTel || "—"}</p>
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-orange-600">
                  <Edit3 size={15} />
                  Tahrirlash uchun bosing
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    ochirish(ombor.id);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
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
      )}

      {modalOchiq && (
        <OmborModal
          boshlangich={tahrirOmbor}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={saqlash}
        />
      )}
    </div>
  );
}
