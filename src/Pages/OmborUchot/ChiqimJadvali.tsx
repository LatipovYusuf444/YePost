import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, FileText, Plus, Search, Settings, Trash2 } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import ChiqimKorishModal from "./ChiqimKorishModal";
import ChiqimModal from "./ChiqimModal";
import { boshlangichChiqimlar, mockMahsulotlar, mockOmborlar } from "./mockData";
import type { ChiqimHujjat } from "./types";
import { holatNomi, chiqimJami, omborNomi, pul, sana, tarixgaQoshish } from "./yordamchilar";

const BARCHA_USTUNLAR = [
  { kalit: "nomi", nom: "Nomi" },
  { kalit: "holati", nom: "Status" },
  { kalit: "yaratilganSana", nom: "Yaratilgan vaqti" },
  { kalit: "omborId", nom: "Ombor" },
  { kalit: "masulShaxs", nom: "Yaratgan mas'ul shaxs" },
  { kalit: "ozgartirilganSana", nom: "O'zgartirilgan vaqti" },
  { kalit: "ozgartirganShaxs", nom: "O'zgartirgan mas'ul shaxs" },
  { kalit: "summa", nom: "Summa" },
] as const;

type UstunKaliti = (typeof BARCHA_USTUNLAR)[number]["kalit"];

const BOSHLANGICH_TANLANGAN: UstunKaliti[] = [
  "nomi",
  "holati",
  "yaratilganSana",
  "omborId",
  "masulShaxs",
  "ozgartirilganSana",
  "ozgartirganShaxs",
  "summa",
];

const SAQLASH_KALITI = "omboruchot-chiqim-ustunlar";
const AMALLAR_KENGLIK_PX = 96;
const BOSHLANGICH_KENGLIK_PX = 170;
const ENG_KICHIK_KENGLIK_PX = 70;
const SARLAVHA_BALANDLIK_PX = 44;
const SATR_BALANDLIK_PX = 60;

export default function ChiqimJadvali() {
  const [royxat, setRoyxat] = useState<ChiqimHujjat[]>(boshlangichChiqimlar);
  const [qidiruv, setQidiruv] = useState("");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirHujjat, setTahrirHujjat] = useState<ChiqimHujjat | null>(null);
  const [korishHujjat, setKorishHujjat] = useState<ChiqimHujjat | null>(null);
  const [ochirilayotganHujjat, setOchirilayotganHujjat] = useState<ChiqimHujjat | null>(null);
  const [sozlamaOchiq, setSozlamaOchiq] = useState(false);
  const [tanlanganUstunlar, setTanlanganUstunlar] = useState<UstunKaliti[]>(() => {
    if (typeof window === "undefined") return BOSHLANGICH_TANLANGAN;
    try {
      const saqlangan = window.localStorage.getItem(SAQLASH_KALITI);
      if (!saqlangan) return BOSHLANGICH_TANLANGAN;
      const ozLar: UstunKaliti[] = JSON.parse(saqlangan);
      return ozLar.filter((kalit) => BARCHA_USTUNLAR.some((ustun) => ustun.kalit === kalit));
    } catch {
      return BOSHLANGICH_TANLANGAN;
    }
  });
  const sozlamaTugmaRef = useRef<HTMLButtonElement | null>(null);
  const sozlamaPanelRef = useRef<HTMLDivElement | null>(null);
  const jadvalRef = useRef<HTMLTableElement | null>(null);
  const skrollRef = useRef<HTMLDivElement | null>(null);
  const tortishHolati = useRef<{ ustun: number; boshX: number; boshKenglik: number } | null>(null);
  const skrollTortish = useRef<{ boshX: number; boshScrollLeft: number } | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [skrollHolati, setSkrollHolati] = useState({ chap: 0, kenglik: 100, korinadi: false });

  const korinadiganUstunlar = useMemo(
    () => BARCHA_USTUNLAR.filter((ustun) => tanlanganUstunlar.includes(ustun.kalit)),
    [tanlanganUstunlar]
  );

  const [kengliklar, setKengliklar] = useState<number[]>(() =>
    korinadiganUstunlar.map(() => BOSHLANGICH_KENGLIK_PX)
  );

  useEffect(() => {
    setKengliklar(korinadiganUstunlar.map(() => BOSHLANGICH_KENGLIK_PX));
  }, [korinadiganUstunlar.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SAQLASH_KALITI, JSON.stringify(tanlanganUstunlar));
  }, [tanlanganUstunlar]);

  function skrollHolatiniYangilash() {
    const el = skrollRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth + 1) {
      setSkrollHolati({ chap: 0, kenglik: 100, korinadi: false });
      return;
    }
    const kenglik = (clientWidth / scrollWidth) * 100;
    const maxChap = 100 - kenglik;
    const chap = (scrollLeft / (scrollWidth - clientWidth)) * maxChap;
    setSkrollHolati({ chap, kenglik, korinadi: true });
  }

  useEffect(() => {
    skrollHolatiniYangilash();
    const el = skrollRef.current;
    if (!el) return;
    const kuzatuvchi = new ResizeObserver(skrollHolatiniYangilash);
    kuzatuvchi.observe(el);
    window.addEventListener("resize", skrollHolatiniYangilash);
    return () => {
      kuzatuvchi.disconnect();
      window.removeEventListener("resize", skrollHolatiniYangilash);
    };
  }, [korinadiganUstunlar.length]);

  function skrollTugmasi(yonalish: -1 | 1) {
    skrollRef.current?.scrollBy({ left: yonalish * 240, behavior: "smooth" });
  }

  function trekkaBosish(event: React.MouseEvent<HTMLDivElement>) {
    const el = skrollRef.current;
    const trek = event.currentTarget;
    if (!el) return;
    const rect = trek.getBoundingClientRect();
    const nisbat = (event.clientX - rect.left) / rect.width;
    el.scrollTo({
      left: nisbat * (el.scrollWidth - el.clientWidth),
      behavior: "smooth",
    });
  }

  function tumbTortishniBoshlash(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const el = skrollRef.current;
    if (!el) return;
    skrollTortish.current = { boshX: event.clientX, boshScrollLeft: el.scrollLeft };

    function harakat(moveEvent: MouseEvent) {
      const holat = skrollTortish.current;
      if (!holat || !el) return;
      const deltaX = moveEvent.clientX - holat.boshX;
      el.scrollLeft = holat.boshScrollLeft + (deltaX / el.clientWidth) * el.scrollWidth;
    }

    function toxtatish() {
      skrollTortish.current = null;
      window.removeEventListener("mousemove", harakat);
      window.removeEventListener("mouseup", toxtatish);
    }

    window.addEventListener("mousemove", harakat);
    window.addEventListener("mouseup", toxtatish);
  }

  useEffect(() => {
    if (!sozlamaOchiq) return;

    function joylashuvniYangilash() {
      const rect = sozlamaTugmaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const kenglik = 288;
      const chegara = 12;
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: Math.min(Math.max(chegara, rect.right - kenglik), window.innerWidth - kenglik - chegara),
        width: kenglik,
      });
    }

    joylashuvniYangilash();
    window.addEventListener("resize", joylashuvniYangilash);
    window.addEventListener("scroll", joylashuvniYangilash, true);

    function tashqiBosish(event: MouseEvent) {
      const nishon = event.target as Node;
      if (
        !sozlamaTugmaRef.current?.contains(nishon) &&
        !sozlamaPanelRef.current?.contains(nishon)
      ) {
        setSozlamaOchiq(false);
      }
    }
    window.addEventListener("mousedown", tashqiBosish);

    return () => {
      window.removeEventListener("resize", joylashuvniYangilash);
      window.removeEventListener("scroll", joylashuvniYangilash, true);
      window.removeEventListener("mousedown", tashqiBosish);
    };
  }, [sozlamaOchiq]);

  function ustunniAlmashtirish(kalit: UstunKaliti) {
    setTanlanganUstunlar((old) =>
      old.includes(kalit) ? old.filter((item) => item !== kalit) : [...old, kalit]
    );
  }

  function tortishniBoshlash(ustun: number, event: React.MouseEvent) {
    event.preventDefault();
    tortishHolati.current = {
      ustun,
      boshX: event.clientX,
      boshKenglik: kengliklar[ustun],
    };

    function harakat(moveEvent: MouseEvent) {
      const holat = tortishHolati.current;
      if (!holat) return;
      const deltaX = moveEvent.clientX - holat.boshX;
      const yangiKenglik = Math.max(ENG_KICHIK_KENGLIK_PX, holat.boshKenglik + deltaX);
      setKengliklar((old) => {
        const nusxa = [...old];
        nusxa[holat.ustun] = yangiKenglik;
        return nusxa;
      });
    }

    function toxtatish() {
      tortishHolati.current = null;
      window.removeEventListener("mousemove", harakat);
      window.removeEventListener("mouseup", toxtatish);
    }

    window.addEventListener("mousemove", harakat);
    window.addEventListener("mouseup", toxtatish);
  }

  const keyingiNomi = useMemo(() => `Chiqim hujjati #${royxat.length + 1}`, [royxat.length]);

  const korinadiganRoyxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return royxat;
    return royxat.filter(
      (hujjat) =>
        hujjat.nomi.toLowerCase().includes(soz) ||
        hujjat.sabab.toLowerCase().includes(soz) ||
        (hujjat.masulShaxs ?? "").toLowerCase().includes(soz) ||
        sana(hujjat.sana).toLowerCase().includes(soz) ||
        holatNomi(hujjat.holati).toLowerCase().includes(soz)
    );
  }, [royxat, qidiruv]);

  function modalniOchish(hujjat?: ChiqimHujjat) {
    setTahrirHujjat(hujjat ?? null);
    setModalOchiq(true);
  }

  function saqlash(hujjat: ChiqimHujjat, tasdiqla: boolean) {
    const mavjudHujjat = royxat.find((item) => item.id === hujjat.id);
    let tarix = mavjudHujjat?.tarix;
    tarix = tarixgaQoshish(tarix, mavjudHujjat ? "Hujjat tahrirlandi" : "Hujjat yaratildi");
    if (tasdiqla && mavjudHujjat?.holati !== "tasdiqlangan") {
      tarix = tarixgaQoshish(tarix, "Hujjat tasdiqlandi");
    }
    const yakuniyHujjat: ChiqimHujjat = {
      ...hujjat,
      holati: tasdiqla ? "tasdiqlangan" : "qoralama",
      tarix,
    };
    setRoyxat((oldRoyxat) => {
      const mavjud = oldRoyxat.some((item) => item.id === yakuniyHujjat.id);
      return mavjud
        ? oldRoyxat.map((item) => (item.id === yakuniyHujjat.id ? yakuniyHujjat : item))
        : [yakuniyHujjat, ...oldRoyxat];
    });
    setModalOchiq(false);
  }

  function ochirishSorash(hujjat: ChiqimHujjat) {
    setOchirilayotganHujjat(hujjat);
  }

  function ochirishTasdiqlash() {
    if (!ochirilayotganHujjat) return;
    setRoyxat((oldRoyxat) => oldRoyxat.filter((item) => item.id !== ochirilayotganHujjat.id));
    setOchirilayotganHujjat(null);
  }

  function bekorQilish(hujjat: ChiqimHujjat) {
    const yangilangan: ChiqimHujjat = {
      ...hujjat,
      holati: "qoralama",
      tarix: tarixgaQoshish(hujjat.tarix, "Tasdiqlash bekor qilindi, tahrirlash uchun ochildi"),
    };
    setRoyxat((oldRoyxat) => oldRoyxat.map((item) => (item.id === hujjat.id ? yangilangan : item)));
    setKorishHujjat(null);
    modalniOchish(yangilangan);
  }

  function tasdiqlash(hujjat: ChiqimHujjat) {
    const yangilangan: ChiqimHujjat = {
      ...hujjat,
      holati: "tasdiqlangan",
      tarix: tarixgaQoshish(hujjat.tarix, "Hujjat tasdiqlandi"),
    };
    setRoyxat((oldRoyxat) => oldRoyxat.map((item) => (item.id === hujjat.id ? yangilangan : item)));
    setKorishHujjat(yangilangan);
  }

  function katakQiymati(hujjat: ChiqimHujjat, kalit: UstunKaliti) {
    switch (kalit) {
      case "nomi":
        return <span className="font-black text-gray-950">{hujjat.nomi}</span>;
      case "masulShaxs":
        return <span className="text-gray-700">{hujjat.masulShaxs || "—"}</span>;
      case "holati":
        return (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              hujjat.holati === "tasdiqlangan" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
            }`}
          >
            {holatNomi(hujjat.holati)}
          </span>
        );
      case "yaratilganSana":
        return <span className="text-gray-500">{hujjat.yaratilganSana ? sana(hujjat.yaratilganSana) : "—"}</span>;
      case "ozgartirilganSana":
        return <span className="text-gray-500">{hujjat.ozgartirilganSana ? sana(hujjat.ozgartirilganSana) : "—"}</span>;
      case "ozgartirganShaxs":
        return <span className="text-gray-700">{hujjat.ozgartirganShaxs || "—"}</span>;
      case "omborId":
        return <span className="text-gray-700">{omborNomi(mockOmborlar, hujjat.omborId)}</span>;
      case "summa":
        return <span className="font-bold text-gray-700">{pul(chiqimJami(hujjat))}</span>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor uchoti</p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Chiqim</h1>
          <p className="mt-1 text-sm text-gray-500">Ombordan tovar chiqim qilish hujjatlari.</p>
        </div>
        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          Yaratish
        </button>
      </header>

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={qidiruv}
          onChange={(event) => setQidiruv(event.target.value)}
          placeholder="Nomi, sabab, mas'ul shaxs, sana yoki holati bo'yicha qidirish"
          className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"
        />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
        <div className="flex">
          <div
            ref={skrollRef}
            onScroll={skrollHolatiniYangilash}
            className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <table
              ref={jadvalRef}
              style={{
                width: "100%",
                minWidth: `${kengliklar.reduce((jami, kenglik) => jami + kenglik, 0)}px`,
              }}
              className="table-fixed text-sm"
            >
              <colgroup>
                {kengliklar.map((kenglik, index) => (
                  <col key={korinadiganUstunlar[index].kalit} style={{ width: `${kenglik}px` }} />
                ))}
                <col />
              </colgroup>
              <thead className="bg-orange-50/60 text-left text-xs font-bold uppercase tracking-wide text-orange-500">
                <tr style={{ height: SARLAVHA_BALANDLIK_PX }}>
                  {korinadiganUstunlar.map((ustun, index) => (
                    <th key={ustun.kalit} className="relative truncate px-5 py-3">
                      {ustun.nom}
                      {index < korinadiganUstunlar.length - 1 && (
                        <div
                          onMouseDown={(event) => tortishniBoshlash(index, event)}
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none after:absolute after:right-[3px] after:top-1/2 after:h-4 after:w-[2px] after:-translate-y-1/2 after:rounded-full after:bg-orange-200 hover:after:bg-orange-400"
                        />
                      )}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {korinadiganRoyxat.map((hujjat) => (
                  <tr
                    key={hujjat.id}
                    onClick={() => setKorishHujjat(hujjat)}
                    style={{ height: SATR_BALANDLIK_PX }}
                    className="cursor-pointer hover:bg-orange-50/30"
                  >
                    {korinadiganUstunlar.map((ustun) => (
                      <td key={ustun.kalit} className="truncate px-5 py-3">
                        {katakQiymati(hujjat, ustun.kalit)}
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="shrink-0" style={{ width: AMALLAR_KENGLIK_PX }}>
            <table className="w-full table-fixed text-sm">
              <thead className="bg-orange-50/60">
                <tr style={{ height: SARLAVHA_BALANDLIK_PX }}>
                  <th className="relative px-5 py-2">
                    <div className="flex justify-end">
                      <button
                        ref={sozlamaTugmaRef}
                        onClick={() => setSozlamaOchiq((old) => !old)}
                        title="Ustunlarni sozlash"
                        aria-label="Ustunlarni sozlash"
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                          sozlamaOchiq ? "bg-orange-100 text-orange-600" : "text-orange-400 hover:bg-orange-100 hover:text-orange-600"
                        }`}
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {korinadiganRoyxat.map((hujjat) => (
                  <tr key={hujjat.id} style={{ height: SATR_BALANDLIK_PX }}>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => ochirishSorash(hujjat)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500"
                          aria-label="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {skrollHolati.korinadi && (
          <div className="flex items-center gap-3 border-t border-orange-100 px-4 py-3">
            <button
              onClick={() => skrollTugmasi(-1)}
              aria-label="Chapga surish"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-500 shadow-sm hover:bg-orange-50"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              onClick={trekkaBosish}
              className="relative h-2 flex-1 cursor-pointer rounded-full bg-orange-100/70"
            >
              <div
                onMouseDown={tumbTortishniBoshlash}
                className="absolute top-0 h-2 cursor-grab rounded-full bg-orange-500 active:cursor-grabbing"
                style={{ left: `${skrollHolati.chap}%`, width: `${skrollHolati.kenglik}%` }}
              />
            </div>

            <button
              onClick={() => skrollTugmasi(1)}
              aria-label="O'ngga surish"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-500 shadow-sm hover:bg-orange-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {korinadiganRoyxat.length === 0 && (
          <div className="p-14 text-center">
            <FileText className="mx-auto text-orange-200" size={42} />
            <p className="mt-3 font-bold text-gray-500">Chiqim hujjati topilmadi</p>
            <p className="mt-1 text-sm text-gray-400">"Yaratish" tugmasi orqali yangi chiqim qo'shing.</p>
          </div>
        )}
      </div>

      {modalOchiq && (
        <ChiqimModal
          mahsulotlar={mockMahsulotlar}
          omborlar={mockOmborlar}
          boshlangich={tahrirHujjat}
          keyingiNomi={keyingiNomi}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={saqlash}
        />
      )}

      {korishHujjat && !modalOchiq && (
        <ChiqimKorishModal
          hujjat={korishHujjat}
          mahsulotlar={mockMahsulotlar}
          omborlar={mockOmborlar}
          onYopish={() => setKorishHujjat(null)}
          onTahrirlash={() => {
            modalniOchish(korishHujjat);
            setKorishHujjat(null);
          }}
          onBekorQilish={() => bekorQilish(korishHujjat)}
          onTasdiqlash={() => tasdiqlash(korishHujjat)}
        />
      )}

      {ochirilayotganHujjat && (
        <AppModal>
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,.25)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Trash2 size={22} />
            </div>
            <h3 className="mt-4 text-center text-lg font-black text-gray-950">
              Hujjatni o'chirasizmi?
            </h3>
            <p className="mt-1.5 text-center text-sm text-gray-500">
              "{ochirilayotganHujjat.nomi}" hujjati butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setOchirilayotganHujjat(null)}
                className="h-11 flex-1 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={ochirishTasdiqlash}
                className="h-11 flex-1 rounded-2xl bg-red-500 text-sm font-black text-white hover:bg-red-600"
              >
                Ha, o'chirish
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {sozlamaOchiq &&
        createPortal(
          <div
            ref={sozlamaPanelRef}
            style={panelStyle}
            className="z-[100010] rounded-2xl border border-orange-100 bg-white p-2 shadow-[0_18px_44px_rgba(15,23,42,.18)] ring-1 ring-white/70"
          >
            <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-gray-400">Ko'rinadigan ustunlar</p>
            <div className="max-h-80 overflow-y-auto">
              {BARCHA_USTUNLAR.map((ustun) => {
                const tanlangan = tanlanganUstunlar.includes(ustun.kalit);
                return (
                  <label
                    key={ustun.kalit}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-orange-50/60"
                  >
                    <input
                      type="checkbox"
                      checked={tanlangan}
                      onChange={() => ustunniAlmashtirish(ustun.kalit)}
                      className="h-4 w-4 rounded border-gray-300 accent-orange-500"
                    />
                    {ustun.nom}
                  </label>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
