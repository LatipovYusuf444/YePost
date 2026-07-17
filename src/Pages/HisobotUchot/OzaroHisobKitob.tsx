import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import Dropdown from "./Dropdown";
import MuddatTanlov from "./MuddatTanlov";
import HisobKitobModal from "./HisobKitobModal";
import {
  mockHisobKitob,
  mockKontragentlar,
  mockMaxsulotlar,
  mockMijozlar,
  mockTovarHarakati,
  mockYetkazibBeruvchilar,
} from "./mockData";
import type { Kontragent, Tanlov } from "./types";
import { bugun, pul, son } from "./yordamchilar";

type Filter = {
  dateFrom: string;
  dateTo: string;
  customerIds: string[];
  supplierIds: string[];
  productIds: string[];
  qarzTuri: string;
};

const boshFilter: Filter = {
  dateFrom: "2025-01-01",
  dateTo: bugun(),
  customerIds: [],
  supplierIds: [],
  productIds: [],
  qarzTuri: "barcha",
};

const QARZ_TURLARI = [
  { value: "barcha", nomi: "Barcha qarzdorliklar" },
  { value: "xaridorlar", nomi: "Xamma xaridorlar" },
  { value: "yetkazib", nomi: "Xamma yetkazib beruvchilar" },
  { value: "biz-xaridor", nomi: "Biz qarzdormiz — Xaridorlar" },
  { value: "biz-yetkazib", nomi: "Biz qarzdormiz — Yetkazib beruvchilar" },
  { value: "ular-xaridor", nomi: "Ular bizga qarzdor — Xaridorlar" },
  { value: "ular-yetkazib", nomi: "Ular bizga qarzdor — Yetkazib beruvchilar" },
];

const maxsulotTanlovlari: Tanlov[] = mockMaxsulotlar.map((m) => ({ id: m.id, nomi: m.nomi }));

type Qator = Kontragent & { id: string; nomi: string; balans: number };

function kontragentNomi(k: Kontragent) {
  const royxat = k.turi === "mijoz" ? mockMijozlar : mockYetkazibBeruvchilar;
  return royxat.find((item) => item.id === k.refId)?.nomi ?? k.refId;
}

// balans > 0 → biz qarzdormiz; < 0 → ular bizga qarzdor.
function balansHisobla(refId: string, dateTo: string) {
  return mockHisobKitob
    .filter((d) => d.refId === refId && (!dateTo || d.sana.slice(0, 10) <= dateTo))
    .reduce((s, d) => s + d.prixod - d.rasxod, 0);
}

function qarzTuriMos(k: Qator, qarzTuri: string) {
  switch (qarzTuri) {
    case "xaridorlar":
      return k.turi === "mijoz";
    case "yetkazib":
      return k.turi === "yetkazibBeruvchi";
    case "biz-xaridor":
      return k.turi === "mijoz" && k.balans > 0;
    case "biz-yetkazib":
      return k.turi === "yetkazibBeruvchi" && k.balans > 0;
    case "ular-xaridor":
      return k.turi === "mijoz" && k.balans < 0;
    case "ular-yetkazib":
      return k.turi === "yetkazibBeruvchi" && k.balans < 0;
    default:
      return true;
  }
}

function son2(value: number) {
  return value < 0 ? `−${pul(Math.abs(value))}` : pul(value);
}

function csvYuklash(ustunlar: string[], qatorlar: (string | number)[][]) {
  const satrlar = [ustunlar, ...qatorlar].map((qator) =>
    qator.map((katak) => `"${String(katak).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + satrlar.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ozaro-hisob-kitob.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function OzaroHisobKitob() {
  const [ish, setIsh] = useState<Filter>(boshFilter);
  const [filter, setFilter] = useState<Filter>(boshFilter);
  const [qidiruv, setQidiruv] = useState("");
  const [ochilgan, setOchilgan] = useState<{ refId: string; nomi: string } | null>(null);

  function yangilash<K extends keyof Filter>(kalit: K, qiymat: Filter[K]) {
    setIsh((old) => ({ ...old, [kalit]: qiymat }));
  }

  // Maxsulot tanlansa — o'sha mahsulot bilan ish qilgan kontragentlar.
  const harakatRefIdlar = useMemo(() => {
    const set = new Set<string>();
    if (!filter.productIds.length) return set;
    for (const m of mockTovarHarakati) {
      if (!filter.productIds.includes(m.productId)) continue;
      if (m.customerId) set.add(m.customerId);
      if (m.supplierId) set.add(m.supplierId);
    }
    return set;
  }, [filter.productIds]);

  const qatorlar = useMemo<Qator[]>(() => {
    const tanlovBor = filter.customerIds.length > 0 || filter.supplierIds.length > 0;
    const kalit = qidiruv.trim().toLowerCase();

    return mockKontragentlar
      .map((k) => ({
        ...k,
        id: k.refId,
        nomi: kontragentNomi(k),
        balans: balansHisobla(k.refId, filter.dateTo),
      }))
      .filter((k) => qarzTuriMos(k, filter.qarzTuri))
      .filter((k) =>
        tanlovBor
          ? k.turi === "mijoz"
            ? filter.customerIds.includes(k.refId)
            : filter.supplierIds.includes(k.refId)
          : true
      )
      .filter((k) => (filter.productIds.length ? harakatRefIdlar.has(k.refId) : true))
      .filter((k) => !kalit || k.nomi.toLowerCase().includes(kalit));
  }, [filter, qidiruv, harakatRefIdlar]);

  const jamiBalans = useMemo(() => qatorlar.reduce((s, k) => s + k.balans, 0), [qatorlar]);

  const ustunlar: Ustun<Qator>[] = useMemo(
    () => [
      {
        id: "kontragent",
        nom: "Kontragent",
        kenglik: 320,
        katak: (k) => <span className="font-black text-gray-950">{k.nomi}</span>,
        jami: () => `Jami: ${qatorlar.length} ta`,
      },
      {
        id: "oxirgi",
        nom: "Oxirgi qoldiq",
        kenglik: 200,
        hizalash: "right",
        katak: (k) => (
          <span
            className={
              k.balans > 0 ? "font-black text-red-500" : k.balans < 0 ? "font-black text-emerald-600" : "text-gray-500"
            }
          >
            {son2(k.balans)}
          </span>
        ),
        jami: () => <span className={jamiBalans >= 0 ? "text-red-500" : "text-emerald-600"}>{son(jamiBalans)}</span>,
      },
    ],
    [qatorlar, jamiBalans]
  );

  function eksport() {
    csvYuklash(
      ["Kontragent", "Turi", "Oxirgi qoldiq"],
      qatorlar.map((k) => [k.nomi, k.turi === "mijoz" ? "Mijoz" : "Yetkazib beruvchi", k.balans])
    );
  }

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
            label="Yetkazib beruvchi"
            options={mockYetkazibBeruvchilar}
            selected={ish.supplierIds}
            onChange={(v) => yangilash("supplierIds", v)}
          />
          <KopTanlovli
            label="Maxsulot"
            options={maxsulotTanlovlari}
            selected={ish.productIds}
            onChange={(v) => yangilash("productIds", v)}
          />
          <Dropdown
            label="Barcha qarzdorliklar"
            value={ish.qarzTuri}
            options={QARZ_TURLARI}
            onChange={(v) => yangilash("qarzTuri", v)}
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
              <p className="mt-3 font-bold text-gray-500">Tanlangan filtrlar bo'yicha kontragent topilmadi.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-gray-400">
              Kontragentga bosing — hujjatlar bo'yicha o'zaro hisob-kitob ochiladi.
            </p>
            <KengaytiriladiganJadval
              ustunlar={ustunlar}
              qatorlar={qatorlar}
              jamiBor
              kengaytir
              onQatorBosildi={(k) => setOchilgan({ refId: k.refId, nomi: k.nomi })}
            />
          </>
        )}
      </section>

      {ochilgan && (
        <HisobKitobModal
          refId={ochilgan.refId}
          nomi={ochilgan.nomi}
          dateFrom={filter.dateFrom}
          dateTo={filter.dateTo}
          onClose={() => setOchilgan(null)}
        />
      )}
    </div>
  );
}
