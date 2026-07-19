import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import MuddatTanlov from "./MuddatTanlov";
import { foydaHisobotiniYuklash } from "./excelEksport";
import {
  filialKompaniyasi,
  mockFiliallar,
  mockKompaniyalar,
  mockMaxsulotlar,
  mockMijozlar,
  mockOmborlar,
  mockTovarHarakati,
} from "./mockData";
import type { Tanlov } from "./types";
import { bugun, oyBoshiMinus, oyNomi, oylarRoyxati, pul, sanadaMi } from "./yordamchilar";

type Filter = {
  dateFrom: string;
  dateTo: string;
  customerIds: string[];
  kompaniyaIds: string[];
  warehouseIds: string[];
  filialIds: string[];
};

// Default: oxirgi 4 oy (oylik ajratma ko'rinsin).
const boshFilter: Filter = {
  dateFrom: oyBoshiMinus(3),
  dateTo: bugun(),
  customerIds: [],
  kompaniyaIds: [],
  warehouseIds: [],
  filialIds: [],
};

type OyQiymati = { savdo: number; foyda: number };

type Qator = {
  id: string;
  nomi: string;
  oylik: Record<string, OyQiymati>; // oy kaliti → o'sha oydagi savdo va foyda
  jamiSavdo: number;
  jamiFoyda: number;
  rentabellik: number;
};

function nomTop(royxat: Tanlov[], id: string) {
  return royxat.find((item) => item.id === id)?.nomi ?? "";
}

function foiz(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function FoydaHisoboti() {
  const [ish, setIsh] = useState<Filter>(boshFilter);
  const [filter, setFilter] = useState<Filter>(boshFilter);
  const [qidiruv, setQidiruv] = useState("");

  function yangilash<K extends keyof Filter>(kalit: K, qiymat: Filter[K]) {
    setIsh((old) => ({ ...old, [kalit]: qiymat }));
  }

  // Davr ichidagi oylar — jadval ustunlari shunga qarab hosil bo'ladi.
  const oylar = useMemo(
    () => oylarRoyxati(filter.dateFrom, filter.dateTo),
    [filter.dateFrom, filter.dateTo]
  );
  const kopYil = new Set(oylar.map((o) => o.slice(0, 4))).size > 1;

  // Mijozga sotilgan tovarlar (realizatsiya) → xaridor × oy bo'yicha foyda.
  const qatorlar = useMemo<Qator[]>(() => {
    const ichida = (massiv: string[], id: string) => massiv.length === 0 || massiv.includes(id);

    const sotuvlar = mockTovarHarakati.filter(
      (m) =>
        m.hujjatTuri === "realizatsiya" &&
        m.customerId &&
        sanadaMi(m.sana, filter.dateFrom, filter.dateTo) &&
        ichida(filter.customerIds, m.customerId) &&
        ichida(filter.warehouseIds, m.warehouseId) &&
        ichida(filter.filialIds, m.filialId) &&
        // Kompaniya — bizning firmamiz: harakat filiali qaysi firmaga tegishli.
        (filter.kompaniyaIds.length === 0 ||
          filter.kompaniyaIds.includes(filialKompaniyasi[m.filialId] ?? ""))
    );

    const jamlanma = new Map<string, Qator>();
    for (const m of sotuvlar) {
      const mahsulot = mockMaxsulotlar.find((p) => p.id === m.productId);
      if (!mahsulot) continue;

      const savdo = m.miqdor * mahsulot.sotuvNarx;
      const foyda = savdo - m.miqdor * mahsulot.tanNarx;
      const oy = m.sana.slice(0, 7);

      const eski =
        jamlanma.get(m.customerId) ??
        ({
          id: m.customerId,
          nomi: nomTop(mockMijozlar, m.customerId),
          oylik: {},
          jamiSavdo: 0,
          jamiFoyda: 0,
          rentabellik: 0,
        } satisfies Qator);

      const oyEski = eski.oylik[oy] ?? { savdo: 0, foyda: 0 };
      eski.oylik[oy] = { savdo: oyEski.savdo + savdo, foyda: oyEski.foyda + foyda };
      eski.jamiSavdo += savdo;
      eski.jamiFoyda += foyda;
      jamlanma.set(m.customerId, eski);
    }

    const kalit = qidiruv.trim().toLowerCase();
    return [...jamlanma.values()]
      .map((k) => ({
        ...k,
        rentabellik: k.jamiSavdo ? (k.jamiFoyda / k.jamiSavdo) * 100 : 0,
      }))
      .filter((k) => !kalit || k.nomi.toLowerCase().includes(kalit))
      .sort((a, b) => b.jamiFoyda - a.jamiFoyda);
  }, [filter, qidiruv]);

  const jami = useMemo(() => {
    const oylik: Record<string, OyQiymati> = {};
    for (const oy of oylar) {
      oylik[oy] = {
        savdo: qatorlar.reduce((s, k) => s + (k.oylik[oy]?.savdo ?? 0), 0),
        foyda: qatorlar.reduce((s, k) => s + (k.oylik[oy]?.foyda ?? 0), 0),
      };
    }
    const savdo = qatorlar.reduce((s, k) => s + k.jamiSavdo, 0);
    const foyda = qatorlar.reduce((s, k) => s + k.jamiFoyda, 0);
    return { oylik, savdo, foyda, rentabellik: savdo ? (foyda / savdo) * 100 : 0 };
  }, [qatorlar, oylar]);

  async function eksport() {
    // Kompaniya sarlavhasi: tanlanmagan bo'lsa "Barchasi".
    const kompaniya = filter.kompaniyaIds.length
      ? filter.kompaniyaIds.map((id) => nomTop(mockKompaniyalar, id)).join(", ")
      : "Barchasi";

    await foydaHisobotiniYuklash({
      qatorlar: qatorlar.map((k) => ({ nomi: k.nomi, oylik: k.oylik })),
      oylar,
      oyNomlari: oylar.map((o) => oyNomi(o, kopYil)),
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      kompaniya,
    });
  }

  const ustunlar: Ustun<Qator>[] = useMemo(
    () => [
      {
        id: "xaridor",
        nom: "Xaridor",
        kenglik: 190,
        katak: (k) => <span className="font-black text-gray-950">{k.nomi}</span>,
        jami: () => `Jami: ${qatorlar.length} ta`,
      },
      ...oylar.flatMap<Ustun<Qator>>((oy) => [
        {
          id: `savdo-${oy}`,
          nom: `${oyNomi(oy, kopYil)} Jami savdo`,
          kenglik: 150,
          hizalash: "right",
          katak: (k) =>
            k.oylik[oy]?.savdo ? (
              <span className="text-gray-700">{pul(k.oylik[oy].savdo)}</span>
            ) : (
              <span className="text-gray-300">—</span>
            ),
          jami: () => (jami.oylik[oy]?.savdo ? pul(jami.oylik[oy].savdo) : "—"),
        },
        {
          id: `foyda-${oy}`,
          nom: `${oyNomi(oy, kopYil)} Jami foyda`,
          kenglik: 150,
          hizalash: "right",
          katak: (k) =>
            k.oylik[oy]?.foyda ? (
              <span
                className={k.oylik[oy].foyda >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-500"}
              >
                {pul(k.oylik[oy].foyda)}
              </span>
            ) : (
              <span className="text-gray-300">—</span>
            ),
          jami: () =>
            jami.oylik[oy]?.foyda ? (
              <span className="text-emerald-600">{pul(jami.oylik[oy].foyda)}</span>
            ) : (
              "—"
            ),
        },
      ]),
      {
        id: "jamiSavdo",
        nom: "Jami savdo",
        kenglik: 160,
        hizalash: "right",
        katak: (k) => <span className="font-black text-gray-800">{pul(k.jamiSavdo)}</span>,
        jami: () => pul(jami.savdo),
      },
      {
        id: "jamiFoyda",
        nom: "Jami foyda",
        kenglik: 160,
        hizalash: "right",
        katak: (k) => (
          <span className={k.jamiFoyda >= 0 ? "font-black text-emerald-600" : "font-black text-red-500"}>
            {pul(k.jamiFoyda)}
          </span>
        ),
        jami: () => <span className="text-emerald-600">{pul(jami.foyda)}</span>,
      },
      {
        id: "rentabellik",
        nom: "Rentabellik",
        kenglik: 130,
        hizalash: "right",
        katak: (k) => (
          <span className={k.rentabellik >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-500"}>
            {foiz(k.rentabellik)}
          </span>
        ),
        jami: () => foiz(jami.rentabellik),
      },
    ],
    [qatorlar, jami, oylar, kopYil]
  );

  return (
    <div className="space-y-5">
      {/* Filter paneli */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="grid gap-x-6 gap-y-4 xl:grid-cols-4 sm:grid-cols-2">
          <MuddatTanlov
            dateFrom={ish.dateFrom}
            dateTo={ish.dateTo}
            onChange={(dateFrom, dateTo) => setIsh((old) => ({ ...old, dateFrom, dateTo }))}
          />
          <KopTanlovli
            label="Xaridor"
            options={mockMijozlar}
            selected={ish.customerIds}
            onChange={(v) => yangilash("customerIds", v)}
          />
          <KopTanlovli
            label="Kompaniya"
            options={mockKompaniyalar}
            selected={ish.kompaniyaIds}
            onChange={(v) => yangilash("kompaniyaIds", v)}
          />
          <KopTanlovli
            label="Ombor"
            options={mockOmborlar}
            selected={ish.warehouseIds}
            onChange={(v) => yangilash("warehouseIds", v)}
          />
          <KopTanlovli
            label="Filial"
            options={mockFiliallar}
            selected={ish.filialIds}
            onChange={(v) => yangilash("filialIds", v)}
          />
        </div>
      </section>

      {/* Amal qatori */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(ish)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white transition hover:bg-orange-600"
          >
            <Search size={18} />
            Hisobotni shakllantirish
          </button>
          <button
            onClick={() => void eksport()}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <Download size={16} />
            Excel yuklash
          </button>
        </div>
        <div className="relative md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={qidiruv}
            onChange={(e) => setQidiruv(e.target.value)}
            placeholder="Jadval bo'yicha qidiruv"
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
              <p className="mt-3 font-bold text-gray-500">Tanlangan muddatda sotuv topilmadi.</p>
            </div>
          </div>
        ) : (
          <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={qatorlar} jamiBor kengaytir />
        )}
      </section>
    </div>
  );
}
