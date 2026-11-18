import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, LoaderCircle, PenLine, RotateCcw, Truck, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import HisobotHavolasi from "@/Components/common/HisobotHavolasi";
import HujjatOchirish from "@/Components/common/HujjatOchirish";
import NegativeStockBadge from "@/Components/common/NegativeStockBadge";
import SmartTable from "@/Components/common/smart-table/SmartTable";
import { KiritilganBelgisi } from "@/Components/common/HujjatSanasi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { taminotchiQaytarishApi } from "@/api/taminotchiQaytarishApi";
import { useHisobotQatori } from "@/hooks/useHisobotQatori";
import { useHujjatniBekorQilishMumkinmi, useHujjatniOchirishMumkinmi } from "@/hooks/useHujjatniOchirishMumkinmi";
import type { HujjatHisobotManbasi, HujjatQatoriTanlovi } from "@/lib/hujjatQatoriTanlovi";
import { qaytarishHolati } from "@/lib/taminotchiQaytarish";
import { valyutaKodi } from "@/lib/valyuta";
import { useOmborStore } from "@/store/omborStore";
import type { TaminotchiQaytarishHujjati } from "@/types/taminotchiQaytarish";
import InventoryDocumentActivity from "../InventoryDocumentActivity";
import { hujjatRaqami, pul, sana } from "../omborYordamchilari";
import HolatBelgisi from "./HolatBelgisi";
import QaytarishOynasi from "./QaytarishOynasi";
import { qatorNomi, yetkazibBeruvchiNomi } from "./yordamchi";

type Props = { id: string; onClose: () => void; onOzgardi?: () => void; ajratilganQator?: HujjatQatoriTanlovi; hisobotManbasi?: HujjatHisobotManbasi };

export default function QaytarishTafsilot({ id, onClose, onOzgardi, ajratilganQator, hisobotManbasi }: Props) {
  const { t: tr } = useTranslation("ombor_royxat");
  const t = (kalit: string, parametrlar?: Record<string, unknown>) => tr(`taminotchiQaytarish.${kalit}`, parametrlar);
  const store = useOmborStore();
  const ajratish = useHisobotQatori(ajratilganQator);
  const tahrirMumkin = useHujjatniOchirishMumkinmi("ombor");
  const bekorMumkin = useHujjatniBekorQilishMumkinmi("ombor");
  const [hujjat, setHujjat] = useState<TaminotchiQaytarishHujjati | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");
  const [bekorTasdiq, setBekorTasdiq] = useState(false);
  const [tahrirOchiq, setTahrirOchiq] = useState(false);

  const yuklash = useCallback(async () => {
    try {
      const item = await taminotchiQaytarishApi.olish(id);
      setHujjat(item);
      return item;
    } catch (error) {
      setXato(getApiErrorMessage(error));
      return null;
    } finally {
      setYuklanmoqda(false);
    }
  }, [id]);
  useEffect(() => { void yuklash(); }, [yuklash]);

  const kirimRaqamlari = useMemo(() => new Map(store.kirimlar.map((kirim) => [kirim.id, hujjatRaqami(kirim)])), [store.kirimlar]);
  const holat = qaytarishHolati(hujjat?.status);
  const valyuta = valyutaKodi(hujjat?.currency ?? undefined);
  const qatorlar = hujjat?.items ?? [];

  async function bajar(ish: () => Promise<TaminotchiQaytarishHujjati>) {
    setBand(true);
    setXato("");
    try {
      // NEGATIVE_STOCK ogohlantirishlari (javobdagi `warnings`) umumiy toast bilan chiqadi (lib/negativeStock); qatorda — belgi.
      await ish();
      await yuklash();
      onOzgardi?.();
      return true;
    } catch (error) {
      setXato(getApiErrorMessage(error));
      return false;
    } finally {
      setBand(false);
    }
  }

  if (tahrirOchiq && hujjat) {
    // Yopilganda ham qayta yuklanadi: saqlangan-u tasdiqlanmagan tahrir eski ko'rinishda qolmasin.
    const yangilash = () => { setTahrirOchiq(false); void yuklash(); onOzgardi?.(); };
    return <QaytarishOynasi tahrir={hujjat} onClose={yangilash} onSaqlandi={yangilash} />;
  }

  return (
    <AppModal onClose={onClose} className="sidebar-aligned-document-modal items-stretch p-3 sm:p-5">
      <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-[34px] border border-orange-100 bg-[#F8FAFC] shadow-[0_28px_90px_rgba(15,23,42,.34)]">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-orange-100 bg-white/80 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 ring-1 ring-orange-100 sm:flex"><Undo2 size={22} /></span>
            <h2 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{hujjat?.docNumber?.trim() ? t("viewTitle", { number: hujjat.docNumber }) : t("viewTitleDraft")}</h2>
            {hujjat && <HolatBelgisi status={hujjat.status} />}
          </div>
          {hujjat && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {holat === "DRAFT" && tahrirMumkin && <button type="button" disabled={band} onClick={() => setTahrirOchiq(true)} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 text-sm font-black text-orange-600 hover:bg-orange-50 disabled:opacity-50"><PenLine size={17} />{t("edit")}</button>}
              {holat === "DRAFT" && tahrirMumkin && <button type="button" disabled={band} onClick={() => void bajar(() => taminotchiQaytarishApi.tasdiqlash(id))} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-100 disabled:opacity-50">{band ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={18} />}{t("confirm")}</button>}
              {holat === "CONFIRMED" && bekorMumkin && <button type="button" disabled={band} onClick={() => setBekorTasdiq(true)} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-700 px-5 text-sm font-black text-white shadow-lg disabled:opacity-50"><RotateCcw size={18} />{t("cancelDocument")}</button>}
            </div>
          )}
        </header>
        <HisobotHavolasi manba={hisobotManbasi} />

        {yuklanmoqda ? (
          <div className="flex flex-1 items-center justify-center"><LoaderCircle size={36} className="animate-spin text-orange-500" /></div>
        ) : !hujjat ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center font-bold text-slate-500">{xato || t("loadError")}</div>
        ) : (
          <div className="scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-8">
            {xato && (
              <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
                {xato}
              </div>
            )}

            <div className="grid items-start gap-5 xl:grid-cols-2">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Truck size={18} />} text={t("aboutSection")} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Plitka nom={t("totalAmount")} qiymat={pul(Number(hujjat.total) || 0, valyuta)} asosiy izoh={t("totalViewHint")} />
                  <Plitka nom={t("costTotal")} qiymat={hujjat.costTotal != null ? pul(Number(hujjat.costTotal) || 0, valyuta) : "—"} izoh={holat === "CONFIRMED" ? t("costHint") : t("costDraftHint")} />
                  <Plitka nom={t("costDifference")} qiymat={hujjat.costDifference != null ? <FarqMatni qiymat={Number(hujjat.costDifference) || 0} valyuta={valyuta} /> : "—"} izoh={t("differenceHint")} />
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Info label={t("fields.supplier")} value={yetkazibBeruvchiNomi(hujjat, store.yetkazibBeruvchilar) || "—"} />
                  <div>
                    <Info label={t("fields.date")} value={sana(hujjat.date ?? hujjat.createdAt ?? undefined)} />
                    <KiritilganBelgisi date={hujjat.date ?? undefined} createdAt={hujjat.createdAt ?? undefined} className="mt-1" />
                  </div>
                  <Info label={t("fields.currency")} value={valyuta} />
                  <Info label={t("fields.lines")} value={String(qatorlar.length)} />
                  {hujjat.note?.trim() && <Info label={t("fields.note")} value={hujjat.note} className="sm:col-span-2" />}
                </dl>
              </section>
              <InventoryDocumentActivity documentType="SUPPLIER_RETURN" documentId={hujjat.id} />
            </div>

            <section className="rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
              <SectionTitle icon={<Undo2 size={18} />} text={t("itemsSection")} />
              <div className="overflow-x-auto rounded-[22px] border border-orange-100">
                <SmartTable tableId="Ombor/TaminotchiQaytarishTafsilot/table-1" replaceColumnControls><table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th data-column-id="n" className="px-4 py-4">№</th>
                      <th data-column-id="mahsulot" className="px-4 py-4">{t("fields.product")}</th>
                      <th data-column-id="ombor" className="px-4 py-4">{t("fields.warehouse")}</th>
                      <th data-column-id="kirim" className="px-4 py-4">{t("fields.purchase")}</th>
                      <th data-column-id="miqdor" className="px-4 py-4 text-right">{t("fields.quantity")}</th>
                      <th data-column-id="narx" className="px-4 py-4 text-right">{t("fields.price")}</th>
                      <th data-column-id="summa" className="px-4 py-4 text-right">{t("fields.amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {qatorlar.map((item, indeks) => (
                      <tr {...ajratish(item)} key={item.id ?? `${item.modificationId}-${indeks}`}>
                        <td className="px-4 py-4 font-bold text-slate-400">{indeks + 1}</td>
                        <td className="px-4 py-4 font-black text-slate-800">{qatorNomi(item) || "—"}<NegativeStockBadge wentNegative={item.wentNegative} /></td>
                        <td className="px-4 py-4 text-slate-600">{item.warehouseName || store.omborlar.find((ombor) => ombor.id === item.warehouseId)?.name || "—"}</td>
                        <td className="px-4 py-4 text-slate-600">{item.purchaseId ? kirimRaqamlari.get(item.purchaseId) || t("fields.savedPurchase") : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-700">{(Number(item.quantity) || 0).toLocaleString("uz-UZ", { maximumFractionDigits: 3 })}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-600">{pul(Number(item.price) || 0, valyuta)}</td>
                        <td className="px-4 py-4 text-right font-black text-emerald-600">{pul((Number(item.quantity) || 0) * (Number(item.price) || 0), valyuta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></SmartTable>
                {qatorlar.length === 0 && <div className="p-10 text-center text-sm font-bold text-slate-400">{t("emptyItems")}</div>}
              </div>
            </section>

            <div className="flex justify-end empty:hidden">
              <HujjatOchirish
                korinish="tugma"
                guruh="ombor"
                status={hujjat.status}
                nom={hujjatRaqami(hujjat)}
                onTasdiq={async () => { await taminotchiQaytarishApi.ochirish(hujjat.id); onOzgardi?.(); return true; }}
                onTiklash={async () => { await taminotchiQaytarishApi.tiklash(hujjat.id); onOzgardi?.(); return true; }}
                onOchirildi={onClose}
                onTiklandi={() => void yuklash()}
              />
            </div>
          </div>
        )}

        {bekorTasdiq && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[26px] bg-white p-6 shadow-2xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500"><RotateCcw size={21} /></div>
              <h3 className="mt-4 text-center text-lg font-black text-slate-950">{t("cancelConfirm.title")}</h3>
              <p className="mt-2 text-center text-sm text-slate-500">{t("cancelConfirm.description")}</p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setBekorTasdiq(false)} className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">{t("cancelConfirm.no")}</button>
                <button type="button" disabled={band} onClick={() => void bajar(() => taminotchiQaytarishApi.bekorQilish(id)).then(() => setBekorTasdiq(false))} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white disabled:opacity-50">{band && <LoaderCircle size={16} className="animate-spin" />}{t("cancelConfirm.yes")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}

function SectionTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600"><span className="text-orange-500">{icon}</span>{text}</div>;
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={className}><dt className="text-sm font-bold text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-line font-black text-slate-800">{value}</dd></div>;
}

function Plitka({ nom, qiymat, izoh, asosiy = false }: { nom: string; qiymat: ReactNode; izoh?: string; asosiy?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl px-4 py-4 ${asosiy ? "bg-orange-50" : "bg-slate-50 ring-1 ring-slate-100"}`}>
      <p className={`text-[11px] font-black uppercase tracking-wide ${asosiy ? "text-orange-600" : "text-slate-400"}`}>{nom}</p>
      <p className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">{qiymat}</p>
      {izoh && <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">{izoh}</p>}
    </div>
  );
}

function FarqMatni({ qiymat, valyuta }: { qiymat: number; valyuta: "UZS" | "USD" }) {
  const rang = qiymat > 0 ? "text-emerald-600" : qiymat < 0 ? "text-red-600" : "text-slate-500";
  return <span className={rang}>{qiymat > 0 ? "+" : ""}{pul(qiymat, valyuta)}</span>;
}
