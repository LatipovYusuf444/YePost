import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  History,
  Link,
  MessageSquare,
  Printer,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type { KochirmaHujjat, KochirmaSatri, Mahsulot, OmborItem, TarixYozuvi } from "./types";
import { holatNomi, hozirgiVaqt, kochirmaJami, omborNomi, pul, sana, tarixgaQoshish } from "./yordamchilar";

type Props = {
  hujjat: KochirmaHujjat;
  mahsulotlar: Mahsulot[];
  omborlar: OmborItem[];
  onYopish: () => void;
  onTahrirlash: () => void;
  onBekorQilish: () => void;
  onTasdiqlash: () => void;
};

type KochirmaFayl = { id: string; nomi: string; sana: string };
type KochirmaKomment = { id: string; matn: string; muallif: string; vaqt: string };

type UstunKaliti = "mahsulot" | "shtrixKod" | "tanNarx" | "soni" | "summa";

const USTUN_SOZLAMALARI: { kalit: UstunKaliti; nom: string; kenglik: number }[] = [
  { kalit: "mahsulot", nom: "Mahsulot", kenglik: 320 },
  { kalit: "shtrixKod", nom: "Shtrix kod", kenglik: 160 },
  { kalit: "tanNarx", nom: "Tan narhi", kenglik: 130 },
  { kalit: "soni", nom: "Soni", kenglik: 110 },
  { kalit: "summa", nom: "Summa", kenglik: 150 },
];

export default function KochirmaKorishModal({
  hujjat,
  mahsulotlar,
  omborlar,
  onYopish,
  onTahrirlash,
  onBekorQilish,
  onTasdiqlash,
}: Props) {
  const [fayllar, setFayllar] = useState<KochirmaFayl[]>([]);
  const [kommentMatni, setKommentMatni] = useState("");
  const [kommentlar, setKommentlar] = useState<KochirmaKomment[]>([]);
  const [tarix, setTarix] = useState<TarixYozuvi[]>(() =>
    tarixgaQoshish(hujjat.tarix, "Hujjat ko'rish uchun ochildi")
  );
  const [korinadiganUstunlar, setKorinadiganUstunlar] = useState<Record<UstunKaliti, boolean>>(
    () =>
      Object.fromEntries(USTUN_SOZLAMALARI.map((ustun) => [ustun.kalit, true])) as Record<
        UstunKaliti,
        boolean
      >
  );
  const [ustunKengliklari, setUstunKengliklari] = useState<Record<string, number>>(() =>
    Object.fromEntries(USTUN_SOZLAMALARI.map((ustun) => [ustun.kalit, ustun.kenglik]))
  );
  const [ustunlarMenyusiOchiq, setUstunlarMenyusiOchiq] = useState(false);
  const ustunlarMenyusiRef = useRef<HTMLDivElement | null>(null);
  const ustunlarTugmaRef = useRef<HTMLButtonElement | null>(null);

  const jami = kochirmaJami(hujjat);
  const korinadiganUstunSozlamalari = USTUN_SOZLAMALARI.filter(
    (ustun) => korinadiganUstunlar[ustun.kalit]
  );

  useEffect(() => {
    if (!ustunlarMenyusiOchiq) return;
    function tashqigaBosish(event: globalThis.MouseEvent) {
      const nishon = event.target as Node;
      if (
        !ustunlarMenyusiRef.current?.contains(nishon) &&
        !ustunlarTugmaRef.current?.contains(nishon)
      ) {
        setUstunlarMenyusiOchiq(false);
      }
    }
    document.addEventListener("mousedown", tashqigaBosish);
    return () => document.removeEventListener("mousedown", tashqigaBosish);
  }, [ustunlarMenyusiOchiq]);

  function ustunKorinishiniAlmashtirish(kalit: UstunKaliti) {
    setKorinadiganUstunlar((oldUstunlar) => ({ ...oldUstunlar, [kalit]: !oldUstunlar[kalit] }));
  }

  function ustunOlchaminiOzgartirish(kalit: string, event: ReactMouseEvent) {
    event.preventDefault();
    const boshlanishX = event.clientX;
    const boshlanishKenglik = ustunKengliklari[kalit] ?? 100;

    function harakat(moveEvent: globalThis.MouseEvent) {
      const farq = moveEvent.clientX - boshlanishX;
      setUstunKengliklari((old) => ({ ...old, [kalit]: Math.max(60, boshlanishKenglik + farq) }));
    }
    function toxtash() {
      window.removeEventListener("mousemove", harakat);
      window.removeEventListener("mouseup", toxtash);
    }
    window.addEventListener("mousemove", harakat);
    window.addEventListener("mouseup", toxtash);
  }

  function ustunHujayrasi(kalit: UstunKaliti, satr: KochirmaSatri) {
    const mahsulot = mahsulotlar.find((item) => item.id === satr.mahsulotId);

    switch (kalit) {
      case "mahsulot":
        return (
          <span className="font-bold text-slate-800">{mahsulot?.nomi ?? "Noma'lum mahsulot"}</span>
        );
      case "shtrixKod":
        return <span className="text-slate-500">{satr.shtrixKod || "—"}</span>;
      case "tanNarx":
        return <span className="text-slate-700">{pul(satr.tanNarx)}</span>;
      case "soni":
        return (
          <span className="text-slate-700">
            {satr.soni} {mahsulot?.birlik ?? "dona"}
          </span>
        );
      case "summa":
        return <span className="font-black text-emerald-600">{pul(satr.soni * satr.tanNarx)}</span>;
    }
  }

  function tarixgaYozish(matn: string) {
    setTarix((oldTarix) => [{ id: crypto.randomUUID(), matn, vaqt: hozirgiVaqt() }, ...oldTarix]);
  }

  function faylTanlash(event: ChangeEvent<HTMLInputElement>) {
    const tanlanganFayllar = event.target.files;
    if (!tanlanganFayllar || tanlanganFayllar.length === 0) return;
    const bugun = new Date().toISOString().slice(0, 10);
    const yangiFayllar: KochirmaFayl[] = Array.from(tanlanganFayllar).map((fayl) => ({
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
      {
        id: crypto.randomUUID(),
        matn: kommentMatni.trim(),
        muallif: hujjat.masulShaxs || "Siz",
        vaqt: hozirgiVaqt(),
      },
      ...oldKommentlar,
    ]);
    tarixgaYozish("Izoh qo'shildi");
    setKommentMatni("");
  }

  function nusxaOlish() {
    if (typeof window === "undefined") return;
    void navigator.clipboard?.writeText(window.location.href);
  }

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
                  <h2 className="text-[30px] font-black tracking-tight text-slate-950">{hujjat.nomi}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      hujjat.holati === "tasdiqlangan"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-[#FFF3E2] text-[#FF6A00]"
                    }`}
                  >
                    {holatNomi(hujjat.holati)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {hujjat.holati === "tasdiqlangan" ? (
                  <button
                    type="button"
                    onClick={onBekorQilish}
                    className="inline-flex h-11 items-center gap-2 rounded-[15px] bg-slate-700 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(15,23,42,.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    <RotateCcw size={16} />
                    Bekor qilish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onTahrirlash}
                    className="inline-flex h-11 items-center gap-2 rounded-[15px] bg-[#FF6A00] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,.22)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
                  >
                    <Edit3 size={16} />
                    Tahrirlash
                  </button>
                )}
                <button
                  type="button"
                  onClick={onYopish}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-[#FF6A00] hover:text-white"
                  aria-label="Oynani yopish"
                >
                  <X size={19} />
                </button>
              </div>
            </div>
          </header>

          <div className="scrollbar-hidden h-[calc(100%-74px)] overflow-y-auto px-7 py-4 pb-10">
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <h3 className="mb-4 border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                    Ko'chirma haqida
                  </h3>

                  <div className="space-y-4">
                    <div className="flex h-[160px] w-full flex-col justify-center rounded-2xl bg-gradient-to-br from-[#FFF3E2] to-[#FFE7D1] p-6 ring-1 ring-orange-100">
                      <p className="text-sm font-black uppercase tracking-wide text-[#EA580C]">
                        Umumiy summa
                      </p>
                      <p className="mt-2 text-4xl font-black text-slate-950">{pul(jami)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400">Yo'nalish</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-base font-bold text-slate-800">
                        <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-sm text-[#EA580C]">
                          {omborNomi(omborlar, hujjat.omborIdFrom)}
                        </span>
                        <ArrowRight size={16} className="text-slate-400" />
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm text-emerald-600">
                          {omborNomi(omborlar, hujjat.omborIdTo)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-400">Qachon ko'chirilgan</p>
                        <p className="mt-1 text-base font-bold text-slate-800">{sana(hujjat.sana)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-400">Mas'ul shaxs</p>
                        <p className="mt-1 text-base font-bold text-slate-800">
                          {hujjat.masulShaxs || "—"}
                        </p>
                      </div>
                    </div>
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
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                              <CalendarDays size={13} />
                              {sana(fayl.sana)}
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

            <section className="relative mt-5 rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
              <h3 className="mb-4 border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                Tovarlar
              </h3>

              <div className="relative">
                <div className="overflow-x-auto rounded-2xl border border-orange-100">
                  <table
                    className="border-collapse text-sm"
                    style={{ tableLayout: "fixed", width: "100%", minWidth: "max-content" }}
                  >
                    <colgroup>
                      <col style={{ width: 48 }} />
                      {korinadiganUstunSozlamalari.map((ustun) => (
                        <col key={ustun.kalit} style={{ width: ustunKengliklari[ustun.kalit] }} />
                      ))}
                      <col />
                      <col style={{ width: 56 }} />
                    </colgroup>
                    <thead className="bg-orange-50/70 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3">№</th>
                        {korinadiganUstunSozlamalari.map((ustun) => (
                          <th key={ustun.kalit} className="relative truncate px-3 py-3">
                            {ustun.nom}
                            <span
                              onMouseDown={(event) => ustunOlchaminiOzgartirish(ustun.kalit, event)}
                              className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-orange-300/70"
                            />
                          </th>
                        ))}
                        <th />
                        <th className="px-3 py-3 text-right">
                          <button
                            ref={ustunlarTugmaRef}
                            type="button"
                            onClick={() => setUstunlarMenyusiOchiq((old) => !old)}
                            aria-label="Ustunlarni sozlash"
                            title="Ustunlarni ko'rsatish/berkitish"
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                              ustunlarMenyusiOchiq
                                ? "bg-orange-100 text-[#FF6A00]"
                                : "text-slate-400 hover:bg-orange-100 hover:text-[#FF6A00]"
                            }`}
                          >
                            <Settings size={16} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50">
                      {hujjat.satrlar.map((satr, index) => (
                        <tr key={satr.id} className="hover:bg-orange-50/30">
                          <td className="px-3 py-2.5 text-xs font-black text-slate-400">{index + 1}</td>
                          {korinadiganUstunSozlamalari.map((ustun) => (
                            <td key={ustun.kalit} className="truncate px-3 py-2.5">
                              {ustunHujayrasi(ustun.kalit, satr)}
                            </td>
                          ))}
                          <td />
                          <td />
                        </tr>
                      ))}
                      {hujjat.satrlar.length === 0 && (
                        <tr>
                          <td
                            colSpan={korinadiganUstunSozlamalari.length + 3}
                            className="px-3 py-8 text-center text-slate-400"
                          >
                            Mahsulot qo'shilmagan
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {ustunlarMenyusiOchiq && (
                  <div
                    ref={ustunlarMenyusiRef}
                    className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-orange-100 bg-white p-2 shadow-xl"
                  >
                    <p className="px-2 py-1 text-xs font-black uppercase tracking-wide text-slate-400">
                      Ustunlarni ko'rsatish
                    </p>
                    <div className="max-h-60 overflow-y-auto">
                      {USTUN_SOZLAMALARI.filter((ustun) => ustun.kalit !== "mahsulot").map((ustun) => (
                        <label
                          key={ustun.kalit}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-orange-50"
                        >
                          <input
                            type="checkbox"
                            checked={korinadiganUstunlar[ustun.kalit]}
                            onChange={() => ustunKorinishiniAlmashtirish(ustun.kalit)}
                            className="h-4 w-4 accent-orange-500"
                          />
                          {ustun.nom}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {hujjat.holati === "qoralama" && (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={onTasdiqlash}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(16,185,129,.28)] transition hover:-translate-y-0.5 hover:bg-emerald-600"
                >
                  <CheckCircle2 size={18} />
                  Tasdiqlash
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
