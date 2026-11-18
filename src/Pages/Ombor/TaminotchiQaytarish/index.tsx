import SmartTable from "@/Components/common/smart-table/SmartTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Plus, Search, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import DateRangePicker from "@/Components/ui/DateRangePicker";
import AppSelect from "@/Components/ui/AppSelect";
import TablePagination from "@/Components/common/TablePagination";
import HujjatOchirish from "@/Components/common/HujjatOchirish";
import { KiritilganBelgisi } from "@/Components/common/HujjatSanasi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { taminotchiQaytarishApi } from "@/api/taminotchiQaytarishApi";
import { toshkentKuni } from "@/lib/hujjatSanasi";
import { qaytarishHolati } from "@/lib/taminotchiQaytarish";
import { valyutaKodi } from "@/lib/valyuta";
import { useOmborStore } from "@/store/omborStore";
import type { TaminotchiQaytarishHujjati } from "@/types/taminotchiQaytarish";
import HujjatStatistikaKartalari from "../HujjatStatistikaKartalari";
import OmborJadval from "../OmborJadval";
import { hujjatRaqami, pul, sana } from "../omborYordamchilari";
import QaytarishOynasi from "./QaytarishOynasi";
import QaytarishTafsilot from "./QaytarishTafsilot";
import HolatBelgisi from "./HolatBelgisi";
import { mahsulotlarMatni, yetkazibBeruvchiNomi } from "./yordamchi";

// Ombor → Yetkazib beruvchiga qaytarish: kirimda kelgan nuqsonli yoki ortiqcha tovar yetkazib beruvchiga qaytariladi (VOZ-…).
export default function TaminotchiQaytarish() {
  const { t } = useTranslation("ombor_royxat");
  const store = useOmborStore();
  const malumotlarniYuklashAgarKerak = store.malumotlarniYuklashAgarKerak;
  const [hujjatlar, setHujjatlar] = useState<TaminotchiQaytarishHujjati[] | null>(null);
  const [xato, setXato] = useState("");
  const [qidiruv, setQidiruv] = useState("");
  const [statusFiltri, setStatusFiltri] = useState("ALL");
  const [supplierFiltri, setSupplierFiltri] = useState("");
  const [sanaDan, setSanaDan] = useState("");
  const [sanaGacha, setSanaGacha] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [yangiOchiq, setYangiOchiq] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);

  // Hisobotdagi havola: /ombor/yetkazib-beruvchiga-qaytarish?hujjat=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location?.search ?? "").get("hujjat");
    if (id) setTanlanganId(id);
  }, []);

  useEffect(() => {
    void malumotlarniYuklashAgarKerak();
  }, [malumotlarniYuklashAgarKerak]);

  const yuklash = useCallback(async () => {
    setXato("");
    try {
      setHujjatlar(await taminotchiQaytarishApi.royxat());
    } catch (error) {
      setXato(getApiErrorMessage(error));
      setHujjatlar((joriy) => joriy ?? []);
    }
  }, []);
  useEffect(() => { void yuklash(); }, [yuklash]);

  const hammasi = useMemo(() => hujjatlar ?? [], [hujjatlar]);
  const royxat = useMemo(() => {
    const q = qidiruv.trim().toLocaleLowerCase();
    return hammasi.filter((hujjat) => {
      const status = qaytarishHolati(hujjat.status);
      if (statusFiltri !== "ALL" && status !== statusFiltri) return false;
      if (supplierFiltri && hujjat.supplierId !== supplierFiltri) return false;
      const kun = toshkentKuni(hujjat.date ?? hujjat.createdAt ?? undefined);
      if (sanaDan && !(kun && kun >= sanaDan)) return false;
      if (sanaGacha && !(kun && kun <= sanaGacha)) return false;
      if (!q) return true;
      return [hujjatRaqami(hujjat), yetkazibBeruvchiNomi(hujjat, store.yetkazibBeruvchilar), mahsulotlarMatni(hujjat), hujjat.note]
        .join(" ").toLocaleLowerCase().includes(q);
    });
  }, [hammasi, qidiruv, statusFiltri, supplierFiltri, sanaDan, sanaGacha, store.yetkazibBeruvchilar]);
  const statistika = useMemo(() => {
    const holatlar = hammasi.map((hujjat) => qaytarishHolati(hujjat.status));
    const tasdiqlangan = holatlar.filter((holat) => holat === "CONFIRMED").length;
    const bekor = holatlar.filter((holat) => holat === "CANCELLED").length;
    return [hammasi.length, tasdiqlangan, hammasi.length - tasdiqlangan - bekor, bekor] as [number, number, number, number];
  }, [hammasi]);
  const sahifadagi = useMemo(() => royxat.slice((page - 1) * pageSize, page * pageSize), [royxat, page, pageSize]);
  useEffect(() => setPage(1), [qidiruv, statusFiltri, supplierFiltri, sanaDan, sanaGacha, pageSize]);

  const yuklanmoqda = hujjatlar === null;
  const yangiTugma = (
    <button type="button" onClick={() => setYangiOchiq(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
      <Plus size={17} />{t("taminotchiQaytarish.createButton")}
    </button>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-950">{t("taminotchiQaytarish.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">{t("taminotchiQaytarish.subtitle")}</p>
        </div>
        {yangiTugma}
      </header>

      <HujjatStatistikaKartalari
        labels={[t("taminotchiQaytarish.stats.total"), t("taminotchiQaytarish.stats.confirmed"), t("taminotchiQaytarish.stats.draft"), t("taminotchiQaytarish.stats.cancelled")]}
        values={statistika}
        selected={statusFiltri}
        onSelect={setStatusFiltri}
        ariaLabel={t("taminotchiQaytarish.stats.aria")}
        loading={yuklanmoqda}
        loadingText={t("taminotchiQaytarish.loading")}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={t("taminotchiQaytarish.searchPlaceholder")} aria-label={t("taminotchiQaytarish.searchPlaceholder")} className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
        </div>
        <AppSelect value={supplierFiltri} onChange={(event) => setSupplierFiltri(event.target.value)} aria-label={t("taminotchiQaytarish.supplierFilter")} className="h-11 w-full rounded-2xl text-sm font-semibold text-slate-700 lg:w-64 [&>button]:rounded-2xl [&>button]:px-4">
          <option value="">{t("taminotchiQaytarish.allSuppliers")}</option>
          {store.yetkazibBeruvchilar.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </AppSelect>
        <DateRangePicker from={sanaDan} to={sanaGacha} onChange={(from, to) => { setSanaDan(from); setSanaGacha(to); }} className="w-full sm:w-64 sm:shrink-0 lg:w-80" compact />
      </div>

      {xato && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{xato}</span>
          <button type="button" onClick={() => void yuklash()} className="shrink-0 text-red-500 underline">{t("taminotchiQaytarish.retry")}</button>
        </div>
      )}

      <OmborJadval>
        <SmartTable tableId="Ombor/TaminotchiQaytarish/table-1" replaceColumnControls><table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th data-column-id="raqam">{t("taminotchiQaytarish.columns.number")}</th>
              <th data-column-id="yetkazib">{t("taminotchiQaytarish.columns.supplier")}</th>
              <th data-column-id="mahsulotlar">{t("taminotchiQaytarish.columns.products")}</th>
              <th data-column-id="sana">{t("taminotchiQaytarish.columns.date")}</th>
              <th data-column-id="summa" className="text-right">{t("taminotchiQaytarish.columns.amount")}</th>
              <th data-column-id="holat">{t("taminotchiQaytarish.columns.status")}</th>
              <th data-column-id="amal" className="sticky right-0 z-10 bg-[#F8FAFC] text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {yuklanmoqda ? (
              <tr><td colSpan={7} className="px-6 py-16 text-center"><LoaderCircle className="mx-auto animate-spin text-orange-500" size={28} /></td></tr>
            ) : sahifadagi.map((hujjat) => (
              <tr key={hujjat.id} onClick={() => setTanlanganId(hujjat.id)} className="cursor-pointer hover:bg-orange-50/30">
                <td className="whitespace-nowrap font-black text-gray-950">{hujjat.docNumber?.trim() || <span className="font-bold text-slate-400">{t("taminotchiQaytarish.draftNumber")}</span>}</td>
                <td className="font-bold text-gray-800">{yetkazibBeruvchiNomi(hujjat, store.yetkazibBeruvchilar) || "—"}</td>
                <td className="max-w-[320px] truncate text-gray-600">{mahsulotlarMatni(hujjat) || "—"}</td>
                <td className="whitespace-nowrap text-gray-700">{sana(hujjat.date ?? hujjat.createdAt ?? undefined)}<KiritilganBelgisi date={hujjat.date ?? undefined} createdAt={hujjat.createdAt ?? undefined} /></td>
                <td className="whitespace-nowrap text-right font-black text-gray-800">{pul(Number(hujjat.total) || 0, valyutaKodi(hujjat.currency ?? undefined))}</td>
                <td><HolatBelgisi status={hujjat.status} /></td>
                <td className="sticky right-0 bg-white text-right" onClick={(event) => event.stopPropagation()}>
                  <HujjatOchirish
                    guruh="ombor"
                    status={hujjat.status}
                    nom={hujjatRaqami(hujjat)}
                    onTasdiq={async () => { await taminotchiQaytarishApi.ochirish(hujjat.id); await yuklash(); return true; }}
                    onTiklash={async () => { await taminotchiQaytarishApi.tiklash(hujjat.id); await yuklash(); return true; }}
                  />
                </td>
              </tr>
            ))}
            {!yuklanmoqda && royxat.length === 0 && (
              <tr>
                <td colSpan={7} className="p-14 text-center">
                  <Undo2 className="mx-auto text-orange-200" size={42} />
                  <p className="mt-3 font-bold text-gray-500">{hammasi.length ? t("taminotchiQaytarish.emptyFiltered") : t("taminotchiQaytarish.emptyTitle")}</p>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-gray-400">{t("taminotchiQaytarish.emptyHint")}</p>
                  {!hammasi.length && <div className="mt-5 flex justify-center">{yangiTugma}</div>}
                </td>
              </tr>
            )}
          </tbody>
        </table></SmartTable>
      </OmborJadval>
      {!yuklanmoqda && <TablePagination page={page} pageSize={pageSize} totalItems={royxat.length} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {/* Yopilganda ham ro'yxat yangilanadi: tasdiqlash xato bergan bo'lsa hujjat qoralama bo'lib qolgan. */}
      {yangiOchiq && <QaytarishOynasi onClose={() => { setYangiOchiq(false); void yuklash(); }} onSaqlandi={(id) => { setYangiOchiq(false); void yuklash(); setTanlanganId(id); }} />}
      {tanlanganId && <QaytarishTafsilot id={tanlanganId} onClose={() => setTanlanganId(null)} onOzgardi={() => void yuklash()} />}
    </div>
  );
}
