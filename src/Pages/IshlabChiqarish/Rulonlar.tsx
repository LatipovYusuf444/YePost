import { useState } from "react";
import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import TablePagination from "@/Components/common/TablePagination";
import { ishlabChiqarishApi, yorliqniChopEtish } from "@/api/ishlabChiqarishApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { miqdorMatni } from "@/lib/ishlabChiqarish";
import type { Rulon } from "@/types/ishlabChiqarish";
import { HolatFiltri, Jadval, OmborTanlash, Sahifa, XatoQutisi, Yuklanmoqda, type Ustun } from "./umumiy";
import { useAmal, useMalumot, useOmborlar } from "./hooklar";

export default function Rulonlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState("IN_STOCK");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const kalit = `${warehouseId}|${status}|${page}|${pageSize}`;
  const royxat = useMalumot(() => ishlabChiqarishApi.rulonlar.royxat({ warehouseId: warehouseId || undefined, status: status || "ALL", page, pageSize }), kalit);
  const xulosa = useMalumot(() => ishlabChiqarishApi.rulonlar.xulosa(warehouseId || undefined), warehouseId);
  const yorliq = useAmal();
  const nomlar = new Map(omborlar.map((ombor) => [ombor.id, ombor.name]));
  const ustunlar: Ustun<Rulon>[] = [
    { nom: t("fields.serial"), katak: (rulon) => <span className="font-black text-slate-900">{rulon.serial ?? "—"}</span> },
    { nom: t("fields.product"), katak: (rulon) => rulon.productName ?? "—" },
    { nom: t("fields.warehouse"), katak: (rulon) => nomlar.get(rulon.warehouseId ?? "") ?? "—" },
    { nom: t("rolls.weight"), ong: true, katak: (rulon) => miqdorMatni(rulon.weight) },
    { nom: t("rolls.weightLeft"), ong: true, katak: (rulon) => miqdorMatni(rulon.weightLeft) },
    { nom: t("rolls.receivedAt"), katak: (rulon) => kunMatni(rulon.receivedAt ?? undefined) || "—" },
    { nom: t("rolls.label"), katak: (rulon) => <button type="button" disabled={yorliq.band} onClick={() => void yorliq.bajar(() => yorliqniChopEtish(rulon.batchId))} className="inline-flex items-center gap-1.5 text-xs font-black text-orange-600 hover:underline disabled:opacity-50"><Printer size={14} />{t("rolls.printLabel")}</button> },
  ];
  return (
    <Sahifa
      sarlavha={t("rolls.title")}
      izoh={t("rolls.subtitle")}
      amal={<>
        <div className="w-56"><OmborTanlash value={warehouseId} omborlar={omborlar} ariaLabel={t("fields.warehouse")} onChange={(id) => { setWarehouseId(id); setPage(1); }} /></div>
        <HolatFiltri qiymat={status} onChange={(qiymat) => { setStatus(qiymat); setPage(1); }} holatlar={["IN_STOCK", "USED"]} />
      </>}
    >
      <XatoQutisi matn={royxat.xato || xulosa.xato || yorliq.xato} />
      <div className="flex flex-wrap gap-2">
        {(xulosa.malumot ?? []).map((qator, indeks) => (
          <span key={`${qator.modificationId ?? qator.productName}-${qator.warehouseId ?? ""}-${indeks}`} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
            <span className="font-black text-slate-900">{qator.productName}</span>
            {t("rolls.summary", { soni: miqdorMatni(qator.rolls), ogirlik: miqdorMatni(qator.weight) })}
          </span>
        ))}
      </div>
      {royxat.yuklanmoqda && !royxat.malumot ? <Yuklanmoqda /> : <>
        <Jadval ustunlar={ustunlar} qatorlar={royxat.malumot?.items ?? []} kalit={(rulon) => rulon.batchId} bosh={t("empty.rolls")} />
        <TablePagination page={page} pageSize={pageSize} totalItems={royxat.malumot?.total ?? 0} onPageChange={setPage} onPageSizeChange={(hajm) => { setPageSize(hajm); setPage(1); }} />
      </>}
    </Sahifa>
  );
}
