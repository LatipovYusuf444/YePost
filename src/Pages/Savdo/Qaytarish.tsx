import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, RotateCcw } from "lucide-react";
import type {
  Qaytarish as QaytarishTuri,
  QaytarishSababi,
  QaytarishYaratishMalumoti,
  Sotuv,
} from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sananiFormatlash,
  sotuvMahsulotiId,
  sotuvMahsulotiMiqdori,
  sotuvMahsulotiModifikatsiyaId,
  sotuvMahsulotiNarxi,
  sotuvHolati,
  sotuvRaqami,
} from "./savdoYordamchilari";
import QaytarishTafsilotlariModal from "./QaytarishTafsilotlariModal";
import SavdoSelect from "./SavdoSelect";
import TablePagination from "@/Components/common/TablePagination";

type QaytarishProps = {
  sotuvlar: Sotuv[];
  qaytarishlar: QaytarishTuri[];
  boshlangichSotuvId?: string;
  amalBajarilmoqda: boolean;
  onSotuvTafsilotiniOlish: (sotuvId: string) => Promise<Sotuv | null>;
  onYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<QaytarishTuri | null>;
  onTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  onBekorQilish: (qaytarishId: string) => Promise<boolean>;
};

const sababMatni: Record<QaytarishSababi, string> = {
  DEFECT: "qaytarish.sabablar.DEFECT",
  WRONG: "qaytarish.sabablar.WRONG",
  OTHER: "qaytarish.sabablar.OTHER",
};

function sababniOzbekcha(reason?: string) {
  return sababMatni[String(reason ?? "OTHER").toUpperCase() as QaytarishSababi] ?? "qaytarish.sabablar.OTHER";
}

function holatniOzbekcha(holat: string) {
  if (holat === "CONFIRMED") return "qaytarish.holatlar.CONFIRMED";
  if (holat === "CANCELLED" || holat === "CANCELED") return "qaytarish.holatlar.CANCELLED";
  return "qaytarish.holatlar.DRAFT";
}

export default function Qaytarish({
  sotuvlar,
  qaytarishlar,
  boshlangichSotuvId = "",
  amalBajarilmoqda,
  onSotuvTafsilotiniOlish,
  onYaratish,
  onTasdiqlash,
}: QaytarishProps) {
  const { t } = useTranslation("savdo_kichik");
  const qaytarishMumkinSotuvlar = useMemo(
    () =>
      sotuvlar.filter(
        (sotuv) =>
          sotuvHolati(sotuv) === "CONFIRMED" &&
          Boolean(sotuv.warehouseId ?? sotuv.warehouse?.id) &&
          (sotuv.items?.length ?? 0) > 0
      ),
    [sotuvlar]
  );
  const [saleId, setSaleId] = useState(boshlangichSotuvId);
  const [reason, setReason] = useState<QaytarishSababi>("OTHER");
  const [note, setNote] = useState("");
  const [xatolik, setXatolik] = useState("");
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const visibleRows = qaytarishlar.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [pageSize, qaytarishlar]);

  useEffect(() => {
    if (boshlangichSotuvId) setSaleId(boshlangichSotuvId);
  }, [boshlangichSotuvId]);

  async function toliqQaytarishYaratish() {
    setXatolik("");
    const royxatdagiSotuv = sotuvlar.find((item) => item.id === saleId);

    if (!royxatdagiSotuv) {
      setXatolik("qaytarish.xatoliklar.sotuvTanlanmagan");
      return;
    }

    const toliqSotuv = (await onSotuvTafsilotiniOlish(royxatdagiSotuv.id)) ?? royxatdagiSotuv;
    const warehouseId = toliqSotuv.warehouseId ?? toliqSotuv.warehouse?.id ?? "";

    if (!warehouseId) {
      setXatolik("qaytarish.xatoliklar.omborTopilmadi");
      return;
    }

    const items = (toliqSotuv.items ?? [])
      .map((item) => ({
        saleItemId: sotuvMahsulotiId(item),
        modificationId: sotuvMahsulotiModifikatsiyaId(item),
        quantity: sotuvMahsulotiMiqdori(item),
        price: sotuvMahsulotiNarxi(item),
      }))
      .filter(
        (item) =>
          item.saleItemId &&
          item.modificationId &&
          Number.isFinite(item.quantity) &&
          item.quantity >= 0.001 &&
          Number.isFinite(item.price) &&
          item.price >= 0
      );

    if (items.length === 0) {
      setXatolik("qaytarish.xatoliklar.yaroqliQatorYoq");
      return;
    }

    const yaratilganQaytarish = await onYaratish({
      saleId: toliqSotuv.id,
      warehouseId,
      responsibleId: toliqSotuv.responsibleId,
      reason,
      note: note.trim() || undefined,
      items,
    });

    if (!yaratilganQaytarish) return;

    const tasdiqlandi = await onTasdiqlash(yaratilganQaytarish.id);
    if (!tasdiqlandi) {
      setXatolik("qaytarish.xatoliklar.tasdiqlashXato");
      return;
    }

    setSaleId("");
    setReason("OTHER");
    setNote("");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1 space-y-2 text-sm font-bold text-gray-700">
            <span>{t("qaytarish.tasdiqlanganSotuv")}</span>
            <SavdoSelect
              value={saleId}
              onChange={setSaleId}
              placeholder={t("qaytarish.sotuvniTanlang")}
              buttonClassName="h-12"
              options={qaytarishMumkinSotuvlar.map((sotuv) => ({
                value: sotuv.id,
                label: `${sotuvRaqami(sotuv)} — ${mijozNomi(sotuv)}`,
              }))}
            />
          </label>
          <label className="space-y-2 text-sm font-bold text-gray-700">
            <span>{t("qaytarish.sabab")}</span>
            <SavdoSelect
              value={reason}
              onChange={(value) => setReason(value as QaytarishSababi)}
              buttonClassName="h-12"
              options={Object.entries(sababMatni).map(([value, label]) => ({
                value,
                label: t(label),
              }))}
            />
          </label>
          <label className="flex-1 space-y-2 text-sm font-bold text-gray-700">
            <span>{t("qaytarish.izoh")}</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
              placeholder={t("qaytarish.izohPlaceholder")}
            />
          </label>
          <button
            onClick={toliqQaytarishYaratish}
            disabled={amalBajarilmoqda}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {amalBajarilmoqda ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <RotateCcw size={17} />
            )}
            {t("qaytarish.toliqQaytarish")}
          </button>
        </div>
        {xatolik && <p className="mt-3 text-sm font-bold text-red-600">{t(xatolik)}</p>}
        {qaytarishMumkinSotuvlar.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">
            {t("qaytarish.mahsulotYoqOgohlantirish")}
          </p>
        )}
      </section>

      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">{t("qaytarish.columns.hujjat")}</th>
                <th className="px-5 py-4">{t("qaytarish.columns.sotuvVaMijoz")}</th>
                <th className="px-5 py-4">{t("qaytarish.columns.sabab")}</th>
                <th className="px-5 py-4">{t("qaytarish.columns.summa")}</th>
                <th className="px-5 py-4">{t("qaytarish.columns.sana")}</th>
                <th className="px-5 py-4">{t("qaytarish.columns.holati")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/70">
              {visibleRows.map((qaytarish) => {
                const holat = String(qaytarish.status ?? "DRAFT").toUpperCase();

                return (
                  <tr
                    key={qaytarish.id}
                    onClick={() => setTanlanganId(qaytarish.id)}
                    className="cursor-pointer transition hover:bg-orange-50/60"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {qaytarish.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">
                        {qaytarish.sale ? sotuvRaqami(qaytarish.sale) : sotuvRaqami(sotuvlar.find((item) => item.id === qaytarish.saleId) ?? { id: qaytarish.saleId })}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {mijozNomi(qaytarish.sale ?? sotuvlar.find((item) => item.id === qaytarish.saleId) ?? { id: qaytarish.saleId })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {t(sababniOzbekcha(qaytarish.reason))}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {pulniFormatlash(qaytarishSummasi(qaytarish))}
                    </td>
                    <td className="px-5 py-4">{sananiFormatlash(qaytarish.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${holat === "CONFIRMED" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : holat === "CANCELLED" || holat === "CANCELED" ? "bg-red-50 text-red-600 ring-1 ring-red-100" : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"}`}>
                        {t(holatniOzbekcha(holat))}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {qaytarishlar.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    {t("qaytarish.emptyList")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <TablePagination page={page} pageSize={pageSize} totalItems={qaytarishlar.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      {tanlanganId && (
        <QaytarishTafsilotlariModal
          qaytarishId={tanlanganId}
          onYopish={() => setTanlanganId(null)}
        />
      )}
    </div>
  );
}
