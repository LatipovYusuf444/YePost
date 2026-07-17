import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import MuddatTanlov from "./MuddatTanlov";
import {
  mijozKompaniyasi,
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

// Default: oxirgi 3 oy (oylik ajratma ko'rinsin).
const boshFilter: Filter = {
  dateFrom: oyBoshiMinus(2),
  dateTo: bugun(),
  customerIds: [],
  kompaniyaIds: [],
  warehouseIds: [],
  filialIds: [],
};

type Qator = {
  id: string;
  nomi: string;
  oylik: Record<string, number>; // oy kaliti → o'sha oydagi foyda
  jamiFoyda: number;
  jamiTushum: number; // faqat rentabellik (foiz) hisoblash uchun
  rentabellik: number;
};

function nomTop(royxat: Tanlov[], id: string) {
  return royxat.find((item) => item.id === id)?.nomi ?? "";
}

function foiz(value: number) {
  return `${value.toFixed(2)}%`;
}

function csvYuklash(ustunlar: string[], qatorlar: (string | number)[][]) {
  const satrlar = [ustunlar, ...qatorlar].map((qator) =>
    qator.map((katak) => `"${String(katak).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + satrlar.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "foyda-hisoboti.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
        (filter.kompaniyaIds.length === 0 ||
          filter.kompaniyaIds.includes(mijozKompaniyasi[m.customerId] ?? ""))
    );

    const jamlanma = new Map<string, Qator>();
    for (const m of sotuvlar) {
      const mahsulot = mockMaxsulotlar.find((p) => p.id === m.productId);
      if (!mahsulot) continue;

      const tushum = m.miqdor * mahsulot.sotuvNarx;
      const foyda = tushum - m.miqdor * mahsulot.tanNarx;
      const oy = m.sana.slice(0, 7);

      const eski =
        jamlanma.get(m.customerId) ??
        ({
          id: m.customerId,
          nomi: nomTop(mockMijozlar, m.customerId),
          oylik: {},
          jamiFoyda: 0,
          jamiTushum: 0,
          rentabellik: 0,
        } satisfies Qator);

      eski.oylik[oy] = (eski.oylik[oy] ?? 0) + foyda;
      eski.jamiFoyda += foyda;
      eski.jamiTushum += tushum;
      jamlanma.set(m.customerId, eski);
    }

    const kalit = qidiruv.trim().toLowerCase();
    return [...jamlanma.values()]
      .map((k) => ({
        ...k,
        rentabellik: k.jamiTushum ? (k.jamiFoyda / k.jamiTushum) * 100 : 0,
      }))
      .filter((k) => !kalit || k.nomi.toLowerCase().includes(kalit))
      .sort((a, b) => b.jamiFoyda - a.jamiFoyda);
  }, [filter, qidiruv]);

  const jami = useMemo(() => {
    const oylik: Record<string, number> = {};
    for (const oy of oylar) {
      oylik[oy] = qatorlar.reduce((s, k) => s + (k.oylik[oy] ?? 0), 0);
    }
    const foyda = qatorlar.reduce((s, k) => s + k.jamiFoyda, 0);
    const tushum = qatorlar.reduce((s, k) => s + k.jamiTushum, 0);
    return { oylik, foyda, tushum, rentabellik: tushum ? (foyda / tushum) * 100 : 0 };
  }, [qatorlar, oylar]);

  function eksport() {
    csvYuklash(
      ["Xaridor", ...oylar.map((o) => oyNomi(o, true)), "Jami foyda", "Rentabellik"],
      qatorlar.map((k) => [
        k.nomi,
        ...oylar.map((o) => k.oylik[o] ?? 0),
        k.jamiFoyda,
        foiz(k.rentabellik),
      ])
    );
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
      ...oylar.map<Ustun<Qator>>((oy) => ({
        id: `oy-${oy}`,
        nom: oyNomi(oy, kopYil),
        kenglik: 130,
        hizalash: "right",
        katak: (k) =>
          k.oylik[oy] ? (
            <span className={k.oylik[oy] >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-500"}>
              {pul(k.oylik[oy])}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
        jami: () => (jami.oylik[oy] ? pul(jami.oylik[oy]) : "—"),
      })),
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
            onClick={eksport}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <Download size={16} />
            Excel (CSV)
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
          <>
            <p className="mb-3 text-xs font-semibold text-gray-400">
              Har oy ustunida — o'sha oyda mijozdan olingan foyda. Rentabellik = jami foyda ÷ jami tushum.
            </p>
            <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={qatorlar} jamiBor kengaytir />
          </>
        )}
      </section>
    </div>
  );
}
