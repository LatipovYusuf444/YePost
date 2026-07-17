import { useRef, useState, type DragEvent } from "react";
import { ChevronDown, ImagePlus, Plus, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { mockKategoriyalar } from "./mockData";
import type { Maxsulot } from "./types";

// Mahsulotlar sahifasidagi "Mahsulotni tahrirlash" UI'sining mock nusxasi.
// Backendga bog'lanmagan — lokal holat, mock ma'lumot.

const BIRLIKLAR = ["Dona", "kg", "litr", "metr", "quti"];

function tasodifiyRaqam(uzunlik: number) {
  let natija = "";
  for (let i = 0; i < uzunlik; i++) natija += Math.floor(Math.random() * 10);
  return natija;
}

export default function MahsulotModal({
  mahsulot,
  onClose,
}: {
  mahsulot: Maxsulot;
  onClose: () => void;
}) {
  const [nomi, setNomi] = useState(mahsulot.nomi);
  const [barkod, setBarkod] = useState(mahsulot.barkod);
  const [artikul, setArtikul] = useState(mahsulot.artikul);
  const [birlik, setBirlik] = useState(mahsulot.birlik);
  const [kategoriya, setKategoriya] = useState(mahsulot.categoryId);
  const [faol, setFaol] = useState(true);
  const [rasm, setRasm] = useState("");
  const [atribut, setAtribut] = useState("");
  const [tanNarx, setTanNarx] = useState(String(mahsulot.tanNarx));
  const [sotuvNarx, setSotuvNarx] = useState(String(mahsulot.sotuvNarx));
  const [ulgurji, setUlgurji] = useState(String(mahsulot.ulgurjiNarx));
  const rasmInput = useRef<HTMLInputElement | null>(null);

  const ustama =
    Number(tanNarx) > 0 && Number(sotuvNarx) >= 0
      ? (((Number(sotuvNarx) - Number(tanNarx)) / Number(tanNarx)) * 100).toFixed(1)
      : "";

  function rasmTanlash(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setRasm(URL.createObjectURL(file));
  }

  function rasmTashlandi(e: DragEvent) {
    e.preventDefault();
    rasmTanlash(e.dataTransfer.files?.[0]);
  }

  return (
    <AppModal>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="scrollbar-hidden max-h-[94vh] w-full max-w-[min(1200px,calc(100vw-32px))] overflow-y-auto rounded-[30px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white"
            >
              <X size={18} />
            </button>
            <h2 className="truncate text-2xl font-black">Mahsulotni tahrirlash</h2>
          </div>
        </div>

        <div className="px-6 py-6">
          <section className="space-y-5">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black">Asosiy</h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <div className="space-y-4">
                <label className="block text-sm font-black text-gray-500">
                  Nomi *
                  <div className="relative mt-2">
                    <input value={nomi} onChange={(e) => setNomi(e.target.value)} className="input pr-16" placeholder="Nomi kiriting" />
                    <button
                      type="button"
                      onClick={() => setNomi(mahsulot.nomi)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-black text-orange-600 hover:bg-orange-50"
                    >
                      Tez
                    </button>
                  </div>
                </label>
                <label className="block text-sm font-black text-gray-500">
                  Artikul *
                  <div className="relative mt-2">
                    <input value={artikul} onChange={(e) => setArtikul(e.target.value)} className="input pr-16" placeholder="Artikul" />
                    <button
                      type="button"
                      onClick={() => setArtikul(`${nomi.slice(0, 3).toUpperCase()}-${tasodifiyRaqam(6)}`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-black text-orange-600 hover:bg-orange-50"
                    >
                      Gen
                    </button>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black text-gray-500">
                  Barkod
                  <div className="relative mt-2">
                    <input value={barkod} onChange={(e) => setBarkod(e.target.value)} className="input pr-16" placeholder="Barkod" />
                    <button
                      type="button"
                      onClick={() => setBarkod(tasodifiyRaqam(13))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-black text-orange-600 hover:bg-orange-50"
                    >
                      Gen
                    </button>
                  </div>
                </label>
                <label className="block text-sm font-black text-gray-500">
                  Kategoriya *
                  <select value={kategoriya} onChange={(e) => setKategoriya(e.target.value)} className="input mt-2">
                    <option value="">Kategoriya</option>
                    {mockKategoriyalar.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nomi}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-4">
                <div className="block text-sm font-black text-gray-500">
                  <p>O'lchov birligi *</p>
                  <div className="mt-2 flex items-center gap-3">
                    <select value={birlik} onChange={(e) => setBirlik(e.target.value)} className="input min-w-0 flex-1">
                      {BIRLIKLAR.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setFaol(!faol)}
                      aria-label="Mahsulot holatini o'zgartirish"
                      className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
                        faol ? "bg-orange-500 shadow-sm shadow-orange-100" : "bg-gray-200"
                      }`}
                    >
                      <span className={`h-6 w-6 rounded-full bg-white shadow transition ${faol ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-black text-gray-500">Foto</p>
                  <input ref={rasmInput} type="file" accept="image/*" onChange={(e) => rasmTanlash(e.target.files?.[0])} className="hidden" />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => rasmInput.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") rasmInput.current?.click();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={rasmTashlandi}
                    className="flex min-h-[108px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-gray-100 px-4 py-4 text-center transition hover:border-orange-200 hover:bg-orange-50/40"
                  >
                    {rasm ? (
                      <div className="relative">
                        <img src={rasm} alt="Mahsulot rasmi" className="max-h-24 rounded-2xl object-contain" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRasm("");
                          }}
                          className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 shadow-lg ring-1 ring-red-100 hover:bg-red-500 hover:text-white"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                          <ImagePlus size={20} />
                        </div>
                        <p className="text-sm font-black text-gray-600">Rasmni tashlang</p>
                        <p className="text-sm font-black text-orange-600">Tanlash uchun bosing</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black">Variatsiyalar</h3>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-500">Variatsiya atributini tanlang *</p>
                <p className="mt-1 text-xs font-bold text-gray-400">Masalan: Rang</p>
                <div className="mt-3 max-w-md space-y-2">
                  <div className="relative">
                    <input value={atribut} onChange={(e) => setAtribut(e.target.value)} className="input pr-12" placeholder="Atribut kiriting" />
                    <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  {atribut.trim() ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <Plus size={16} />
                      Qo'shish "{atribut.trim()}"
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-center text-sm font-bold text-gray-400">
                      Variantlar yo'q
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-orange-100 bg-orange-50/30 p-4">
                <div className="mb-4">
                  <p className="text-base font-black text-gray-700">Asosiy variant narxlari</p>
                  <p className="mt-1 text-sm font-bold text-gray-400">
                    Variatsiya kiritilmasa, mahsulot uchun bitta asosiy variant yaratiladi.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Narx label="Kelish narxi" value={tanNarx} onChange={setTanNarx} />
                  <label className="block text-xs font-black uppercase tracking-[0.06em] text-gray-500">
                    Ustama
                    <div className="relative mt-2">
                      <input value={ustama} readOnly className="input pr-10 bg-gray-50" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">%</span>
                    </div>
                  </label>
                  <Narx label="Sotuv narxi" value={sotuvNarx} onChange={setSotuvNarx} />
                  <Narx label="Ulgurji narx" value={ulgurji} onChange={setUlgurji} />
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">
              Bekor qilish
            </button>
            <button className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white">
              Saqlash
            </button>
          </div>
        </div>
      </form>
    </AppModal>
  );
}

function Narx({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.06em] text-gray-500">
      {label}
      <div className="relative mt-2">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-14"
          placeholder="0"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">so'm</span>
      </div>
    </label>
  );
}
