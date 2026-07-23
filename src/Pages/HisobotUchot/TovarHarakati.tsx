import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import MuddatTanlov from "./MuddatTanlov";
import MahsulotModal from "./MahsulotModal";
import HujjatKorish from "./HujjatKorish";
import { useHisobotRealData } from "./HisobotRealData";
import { stockMovementReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Maxsulot, Tanlov, TovarHarakati, TovarHarakatiFilter } from "./types";
import { bugun, bugunMinus, sanadaMi, son } from "./yordamchilar";

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

function nomTop(royxat: Tanlov[], id: string) {
  return royxat.find((item) => item.id === id)?.nomi ?? "—";
}

const tire = <span className="text-gray-300">—</span>;

// Kirim/inventarizatsiya qoldiqni oshiradi (Kirim ustuni), chiqim/realizatsiya kamaytiradi.
function kirimTuri(r: TovarHarakati) {
  return r.hujjatTuri === "kirim" || r.hujjatTuri === "inventarizatsiya";
}

const HUJJAT_PREFIX: Record<TovarHarakati["hujjatTuri"], string> = {
  kirim: "Kirim",
  inventarizatsiya: "Inver",
  chiqim: "Chiqim",
  realizatsiya: "Real",
};

function hujjatNomi(r: TovarHarakati) {
  return `${HUJJAT_PREFIX[r.hujjatTuri]} №${r.hujjatRaqam}`;
}

// Jadvalda ko'rsatiladigan qator: mahsulot sarlavhasi yoki hujjat qatori.
type KorinishQator = {
  kind: "header" | "detail";
  id: string;
  nomi: string;
  hujjat: string;
  xaridor: string;
  yetkazib: string;
  boshQoldiq: number;
  kirim: number | null;
  chiqim: number | null;
  oxirgiQoldiq: number;
  productId?: string; // sarlavha qatorida — mahsulot modalini ochish uchun
  harakat?: TovarHarakati; // hujjat qatorida — hujjat modalini ochish uchun
};

export default function TovarHarakati() {
  const {
    maxsulotlar,
    omborlar,
    kategoriyalar,
    variatsiyalar,
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
    setYuklanmoqda(true);
    setXato("");
    stockMovementReportApi
      .barchasi({
        dateFrom: new Date(`${filter.dateFrom}T00:00:00.000Z`).toISOString(),
        dateTo: new Date(`${filter.dateTo}T23:59:59.999Z`).toISOString(),
        warehouseIds: filter.warehouseIds.length ? filter.warehouseIds.join(",") : undefined,
        branchIds: filter.filialIds.length ? filter.filialIds.join(",") : undefined,
        categoryIds: filter.categoryIds.length ? filter.categoryIds.join(",") : undefined,
        productIds: filter.productIds.length ? filter.productIds.join(",") : undefined,
        modificationIds: filter.xarakteristikaIds.length
          ? filter.xarakteristikaIds.join(",")
          : undefined,
        customerIds: filter.customerIds.length ? filter.customerIds.join(",") : undefined,
        supplierIds: filter.supplierIds.length ? filter.supplierIds.join(",") : undefined,
        search: qidiruv || undefined,
      })
      .then((response) => {
        if (!active) return;
        const raw = response as {
          items?: Array<{
            date?: string;
            type?: string;
            docNumber?: string;
            refId?: string;
            warehouseId?: string;
            branchId?: string;
            productId?: string;
            categoryId?: string;
            modificationId?: string;
            quantity?: number | string;
            customerId?: string;
            supplierId?: string;
          }>;
        };
        setTovarHarakati(
          (raw.items ?? []).map((row, index) => ({
            id: `${row.refId ?? index}-${row.modificationId ?? ""}-${row.date ?? ""}`,
            sana: row.date ?? "",
            hujjatTuri:
              row.type === "PURCHASE" || row.type === "RETURN" || row.type === "TRANSFER_IN"
                ? "kirim"
                : row.type === "STOCK_TAKE"
                  ? "inventarizatsiya"
                  : row.type === "SALE"
                    ? "realizatsiya"
                    : "chiqim",
            hujjatRaqam: row.docNumber ?? row.refId ?? "",
            productId: row.productId ?? "",
            xarakteristikaId: row.modificationId ?? "",
            categoryId: row.categoryId ?? "",
            warehouseId: row.warehouseId ?? "",
            filialId: row.branchId ?? "",
            miqdor: Math.abs(Number(row.quantity ?? 0)),
            customerId: row.customerId ?? "",
            supplierId: row.supplierId ?? "",
          }))
        );
      })
      .catch((error) => {
        if (active) setXato(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setYuklanmoqda(false);
      });
    return () => {
      active = false;
    };
  }, [filter, qidiruv]);

  const mahsulotOchish = useCallback((productId?: string) => {
    const mahsulot = maxsulotlar.find((m) => m.id === productId);
    if (mahsulot) setOchilganMahsulot(mahsulot);
  }, [maxsulotlar]);

  function yangilash<K extends keyof TovarHarakatiFilter>(kalit: K, qiymat: TovarHarakatiFilter[K]) {
    setIsh((old) => ({ ...old, [kalit]: qiymat }));
  }

  // Filterlangan harakatlar → mahsulot bo'yicha guruhlab, sarlavha + hujjat qatorlariga aylantiramiz.
  const korinishQatorlar = useMemo<KorinishQator[]>(() => {
    const ichida = (massiv: string[], id: string) => massiv.length === 0 || massiv.includes(id);
    const kalit = qidiruv.trim().toLowerCase();

    const yozuvlar = tovarHarakati.filter((r) => {
      const asosiy =
        sanadaMi(r.sana, filter.dateFrom, filter.dateTo) &&
        ichida(filter.warehouseIds, r.warehouseId) &&
        ichida(filter.categoryIds, r.categoryId) &&
        ichida(filter.productIds, r.productId) &&
        ichida(filter.xarakteristikaIds, r.xarakteristikaId);
      if (!asosiy) return false;
      if (!kalit) return true;
      return [
        nomTop(maxsulotTanlovlari, r.productId),
        hujjatNomi(r),
      ]
        .join(" ")
        .toLowerCase()
        .includes(kalit);
    });

    const natija: KorinishQator[] = [];
    for (const mahsulot of maxsulotlar) {
      const guruh = yozuvlar
        .filter((r) => r.productId === mahsulot.id)
        .sort((a, b) => a.sana.localeCompare(b.sana));
      if (guruh.length === 0) continue;

      let qoldiq = tovarHarakati
        .filter((r) => r.productId === mahsulot.id && r.sana.slice(0, 10) < filter.dateFrom)
        .filter((r) => ichida(filter.warehouseIds, r.warehouseId) && ichida(filter.categoryIds, r.categoryId) && ichida(filter.xarakteristikaIds, r.xarakteristikaId))
        .reduce((summa, r) => summa + (kirimTuri(r) ? r.miqdor : -r.miqdor), 0);
      const boshlangichQoldiq = qoldiq;
      let kirimJami = 0;
      let chiqimJami = 0;
      const detaylar: KorinishQator[] = [];

      for (const r of guruh) {
        const bosh = qoldiq;
        const kirimmi = kirimTuri(r);
        if (kirimmi) {
          qoldiq += r.miqdor;
          kirimJami += r.miqdor;
        } else {
          qoldiq -= r.miqdor;
          chiqimJami += r.miqdor;
        }
        detaylar.push({
          kind: "detail",
          id: r.id,
          nomi: "",
          hujjat: hujjatNomi(r),
          xaridor: "",
          yetkazib: "",
          boshQoldiq: bosh,
          kirim: kirimmi ? r.miqdor : null,
          chiqim: kirimmi ? null : r.miqdor,
          oxirgiQoldiq: qoldiq,
          harakat: r,
        });
      }

      natija.push({
        kind: "header",
        id: `h-${mahsulot.id}`,
        nomi: mahsulot.nomi,
        hujjat: "",
        xaridor: "",
        yetkazib: "",
        boshQoldiq: boshlangichQoldiq,
        kirim: kirimJami,
        chiqim: chiqimJami,
        oxirgiQoldiq: qoldiq,
        productId: mahsulot.id,
      });
      natija.push(...detaylar);
    }
    return natija;
  }, [filter, maxsulotlar, maxsulotTanlovlari, qidiruv, tovarHarakati]);

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
      await stockMovementReportApi.export({
        dateFrom: new Date(`${filter.dateFrom}T00:00:00.000Z`).toISOString(),
        dateTo: new Date(`${filter.dateTo}T23:59:59.999Z`).toISOString(),
        warehouseIds: filter.warehouseIds.length ? filter.warehouseIds.join(",") : undefined,
        branchIds: filter.filialIds.length ? filter.filialIds.join(",") : undefined,
        categoryIds: filter.categoryIds.length ? filter.categoryIds.join(",") : undefined,
        productIds: filter.productIds.length ? filter.productIds.join(",") : undefined,
        modificationIds: filter.xarakteristikaIds.length ? filter.xarakteristikaIds.join(",") : undefined,
        customerIds: filter.customerIds.length ? filter.customerIds.join(",") : undefined,
        supplierIds: filter.supplierIds.length ? filter.supplierIds.join(",") : undefined,
        search: qidiruv || undefined,
      }, "excel");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setEksportYuklanmoqda(false);
    }
  }

  const ustunlar: Ustun<KorinishQator>[] = useMemo(
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
      {
        id: "hujjat",
        nom: "Xujjat",
        kenglik: 160,
        katak: (r) =>
          r.harakat ? (
            <button
              type="button"
              onClick={() => setOchilganHarakat(r.harakat ?? null)}
              className="font-bold text-orange-600 hover:underline"
            >
              {r.hujjat}
            </button>
          ) : (
            ""
          ),
      },
      {
        id: "boshQoldiq",
        nom: "Boshlang'ich qoldiq",
        kenglik: 160,
        katak: (r) => son(r.boshQoldiq),
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
      { id: "oxirgiQoldiq", nom: "Oxirgi qoldiq", kenglik: 140, katak: (r) => son(r.oxirgiQoldiq) },
    ],
    [jami, mahsulotOchish]
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
              options={omborlar}
            selected={ish.warehouseIds}
            onChange={(v) => yangilash("warehouseIds", v)}
          />
          <KopTanlovli
            label="Kategoriya"
              options={kategoriyalar}
            selected={ish.categoryIds}
            onChange={(v) => yangilash("categoryIds", v)}
          />
          <KopTanlovli
            label="Maxsulot"
            options={maxsulotTanlovlari}
            selected={ish.productIds}
            onChange={(v) => yangilash("productIds", v)}
          />
          <KopTanlovli
            label="Variatsiya"
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
            disabled={eksportYuklanmoqda}
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
            placeholder="Jadval bo'yicha qidiruv"
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {/* Natija jadvali */}
      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        {yuklanmoqda ? (
          <div className="flex h-72 items-center justify-center font-bold text-slate-400">
            Backenddan yuklanmoqda...
          </div>
        ) : korinishQatorlar.length === 0 ? (
          <Bosh />
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-gray-400">
              Ustun chetini tortib kengaytiring, sarlavhani sudrab joyini almashtiring.
            </p>
            <KengaytiriladiganJadval
              ustunlar={ustunlar}
              qatorlar={korinishQatorlar}
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
