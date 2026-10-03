import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleCheck, Clock3, LoaderCircle, RotateCcw, Undo2, Wallet } from "lucide-react";
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
  sotuvSummasi,
} from "./savdoYordamchilari";
import QaytarishTafsilotlariModal from "./QaytarishTafsilotlariModal";
import SavdoSelect from "./SavdoSelect";
import JadvalYuklanmoqda from "./JadvalYuklanmoqda";
import TablePagination from "@/Components/common/TablePagination";
import HujjatOchirish from "@/Components/common/HujjatOchirish";

type QaytarishProps = {
  sotuvlar: Sotuv[];
  qaytarishlar: QaytarishTuri[];
  boshlangichSotuvId?: string;
  amalBajarilmoqda: boolean;
  yuklanmoqda?: boolean;
  onSotuvTafsilotiniOlish: (sotuvId: string) => Promise<Sotuv | null>;
  onYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<QaytarishTuri | null>;
  onTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  onBekorQilish: (qaytarishId: string) => Promise<boolean>;
  onOchirish: (qaytarishId: string) => Promise<boolean>;
  onTiklash: (qaytarishId: string) => Promise<boolean>;
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
  yuklanmoqda = false,
  onSotuvTafsilotiniOlish,
  onYaratish,
  onTasdiqlash,
  onOchirish,
  onTiklash,
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

  const tanlanganSotuv = qaytarishMumkinSotuvlar.find((sotuv) => sotuv.id === saleId);
  const statistika = useMemo(() => {
    let tasdiqlangan = 0;
    let qoralama = 0;
    let summa = 0;
    for (const qaytarish of qaytarishlar) {
      const holat = String(qaytarish.status ?? "DRAFT").toUpperCase();
      if (holat === "CONFIRMED") {
        tasdiqlangan += 1;
        summa += qaytarishSummasi(qaytarish);
      } else if (holat !== "CANCELLED" && holat !== "CANCELED") {
        qoralama += 1;
      }
    }
    return { jami: qaytarishlar.length, tasdiqlangan, qoralama, summa };
  }, [qaytarishlar]);

  const kartalar = [
    { kalit: "jami", label: t("qaytarish.stat.jami"), qiymat: String(statistika.jami), ikonka: Undo2, stil: "from-blue-500 to-blue-700 shadow-blue-200", chegara: "border-blue-100" },
    { kalit: "tasdiqlangan", label: t("qaytarish.stat.tasdiqlangan"), qiymat: String(statistika.tasdiqlangan), ikonka: CircleCheck, stil: "from-emerald-400 to-emerald-600 shadow-emerald-200", chegara: "border-emerald-100" },
    { kalit: "qoralama", label: t("qaytarish.stat.qoralama"), qiymat: String(statistika.qoralama), ikonka: Clock3, stil: "from-amber-400 to-amber-600 shadow-amber-200", chegara: "border-amber-100" },
    { kalit: "summa", label: t("qaytarish.stat.summa"), qiymat: pulniFormatlash(statistika.summa), ikonka: Wallet, stil: "from-rose-400 to-rose-600 shadow-rose-200", chegara: "border-rose-100" },
  ];

  const sababStili: Record<QaytarishSababi, string> = {
    DEFECT: "bg-red-50 text-red-600 ring-red-100",
    WRONG: "bg-amber-50 text-amber-700 ring-amber-100",
    OTHER: "bg-slate-50 text-slate-600 ring-slate-200",
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="savdo-section-title">{t("qaytarish.sarlavha")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("qaytarish.tavsif")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("qaytarish.sarlavha")}>
        {kartalar.map((karta) => {
          const Ikonka = karta.ikonka;
          return (
            <div
              key={karta.kalit}
              className={`group flex items-center gap-4 rounded-[22px] border bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-[0_5px_18px_rgba(15,23,42,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(15,23,42,.10)] ${karta.chegara}`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-105 ${karta.stil}`}>
                <Ikonka size={22} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-500">{karta.label}</p>
                <p className="mt-1 truncate text-2xl font-black leading-none tracking-tight text-slate-900 tabular-nums">{karta.qiymat}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_14px_38px_rgba(37,99,235,.06)]">
        <div className="flex items-center gap-3 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
            <RotateCcw size={19} />
          </span>
          <div>
            <h2 className="font-black text-slate-900">{t("qaytarish.yangi")}</h2>
            <p className="text-xs text-slate-500">{t("qaytarish.yangiTavsif")}</p>
          </div>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <label className="block space-y-2 text-sm font-bold text-gray-700">
              <span>1. {t("qaytarish.tasdiqlanganSotuv")}</span>
              <SavdoSelect
                value={saleId}
                onChange={setSaleId}
                placeholder={t("qaytarish.sotuvniTanlang")}
                buttonClassName="h-12 rounded-2xl"
                options={qaytarishMumkinSotuvlar.map((sotuv) => ({
                  value: sotuv.id,
                  label: `${sotuvRaqami(sotuv)} — ${mijozNomi(sotuv)}`,
                }))}
              />
            </label>

            {tanlanganSotuv ? (
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{t("qaytarish.sotuvMijoz")}</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{mijozNomi(tanlanganSotuv)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{t("qaytarish.sotuvSumma")}</p>
                  <p className="mt-0.5 truncate text-sm font-black text-emerald-700">{pulniFormatlash(sotuvSummasi(tanlanganSotuv))}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{t("qaytarish.mahsulotlarSoni")}</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{tanlanganSotuv.items?.length ?? 0}</p>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400">{t("qaytarish.sotuvTanlanmaganHint")}</p>
            )}
          </div>

          <div className="space-y-5">
            <div className="space-y-2 text-sm font-bold text-gray-700">
              <span>2. {t("qaytarish.sabab")}</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(sababMatni) as QaytarishSababi[]).map((kalit) => (
                  <button
                    key={kalit}
                    type="button"
                    onClick={() => setReason(kalit)}
                    aria-pressed={reason === kalit}
                    className={`h-12 rounded-2xl px-3 text-xs font-bold ring-1 transition ${
                      reason === kalit
                        ? "bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,.22)] ring-[#2563EB]"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-orange-50 hover:text-[#2563EB]"
                    }`}
                  >
                    {t(sababMatni[kalit])}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2 text-sm font-bold text-gray-700">
              <span>3. {t("qaytarish.izoh")}</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-200 px-4 text-sm font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder={t("qaytarish.izohPlaceholder")}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-100 bg-orange-50/40 px-6 py-4">
          <p className="text-xs text-slate-500">{t("qaytarish.toliqEslatma")}</p>
          <button
            onClick={toliqQaytarishYaratish}
            disabled={amalBajarilmoqda || !saleId}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:translate-y-0 disabled:opacity-50"
          >
            {amalBajarilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <RotateCcw size={17} />}
            {t("qaytarish.toliqQaytarish")}
          </button>
        </div>
        {(xatolik || qaytarishMumkinSotuvlar.length === 0) && (
          <div className="space-y-1 px-6 pb-4">
            {xatolik && <p className="text-sm font-bold text-red-600">{t(xatolik)}</p>}
            {qaytarishMumkinSotuvlar.length === 0 && <p className="text-sm text-amber-600">{t("qaytarish.mahsulotYoqOgohlantirish")}</p>}
          </div>
        )}
      </section>

      <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_14px_38px_rgba(37,99,235,.06)]">
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
                <th className="w-20 px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/70">
              {visibleRows.map((qaytarish) => {
                const holat = String(qaytarish.status ?? "DRAFT").toUpperCase();
                const sabab = String(qaytarish.reason ?? "OTHER").toUpperCase() as QaytarishSababi;
                const bogliqSotuv = qaytarish.sale ?? sotuvlar.find((item) => item.id === qaytarish.saleId) ?? { id: qaytarish.saleId };

                return (
                  <tr
                    key={qaytarish.id}
                    onClick={() => setTanlanganId(qaytarish.id)}
                    className="cursor-pointer transition hover:bg-orange-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">
                          <Undo2 size={18} />
                        </span>
                        <span className="font-black tabular-nums text-slate-900">{qaytarish.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{sotuvRaqami(bogliqSotuv)}</p>
                      <p className="mt-1 text-xs text-slate-400">{mijozNomi(bogliqSotuv)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ${sababStili[sabab] ?? sababStili.OTHER}`}>
                        {t(sababniOzbekcha(qaytarish.reason))}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-black text-slate-900">
                      {pulniFormatlash(qaytarishSummasi(qaytarish))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{sananiFormatlash(qaytarish.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${holat === "CONFIRMED" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : holat === "CANCELLED" || holat === "CANCELED" ? "bg-red-50 text-red-600 ring-red-100" : "bg-amber-50 text-amber-700 ring-amber-100"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${holat === "CONFIRMED" ? "bg-emerald-500" : holat === "CANCELLED" || holat === "CANCELED" ? "bg-red-500" : "bg-amber-500"}`} />
                        {t(holatniOzbekcha(holat))}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <HujjatOchirish
                        guruh="savdo"
                        status={qaytarish.status ?? "DRAFT"}
                        nom={qaytarish.id.slice(0, 8).toUpperCase()}
                        onTasdiq={() => onOchirish(qaytarish.id)}
                        onTiklash={() => onTiklash(qaytarish.id)}
                      />
                    </td>
                  </tr>
                );
              })}
              {yuklanmoqda && qaytarishlar.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <JadvalYuklanmoqda ikonka={<RotateCcw size={24} />} />
                  </td>
                </tr>
              )}
              {!yuklanmoqda && qaytarishlar.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Undo2 className="mx-auto text-orange-200" size={40} />
                    <p className="mt-3 font-semibold text-gray-400">{t("qaytarish.emptyList")}</p>
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
