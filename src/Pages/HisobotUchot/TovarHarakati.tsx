import { StockQuantity } from "@/Components/common/NegativeStockBadge";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, ExternalLink, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import MuddatTanlov from "./MuddatTanlov";
import MahsulotModal from "./MahsulotModal";
import HujjatKorish from "./HujjatKorish";
import { useHisobotRealData } from "./HisobotRealData";
import axios from "axios";
import { stockMovementReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Maxsulot, Tanlov, TovarHarakati, TovarHarakatiFilter } from "./types";
import { bugun, bugunMinus, son } from "./yordamchilar";
import { useYagonaValyuta } from "@/lib/valyuta";
import { harakatGuruhlari, harakatHavolasi, harakatKontragenti, harakatlarniMoslash, harakatPulJami, harakatPulMatni, harakatRaqamiTakrormi, harakatSanaMatni, harakatTuriNomi, takroriyHujjatRaqamlari, type HarakatKorinishQatori } from "./tovarHarakatiModeli";
import { tovarHarakatiniEksport } from "./tovarHarakatiEksporti";

import YuklanmoqdaHolati from "./YuklanmoqdaHolati";
const boshFilter: TovarHarakatiFilter = {
  dateFrom: bugunMinus(30),
  dateTo: bugun(),
  warehouseIds: [],
  filialIds: [],
  categoryIds: [],
  productIds: [],
  xarakteristikaIds: [],
  customerIds: [],
  supplierIds: [],
};

const tire = <span className="text-gray-300">—</span>;
const guruhKaliti = (row: HarakatKorinishQatori) => row.guruhId;

export default function TovarHarakati() {
  const {
    maxsulotlar,
    omborlar,
    kategoriyalar,
    variatsiyalar,
    mijozlar,
    yetkazibBeruvchilar,
  } = useHisobotRealData();
  const maxsulotTanlovlari: Tanlov[] = useMemo(
    () => maxsulotlar.map((m) => ({ id: m.id, nomi: m.nomi })),
    [maxsulotlar]
  );
  const [ish, setIsh] = useState<TovarHarakatiFilter>(boshFilter); // tahrirlanayotgan
  const [filter, setFilter] = useState<TovarHarakatiFilter>(boshFilter); // qo'llangan
  const [qidiruv, setQidiruv] = useState("");
  const [ochilganMahsulot, setOchilganMahsulot] = useState<Maxsulot | null>(null);
  const [ochilganHarakat, setOchilganHarakat] = useState<TovarHarakati | null>(null);
  const [xato, setXato] = useState("");
  const [eksportYuklanmoqda, setEksportYuklanmoqda] = useState(false);
  const [tovarHarakati, setTovarHarakati] = useState<TovarHarakati[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  useEffect(() => {
    let active = true;
    const bekor = new AbortController();
    setYuklanmoqda(true);
    setXato("");
    stockMovementReportApi
      .barchasi({
        dateFrom: filter.dateFrom, // Toshkent kuni: backend kun boshidan oladi (M3)
        dateTo: filter.dateTo,
        warehouseIds: filter.warehouseIds.length ? filter.warehouseIds.join(",") : undefined,
        branchIds: filter.filialIds.length ? filter.filialIds.join(",") : undefined,
        categoryIds: filter.categoryIds.length ? filter.categoryIds.join(",") : undefined,
        productIds: filter.productIds.length ? filter.productIds.join(",") : undefined,
        modificationIds: filter.xarakteristikaIds.length
          ? filter.xarakteristikaIds.join(",")
          : undefined,
        customerIds: filter.customerIds.length ? filter.customerIds.join(",") : undefined,
        supplierIds: filter.supplierIds.length ? filter.supplierIds.join(",") : undefined,
      }, bekor.signal)
      .then((response) => {
        if (!active) return;
        setTovarHarakati(harakatlarniMoslash(response));
      })
      .catch((error) => {
        if (active && !axios.isCancel(error)) {
          setTovarHarakati([]);
          setXato(getApiErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) setYuklanmoqda(false);
      });
    return () => {
      active = false;
      bekor.abort();
    };
  }, [filter]);

  const mahsulotOchish = useCallback((productId?: string) => {
    const mahsulot = maxsulotlar.find((m) => m.id === productId);
    if (mahsulot) setOchilganMahsulot(mahsulot);
  }, [maxsulotlar]);

  function yangilash<K extends keyof TovarHarakatiFilter>(kalit: K, qiymat: TovarHarakatiFilter[K]) {
    setIsh((old) => ({ ...old, [kalit]: qiymat }));
  }

  const korinishQatorlar = useMemo(() => harakatGuruhlari(tovarHarakati, maxsulotlar, filter, qidiruv, mijozlar, yetkazibBeruvchilar, omborlar), [tovarHarakati, maxsulotlar, filter, qidiruv, mijozlar, yetkazibBeruvchilar, omborlar]);
  const takrorlar = useMemo(() => takroriyHujjatRaqamlari(tovarHarakati), [tovarHarakati]);
  // "Faqat dollar" rejimida pul jami dollarda (kurssiz), aks holda avvalgidek so'mda.
  const jamiValyutasi = useYagonaValyuta() === "USD" ? "USD" : "UZS";
  const pulJami = useMemo(() => harakatPulJami(korinishQatorlar.flatMap(row => row.harakat ? [row.harakat] : []), jamiValyutasi), [korinishQatorlar, jamiValyutasi]);

  const jami = useMemo(() => {
    const sarlavhalar = korinishQatorlar.filter((r) => r.kind === "header");
    return {
      mahsulot: sarlavhalar.length,
      kirim: sarlavhalar.reduce((s, r) => s + (r.kirim ?? 0), 0),
      chiqim: sarlavhalar.reduce((s, r) => s + (r.chiqim ?? 0), 0),
    };
  }, [korinishQatorlar]);

  async function eksport() {
    setXato("");
    setEksportYuklanmoqda(true);
    try {
      await tovarHarakatiniEksport(korinishQatorlar, mijozlar, yetkazibBeruvchilar, omborlar, filter.dateFrom, filter.dateTo);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setEksportYuklanmoqda(false);
    }
  }

  const ustunlar: Ustun<HarakatKorinishQatori>[] = useMemo(
    () => [
      {
        id: "nomi",
        nom: "Nomi",
        kenglik: 200,
        katak: (r) =>
          r.kind === "header" ? (
            <button
              type="button"
              onClick={() => mahsulotOchish(r.productId)}
              className="font-black text-gray-950 hover:text-orange-600 hover:underline"
            >
              {r.nomi}
            </button>
          ) : (
            ""
          ),
        jami: () => `Jami: ${jami.mahsulot} mahsulot`,
      },
      { id: "sana", nom: "Sana va vaqt", kenglik: 170, katak: row => row.harakat ? harakatSanaMatni(row.harakat.sana) : "" },
      { id: "tur", nom: "Hujjat turi", kenglik: 170, katak: row => row.harakat ? harakatTuriNomi(row.harakat) : "" },
      {
        id: "hujjat", nom: "Hujjat №", kenglik: 180,
        katak: row => row.harakat ? <div className="space-y-1">
          <button type="button" disabled={!row.harakat.refId} title={row.harakat.refId || "Hujjat IDsi ko'rsatilmagan"} onClick={() => setOchilganHarakat(row.harakat ?? null)} className="font-bold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400">
            {row.harakat.hujjatRaqam || "Raqam berilmagan"}
          </button>
          {harakatRaqamiTakrormi(row.harakat, takrorlar) && <span className="block text-[11px] text-amber-700">ID: {row.harakat.refId?.slice(0, 8)}</span>}
        </div> : "",
      },
      { id: "kontragent", nom: "Mijoz / Kontragent", kenglik: 210, katak: row => row.harakat ? harakatKontragenti(row.harakat, mijozlar, yetkazibBeruvchilar) : "" },
      { id: "ombor", nom: "Ombor", kenglik: 170, katak: row => row.harakat ? row.harakat.warehouseName || omborlar.find(item => item.id === row.harakat?.warehouseId)?.nomi || "—" : "" },
      { id: "narx", nom: "Narx", kenglik: 240, boshlangichYashirin: true, katak: row => row.harakat ? harakatPulMatni(row.harakat, "narx") : "" },
      { id: "summa", nom: "Summa", kenglik: 260, boshlangichYashirin: true, katak: row => row.harakat ? harakatPulMatni(row.harakat, "summa") : "",
        jami: () => pulJami.toliq ? <span>Kirim: {jamiValyutasi === "USD" ? `$${son(pulJami.kirim)}` : `${son(pulJami.kirim)} so'm`} · Chiqim: {jamiValyutasi === "USD" ? `$${son(pulJami.chiqim)}` : `${son(pulJami.chiqim)} so'm`}</span> : "Jami uchun valyuta yoki kurs yetishmaydi" },
      {
        id: "boshQoldiq",
        nom: "Boshlang'ich qoldiq",
        kenglik: 160,
        katak: (r) => <StockQuantity value={r.boshQoldiq} />,
      },
      {
        id: "kirim",
        nom: "Kirim",
        kenglik: 120,
        katak: (r) =>
          r.kind === "header" ? (
            r.kirim ? son(r.kirim) : ""
          ) : r.kirim != null ? (
            <span className="font-black text-emerald-600">+{son(r.kirim)}</span>
          ) : (
            tire
          ),
        jami: () => <span className="text-emerald-600">+{son(jami.kirim)}</span>,
      },
      {
        id: "chiqim",
        nom: "Chiqim",
        kenglik: 120,
        katak: (r) =>
          r.kind === "header" ? (
            r.chiqim ? son(r.chiqim) : ""
          ) : r.chiqim != null ? (
            <span className="font-black text-red-500">−{son(r.chiqim)}</span>
          ) : (
            tire
          ),
        jami: () => <span className="text-red-500">−{son(jami.chiqim)}</span>,
      },
      { id: "oxirgiQoldiq", nom: "Oxirgi qoldiq", kenglik: 140, katak: (r) => <StockQuantity value={r.oxirgiQoldiq} /> },
      { id: "ochish", nom: "Amallar", kenglik: 210, katak: row => {
        const link = row.harakat ? harakatHavolasi(row.harakat) : null;
        return link ? <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:underline">{link.nom}<ExternalLink size={14} /></a> : null;
      } },
    ],
    [jami, mahsulotOchish, takrorlar, mijozlar, yetkazibBeruvchilar, omborlar, pulJami, jamiValyutasi]
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
            label="Ombor"
            placeholder="Barcha omborlar"
              options={omborlar}
            selected={ish.warehouseIds}
            onChange={(v) => yangilash("warehouseIds", v)}
          />
          <KopTanlovli
            label="Kategoriya"
            placeholder="Barcha kategoriyalar"
              options={kategoriyalar}
            selected={ish.categoryIds}
            onChange={(v) => yangilash("categoryIds", v)}
          />
          <KopTanlovli
            label="Maxsulot"
            placeholder="Barcha mahsulotlar"
            options={maxsulotTanlovlari}
            selected={ish.productIds}
            onChange={(v) => yangilash("productIds", v)}
          />
          <KopTanlovli
            label="Variatsiya"
            placeholder="Barcha variatsiyalar"
              options={variatsiyalar}
            selected={ish.xarakteristikaIds}
            onChange={(v) => yangilash("xarakteristikaIds", v)}
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
            disabled={eksportYuklanmoqda || yuklanmoqda || korinishQatorlar.length === 0}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <Download size={16} />
            {eksportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx)"}
          </button>
        </div>
        <div className="relative md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={qidiruv}
            onChange={(e) => setQidiruv(e.target.value)}
            placeholder="Mahsulot, mijoz yoki hujjat №"
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {takrorlar.size > 0 && <p role="status" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{takrorlar.size} ta hujjat raqami bir nechta hujjatga tegishli. Sana, mijoz va ID orqali ajrating. Har biri o'z hujjatini ochadi.</p>}
      {!pulJami.toliq && <p role="status" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">{jamiValyutasi === "USD" ? "Ayrim narxlar dollarda emas. Ular dollarga aylantirilmaydi va pul jamiga qo'shilmaydi." : "Ayrim narxlarda valyuta yoki hujjat kursi ko'rsatilmagan. Ular so'mga aylantirilmaydi va pul jamiga qo'shilmaydi."} Excelda asl qiymatlar alohida beriladi.</p>}

      {/* Natija jadvali */}
      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        {yuklanmoqda ? (
          <YuklanmoqdaHolati />
        ) : korinishQatorlar.length === 0 ? (
          <Bosh />
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-gray-400">
              Ustun chetini tortib kengaytiring, sarlavhani sudrab joyini almashtiring.
            </p>
            <KengaytiriladiganJadval tableId="HisobotUchot/TovarHarakati/kengaytiriladiganjadval-1"
              ustunlar={ustunlar}
              qatorlar={korinishQatorlar}
              qatorGuruhKaliti={guruhKaliti}
              jamiBor
              qatorKlass={(r) => (r.kind === "header" ? "bg-orange-50/70 text-gray-950" : "")}
            />
          </>
        )}
      </section>

      {ochilganMahsulot && (
        <MahsulotModal mahsulot={ochilganMahsulot} onClose={() => setOchilganMahsulot(null)} />
      )}
      {ochilganHarakat && (
        <HujjatKorish harakat={ochilganHarakat} onYopish={() => setOchilganHarakat(null)} />
      )}
    </div>
  );
}

function Bosh() {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 text-center">
      <div>
        <Search className="mx-auto text-orange-300" size={40} />
        <p className="mt-3 font-bold text-gray-500">Tanlangan filtrlar bo'yicha harakat topilmadi.</p>
      </div>
    </div>
  );
}
