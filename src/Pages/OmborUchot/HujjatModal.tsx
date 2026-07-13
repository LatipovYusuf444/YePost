import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import type { Hujjat, HujjatSatri, Mahsulot, OmborItem } from "./types";
import { hujjatJami, pul } from "./yordamchilar";

type Props = {
  sarlavha: string;
  kontragentYorligi: string;
  omborYorligi: string;
  ikkinchiOmborYorligi?: string;
  omborlar: OmborItem[];
  mahsulotlar: Mahsulot[];
  boshlangich: Hujjat | null;
  keyingiRaqam: string;
  onYopish: () => void;
  onSaqlash: (hujjat: Hujjat, tasdiqla: boolean) => void;
};

function bosSatr(mahsulotId: string): HujjatSatri {
  return { id: crypto.randomUUID(), mahsulotId, miqdor: 1, narx: 0 };
}

export default function HujjatModal({
  sarlavha,
  kontragentYorligi,
  omborYorligi,
  ikkinchiOmborYorligi,
  omborlar,
  mahsulotlar,
  boshlangich,
  keyingiRaqam,
  onYopish,
  onSaqlash,
}: Props) {
  const [raqami, setRaqami] = useState(boshlangich?.raqami ?? keyingiRaqam);
  const [sanaQiymati, setSanaQiymati] = useState(boshlangich?.sana ?? new Date().toISOString().slice(0, 10));
  const [valyuta, setValyuta] = useState(boshlangich?.valyuta ?? "UZS");
  const [kontragentNomi, setKontragentNomi] = useState(boshlangich?.kontragentNomi ?? "");
  const [omborId, setOmborId] = useState(boshlangich?.omborId ?? omborlar[0]?.id ?? "");
  const [omborIdTo, setOmborIdTo] = useState(boshlangich?.omborIdTo ?? omborlar[1]?.id ?? omborlar[0]?.id ?? "");
  const [izoh, setIzoh] = useState(boshlangich?.izoh ?? "");
  const [satrlar, setSatrlar] = useState<HujjatSatri[]>(
    boshlangich?.satrlar ?? (mahsulotlar[0] ? [bosSatr(mahsulotlar[0].id)] : [])
  );

  function satrniOzgartirish(id: string, ozgarish: Partial<HujjatSatri>) {
    setSatrlar((oldSatrlar) =>
      oldSatrlar.map((satr) => (satr.id === id ? { ...satr, ...ozgarish } : satr))
    );
  }

  function satrQoshish() {
    if (!mahsulotlar[0]) return;
    setSatrlar((oldSatrlar) => [...oldSatrlar, bosSatr(mahsulotlar[0].id)]);
  }

  function satrOchirish(id: string) {
    setSatrlar((oldSatrlar) => oldSatrlar.filter((satr) => satr.id !== id));
  }

  function yasashHujjat(): Hujjat {
    return {
      id: boshlangich?.id ?? crypto.randomUUID(),
      raqami: raqami.trim() || keyingiRaqam,
      sana: sanaQiymati,
      valyuta,
      kontragentNomi: kontragentNomi.trim(),
      omborId,
      omborIdTo: ikkinchiOmborYorligi ? omborIdTo : undefined,
      izoh: izoh.trim(),
      holati: boshlangich?.holati ?? "qoralama",
      satrlar,
    };
  }

  const jami = hujjatJami({ satrlar });

  return (
    <AppModal>
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 className="text-2xl font-black text-gray-950">{sarlavha}</h2>
          <button
            onClick={onYopish}
            className="h-9 w-9 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Yopish"
          >
            ✕
          </button>
        </div>

        <Tabs defaultValue="umumiy" className="flex-1 overflow-hidden px-6 py-5">
          <TabsList className="h-11 w-full justify-start gap-1 bg-transparent p-0">
            <TabsTrigger
              value="umumiy"
              className="rounded-none border-b-2 border-transparent px-1 pb-3 text-base font-bold text-gray-400 data-active:border-orange-500 data-active:bg-transparent data-active:text-orange-600"
            >
              Umumiy
            </TabsTrigger>
            <TabsTrigger
              value="tovarlar"
              className="rounded-none border-b-2 border-transparent px-1 pb-3 text-base font-bold text-gray-400 data-active:border-orange-500 data-active:bg-transparent data-active:text-orange-600"
            >
              Tovarlar
              <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
                {satrlar.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="umumiy" className="mt-5 max-h-[52vh] space-y-4 overflow-y-auto pr-1">
            <label className="block space-y-2 text-sm font-bold text-gray-700">
              <span>Hujjat raqami</span>
              <input
                value={raqami}
                onChange={(event) => setRaqami(event.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                placeholder={keyingiRaqam}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2 text-sm font-bold text-gray-700">
                <span>Sana</span>
                <input
                  type="date"
                  value={sanaQiymati}
                  onChange={(event) => setSanaQiymati(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                />
              </label>
              <label className="block space-y-2 text-sm font-bold text-gray-700">
                <span>Valyuta</span>
                <select
                  value={valyuta}
                  onChange={(event) => setValyuta(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                >
                  <option value="UZS">O'zbek so'mi</option>
                  <option value="USD">AQSH dollari</option>
                </select>
              </label>
            </div>

            <label className="block space-y-2 text-sm font-bold text-gray-700">
              <span>{kontragentYorligi}</span>
              <input
                value={kontragentNomi}
                onChange={(event) => setKontragentNomi(event.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                placeholder="Nomini kiriting"
              />
            </label>

            <div className={ikkinchiOmborYorligi ? "grid grid-cols-2 gap-4" : ""}>
              <label className="block space-y-2 text-sm font-bold text-gray-700">
                <span>{omborYorligi}</span>
                <select
                  value={omborId}
                  onChange={(event) => setOmborId(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                >
                  {omborlar.map((ombor) => (
                    <option key={ombor.id} value={ombor.id}>
                      {ombor.nomi}
                    </option>
                  ))}
                </select>
              </label>
              {ikkinchiOmborYorligi && (
                <label className="block space-y-2 text-sm font-bold text-gray-700">
                  <span>{ikkinchiOmborYorligi}</span>
                  <select
                    value={omborIdTo}
                    onChange={(event) => setOmborIdTo(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                  >
                    {omborlar.map((ombor) => (
                      <option key={ombor.id} value={ombor.id}>
                        {ombor.nomi}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <label className="block space-y-2 text-sm font-bold text-gray-700">
              <span>Izoh</span>
              <textarea
                value={izoh}
                onChange={(event) => setIzoh(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400"
                placeholder="Ixtiyoriy izoh"
              />
            </label>
          </TabsContent>

          <TabsContent value="tovarlar" className="mt-5 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-3 py-2.5">Mahsulot</th>
                    <th className="px-3 py-2.5">Miqdor</th>
                    <th className="px-3 py-2.5">Narx</th>
                    <th className="px-3 py-2.5">Summa</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {satrlar.map((satr) => (
                    <tr key={satr.id}>
                      <td className="px-3 py-2">
                        <select
                          value={satr.mahsulotId}
                          onChange={(event) => satrniOzgartirish(satr.id, { mahsulotId: event.target.value })}
                          className="h-10 w-full rounded-xl border border-gray-200 px-2 outline-none focus:border-orange-400"
                        >
                          {mahsulotlar.map((mahsulot) => (
                            <option key={mahsulot.id} value={mahsulot.id}>
                              {mahsulot.nomi}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={satr.miqdor}
                          onChange={(event) =>
                            satrniOzgartirish(satr.id, { miqdor: Number(event.target.value) })
                          }
                          className="h-10 w-24 rounded-xl border border-gray-200 px-2 outline-none focus:border-orange-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={satr.narx}
                          onChange={(event) =>
                            satrniOzgartirish(satr.id, { narx: Number(event.target.value) })
                          }
                          className="h-10 w-28 rounded-xl border border-gray-200 px-2 outline-none focus:border-orange-400"
                        />
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-700">{pul(satr.miqdor * satr.narx)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => satrOchirish(satr.id)}
                          className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                          aria-label="Qatorni o'chirish"
                        >
                          <Trash2 size={15} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {satrlar.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                        Tovar qo'shilmagan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={satrQoshish}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-600"
            >
              <Plus size={15} />
              Tovar qo'shish
            </button>
            <div className="flex justify-end border-t border-gray-100 pt-3 text-base font-black text-gray-950">
              Jami: {pul(jami)}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-5">
          <button
            onClick={onYopish}
            className="h-11 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => onSaqlash(yasashHujjat(), false)}
            className="h-11 rounded-2xl bg-white px-5 text-sm font-black text-orange-600 ring-1 ring-orange-200"
          >
            Saqlash
          </button>
          <button
            onClick={() => onSaqlash(yasashHujjat(), true)}
            className="h-11 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white"
          >
            Saqlash va tasdiqlash
          </button>
        </div>
      </div>
    </AppModal>
  );
}
