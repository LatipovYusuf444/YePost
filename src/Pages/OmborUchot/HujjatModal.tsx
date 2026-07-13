import { useState, type ChangeEvent } from "react";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  History,
  ImageIcon,
  Link,
  MessageSquare,
  Plus,
  Printer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import SavdoSelect from "@/Pages/Savdo/SavdoSelect";
import type { Hujjat, HujjatSatri, Mahsulot, OmborItem, TarixYozuvi } from "./types";
import { hozirgiVaqt, hujjatJami, pul, tarixgaQoshish } from "./yordamchilar";

type Props = {
  sarlavha: string;
  kontragentYorligi?: string;
  omborYorligi: string;
  ikkinchiOmborYorligi?: string;
  omborlar: OmborItem[];
  mahsulotlar: Mahsulot[];
  boshlangich: Hujjat | null;
  keyingiRaqam: string;
  onYopish: () => void;
  onSaqlash: (hujjat: Hujjat, tasdiqla: boolean) => void;
};

type HujjatFayl = { id: string; nomi: string; sana: string };
type HujjatKomment = { id: string; matn: string; muallif: string; vaqt: string };

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

  const [fayllar, setFayllar] = useState<HujjatFayl[]>([]);
  const [kommentMatni, setKommentMatni] = useState("");
  const [kommentlar, setKommentlar] = useState<HujjatKomment[]>([]);
  const [tarix, setTarix] = useState<TarixYozuvi[]>(() =>
    tarixgaQoshish(boshlangich?.tarix, boshlangich ? "Hujjat tahrirlash uchun ochildi" : "Yangi hujjat qoralamasi ochildi")
  );

  function tarixgaYozish(matn: string) {
    setTarix((oldTarix) => [{ id: crypto.randomUUID(), matn, vaqt: hozirgiVaqt() }, ...oldTarix]);
  }

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

  function faylTanlash(event: ChangeEvent<HTMLInputElement>) {
    const tanlanganFayllar = event.target.files;
    if (!tanlanganFayllar || tanlanganFayllar.length === 0) return;
    const bugun = new Date().toISOString().slice(0, 10);
    const yangiFayllar: HujjatFayl[] = Array.from(tanlanganFayllar).map((fayl) => ({
      id: crypto.randomUUID(),
      nomi: fayl.name,
      sana: bugun,
    }));
    setFayllar((oldFayllar) => [...oldFayllar, ...yangiFayllar]);
    yangiFayllar.forEach((fayl) => tarixgaYozish(`Fayl biriktirildi: ${fayl.nomi}`));
    event.target.value = "";
  }

  function faylOchirish(id: string) {
    setFayllar((oldFayllar) => oldFayllar.filter((fayl) => fayl.id !== id));
  }

  function izohQoshish() {
    if (!kommentMatni.trim()) return;
    setKommentlar((oldKommentlar) => [
      { id: crypto.randomUUID(), matn: kommentMatni.trim(), muallif: "Siz", vaqt: hozirgiVaqt() },
      ...oldKommentlar,
    ]);
    tarixgaYozish("Izoh qo'shildi");
    setKommentMatni("");
  }

  function nusxaOlish() {
    if (typeof window === "undefined") return;
    void navigator.clipboard?.writeText(window.location.href);
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
      tarix,
    };
  }

  const jami = hujjatJami({ satrlar });

  return (
    <AppModal className="items-start justify-start bg-slate-950/55 p-0 py-3 pl-[78px] pr-3 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <div className="absolute -left-[46px] top-5 z-[90] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onYopish}
            title="Yopish"
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#FF6A00] text-white shadow-[0_10px_22px_rgba(249,115,22,.32)] ring-1 ring-white/80 transition duration-300 hover:-translate-x-0.5 hover:scale-105 active:scale-95"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={nusxaOlish}
            title="Havolani nusxalash"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Link size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            title="Yangi oynada ochish"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <ExternalLink size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Chop etish"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Printer size={15} />
          </button>
        </div>

        <div className="relative h-full w-full overflow-hidden rounded-l-[48px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE7D1] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
          <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/88 px-7 py-3.5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[30px] font-black tracking-tight text-slate-950">{sarlavha}</h2>
                  <span className="rounded-full bg-[#FFF3E2] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                    {boshlangich ? "Tahrirlash" : "Yangi"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onYopish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-[#FF6A00] hover:text-white"
                aria-label="Oynani yopish"
              >
                <X size={19} />
              </button>
            </div>
          </header>

          <div className="scrollbar-hidden h-[calc(100%-74px)] overflow-y-auto px-7 py-4 pb-28">
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <h3 className="mb-4 border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                    Hujjat haqida
                  </h3>

                  <div className="space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Hujjat raqami</span>
                      <input
                        value={raqami}
                        onChange={(event) => setRaqami(event.target.value)}
                        placeholder={keyingiRaqam}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    {kontragentYorligi && (
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">{kontragentYorligi}</span>
                        <input
                          value={kontragentNomi}
                          onChange={(event) => setKontragentNomi(event.target.value)}
                          placeholder="Nomini kiriting"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">Sana</span>
                        <div className="relative">
                          <input
                            type="date"
                            value={sanaQiymati}
                            onChange={(event) => setSanaQiymati(event.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                          />
                          <CalendarDays
                            size={18}
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">Valyuta</span>
                        <select
                          value={valyuta}
                          onChange={(event) => setValyuta(event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                        >
                          <option value="UZS">O'zbek so'mi</option>
                          <option value="USD">AQSH dollari</option>
                        </select>
                      </label>
                    </div>

                    <div className={ikkinchiOmborYorligi ? "grid grid-cols-2 gap-4" : ""}>
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">{omborYorligi}</span>
                        <SavdoSelect
                          value={omborId}
                          onChange={setOmborId}
                          placeholder="Omborni tanlang"
                          options={omborlar.map((ombor) => ({ value: ombor.id, label: ombor.nomi }))}
                          buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                          dropdownClassName="min-w-[280px]"
                          portal
                        />
                      </label>
                      {ikkinchiOmborYorligi && (
                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">{ikkinchiOmborYorligi}</span>
                          <SavdoSelect
                            value={omborIdTo}
                            onChange={setOmborIdTo}
                            placeholder="Omborni tanlang"
                            options={omborlar.map((ombor) => ({ value: ombor.id, label: ombor.nomi }))}
                            buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                            dropdownClassName="min-w-[280px]"
                            portal
                          />
                        </label>
                      )}
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Izoh</span>
                      <textarea
                        value={izoh}
                        onChange={(event) => setIzoh(event.target.value)}
                        rows={3}
                        placeholder="Ixtiyoriy izoh"
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                  </div>

                  <div className="mt-5 border-t border-orange-100/80 pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Fayllar</h3>
                      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-[#FF6A00] px-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,.22)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]">
                        <Upload size={15} />
                        Fayl yuklash
                        <input type="file" multiple className="hidden" onChange={faylTanlash} />
                      </label>
                    </div>

                    {fayllar.length === 0 ? (
                      <p className="py-4 text-center text-sm font-semibold text-slate-400">
                        Fayl yuklanmagan
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {fayllar.map((fayl) => (
                          <div
                            key={fayl.id}
                            className="flex flex-wrap items-center gap-2.5 rounded-xl bg-white/80 p-3 ring-1 ring-orange-50"
                          >
                            <FileText size={18} className="shrink-0 text-[#FF6A00]" />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
                              {fayl.nomi}
                            </span>
                            <button
                              type="button"
                              onClick={() => faylOchirish(fayl.id)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                              aria-label="Faylni o'chirish"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2 border-b border-orange-100/80 pb-3">
                    <MessageSquare size={16} className="text-[#FF6A00]" />
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Kommentariya
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={kommentMatni}
                      onChange={(event) => setKommentMatni(event.target.value)}
                      rows={3}
                      placeholder="Izoh yozing..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={izohQoshish}
                        disabled={!kommentMatni.trim()}
                        className="inline-flex h-9 items-center rounded-xl bg-[#FF6A00] px-4 text-sm font-black text-white transition hover:bg-[#EA580C] disabled:opacity-40"
                      >
                        Yuborish
                      </button>
                    </div>
                  </div>

                  {kommentlar.length > 0 && (
                    <div className="mt-4 space-y-2.5 border-t border-orange-100/80 pt-4">
                      {kommentlar.map((komment) => (
                        <div key={komment.id} className="rounded-xl bg-white/80 p-3 ring-1 ring-orange-50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-600">{komment.muallif}</span>
                            <span className="text-xs font-semibold text-slate-400">{komment.vaqt}</span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{komment.matn}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2 border-b border-orange-100/80 pb-3">
                    <History size={16} className="text-[#FF6A00]" />
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tarix</h3>
                  </div>

                  <div className="space-y-3.5">
                    {tarix.map((yozuv) => (
                      <div key={yozuv.id} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF6A00]" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700">{yozuv.matn}</p>
                          <p className="text-xs font-semibold text-slate-400">{yozuv.vaqt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <section className="mt-5 overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tovarlar</h3>
                <button
                  type="button"
                  onClick={satrQoshish}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#FF6A00] px-3.5 text-sm font-black uppercase text-white shadow-[0_10px_24px_rgba(255,106,0,.28)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
                >
                  <Plus size={16} />
                  Tovar qo'shish
                </button>
              </div>

              {satrlar.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-orange-200 bg-white/60 p-10 text-center text-sm font-semibold text-slate-400">
                  Tovar qo'shilmagan. "Tovar qo'shish" tugmasini bosing.
                </div>
              ) : (
                <>
                  <div className="scrollbar-hidden overflow-x-auto rounded-2xl border border-orange-100">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <thead className="bg-orange-50/70 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3">№</th>
                          <th className="px-3 py-3">Mahsulot</th>
                          <th className="px-3 py-3">Miqdor</th>
                          <th className="px-3 py-3">Narx</th>
                          <th className="px-3 py-3">Summa</th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-50">
                        {satrlar.map((satr, index) => (
                          <tr key={satr.id} className="hover:bg-orange-50/30">
                            <td className="px-3 py-2.5 text-xs font-black text-slate-400">{index + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-orange-200 bg-white text-slate-300">
                                  <ImageIcon size={16} />
                                </span>
                                <SavdoSelect
                                  value={satr.mahsulotId}
                                  onChange={(value) => satrniOzgartirish(satr.id, { mahsulotId: value })}
                                  placeholder="Mahsulotni tanlang"
                                  options={mahsulotlar.map((mahsulot) => ({
                                    value: mahsulot.id,
                                    label: mahsulot.nomi,
                                  }))}
                                  className="min-w-0 flex-1"
                                  buttonClassName="h-9 rounded-lg px-2.5 text-sm"
                                  dropdownClassName="min-w-[280px]"
                                  qidirish
                                  qidiruvPlaceholder="Mahsulot bo'yicha qidirish"
                                  portal
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                min={0}
                                value={satr.miqdor}
                                onChange={(event) =>
                                  satrniOzgartirish(satr.id, { miqdor: Number(event.target.value) })
                                }
                                className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                min={0}
                                value={satr.narx}
                                onChange={(event) =>
                                  satrniOzgartirish(satr.id, { narx: Number(event.target.value) })
                                }
                                className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                              />
                            </td>
                            <td className="px-3 py-2.5 font-black text-emerald-600">
                              {pul(satr.miqdor * satr.narx)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => satrOchirish(satr.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                                aria-label="Qatorni o'chirish"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Umumiy summa</p>
                      <p className="text-xl font-black text-slate-950">{pul(jami)}</p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>

          <footer className="absolute bottom-0 left-0 right-0 z-30 flex justify-end gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-7 py-3.5 backdrop-blur-xl">
            <button
              type="button"
              onClick={onYopish}
              className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => onSaqlash(yasashHujjat(), false)}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-[#FF6A00] shadow-sm ring-1 ring-orange-200 transition hover:-translate-y-0.5"
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={() => onSaqlash(yasashHujjat(), true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6A00] px-7 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-[0_18px_40px_rgba(234,88,12,.32)]"
            >
              Saqlash va tasdiqlash
            </button>
          </footer>
        </div>
      </div>
    </AppModal>
  );
}
