import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CircleCheck, Clock3, Plus, RotateCcw, Undo2, Wallet } from "lucide-react";
import type { Qaytarish as QaytarishTuri, QaytarishYaratishMalumoti, Sotuv } from "@/types/savdo";
import { useSavdoStore } from "@/store/savdoStore";
import {
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sananiFormatlash,
  sotuvQarzdorlikSummasi,
  sotuvRaqami,
} from "./savdoYordamchilari";
import QaytarishTafsilotlariModal from "./QaytarishTafsilotlariModal";
import QaytarishWizard from "./qaytarish/QaytarishWizard";
import { qaytarishHolati, qaytarishRaqami, raqamga } from "./qaytarish/qaytarishYordamchilari";
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

const HOLAT_STILI: Record<string, { badge: string; nuqta: string; kalit: string }> = {
  CONFIRMED: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-100", nuqta: "bg-emerald-500", kalit: "confirmed" },
  CANCELLED: { badge: "bg-red-50 text-red-600 ring-red-100", nuqta: "bg-red-500", kalit: "cancelled" },
  DRAFT: { badge: "bg-amber-50 text-amber-700 ring-amber-100", nuqta: "bg-amber-500", kalit: "draft" },
};

function holatStili(holat: string) {
  return HOLAT_STILI[holat === "CANCELED" ? "CANCELLED" : holat] ?? HOLAT_STILI.DRAFT;
}

function Holat({ holat }: { holat: string }) {
  const { t } = useTranslation("savdo_qaytarish");
  const uslub = holatStili(holat);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${uslub.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${uslub.nuqta}`} />
      {t(`status.${uslub.kalit}`)}
    </span>
  );
}

export default function Qaytarish({
  sotuvlar,
  qaytarishlar,
  boshlangichSotuvId = "",
  yuklanmoqda = false,
  onSotuvTafsilotiniOlish,
  onYaratish,
  onTasdiqlash,
  onOchirish,
  onTiklash,
}: QaytarishProps) {
  const { t } = useTranslation("savdo_kichik");
  const { t: tq } = useTranslation("savdo_qaytarish");
  const qaytarishTafsilotiniYuklash = useSavdoStore((state) => state.qaytarishTafsilotiniYuklash);
  const [yangiOchiq, setYangiOchiq] = useState(Boolean(boshlangichSotuvId));
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const visibleRows = qaytarishlar.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [pageSize, qaytarishlar]);

  useEffect(() => {
    if (boshlangichSotuvId) setYangiOchiq(true);
  }, [boshlangichSotuvId]);

  const statistika = useMemo(() => {
    let tasdiqlangan = 0;
    let qoralama = 0;
    let summa = 0;
    for (const qaytarish of qaytarishlar) {
      const holat = qaytarishHolati(qaytarish);
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

  // Jadval qatori uchun tayyor ma'lumotlar. Pul maydonlari faqat tasdiqlangan hujjatda backenddan keladi.
  function qatorMalumoti(qaytarish: QaytarishTuri) {
    const holat = qaytarishHolati(qaytarish);
    const bogliqSotuv = qaytarish.sale ?? sotuvlar.find((item) => item.id === qaytarish.saleId) ?? { id: qaytarish.saleId };
    const sotuvTopildi = sotuvlar.find((item) => item.id === qaytarish.saleId);
    const tasdiqlangan = holat === "CONFIRMED";
    const qaytarilgan = tasdiqlangan ? raqamga(qaytarish.refundAmount) : null;
    const qarzdanAyrilgan = tasdiqlangan ? raqamga(qaytarish.debtReduction) : null;
    // Hozircha hujjat bo'yicha "qaytarishdan keyingi qarz" saqlanmaydi: sotuvning joriy qarzi ko'rsatiladi.
    const qolganQarz = tasdiqlangan && sotuvTopildi ? sotuvQarzdorlikSummasi(sotuvTopildi) : null;
    return {
      holat,
      raqam: qaytarishRaqami(qaytarish),
      sotuvRaqami: sotuvRaqami(bogliqSotuv),
      mijoz: mijozNomi(bogliqSotuv),
      tovarQiymati: qaytarishSummasi(qaytarish),
      qaytarilgan,
      qarzdanAyrilgan,
      qolganQarz,
    };
  }

  const pul = (qiymat: number | null) => (qiymat === null ? "—" : pulniFormatlash(qiymat));

  if (yangiOchiq) {
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="savdo-section-title">{tq("wizard.pageTitle")}</h1>
            <p className="mt-1 text-sm text-slate-500">{tq("wizard.pageHint")}</p>
          </div>
          <button
            type="button"
            onClick={() => setYangiOchiq(false)}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} aria-hidden /> {tq("list.backToList")}
          </button>
        </header>
        <QaytarishWizard
          sotuvlar={sotuvlar}
          qaytarishlar={qaytarishlar}
          boshlangichSotuvId={boshlangichSotuvId}
          onSotuvTafsilotiniOlish={onSotuvTafsilotiniOlish}
          onYaratish={onYaratish}
          onTasdiqlash={onTasdiqlash}
          onTafsilotiniOlish={qaytarishTafsilotiniYuklash}
          onHujjatniKorish={setTanlanganId}
          onYopish={() => setYangiOchiq(false)}
        />
        {tanlanganId && <QaytarishTafsilotlariModal qaytarishId={tanlanganId} onYopish={() => setTanlanganId(null)} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="savdo-section-title">{t("qaytarish.sarlavha")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("qaytarish.tavsif")}</p>
        </div>
        <button
          type="button"
          onClick={() => setYangiOchiq(true)}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 motion-reduce:transition-none"
        >
          <Plus size={17} aria-hidden /> {tq("list.newReturn")}
        </button>
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

      {/* Planshet va kompyuter: jadval */}
      <div className="hidden overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_14px_38px_rgba(37,99,235,.06)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4">{tq("list.columns.number")}</th>
                <th className="px-4 py-4">{tq("list.columns.customer")}</th>
                <th className="px-4 py-4">{tq("list.columns.sale")}</th>
                <th className="px-4 py-4 text-right">{tq("list.columns.goodsValue")}</th>
                <th className="px-4 py-4 text-right">{tq("list.columns.refunded")}</th>
                <th className="px-4 py-4 text-right">{tq("list.columns.debtReduced")}</th>
                <th className="px-4 py-4 text-right" title={tq("list.remainingDebtHint")}>{tq("list.columns.remainingDebt")}</th>
                <th className="px-4 py-4">{tq("list.columns.status")}</th>
                <th className="px-4 py-4">{tq("list.columns.date")}</th>
                <th className="w-20 px-4 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/70">
              {visibleRows.map((qaytarish) => {
                const q = qatorMalumoti(qaytarish);
                return (
                  <tr key={qaytarish.id} onClick={() => setTanlanganId(qaytarish.id)} className="cursor-pointer transition hover:bg-orange-50/60">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">
                          <Undo2 size={18} />
                        </span>
                        <span className="font-black tabular-nums text-slate-900">{q.raqam}</span>
                      </div>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-4 font-semibold text-slate-700">{q.mijoz}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-800">{q.sotuvRaqami}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-black tabular-nums text-slate-900">{pulniFormatlash(q.tovarQiymati)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-bold tabular-nums text-orange-700">{pul(q.qaytarilgan)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-bold tabular-nums text-emerald-700">{pul(q.qarzdanAyrilgan)}</td>
                    <td className={`whitespace-nowrap px-4 py-4 text-right font-bold tabular-nums ${q.qolganQarz ? "text-rose-600" : "text-slate-600"}`}>{pul(q.qolganQarz)}</td>
                    <td className="px-4 py-4"><Holat holat={q.holat} /></td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">{sananiFormatlash(qaytarish.createdAt)}</td>
                    <td className="px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                      <HujjatOchirish
                        guruh="savdo"
                        status={qaytarish.status ?? "DRAFT"}
                        nom={q.raqam}
                        onTasdiq={() => onOchirish(qaytarish.id)}
                        onTiklash={() => onTiklash(qaytarish.id)}
                      />
                    </td>
                  </tr>
                );
              })}
              {yuklanmoqda && qaytarishlar.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-0">
                    <JadvalYuklanmoqda ikonka={<RotateCcw size={24} />} />
                  </td>
                </tr>
              )}
              {!yuklanmoqda && qaytarishlar.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <Undo2 className="mx-auto text-orange-200" size={40} />
                    <p className="mt-3 font-semibold text-gray-400">{t("qaytarish.emptyList")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Telefon: kartalar */}
      <ul className="space-y-3 md:hidden">
        {visibleRows.map((qaytarish) => {
          const q = qatorMalumoti(qaytarish);
          return (
            <li key={qaytarish.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setTanlanganId(qaytarish.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setTanlanganId(qaytarish.id); } }}
                className="cursor-pointer rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition active:bg-orange-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black tabular-nums text-slate-900">{q.raqam}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-600">{q.mijoz} · {q.sotuvRaqami}</p>
                    <p className="text-xs font-medium tabular-nums text-slate-400">{sananiFormatlash(qaytarish.createdAt)}</p>
                  </div>
                  <Holat holat={q.holat} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-dashed border-slate-200 pt-3 text-xs">
                  {[
                    { nom: tq("list.columns.goodsValue"), qiymat: pulniFormatlash(q.tovarQiymati), rang: "text-slate-900" },
                    { nom: tq("list.columns.refunded"), qiymat: pul(q.qaytarilgan), rang: "text-orange-700" },
                    { nom: tq("list.columns.debtReduced"), qiymat: pul(q.qarzdanAyrilgan), rang: "text-emerald-700" },
                    { nom: tq("list.columns.remainingDebt"), qiymat: pul(q.qolganQarz), rang: q.qolganQarz ? "text-rose-600" : "text-slate-600" },
                  ].map((satr) => (
                    <div key={satr.nom} className="min-w-0">
                      <dt className="text-[11px] font-semibold text-slate-400">{satr.nom}</dt>
                      <dd className={`mt-0.5 truncate text-[13px] font-extrabold tabular-nums ${satr.rang}`}>{satr.qiymat}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex justify-end" onClick={(event) => event.stopPropagation()}>
                  <HujjatOchirish
                    guruh="savdo"
                    status={qaytarish.status ?? "DRAFT"}
                    nom={q.raqam}
                    onTasdiq={() => onOchirish(qaytarish.id)}
                    onTiklash={() => onTiklash(qaytarish.id)}
                  />
                </div>
              </div>
            </li>
          );
        })}
        {yuklanmoqda && qaytarishlar.length === 0 && (
          <li className="overflow-hidden rounded-[22px] border border-slate-200 bg-white"><JadvalYuklanmoqda ikonka={<RotateCcw size={24} />} /></li>
        )}
        {!yuklanmoqda && qaytarishlar.length === 0 && (
          <li className="rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <Undo2 className="mx-auto text-orange-200" size={40} />
            <p className="mt-3 font-semibold text-gray-400">{t("qaytarish.emptyList")}</p>
          </li>
        )}
      </ul>

      <TablePagination page={page} pageSize={pageSize} totalItems={qaytarishlar.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      {tanlanganId && <QaytarishTafsilotlariModal qaytarishId={tanlanganId} onYopish={() => setTanlanganId(null)} />}
    </div>
  );
}
