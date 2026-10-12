import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, PackageSearch, RefreshCw, Ruler, Search, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import TablePagination from "@/Components/common/TablePagination";
import { stockBalanceReport, type StockBalanceItem, type StockBalanceParams } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Mahsulot, OlchovBirligi } from "@/types/catalog";
import { birlikdagiMahsulotlar, maydonKlass } from "./yordamchilar";

// Sozlamalar → O'lchov birligi: birlik ustiga bosilganda shu birlikdagi barcha mahsulotlar va ularning
// omborlardagi qoldig'i. Mahsulotlar ro'yxati (/catalog/products) birlik bo'yicha, qoldiq esa
// /reports/stock-balance dan (omborlar bo'yicha) olinadi.

// Shuncha mahsulotgacha qoldiq `productIds` filtri bilan so'raladi; ko'p bo'lsa URL uzunligi uchun butun qoldiq olinib filtrlanadi.
const FILTRLI_SOROV_CHEGARASI = 40;
const MAKS_SAHIFA = 30;

type Qator = {
  key: string;
  nom: string;
  variant: string;
  shtrix: string;
  ombor: string;
  qoldiqBor: boolean;
  qoldiq: number;
  zaxira: number;
  mavjud: number;
  nofaol: boolean;
};

const raqam = (value: unknown) => {
  const son = Number(value ?? 0);
  return Number.isFinite(son) ? son : 0;
};

const sonMatni = (value: number) => value.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });

async function barchaQoldiqSahifalari(qoshimcha: Partial<StockBalanceParams>) {
  const asos: StockBalanceParams = { groupByWarehouse: true, balanceStatus: "ALL", includeReserved: true, pageSize: 1000, ...qoshimcha };
  const birinchi = await stockBalanceReport({ ...asos, page: 1 });
  const sahifalar = Math.min(Math.max(Number(birinchi.totalPages ?? 1), 1), MAKS_SAHIFA);
  const qolgan = await Promise.all(
    Array.from({ length: sahifalar - 1 }, (_, indeks) => stockBalanceReport({ ...asos, page: indeks + 2 }))
  );
  return [birinchi, ...qolgan].flatMap((sahifa) => sahifa.items ?? []);
}

async function birlikQoldiqlari(mahsulotIdlari: string[]): Promise<StockBalanceItem[]> {
  if (mahsulotIdlari.length === 0) return [];
  if (mahsulotIdlari.length <= FILTRLI_SOROV_CHEGARASI) return barchaQoldiqSahifalari({ productIds: mahsulotIdlari.join(",") });
  const idlar = new Set(mahsulotIdlari);
  return (await barchaQoldiqSahifalari({})).filter((qator) => idlar.has(qator.productId));
}

type Props = {
  birlik: OlchovBirligi;
  mahsulotlar: Mahsulot[];
  onYopish: () => void;
};

export default function BirlikMahsulotlari({ birlik, mahsulotlar, onYopish }: Props) {
  const { t } = useTranslation("sozlamalar_uchot");
  const birlikMahsulotlari = useMemo(() => birlikdagiMahsulotlar(mahsulotlar, birlik), [mahsulotlar, birlik]);
  const birlikNomi = birlik.shortName || birlik.name;

  const [qoldiqlar, setQoldiqlar] = useState<StockBalanceItem[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [qoldiqXatosi, setQoldiqXatosi] = useState("");
  const [urinish, setUrinish] = useState(0);
  const [qidiruv, setQidiruv] = useState("");
  const [omborFiltri, setOmborFiltri] = useState("");
  const [sahifa, setSahifa] = useState(1);
  const [sahifaHajmi, setSahifaHajmi] = useState(20);

  const mahsulotIdlari = useMemo(() => birlikMahsulotlari.map((mahsulot) => mahsulot.id), [birlikMahsulotlari]);

  useEffect(() => {
    let faol = true;
    setYuklanmoqda(true);
    setQoldiqXatosi("");
    birlikQoldiqlari(mahsulotIdlari)
      .then((natija) => {
        if (faol) setQoldiqlar(natija);
      })
      .catch((error: unknown) => {
        if (!faol) return;
        setQoldiqlar([]);
        setQoldiqXatosi(getApiErrorMessage(error));
      })
      .finally(() => {
        if (faol) setYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
  }, [mahsulotIdlari, urinish]);

  const qatorlar = useMemo<Qator[]>(() => {
    const natija: Qator[] = [];
    const qoldiqliMahsulotlar = new Set<string>();
    qoldiqlar.forEach((qator, indeks) => {
      qoldiqliMahsulotlar.add(qator.productId);
      const mahsulot = birlikMahsulotlari.find((item) => item.id === qator.productId);
      natija.push({
        key: `${qator.productId}:${qator.modificationId}:${qator.warehouseId ?? indeks}`,
        nom: qator.productName || mahsulot?.name || "—",
        variant: qator.modificationName && qator.modificationName !== qator.productName ? qator.modificationName : "",
        shtrix: qator.barcode ?? "",
        ombor: qator.warehouseName ?? "",
        qoldiqBor: true,
        qoldiq: raqam(qator.quantity),
        zaxira: raqam(qator.reservedQuantity),
        mavjud: raqam(qator.availableQuantity ?? raqam(qator.quantity) - raqam(qator.reservedQuantity)),
        nofaol: mahsulot ? mahsulot.isActive === false : false,
      });
    });
    // Hech bir omborda qoldiq yozuvi bo'lmagan mahsulotlar ham ro'yxatda ko'rinadi.
    if (!yuklanmoqda && !qoldiqXatosi) {
      birlikMahsulotlari
        .filter((mahsulot) => !qoldiqliMahsulotlar.has(mahsulot.id))
        .forEach((mahsulot) =>
          natija.push({
            key: `${mahsulot.id}:yoq`,
            nom: mahsulot.name,
            variant: "",
            shtrix: mahsulot.barcode ?? mahsulot.modifications?.[0]?.barcode ?? "",
            ombor: "",
            qoldiqBor: false,
            qoldiq: 0,
            zaxira: 0,
            mavjud: 0,
            nofaol: mahsulot.isActive === false,
          })
        );
    }
    return natija.sort((a, b) => a.nom.localeCompare(b.nom, "uz") || a.ombor.localeCompare(b.ombor, "uz"));
  }, [qoldiqlar, birlikMahsulotlari, yuklanmoqda, qoldiqXatosi]);

  // Xatolik bo'lsa qoldiqsiz mahsulotlar ro'yxati ko'rsatiladi.
  const korinadiganQatorlar = useMemo<Qator[]>(() => {
    if (!qoldiqXatosi) return qatorlar;
    return birlikMahsulotlari.map((mahsulot) => ({
      key: `${mahsulot.id}:xato`,
      nom: mahsulot.name,
      variant: "",
      shtrix: mahsulot.barcode ?? mahsulot.modifications?.[0]?.barcode ?? "",
      ombor: "",
      qoldiqBor: false,
      qoldiq: 0,
      zaxira: 0,
      mavjud: 0,
      nofaol: mahsulot.isActive === false,
    }));
  }, [qatorlar, qoldiqXatosi, birlikMahsulotlari]);

  const omborlar = useMemo(
    () => Array.from(new Set(qatorlar.filter((qator) => qator.ombor).map((qator) => qator.ombor))).sort((a, b) => a.localeCompare(b, "uz")),
    [qatorlar]
  );

  const filtrlangan = useMemo(() => {
    const matn = qidiruv.trim().toLowerCase();
    return korinadiganQatorlar.filter((qator) => {
      if (omborFiltri && qator.ombor !== omborFiltri) return false;
      return !matn || [qator.nom, qator.variant, qator.shtrix, qator.ombor].join(" ").toLowerCase().includes(matn);
    });
  }, [korinadiganQatorlar, qidiruv, omborFiltri]);

  useEffect(() => setSahifa(1), [qidiruv, omborFiltri, sahifaHajmi, birlik.id]);

  const jamiQoldiq = filtrlangan.reduce((summa, qator) => summa + qator.qoldiq, 0);
  const jamiMavjud = filtrlangan.reduce((summa, qator) => summa + qator.mavjud, 0);
  const omborJamilari = useMemo(() => {
    const xarita = new Map<string, number>();
    qatorlar.filter((qator) => qator.ombor).forEach((qator) => xarita.set(qator.ombor, (xarita.get(qator.ombor) ?? 0) + qator.qoldiq));
    return Array.from(xarita.entries()).sort((a, b) => a[0].localeCompare(b[0], "uz"));
  }, [qatorlar]);
  const korinadigan = filtrlangan.slice((sahifa - 1) * sahifaHajmi, sahifa * sahifaHajmi);

  const qaytaYuklash = useCallback(() => setUrinish((son) => son + 1), []);

  return (
    <AppModal className="bg-[rgba(15,23,42,.45)] p-4 backdrop-blur-[3px]" onClose={onYopish}>
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_34px_120px_rgba(15,23,42,.42)]">
        <header className="flex items-start justify-between gap-4 border-b border-orange-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#2563EB]">
              <Ruler size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">{t("birliklar.products.eyebrow")}</p>
              <h2 className="truncate text-xl font-black text-gray-950">
                {birlik.name}
                {birlik.shortName ? <span className="ml-2 text-base font-bold text-slate-400">({birlik.shortName})</span> : null}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onYopish}
            aria-label={t("birliklar.products.closeAria")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-orange-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-400">{t("birliklar.products.productsCount")}</p>
            <p className="mt-1 text-xl font-black text-slate-900">{birlikMahsulotlari.length.toLocaleString("uz-UZ")}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-400">{t("birliklar.products.totalStock")}</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {yuklanmoqda ? "…" : qoldiqXatosi ? "—" : `${sonMatni(jamiQoldiq)} ${birlikNomi}`}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-400">{t("birliklar.products.available")}</p>
            <p className="mt-1 text-xl font-black text-emerald-600">
              {yuklanmoqda ? "…" : qoldiqXatosi ? "—" : `${sonMatni(jamiMavjud)} ${birlikNomi}`}
            </p>
          </div>
        </div>

        {omborJamilari.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-3" aria-label={t("birliklar.products.byWarehouse")}>
            {omborJamilari.map(([ombor, jami]) => (
              <button
                key={ombor}
                type="button"
                onClick={() => setOmborFiltri((joriy) => (joriy === ombor ? "" : ombor))}
                aria-pressed={omborFiltri === ombor}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  omborFiltri === ombor ? "bg-[#2563EB] text-white" : "bg-orange-50 text-[#2563EB] hover:bg-orange-100"
                }`}
              >
                {ombor}: {sonMatni(jami)} {birlikNomi}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 px-6 py-3">
          <label className="relative min-w-0 flex-1 basis-60">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" aria-hidden />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              placeholder={t("birliklar.products.searchPlaceholder")}
              className={`${maydonKlass} pl-10`}
            />
          </label>
          {omborlar.length > 1 && (
            <select
              value={omborFiltri}
              onChange={(event) => setOmborFiltri(event.target.value)}
              aria-label={t("birliklar.products.warehouseFilter")}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2563EB]"
            >
              <option value="">{t("birliklar.products.allWarehouses")}</option>
              {omborlar.map((ombor) => (
                <option key={ombor} value={ombor}>
                  {ombor}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={qaytaYuklash}
            disabled={yuklanmoqda}
            aria-label={t("birliklar.products.refresh")}
            title={t("birliklar.products.refresh")}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-[#2563EB] disabled:opacity-50"
          >
            <RefreshCw size={16} className={yuklanmoqda ? "animate-spin" : ""} />
          </button>
        </div>

        {qoldiqXatosi && (
          <p role="alert" className="mx-6 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {t("birliklar.products.stockError")}: {qoldiqXatosi}
            </span>
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-auto border-t border-slate-100">
          {yuklanmoqda ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm font-bold text-slate-400">
              <LoaderCircle className="animate-spin" size={18} />
              {t("loadingGeneric")}
            </div>
          ) : filtrlangan.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <PackageSearch className="mx-auto text-orange-300" size={34} />
              <p className="mt-3 text-sm font-bold text-slate-500">
                {birlikMahsulotlari.length === 0 ? t("birliklar.products.empty") : t("birliklar.products.noMatches")}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-[#F8FAFC] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">{t("birliklar.products.columns.product")}</th>
                  <th className="px-4 py-3">{t("birliklar.products.columns.barcode")}</th>
                  <th className="px-4 py-3">{t("birliklar.products.columns.warehouse")}</th>
                  <th className="px-4 py-3 text-right">{t("birliklar.products.columns.stock")}</th>
                  <th className="px-4 py-3 text-right">{t("birliklar.products.columns.reserved")}</th>
                  <th className="px-6 py-3 text-right">{t("birliklar.products.columns.available")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {korinadigan.map((qator) => (
                  <tr key={qator.key} className="transition hover:bg-orange-50/40">
                    <td className="px-6 py-3">
                      <p className="font-bold text-slate-900">
                        {qator.nom}
                        {qator.nofaol && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                            {t("birliklar.products.inactive")}
                          </span>
                        )}
                      </p>
                      {qator.variant && <p className="text-xs font-semibold text-slate-400">{qator.variant}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-slate-500">{qator.shtrix || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                      {qator.ombor || (qator.qoldiqBor || qoldiqXatosi ? "—" : <span className="text-slate-400">{t("birliklar.products.noStockRecord")}</span>)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums text-slate-900">
                      {qator.qoldiqBor ? `${sonMatni(qator.qoldiq)} ${birlikNomi}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-500">
                      {qator.qoldiqBor ? sonMatni(qator.zaxira) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right font-extrabold tabular-nums text-emerald-600">
                      {qator.qoldiqBor ? sonMatni(qator.mavjud) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!yuklanmoqda && filtrlangan.length > 0 && (
          <TablePagination page={sahifa} pageSize={sahifaHajmi} totalItems={filtrlangan.length} onPageChange={setSahifa} onPageSizeChange={setSahifaHajmi} />
        )}
      </section>
    </AppModal>
  );
}
