import { useMemo, useState } from "react";
import { Check, Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import Dropdown from "./Dropdown";
import {
  mockFiliallar,
  mockKategoriyalar,
  mockMaxsulotlar,
  mockOmborlar,
  mockTovarHarakati,
  mockVariatsiyalar,
  mockXarakteristikalar,
} from "./mockData";
import { son } from "./yordamchilar";

// Ombor qoldig'i hisoboti — joriy qoldiq = boshQoldiq + Σkirim − Σchiqim (mock).
// Filter paneli backend "Ombor qoldig'i" hujjat filtriga mos: sana, ombor, filial,
// kategoriya, mahsulot, narx turi, variatsiya, xarakteristika, qoldiqlar + belgilar.
type NarxTuri = "tanNarx" | "sotuvNarx" | "ulgurjiNarx";
type QoldiqTuri = "hammasi" | "musbat" | "nol" | "manfiy";

const narxVariantlari: { value: string; nomi: string }[] = [
  { value: "tanNarx", nomi: "Tan narxi" },
  { value: "sotuvNarx", nomi: "Sotuv narxi" },
  { value: "ulgurjiNarx", nomi: "Ulgurji narx" },
];

const qoldiqVariantlari: { value: string; nomi: string }[] = [
  { value: "hammasi", nomi: "Hammasi" },
  { value: "musbat", nomi: "Musbat" },
  { value: "nol", nomi: "Nol" },
  { value: "manfiy", nomi: "Manfiy" },
];

const bugungiSana = new Date().toISOString().slice(0, 10);

function kategoriyaNomi(id: string) {
  return mockKategoriyalar.find((k) => k.id === id)?.nomi ?? "—";
}

// Kirim/inventarizatsiya qoldiqni oshiradi, chiqim/realizatsiya kamaytiradi.
function kirimmi(turi: string) {
  return turi === "kirim" || turi === "inventarizatsiya";
}

type Qator = {
  id: string;
  nomi: string;
  barkod: string;
  kategoriya: string;
  birlik: string;
  qoldiq: number;
  narx: number;
  summa: number;
};

function csvYuklash(ustunlar: string[], qatorlar: (string | number)[][]) {
  const satrlar = [ustunlar, ...qatorlar].map((qator) =>
    qator.map((katak) => `"${String(katak).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + satrlar.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ombor-qoldigi.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function QoldiqHisoboti() {
  const [sana, setSana] = useState(bugungiSana);
  const [omborlar, setOmborlar] = useState<string[]>([]);
  const [filiallar, setFiliallar] = useState<string[]>([]);
  const [kategoriyalar, setKategoriyalar] = useState<string[]>([]);
  const [mahsulotlar, setMahsulotlar] = useState<string[]>([]);
  const [variatsiyalar, setVariatsiyalar] = useState<string[]>([]);
  const [xarakteristikalar, setXarakteristikalar] = useState<string[]>([]);
  const [narxTuri, setNarxTuri] = useState<NarxTuri>("sotuvNarx");
  const [qoldiqTuri, setQoldiqTuri] = useState<QoldiqTuri>("hammasi");
  // Ko'rsatish belgilari (backend filtridagi checkboxlar)
  const [rezervni, setRezervni] = useState(true);
  const [omborBoyicha, setOmborBoyicha] = useState(false);
  const [shtrixKod, setShtrixKod] = useState(false);
  const [variatsiyaKor, setVariatsiyaKor] = useState(false);
  const [qidiruv, setQidiruv] = useState("");

  const maxsulotTanlovlari = useMemo(
    () => mockMaxsulotlar.map((m) => ({ id: m.id, nomi: m.nomi })),
    []
  );

  const qatorlar = useMemo<Qator[]>(() => {
    const ichida = (massiv: string[], id: string) => massiv.length === 0 || massiv.includes(id);
    const kalit = qidiruv.trim().toLowerCase();

    return mockMaxsulotlar
      .filter(
        (m) =>
          ichida(kategoriyalar, m.categoryId) &&
          ichida(mahsulotlar, m.id) &&
          (!kalit ||
            [m.nomi, kategoriyaNomi(m.categoryId), m.artikul, m.barkod]
              .join(" ")
              .toLowerCase()
              .includes(kalit))
      )
      .map((m) => {
        // Tanlangan sanagacha bo'lgan, ombor/filial/xarakteristika filtriga mos harakatlar.
        const harakatlar = mockTovarHarakati.filter(
          (r) =>
            r.productId === m.id &&
            r.sana.slice(0, 10) <= sana &&
            ichida(omborlar, r.warehouseId) &&
            ichida(filiallar, r.filialId) &&
            ichida(xarakteristikalar, r.xarakteristikaId)
        );
        const qoldiq = harakatlar.reduce(
          (jami, r) => jami + (kirimmi(r.hujjatTuri) ? r.miqdor : -r.miqdor),
          m.boshQoldiq
        );
        const narx = m[narxTuri];
        return {
          id: m.id,
          nomi: m.nomi,
          barkod: m.barkod,
          kategoriya: kategoriyaNomi(m.categoryId),
          birlik: m.birlik,
          qoldiq,
          narx,
          summa: qoldiq * narx,
        };
      })
      .filter((q) => {
        if (qoldiqTuri === "musbat") return q.qoldiq > 0;
        if (qoldiqTuri === "nol") return q.qoldiq === 0;
        if (qoldiqTuri === "manfiy") return q.qoldiq < 0;
        return true;
      });
  }, [sana, omborlar, filiallar, kategoriyalar, mahsulotlar, xarakteristikalar, narxTuri, qoldiqTuri, qidiruv]);

  const jami = useMemo(
    () => ({
      mahsulot: qatorlar.length,
      qoldiq: qatorlar.reduce((s, q) => s + q.qoldiq, 0),
      summa: qatorlar.reduce((s, q) => s + q.summa, 0),
    }),
    [qatorlar]
  );

  const ustunlar: Ustun<Qator>[] = useMemo(() => {
    const ust: Ustun<Qator>[] = [
      {
        id: "nomi",
        nom: "Mahsulot",
        kenglik: 240,
        katak: (q) => <span className="font-black text-gray-950">{q.nomi}</span>,
        jami: () => `Jami: ${jami.mahsulot} mahsulot`,
      },
    ];
    if (shtrixKod) {
      ust.push({ id: "barkod", nom: "Shtrix kod", kenglik: 160, katak: (q) => q.barkod });
    }
    ust.push(
      { id: "kategoriya", nom: "Kategoriya", kenglik: 150, katak: (q) => q.kategoriya },
      { id: "birlik", nom: "Birlik", kenglik: 100, katak: (q) => q.birlik },
      {
        id: "qoldiq",
        nom: "Qoldiq",
        kenglik: 120,
        katak: (q) => (
          <span
            className={`font-black ${
              q.qoldiq > 0 ? "text-emerald-600" : q.qoldiq < 0 ? "text-red-500" : "text-gray-400"
            }`}
          >
            {son(q.qoldiq)}
          </span>
        ),
        jami: () => son(jami.qoldiq),
      },
      { id: "narx", nom: "Narx", kenglik: 140, katak: (q) => `${son(q.narx)} so'm` },
      {
        id: "summa",
        nom: "Summa",
        kenglik: 160,
        katak: (q) => <span className="font-bold text-gray-800">{son(q.summa)} so'm</span>,
        jami: () => <span className="font-black text-orange-600">{son(jami.summa)} so'm</span>,
      }
    );
    return ust;
  }, [jami, shtrixKod]);

  function eksport() {
    const bosh = ["Mahsulot", ...(shtrixKod ? ["Shtrix kod"] : []), "Kategoriya", "Birlik", "Qoldiq", "Narx", "Summa"];
    csvYuklash(
      bosh,
      qatorlar.map((q) => [
        q.nomi,
        ...(shtrixKod ? [q.barkod] : []),
        q.kategoriya,
        q.birlik,
        q.qoldiq,
        q.narx,
        q.summa,
      ])
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter paneli — backend "Ombor qoldig'i" hujjat filtriga mos */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        {/* Sana bo'yicha */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-bold text-gray-700">Sana bo'yicha</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={sana}
              onChange={(e) => setSana(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={() => setSana(bugungiSana)}
              className="h-11 rounded-2xl border border-orange-100 bg-orange-50 px-4 text-sm font-bold text-orange-600 transition hover:bg-orange-100"
            >
              Bugun
            </button>
          </div>
        </div>

        {/* Filtrlar to'ri */}
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <KopTanlovli label="Ombor" options={mockOmborlar} selected={omborlar} onChange={setOmborlar} />
          <KopTanlovli label="Filial" options={mockFiliallar} selected={filiallar} onChange={setFiliallar} />
          <KopTanlovli
            label="Mahsulot kategoriyasi"
            options={mockKategoriyalar}
            selected={kategoriyalar}
            onChange={setKategoriyalar}
           
          />
          <KopTanlovli
            label="Mahsulot"
            options={maxsulotTanlovlari}
            selected={mahsulotlar}
            onChange={setMahsulotlar}
           
          />
          <Dropdown
            label="Narx turi"
            value={narxTuri}
            options={narxVariantlari}
            onChange={(v) => setNarxTuri(v as NarxTuri)}
          />
          <KopTanlovli
            label="Variatsiyalar"
            options={mockVariatsiyalar}
            selected={variatsiyalar}
            onChange={setVariatsiyalar}
           
          />
          <KopTanlovli
            label="Xarakteristika"
            options={mockXarakteristikalar}
            selected={xarakteristikalar}
            onChange={setXarakteristikalar}
           
          />
          <Dropdown
            label="Qoldiqlar"
            value={qoldiqTuri}
            options={qoldiqVariantlari}
            onChange={(v) => setQoldiqTuri(v as QoldiqTuri)}
          />
        </div>

        {/* Ko'rsatish belgilari */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t border-orange-50 pt-4">
          <Belgi label="Rezervni ko'rsatish" belgili={rezervni} onToggle={() => setRezervni((v) => !v)} />
          <Belgi label="Omborlar bo'yicha ajratish" belgili={omborBoyicha} onToggle={() => setOmborBoyicha((v) => !v)} />
          <Belgi label="Shtrix kodni ko'rsatish" belgili={shtrixKod} onToggle={() => setShtrixKod((v) => !v)} />
          <Belgi label="Variatsiyalarni ko'rsatish" belgili={variatsiyaKor} onToggle={() => setVariatsiyaKor((v) => !v)} />
        </div>
      </section>

      {/* Amal qatori */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={eksport}
          className="inline-flex h-12 items-center gap-2 self-start rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
        >
          <Download size={16} />
          Excel (CSV)
        </button>
        <div className="relative md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={qidiruv}
            onChange={(e) => setQidiruv(e.target.value)}
            placeholder="Mahsulot, kategoriya, artikul..."
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {/* Natija jadvali */}
      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        {qatorlar.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 text-center">
            <div>
              <Search className="mx-auto text-orange-300" size={40} />
              <p className="mt-3 font-bold text-gray-500">Tanlangan filtrlar bo'yicha qoldiq topilmadi.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-gray-400">
              Ustun chetini tortib kengaytiring, sarlavhani sudrab joyini almashtiring.
            </p>
            <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={qatorlar} jamiBor />
          </>
        )}
      </section>
    </div>
  );
}

function Belgi({
  label,
  belgili,
  onToggle,
}: {
  label: string;
  belgili: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
          belgili ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check size={14} strokeWidth={3} />
      </span>
      {label}
    </button>
  );
}
