import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import Dropdown from "./Dropdown";
import MuddatTanlov from "./MuddatTanlov";
import HisobKitobModal from "./HisobKitobModal";
import { ozaroHisobKitobniYuklash } from "./excelEksport";
import {
  mockHisobKitob,
  mockKontragentlar,
  mockMaxsulotlar,
  mockMijozlar,
  mockTovarHarakati,
  mockYetkazibBeruvchilar,
} from "./mockData";
import type { Kontragent, Tanlov } from "./types";
import { bugun, pul, sanadaMi } from "./yordamchilar";

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

type Qator = Kontragent & {
  id: string;
  nomi: string;
  bosh: number; // davr boshidagi qoldiq
  kirim: number; // davr ichidagi kirim (prixod)
  chiqim: number; // davr ichidagi chiqim (rasxod)
  yakuniy: number; // bosh + kirim − chiqim
};

function kontragentNomi(k: Kontragent) {
  const royxat = k.turi === "mijoz" ? mockMijozlar : mockYetkazibBeruvchilar;
  return royxat.find((item) => item.id === k.refId)?.nomi ?? k.refId;
}

// Davr bo'yicha: boshlang'ich qoldiq, kirim, chiqim, yakuniy qoldiq.
// yakuniy > 0 → biz qarzdormiz; < 0 → ular bizga qarzdor.
function hisobla(refId: string, dateFrom: string, dateTo: string) {
  const barcha = mockHisobKitob.filter((d) => d.refId === refId);
  const bosh = barcha
    .filter((d) => dateFrom && d.sana.slice(0, 10) < dateFrom)
    .reduce((s, d) => s + d.prixod - d.rasxod, 0);
  const davr = barcha.filter((d) => sanadaMi(d.sana, dateFrom, dateTo));
  const kirim = davr.reduce((s, d) => s + d.prixod, 0);
  const chiqim = davr.reduce((s, d) => s + d.rasxod, 0);
  return { bosh, kirim, chiqim, yakuniy: bosh + kirim - chiqim };
}

function qarzTuriMos(k: Qator, qarzTuri: string) {
  switch (qarzTuri) {
    case "xaridorlar":
      return k.turi === "mijoz";
    case "yetkazib":
      return k.turi === "yetkazibBeruvchi";
    case "biz-xaridor":
      return k.turi === "mijoz" && k.yakuniy > 0;
    case "biz-yetkazib":
      return k.turi === "yetkazibBeruvchi" && k.yakuniy > 0;
    case "ular-xaridor":
      return k.turi === "mijoz" && k.yakuniy < 0;
    case "ular-yetkazib":
      return k.turi === "yetkazibBeruvchi" && k.yakuniy < 0;
    default:
      return true;
  }
}

function son2(value: number) {
  return value < 0 ? `−${pul(Math.abs(value))}` : pul(value);
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
        ...hisobla(k.refId, filter.dateFrom, filter.dateTo),
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

  const jami = useMemo(
    () => ({
      bosh: qatorlar.reduce((s, k) => s + k.bosh, 0),
      kirim: qatorlar.reduce((s, k) => s + k.kirim, 0),
      chiqim: qatorlar.reduce((s, k) => s + k.chiqim, 0),
      yakuniy: qatorlar.reduce((s, k) => s + k.yakuniy, 0),
    }),
    [qatorlar]
  );

  const ustunlar: Ustun<Qator>[] = useMemo(
    () => [
      {
        id: "xaridor",
        nom: "Xaridorlar",
        kenglik: 240,
        katak: (k) => <span className="font-black text-gray-950">{k.nomi}</span>,
        jami: () => "Jami:",
      },
      {
        id: "bosh",
        nom: "Boshlang'ich qoldiq",
        kenglik: 170,
        hizalash: "right",
        katak: (k) => <span className="text-gray-600">{son2(k.bosh)}</span>,
        jami: () => son2(jami.bosh),
      },
      {
        id: "kirim",
        nom: "Kirim",
        kenglik: 150,
        hizalash: "right",
        katak: (k) =>
          k.kirim ? <span className="font-bold text-emerald-600">{pul(k.kirim)}</span> : <span className="text-gray-300">—</span>,
        jami: () => <span className="text-emerald-600">{pul(jami.kirim)}</span>,
      },
      {
        id: "chiqim",
        nom: "Chiqim",
        kenglik: 150,
        hizalash: "right",
        katak: (k) =>
          k.chiqim ? <span className="font-bold text-red-500">{pul(k.chiqim)}</span> : <span className="text-gray-300">—</span>,
        jami: () => <span className="text-red-500">{pul(jami.chiqim)}</span>,
      },
      {
        id: "yakuniy",
        nom: "Yakuniy qoldiq",
        kenglik: 170,
        hizalash: "right",
        katak: (k) => (
          <span
            className={
              k.yakuniy > 0 ? "font-black text-red-500" : k.yakuniy < 0 ? "font-black text-emerald-600" : "text-gray-500"
            }
          >
            {son2(k.yakuniy)}
          </span>
        ),
        jami: () => (
          <span className={jami.yakuniy > 0 ? "text-red-500" : "text-emerald-600"}>{son2(jami.yakuniy)}</span>
        ),
      },
    ],
    [jami]
  );

  async function eksport() {
    await ozaroHisobKitobniYuklash({
      qatorlar: qatorlar.map((k) => ({
        nomi: k.nomi,
        bosh: k.bosh,
        kirim: k.kirim,
        chiqim: k.chiqim,
        yakuniy: k.yakuniy,
      })),
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      qidiruv,
    });
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
