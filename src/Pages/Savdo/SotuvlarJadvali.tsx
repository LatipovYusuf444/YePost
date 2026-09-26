import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReceiptText, RotateCcw } from "lucide-react";
import type { Qaytarish, Sotuv, TolovTuri } from "@/types/savdo";
import {
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sotuvJadvalId,
  sotuvMahsulotiId,
  sotuvMahsulotiMiqdori,
  sotuvRaqami,
  sotuvSummasi,
} from "./savdoYordamchilari";

type SotuvlarJadvaliProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
  qaytarishlar?: Qaytarish[];
  onQaytarish?: (sotuv: Sotuv) => void;
  tarixKorinish?: boolean;
  boshMatn?: string;
};

function telefonRaqam(sotuv: Sotuv) {
  // "Mas'ul shaxs" ustuniga mos — tizimga kirgan (sotuvni amalga oshirgan)
  // xodimning real telefon raqami, mijozning emas.
  return sotuv.responsible?.phone || "-";
}

function qaytarishTasdiqlangan(qaytarish: Qaytarish) {
  return String(qaytarish.status ?? "").toUpperCase() === "CONFIRMED";
}

type TarixHolat = "SOLD" | "PARTIALLY_RETURNED" | "FULLY_RETURNED";

function qaytarishStatistikasi(sotuv: Sotuv, qaytarishlar: Qaytarish[]) {
  const sotuvQaytarishlari = qaytarishlar.filter(
    (qaytarish) => qaytarish.saleId === sotuv.id && qaytarishTasdiqlangan(qaytarish)
  );
  const qaytarilganSumma = sotuvQaytarishlari.reduce(
    (summa, qaytarish) => summa + qaytarishSummasi(qaytarish),
    0
  );
  const items = sotuv.items ?? [];
  const jamiSotilgan = items.reduce(
    (summa, item) => summa + Math.max(sotuvMahsulotiMiqdori(item), 0),
    0
  );
  const jamiQaytarilgan = items.reduce((summa, item) => {
    const saleItemId = sotuvMahsulotiId(item);
    return (
      summa +
      sotuvQaytarishlari.reduce((qaytSumma, qaytarish) => {
        const itemSumma =
          qaytarish.items
            ?.filter((qaytItem) => qaytItem.saleItemId === saleItemId)
            .reduce((jami, qaytItem) => jami + Number(qaytItem.quantity ?? 0), 0) ?? 0;
        return qaytSumma + itemSumma;
      }, 0)
    );
  }, 0);

  const holat: TarixHolat =
    jamiSotilgan > 0 && jamiQaytarilgan >= jamiSotilgan
      ? "FULLY_RETURNED"
      : jamiQaytarilgan > 0 || qaytarilganSumma > 0
        ? "PARTIALLY_RETURNED"
        : "SOLD";

  return { holat, qaytarilganSumma };
}

const tarixHolatMatni = {
  SOLD: "sotuvlarJadvali.holatlar.SOLD",
  PARTIALLY_RETURNED: "sotuvlarJadvali.holatlar.PARTIALLY_RETURNED",
  FULLY_RETURNED: "sotuvlarJadvali.holatlar.FULLY_RETURNED",
} as const;

const tolovTuriKaliti: Record<TolovTuri, string> = {
  CASH: "sotuvlarJadvali.tolovTuri.CASH",
  CARD: "sotuvlarJadvali.tolovTuri.CARD",
  BANK: "sotuvlarJadvali.tolovTuri.BANK",
  DEBT: "sotuvlarJadvali.tolovTuri.DEBT",
};

const tarixHolatClass = {
  SOLD: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  PARTIALLY_RETURNED: "bg-amber-50 text-amber-700 ring-amber-100",
  FULLY_RETURNED: "bg-red-50 text-red-600 ring-red-100",
} as const;

function sanaVaVaqt(value?: string) {
  if (!value) return { sana: "-", vaqt: "" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { sana: value, vaqt: "" };

  return {
    sana: new Intl.DateTimeFormat("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    vaqt: new Intl.DateTimeFormat("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

export default function SotuvlarJadvali({
  sotuvlar,
  onSotuvniOchish,
  qaytarishlar = [],
  onQaytarish,
  tarixKorinish = false,
  boshMatn,
}: SotuvlarJadvaliProps) {
  const { t } = useTranslation("savdo_kichik");
  const effectiveBoshMatn = boshMatn ?? t("sotuvlarJadvali.boshMatn");
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(Math.ceil(sotuvlar.length / pageSize), 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [sotuvlar]);

  const visibleRows = useMemo(
    () => sotuvlar.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, sotuvlar]
  );

  return (
    <div className="px-10 pb-10">
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse text-left text-sm ${tarixKorinish ? "min-w-[1180px]" : "min-w-[900px]"}`}>
          <thead className="text-[13px] font-medium text-slate-500">
            <tr>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.savdoRaqami")}</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.mijozNomi")}</th>
              {tarixKorinish && (
                <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.tolovTuri")}</th>
              )}
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.summa")}</th>
              {tarixKorinish && (
                <>
                  <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.holati")}</th>
                  <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.qaytarilganSumma")}</th>
                </>
              )}
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.sana")}</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.masulShaxs")}</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.telefonRaqam")}</th>
              {tarixKorinish && (
                <th className="border-b border-gray-200 px-4 py-3 text-right font-medium">{t("sotuvlarJadvali.columns.amallar")}</th>
              )}
            </tr>
          </thead>
          <tbody className="text-[13px] text-[#4B4B4B]">
            {visibleRows.map((sotuv) => {
              const sana = sanaVaVaqt(sotuv.createdAt);
              const stat = qaytarishStatistikasi(sotuv, qaytarishlar);
              const paymentType = sotuv.payments?.[0]?.paymentType;

              return (
                <tr
                  key={sotuv.id}
                  onClick={() => onSotuvniOchish(sotuv)}
                  className="cursor-pointer transition hover:bg-orange-50/45"
                  title={t("sotuvlarJadvali.rowTitle", { raqam: sotuvRaqami(sotuv) })}
                >
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    {sotuvJadvalId(sotuv)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5 font-medium">
                    {mijozNomi(sotuv)}
                  </td>
                  {tarixKorinish && (
                    <td className="border-b border-gray-100 px-4 py-3.5">
                      {paymentType ? t(tolovTuriKaliti[paymentType]) : "-"}
                    </td>
                  )}
                  <td className="border-b border-gray-100 px-4 py-3.5 font-semibold text-emerald-700">
                    {pulniFormatlash(sotuvSummasi(sotuv))}
                  </td>
                  {tarixKorinish && (
                    <>
                      <td className="border-b border-gray-100 px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${tarixHolatClass[stat.holat]}`}>
                          {t(tarixHolatMatni[stat.holat])}
                        </span>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3.5 font-semibold text-slate-900">
                        {pulniFormatlash(stat.qaytarilganSumma)}
                      </td>
                    </>
                  )}
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    <span className="block">{sana.sana}</span>
                    {sana.vaqt && (
                      <span className="mt-0.5 block text-[10px] text-[#4B4B4B]">
                        {sana.vaqt}
                      </span>
                    )}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    {masulNomi(sotuv)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    {telefonRaqam(sotuv)}
                  </td>
                  {tarixKorinish && (
                    <td className="border-b border-gray-100 px-4 py-3.5 text-right align-middle">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          disabled={stat.holat === "FULLY_RETURNED" || !onQaytarish}
                          onClick={(event) => {
                            event.stopPropagation();
                            onQaytarish?.(sotuv);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <RotateCcw size={14} />
                          {t("sotuvlarJadvali.qaytarish")}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {sotuvlar.length === 0 && (
              <tr>
                <td colSpan={tarixKorinish ? 10 : 6} className="px-6 py-20 text-center">
                  <ReceiptText className="mx-auto text-orange-200" size={40} />
                  <p className="mt-3 font-semibold text-gray-500">{effectiveBoshMatn}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {t("sotuvlarJadvali.emptySubtitle")}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sotuvlar.length > pageSize && (
        <div className="table-pagination mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("sotuvlarJadvali.pagination.info", {
              jami: sotuvlar.length,
              dan: (currentPage - 1) * pageSize + 1,
              gacha: Math.min(currentPage * pageSize, sotuvlar.length),
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="h-9 rounded-lg border border-gray-200 px-3 font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("sotuvlarJadvali.pagination.oldingi")}
            </button>
            <span className="min-w-16 text-center font-semibold text-gray-700">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-9 rounded-lg border border-gray-200 px-3 font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("sotuvlarJadvali.pagination.keyingi")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
