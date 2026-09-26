import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import AppModal from "@/Components/common/AppModal";
import type {
  Qaytarish,
  QaytarishSababi,
  QaytarishToloviniQaytarishUsuli as RefundMethod,
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
  sotuvRaqami,
  sotuvSummasi,
  tolovTuriMatni,
} from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";

type MahsulotQaytarishModalProps = {
  sotuv: Sotuv;
  qaytarishlar: Qaytarish[];
  amalBajarilmoqda: boolean;
  onYopish: () => void;
  onYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<Qaytarish | null>;
  onTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  onMuvaffaqiyat: () => void;
};

type UiSabab =
  | "CUSTOMER_CHANGED_MIND"
  | "DEFECT"
  | "WRONG"
  | "OPERATOR_ERROR"
  | "OTHER";

function sababOptionsRoyxati(t: TFunction): Array<{ value: UiSabab; label: string }> {
  return [
    { value: "CUSTOMER_CHANGED_MIND", label: t("qaytarishModal.sababOptions.customerChangedMind") },
    { value: "DEFECT", label: t("qaytarishModal.sababOptions.defect") },
    { value: "WRONG", label: t("qaytarishModal.sababOptions.wrong") },
    { value: "OPERATOR_ERROR", label: t("qaytarishModal.sababOptions.operatorError") },
    { value: "OTHER", label: t("qaytarishModal.sababOptions.other") },
  ];
}

function refundOptionsRoyxati(t: TFunction): Array<{ value: RefundMethod; label: string }> {
  return [
    { value: "CASH", label: t("qaytarishModal.refundOptions.cash") },
    { value: "CARD", label: t("qaytarishModal.refundOptions.card") },
    { value: "BALANCE", label: t("qaytarishModal.refundOptions.balance") },
    { value: "NONE", label: t("qaytarishModal.refundOptions.none") },
  ];
}

const uiSababMatni: Record<UiSabab, string> = {
  CUSTOMER_CHANGED_MIND: "Xaridor fikridan qaytdi",
  DEFECT: "Mahsulot nuqsonli",
  WRONG: "Noto'g'ri sotilgan",
  OPERATOR_ERROR: "Operator xatosi",
  OTHER: "Boshqa",
};

function backendSabab(sabab: UiSabab): QaytarishSababi {
  if (sabab === "DEFECT") return "DEFECT";
  if (sabab === "WRONG" || sabab === "OPERATOR_ERROR") return "WRONG";
  return "OTHER";
}

function mahsulotNomi(item: NonNullable<Sotuv["items"]>[number], t: TFunction) {
  return (
    item.modification?.product?.name ||
    item.modification?.name ||
    sotuvMahsulotiModifikatsiyaId(item) ||
    t("qaytarishModal.table.productFallback")
  );
}

function qaytarishHolati(qaytarish: Qaytarish) {
  return String(qaytarish.status ?? "").toUpperCase();
}

export default function MahsulotQaytarishModal({
  sotuv,
  qaytarishlar,
  amalBajarilmoqda,
  onYopish,
  onYaratish,
  onTasdiqlash,
  onMuvaffaqiyat,
}: MahsulotQaytarishModalProps) {
  const { t } = useTranslation("savdo_tolov");
  const [sabab, setSabab] = useState<UiSabab>("CUSTOMER_CHANGED_MIND");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("CASH");
  const [note, setNote] = useState("");
  const [xatolik, setXatolik] = useState("");
  const [miqdorlar, setMiqdorlar] = useState<Record<string, string>>({});

  const sababOptions = useMemo(() => sababOptionsRoyxati(t), [t]);
  const refundOptions = useMemo(() => refundOptionsRoyxati(t), [t]);

  const sotuvQaytarishlari = useMemo(
    () =>
      qaytarishlar.filter(
        (qaytarish) =>
          qaytarish.saleId === sotuv.id && qaytarishHolati(qaytarish) === "CONFIRMED"
      ),
    [qaytarishlar, sotuv.id]
  );

  const qatorlar = useMemo(
    () =>
      (sotuv.items ?? []).map((item) => {
        const saleItemId = sotuvMahsulotiId(item);
        const narx = sotuvMahsulotiNarxi(item);
        const sotilgan = sotuvMahsulotiMiqdori(item);
        const oldinQaytarilgan = sotuvQaytarishlari.reduce((summa, qaytarish) => {
          const mos = qaytarish.items?.filter((qaytItem) => qaytItem.saleItemId === saleItemId) ?? [];
          return summa + mos.reduce((jami, qaytItem) => jami + Number(qaytItem.quantity ?? 0), 0);
        }, 0);
        const qolgan = Math.max(sotilgan - oldinQaytarilgan, 0);
        const tanlangan = Number(miqdorlar[saleItemId] ?? 0);

        return {
          item,
          saleItemId,
          modificationId: sotuvMahsulotiModifikatsiyaId(item),
          nomi: mahsulotNomi(item, t),
          sotilgan,
          oldinQaytarilgan,
          qolgan,
          narx,
          tanlangan: Number.isFinite(tanlangan) ? tanlangan : 0,
        };
      }),
    [miqdorlar, sotuv.items, sotuvQaytarishlari, t]
  );

  const qaytariladiganSumma = qatorlar.reduce(
    (summa, qator) => summa + qator.tanlangan * qator.narx,
    0
  );
  const jamiQaytarilgan = sotuvQaytarishlari.reduce(
    (summa, qaytarish) => summa + qaytarishSummasi(qaytarish),
    0
  );
  const paymentType = sotuv.payments?.[0]?.paymentType;
  const warehouseId = sotuv.warehouseId ?? sotuv.warehouse?.id ?? "";

  function miqdorniOzgarish(saleItemId: string, value: string) {
    setMiqdorlar((current) => ({ ...current, [saleItemId]: value }));
  }

  async function submit() {
    setXatolik("");

    if (!warehouseId) {
      setXatolik("qaytarishModal.errors.warehouseMissing");
      return;
    }

    if (sabab === "OTHER" && note.trim().length < 3) {
      setXatolik("qaytarishModal.errors.noteRequired");
      return;
    }

    const items = qatorlar
      .filter((qator) => qator.tanlangan > 0)
      .map((qator) => ({
        saleItemId: qator.saleItemId,
        modificationId: qator.modificationId,
        quantity: qator.tanlangan,
        price: qator.narx,
        qolgan: qator.qolgan,
      }));

    if (items.length === 0) {
      setXatolik("qaytarishModal.errors.noItemsSelected");
      return;
    }

    const notogriQator = items.find(
      (item) =>
        !item.saleItemId ||
        !item.modificationId ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > item.qolgan
    );

    if (notogriQator) {
      setXatolik("qaytarishModal.errors.exceedsRemaining");
      return;
    }

    const qaytarish = await onYaratish({
      saleId: sotuv.id,
      warehouseId,
      responsibleId: sotuv.responsibleId,
      reason: backendSabab(sabab),
      restock: true,
      refundMethod,
      note: [`Sabab: ${uiSababMatni[sabab]}`, note.trim()].filter(Boolean).join(" | "),
      items: items.map((item) => ({
        saleItemId: item.saleItemId,
        modificationId: item.modificationId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    if (!qaytarish) return;

    const tasdiqlandi = await onTasdiqlash(qaytarish.id);
    if (!tasdiqlandi) return;

    onMuvaffaqiyat();
    onYopish();
  }

  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="scrollbar-hidden h-[calc(100vh-32px)] w-[calc(100vw-104px)] overflow-y-auto rounded-[34px] border border-orange-100 bg-[#F8FAFC] shadow-[0_30px_90px_rgba(15,23,42,.25)]">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-orange-100 bg-[#F8FAFC]/95 px-11 py-7 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
              {t("qaytarishModal.eyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{sotuvRaqami(sotuv)}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {mijozNomi(sotuv)} · {sananiFormatlash(sotuv.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition hover:bg-orange-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-[calc(100vh-170px)] gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6 px-11 py-7">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard label={t("qaytarishModal.infoCards.tolovTuri")} value={paymentType ? tolovTuriMatni[paymentType] : "-"} />
              <InfoCard label={t("qaytarishModal.infoCards.sotuvJami")} value={pulniFormatlash(sotuvSummasi(sotuv))} />
              <InfoCard label={t("qaytarishModal.infoCards.oldinQaytarilgan")} value={pulniFormatlash(jamiQaytarilgan)} />
              <InfoCard label={t("qaytarishModal.infoCards.qaytariladigan")} value={pulniFormatlash(qaytariladiganSumma)} accent />
            </div>

            <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">{t("qaytarishModal.table.columns.mahsulot")}</th>
                      <th className="px-4 py-4">{t("qaytarishModal.table.columns.sotilgan")}</th>
                      <th className="px-4 py-4">{t("qaytarishModal.table.columns.oldinQaytarilgan")}</th>
                      <th className="px-4 py-4">{t("qaytarishModal.table.columns.qaytarishMumkin")}</th>
                      <th className="px-4 py-4">{t("qaytarishModal.table.columns.narxi")}</th>
                      <th className="px-4 py-4">{t("qaytarishModal.table.columns.qaytariladiganSon")}</th>
                      <th className="px-4 py-4">{t("qaytarishModal.table.columns.ombor")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100/70 text-slate-700">
                    {qatorlar.map((qator) => (
                      <tr key={qator.saleItemId || qator.modificationId} className="hover:bg-orange-50/35">
                        <td className="px-5 py-4 font-black text-slate-800">{qator.nomi}</td>
                        <td className="px-4 py-4">{qator.sotilgan}</td>
                        <td className="px-4 py-4">{qator.oldinQaytarilgan}</td>
                        <td className="px-4 py-4 font-bold text-emerald-700">{qator.qolgan}</td>
                        <td className="px-4 py-4">{pulniFormatlash(qator.narx)}</td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            max={qator.qolgan}
                            step="1"
                            disabled={qator.qolgan <= 0 || amalBajarilmoqda}
                            value={miqdorlar[qator.saleItemId] ?? ""}
                            onChange={(event) => miqdorniOzgarish(qator.saleItemId, event.target.value)}
                            className="h-10 w-28 rounded-xl border border-orange-100 bg-white px-3 font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-gray-50 disabled:text-gray-400"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                            <input type="checkbox" checked disabled className="h-4 w-4 accent-orange-500" />
                            {t("qaytarishModal.table.qaytadi")}
                          </label>
                        </td>
                      </tr>
                    ))}
                    {qatorlar.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center font-semibold text-slate-400">
                          {t("qaytarishModal.table.emptyRow")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-4 border-l border-orange-100 bg-white/75 p-6 shadow-[-18px_0_50px_rgba(37,99,235,.06)]">
            <div className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-orange-700">
              {t("qaytarishModal.sidebar.infoNote")}
            </div>
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>{t("qaytarishModal.sidebar.sababLabel")}</span>
              <SavdoSelect
                value={sabab}
                onChange={(value) => setSabab(value as UiSabab)}
                options={sababOptions}
                portal
                buttonClassName="h-12 rounded-2xl"
              />
            </label>
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>{t("qaytarishModal.sidebar.refundLabel")}</span>
              <SavdoSelect
                value={refundMethod}
                onChange={(value) => setRefundMethod(value as RefundMethod)}
                options={refundOptions}
                portal
                buttonClassName="h-12 rounded-2xl"
              />
            </label>
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>{t("qaytarishModal.sidebar.noteLabel")}</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-orange-100 bg-white p-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder={t("qaytarishModal.sidebar.notePlaceholder")}
              />
            </label>

            {xatolik && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{t(xatolik)}</span>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={amalBajarilmoqda || qatorlar.length === 0}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {amalBajarilmoqda ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <RotateCcw size={18} />
              )}
              {t("qaytarishModal.sidebar.submitButton")}
            </button>
            <div className="flex items-start gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{t("qaytarishModal.sidebar.submitHint")}</span>
            </div>
          </aside>
        </div>
      </div>
    </AppModal>
  );
}

function InfoCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-black ${accent ? "text-orange-600" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}
