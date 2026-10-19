import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Calculator, Download, Search, TrendingUp, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import TablePagination from "@/Components/common/TablePagination";
import Dropdown from "./Dropdown";
import MuddatTanlov from "./MuddatTanlov";
import { useHisobotRealData } from "./HisobotRealData";
import { productProfitReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { bugun, bugunMinus, son } from "./yordamchilar";
import { korsatiladiganValyuta, useValyuta, type Valyuta } from "@/lib/valyuta";
import {
  engKopFoyda,
  foydaHisobotiniMoslash,
  foydaJami,
  foydaJamiIkkiValyuta,
  foydaniSaralash,
  panelRoyxati,
  qatorJufti,
  valyutaJufti,
  zararliQatorlar,
  type FoydaGuruhi,
  type FoydaQatori as Qator,
  type FoydaSaralashKaliti,
  type FoydaSummalari,
  type FoydaTaklifi,
  type FoydaXulosasi,
} from "./foydaHisobotiModeli";
import { hisobotPulMatni } from "./hisobotValyutasi";

import YuklanmoqdaHolati from "./YuklanmoqdaHolati";

// Sotuv qatori narx turi bo'yicha filtr (GET /reports/product-profit?priceType=...).
const NARX_TURI_VARIANTLARI = [
  { value: "", nomi: "Barchasi" },
  { value: "RETAIL", nomi: "Chakana" },
  { value: "WHOLESALE", nomi: "Ulgurji" },
  { value: "COST", nomi: "Tannarx" },
  { value: "UNKNOWN", nomi: "Noma’lum" },
];
type NarxTuriFiltri = "" | "RETAIL" | "WHOLESALE" | "COST" | "UNKNOWN";

const GURUHLAR: Array<{ id: FoydaGuruhi; nom: string; qidiruv: string }> = [
  { id: "PRODUCT", nom: "Mahsulotlar bo‘yicha", qidiruv: "Mahsulot bo‘yicha qidiruv" },
  { id: "CUSTOMER", nom: "Mijozlar bo‘yicha", qidiruv: "Mijoz bo‘yicha qidiruv" },
];

type Saralash = { kalit: FoydaSaralashKaliti; kamayish: boolean };
type Model = { qatorlar: Qator[]; xulosa: FoydaXulosasi | null; eng: FoydaTaklifi[] | null; zarar: FoydaTaklifi[] | null };
const BOSH_MODEL: Model = { qatorlar: [], xulosa: null, eng: null, zarar: null };

function hisobotParametrlari(p: { guruh: FoydaGuruhi; dateFrom: string; dateTo: string; categoryId: string; narxTuri: NarxTuriFiltri; valyuta: Valyuta; qidiruv: string }) {
  return {
    groupBy: p.guruh,
    dateFrom: new Date(`${p.dateFrom}T00:00:00.000Z`).toISOString(),
    dateTo: new Date(`${p.dateTo}T23:59:59.999Z`).toISOString(),
    categoryId: p.categoryId || undefined,
    priceType: p.narxTuri || undefined,
    currency: p.valyuta,
    // Backend qidiruvi tovar nomi bo'yicha; mijozlar kesimida mijoz nomi bo'yicha qidiruv jadvalning o'zida.
    search: p.guruh === "PRODUCT" && p.qidiruv ? p.qidiruv : undefined,
  };
}

export default function FoydaHisoboti() {
  useValyuta();
  const tanlanganValyuta = korsatiladiganValyuta();
  const { kategoriyalar } = useHisobotRealData();
  const [dateFrom, setDateFrom] = useState(bugunMinus(30));
  const [dateTo, setDateTo] = useState(bugun());
  const [categoryId, setCategoryId] = useState("");
  const [narxTuri, setNarxTuri] = useState<NarxTuriFiltri>("");
  const [guruh, setGuruh] = useState<FoydaGuruhi>("PRODUCT");
  const [qidiruv, setQidiruv] = useState("");
  const [serverQidiruv, setServerQidiruv] = useState("");
  const [saralash, setSaralash] = useState<Saralash>({ kalit: "foyda", kamayish: true });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [model, setModel] = useState<Model>(BOSH_MODEL);
  const [hisobotValyutasi, setHisobotValyutasi] = useState<Valyuta>(tanlanganValyuta);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [exportYuklanmoqda, setExportYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const qatorlar = model.qatorlar;

  // Mahsulotlar kesimida qidiruv backendga ketadi (jami ham shunga mos hisoblanadi): har harfda emas, yozib bo'lgach.
  useEffect(() => {
    const kutish = setTimeout(() => setServerQidiruv(qidiruv.trim()), 350);
    return () => clearTimeout(kutish);
  }, [qidiruv]);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    productProfitReportApi.barchasi(hisobotParametrlari({ guruh, dateFrom, dateTo, categoryId, narxTuri, valyuta: tanlanganValyuta, qidiruv: serverQidiruv }))
      .then((value) => {
        if (!active) return;
        const natija = foydaHisobotiniMoslash(value, tanlanganValyuta, guruh);
        setHisobotValyutasi(natija.valyuta);
        setModel({ qatorlar: natija.qatorlar, xulosa: natija.xulosa, eng: natija.eng, zarar: natija.zarar });
      })
      .catch((error) => { if (active) { setModel(BOSH_MODEL); setXato(getApiErrorMessage(error)); } })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [categoryId, dateFrom, dateTo, guruh, narxTuri, tanlanganValyuta, serverQidiruv]);

  const mijozQidiruvi = guruh === "CUSTOMER" ? qidiruv.trim().toLowerCase() : "";
  const korinadigan = useMemo(
    () => (mijozQidiruvi ? qatorlar.filter((item) => item.nomi.toLowerCase().includes(mijozQidiruvi)) : qatorlar),
    [qatorlar, mijozQidiruvi]
  );

  const tartiblangan = useMemo(() => foydaniSaralash(korinadigan, saralash.kalit, saralash.kamayish), [korinadigan, saralash]);

  // Jami: backend `summary` butun filtr bo'yicha; mijoz nomi bo'yicha qidirilganda faqat ko'rinayotgan qatorlar yig'iladi.
  const jami = useMemo(() => {
    const qatorJami = foydaJami(korinadigan);
    const ikki = foydaJamiIkkiValyuta(korinadigan);
    const xulosa = mijozQidiruvi ? null : model.xulosa;
    return {
      sotilgan: xulosa?.sotilgan ?? qatorJami.sotilgan,
      uzs: xulosa?.uzs ?? ikki.uzs,
      usd: xulosa ? xulosa.usd : ikki.usd,
      // Dollar/so'm bo'lmagan eski javobda hisobot valyutasidagi jami.
      asosiy: { tushum: qatorJami.tushum, tannarx: qatorJami.tannarx, foyda: qatorJami.foyda },
      rentabellik: xulosa?.rentabellik ?? qatorJami.rentabellik,
      cheklar: xulosa?.cheklar ?? null,
      ortachaKurs: xulosa?.ortachaKurs ?? null,
    };
  }, [korinadigan, model.xulosa, mijozQidiruvi]);

  const eng = useMemo(() => panelRoyxati(mijozQidiruvi ? null : model.eng, engKopFoyda(korinadigan)).filter((item) => item.foydaUzs > 0 || item.foydaUsd !== null && item.foydaUsd > 0).slice(0, 5), [korinadigan, model.eng, mijozQidiruvi]);
  const zararli = useMemo(() => panelRoyxati(mijozQidiruvi ? null : model.zarar, zararliQatorlar(korinadigan)), [korinadigan, model.zarar, mijozQidiruvi]);

  useEffect(() => setPage(1), [mijozQidiruvi, saralash, model, pageSize]);
  const sahifa = tartiblangan.slice((page - 1) * pageSize, page * pageSize);
  const joriyGuruh = GURUHLAR.find((item) => item.id === guruh) ?? GURUHLAR[0];

  const pul = (summa: number, valyuta: Valyuta = hisobotValyutasi) => hisobotPulMatni(summa, valyuta);
  // Jami summa: so'm va dollar bo'lsa tanlangan valyuta asosiy; yo'q bo'lsa hisobot valyutasidagi qiymat.
  const jamiJufti = (kalit: keyof FoydaSummalari) =>
    jami.uzs ? valyutaJufti(jami.uzs[kalit], jami.usd?.[kalit] ?? null, hisobotValyutasi) : { asosiy: { summa: jami.asosiy[kalit], valyuta: hisobotValyutasi }, qoshimcha: null };

  function saralashniOzgartirish(kalit: FoydaSaralashKaliti) {
    setSaralash((joriy) => (joriy.kalit === kalit ? { kalit, kamayish: !joriy.kamayish } : { kalit, kamayish: kalit !== "nomi" }));
  }

  async function eksport() {
    if (exportYuklanmoqda) return;
    setExportYuklanmoqda(true);
    setXato("");
    try {
      await productProfitReportApi.export(hisobotParametrlari({ guruh, dateFrom, dateTo, categoryId, narxTuri, valyuta: tanlanganValyuta, qidiruv: serverQidiruv }), "excel");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setExportYuklanmoqda(false);
    }
  }

  const ustunlar: Array<{ kalit: FoydaSaralashKaliti; nom: string; chap?: boolean }> = [
    { kalit: "nomi", nom: guruh === "CUSTOMER" ? "Mijoz" : "Mahsulot", chap: true },
    { kalit: "sotilgan", nom: "Miqdor" },
    { kalit: "tushum", nom: "Tushum" },
    { kalit: "tannarx", nom: "Tannarx" },
    { kalit: "foyda", nom: "Yalpi foyda" },
    { kalit: "rentabellik", nom: "Rentabellik" },
  ];
  const foydaRangi = (zarar: boolean) => (zarar ? "text-red-500" : "text-orange-600");
  const tushumJufti = jamiJufti("tushum");
  const tannarxJufti = jamiJufti("tannarx");
  const foydaJuftiJami = jamiJufti("foyda");
  const jamiZarar = foydaJuftiJami.asosiy.summa < 0;
  const qoshimcha = (juft: ReturnType<typeof jamiJufti>) => (juft.qoshimcha ? `≈ ${pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)}` : "");
  const guruhSozi = guruh === "CUSTOMER" ? "mijoz" : "mahsulot";

  return <div className="space-y-5">
    <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MuddatTanlov dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <Dropdown label="Mahsulot kategoriyasi" value={categoryId} options={[{ value: "", nomi: "Barchasi" }, ...kategoriyalar.map((item) => ({ value: item.id, nomi: item.nomi }))]} onChange={setCategoryId} />
        <Dropdown label="Narx turi" value={narxTuri} options={NARX_TURI_VARIANTLARI} onChange={(value) => setNarxTuri(value as NarxTuriFiltri)} />
        <label className="block text-xs font-bold text-gray-700">
          {guruh === "CUSTOMER" ? "Mijoz" : "Mahsulot"}
          <span className="relative mt-1.5 block">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={joriyGuruh.qidiruv} className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-gray-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-orange-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </span>
        </label>
      </div>
    </section>

    {xato && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

    <section aria-label="Asosiy ko‘rsatkichlar" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <Korsatkich nom="Tushum" qiymat={yuklanmoqda ? "…" : pul(tushumJufti.asosiy.summa, tushumJufti.asosiy.valyuta)} izoh={[qoshimcha(tushumJufti), jami.cheklar !== null ? `${son(jami.cheklar)} ta chek` : ""].filter(Boolean).join(" · ") || "Qaytarilganlarsiz"} />
      <Korsatkich nom="Tannarx" qiymat={yuklanmoqda ? "…" : pul(tannarxJufti.asosiy.summa, tannarxJufti.asosiy.valyuta)} izoh={qoshimcha(tannarxJufti) || "Sotilgan tovar tannarxi"} />
      <Korsatkich nom="Yalpi foyda" qiymat={yuklanmoqda ? "…" : pul(foydaJuftiJami.asosiy.summa, foydaJuftiJami.asosiy.valyuta)} izoh={qoshimcha(foydaJuftiJami) || "tushum − tannarx"} ton={jamiZarar ? "zarar" : "foyda"} keng />
      <Korsatkich nom="Rentabellik" qiymat={yuklanmoqda ? "…" : `${jami.rentabellik.toFixed(1)}%`} izoh="foyda ÷ tushum" />
      {jami.ortachaKurs !== null
        ? <Korsatkich nom="O‘rtacha kurs" qiymat={yuklanmoqda ? "…" : son(Math.round(jami.ortachaKurs))} izoh="sotuv kunlari bo‘yicha" />
        : <Korsatkich nom="Sotilgan miqdor" qiymat={yuklanmoqda ? "…" : son(jami.sotilgan)} izoh={`${korinadigan.length} ta ${guruhSozi}`} />}
    </section>

    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-orange-100/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div role="tablist" aria-label="Hisobot kesimi" className="inline-flex w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
            {GURUHLAR.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={guruh === item.id} onClick={() => setGuruh(item.id)} className={`h-9 flex-1 whitespace-nowrap rounded-xl px-3.5 text-sm font-bold transition sm:flex-none ${guruh === item.id ? "bg-white text-orange-600 shadow-sm ring-1 ring-orange-100" : "text-slate-500 hover:text-slate-800"}`}>{item.nom}</button>
            ))}
          </div>
          <button type="button" disabled={exportYuklanmoqda || yuklanmoqda || !korinadigan.length} onClick={() => void eksport()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50 disabled:opacity-50"><Download size={16} />{exportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx) · UZS + USD"}</button>
        </div>

        {yuklanmoqda ? <YuklanmoqdaHolati /> : !korinadigan.length ? (
          <div className="flex h-72 items-center justify-center px-4 text-center font-bold text-slate-400">Tanlangan filtr bo‘yicha ma’lumot topilmadi.</div>
        ) : (
          <>
            <div className="scrollbar-orange hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    {ustunlar.map((ustun) => {
                      const faol = saralash.kalit === ustun.kalit;
                      const Belgi = faol ? (saralash.kamayish ? ArrowDown : ArrowUp) : ArrowUpDown;
                      return (
                        <th key={ustun.kalit} scope="col" aria-sort={faol ? (saralash.kamayish ? "descending" : "ascending") : "none"} className={`px-4 py-3.5 font-bold ${ustun.chap ? "text-left" : "text-right"}`}>
                          <button type="button" onClick={() => saralashniOzgartirish(ustun.kalit)} className={`inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wide transition hover:text-orange-600 ${faol ? "text-orange-600" : ""}`}>
                            {ustun.nom}<Belgi size={13} className={faol ? "" : "opacity-40"} />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sahifa.map((item) => (
                    <tr key={item.id} className={`align-top transition hover:bg-orange-50/50 ${item.zarar ? "bg-red-50/40" : ""}`}>
                      <td className="max-w-[260px] px-4 py-3.5 font-black text-slate-900">
                        <span className="block truncate" title={item.nomi}>{item.nomi}</span>
                        <QatorIzohi item={item} pul={pul} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-gray-700">{son(item.sotilgan)}</td>
                      <td className="px-4 py-3.5 text-right"><SummaKatagi juft={qatorJufti(item, "tushum", hisobotValyutasi)} pul={pul} /></td>
                      <td className="px-4 py-3.5 text-right"><SummaKatagi juft={qatorJufti(item, "tannarx", hisobotValyutasi)} pul={pul} /></td>
                      <td className="px-4 py-3.5 text-right"><SummaKatagi juft={qatorJufti(item, "foyda", hisobotValyutasi)} pul={pul} rang={foydaRangi(item.zarar)} qalin /></td>
                      <td className="px-4 py-3.5 text-right"><RentabellikBelgisi qator={item} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-orange-100 bg-orange-50/40 align-top font-black text-gray-700">
                    <td className="whitespace-nowrap px-4 py-3.5">Jami: {korinadigan.length} {guruhSozi}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{son(jami.sotilgan)}</td>
                    <td className="px-4 py-3.5 text-right"><SummaKatagi juft={tushumJufti} pul={pul} qalin /></td>
                    <td className="px-4 py-3.5 text-right"><SummaKatagi juft={tannarxJufti} pul={pul} qalin /></td>
                    <td className="px-4 py-3.5 text-right"><SummaKatagi juft={foydaJuftiJami} pul={pul} rang={foydaRangi(jamiZarar)} qalin /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{jami.rentabellik.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 xl:hidden">
              {sahifa.map((item) => (
                <li key={item.id} className={`p-4 ${item.zarar ? "bg-red-50/40" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black text-slate-900">{item.nomi}</p>
                      <QatorIzohi item={item} pul={pul} />
                    </div>
                    <RentabellikBelgisi qator={item} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
                    <Maydon nom="Tushum"><SummaKatagi juft={qatorJufti(item, "tushum", hisobotValyutasi)} pul={pul} chap /></Maydon>
                    <Maydon nom="Tannarx"><SummaKatagi juft={qatorJufti(item, "tannarx", hisobotValyutasi)} pul={pul} chap /></Maydon>
                    <Maydon nom="Miqdor">{son(item.sotilgan)}</Maydon>
                    <Maydon nom="Yalpi foyda"><SummaKatagi juft={qatorJufti(item, "foyda", hisobotValyutasi)} pul={pul} rang={foydaRangi(item.zarar)} qalin chap /></Maydon>
                  </dl>
                </li>
              ))}
            </ul>

            <TablePagination page={page} pageSize={pageSize} totalItems={tartiblangan.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </section>

      <aside className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-1">
        {!yuklanmoqda && eng.length > 0 && (
          <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5 md:col-span-2 lg:col-span-1">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><TrendingUp size={16} className="text-orange-500" />Eng ko‘p foyda keltirgan</h2>
            <ul className="mt-4 space-y-3.5">
              {eng.map((item) => {
                const juft = valyutaJufti(item.foydaUzs, item.foydaUsd, hisobotValyutasi);
                return (
                  <li key={item.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-bold text-slate-800" title={item.nomi}>{item.nomi}</span>
                      <span className="shrink-0 font-black tabular-nums text-orange-600">{pul(juft.asosiy.summa, juft.asosiy.valyuta)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max((item.foydaUzs / eng[0].foydaUzs) * 100, 3)}%` }} />
                    </div>
                    {juft.qoshimcha && <p className="mt-1 text-xs font-semibold tabular-nums text-slate-400">≈ {pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!yuklanmoqda && zararli.length > 0 && (
          <section role="alert" className="rounded-3xl border border-red-100 bg-red-50 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-red-700"><TriangleAlert size={16} />Zarar bilan sotilgan</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-red-700">
              {zararli.slice(0, 3).map((item) => {
                const juft = valyutaJufti(item.foydaUzs, item.foydaUsd, hisobotValyutasi);
                return (
                  <li key={item.id}>
                    <p className="break-words"><span className="font-black">{item.nomi}</span> — {pul(juft.asosiy.summa, juft.asosiy.valyuta)}{juft.qoshimcha ? ` (${pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)})` : ""}</p>
                    <p className="text-xs font-semibold text-red-600/80">Sotuv narxi tannarxdan past.</p>
                  </li>
                );
              })}
            </ul>
            {zararli.length > 3 && <p className="mt-2.5 text-xs font-bold text-red-600">va yana {zararli.length - 3} ta</p>}
          </section>
        )}

        <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><Calculator size={16} className="text-orange-500" />Hisoblash formulasi</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li><span className="font-bold text-slate-800">Yalpi foyda</span> = tushum − tannarx</li>
            <li><span className="font-bold text-slate-800">Rentabellik</span> = foyda ÷ tushum × 100% (so‘mda)</li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Har bir sotuv o‘z kunidagi kurs bilan hisoblanadi, shuning uchun $ summa so‘mni bugungi kursga bo‘lish bilan chiqmaydi. Qaytarilgan tovarlar ayirilgan, operatsion xarajatlar hisobga olinmagan. Sof foyda (xarajatlar ayirilgan) — <Link to="/hisobotlar/foyda-xarajat" className="font-black text-orange-600 underline underline-offset-2">«Foyda va xarajat»</Link> sahifasida.
          </p>
        </section>
      </aside>
    </div>
  </div>;
}

function Korsatkich({ nom, qiymat, izoh, ton, keng }: { nom: string; qiymat: string; izoh: string; ton?: "foyda" | "zarar"; keng?: boolean }) {
  const rangli = ton === "foyda" ? "border-orange-500 bg-orange-500 text-white" : ton === "zarar" ? "border-red-600 bg-red-600 text-white" : "border-orange-100 bg-white text-slate-900";
  return (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-sm ${rangli} ${keng ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className={`text-xs font-semibold ${ton ? "text-white/80" : "text-slate-500"}`}>{nom}</p>
      <p className="mt-1.5 break-words text-xl font-black tabular-nums">{qiymat}</p>
      <p className={`mt-1 text-xs tabular-nums ${ton ? "text-white/80" : "text-slate-400"}`}>{izoh}</p>
    </div>
  );
}

function Maydon({ nom, children }: { nom: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-400">{nom}</dt>
      <dd className="break-words font-bold tabular-nums text-gray-700">{children}</dd>
    </div>
  );
}

type Juft = ReturnType<typeof valyutaJufti> | { asosiy: { summa: number; valyuta: Valyuta }; qoshimcha: null };

// Summa katagi: tanlangan valyutada, tagida kichik harfda ikkinchi valyutadagi qiymat (har sotuv o'z kursida hisoblangan).
function SummaKatagi({ juft, pul, rang = "text-gray-700", qalin, chap }: { juft: Juft; pul: (summa: number, valyuta: Valyuta) => string; rang?: string; qalin?: boolean; chap?: boolean }) {
  return (
    <span className={`block tabular-nums ${chap ? "text-left" : "text-right"}`}>
      <span className={`block whitespace-nowrap ${qalin ? "font-black" : "font-semibold"} ${rang}`}>{pul(juft.asosiy.summa, juft.asosiy.valyuta)}</span>
      {juft.qoshimcha && <span className="block whitespace-nowrap text-xs font-semibold text-slate-400">≈ {pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)}</span>}
    </span>
  );
}

// Nom ostidagi qisqa izoh: 1 dona tannarxi (mahsulot), eng foydali mahsulot (mijoz) va cheklar soni.
function QatorIzohi({ item, pul }: { item: Qator; pul: (summa: number, valyuta: Valyuta) => string }) {
  const qismlar = [
    item.birDonaTannarxUsd !== null ? `tannarx ${pul(item.birDonaTannarxUsd, "USD")} / dona` : "",
    item.engYaxshiMahsulot ? `eng foydali: ${item.engYaxshiMahsulot.nomi} (${pul(item.engYaxshiMahsulot.foydaUzs, "UZS")})` : "",
    item.cheklar !== null ? `${son(item.cheklar)} ta chek` : "",
  ].filter(Boolean);
  if (!qismlar.length) return null;
  return <span className="mt-0.5 block text-xs font-semibold text-slate-400">{qismlar.join(" · ")}</span>;
}

function RentabellikBelgisi({ qator }: { qator: Qator }) {
  const ton = qator.zarar ? "bg-red-50 text-red-600 ring-red-100" : qator.rentabellik < 10 ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-orange-50 text-orange-700 ring-orange-100";
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ring-1 ${ton}`}>{qator.rentabellik.toFixed(1)}%</span>;
}
