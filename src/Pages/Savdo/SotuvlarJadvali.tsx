import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReceiptText, RotateCcw, UserRound } from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import HujjatOchirish from "@/Components/common/HujjatOchirish";
import type { Qaytarish, Sotuv, TolovTuri } from "@/types/savdo";
import {
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sotuvChegirmaSummasi,
  sotuvHolati,
  sotuvJadvalId,
  sotuvMahsulotiId,
  sotuvMahsulotiMiqdori,
  sotuvQarzdorlikSummasi,
  sotuvRaqami,
  sotuvSummasi,
  sotuvTolanganSummasi,
} from "./savdoYordamchilari";

type SotuvlarJadvaliProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
  qaytarishlar?: Qaytarish[];
  onQaytarish?: (sotuv: Sotuv) => void;
  onOchirish?: (sotuvId: string) => Promise<boolean>;
  onTiklash?: (sotuvId: string) => Promise<boolean>;
  tarixKorinish?: boolean;
  boshMatn?: string;
  // Berilsa, sotuvlar serverdan sahifalab keladi: jadval ularni qayta bo'lmaydi, sahifalash serverniki bo'ladi.
  serverSahifalash?: {
    page: number;
    pageSize: number;
    total: number;
    yuklanmoqda?: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
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

const sotuvHolatiStili = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-100",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  CANCELLED: "bg-red-50 text-red-600 ring-red-100",
} as const;

function boshHarflar(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((qism) => qism[0]?.toUpperCase())
    .join("");
}

// Ism boshlanishidagi dumaloq belgi (mijoz yoki mas'ul shaxs uchun).
function Avatar({ nom, bosh }: { nom: string; bosh?: boolean }) {
  const harflar = bosh ? "" : boshHarflar(nom);
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[11px] font-black text-[#2563EB] ring-1 ring-orange-100">
      {harflar || <UserRound size={15} />}
    </span>
  );
}

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
  onOchirish,
  onTiklash,
  tarixKorinish = false,
  boshMatn,
  serverSahifalash,
}: SotuvlarJadvaliProps) {
  const { t } = useTranslation("savdo_kichik");
  const effectiveBoshMatn = boshMatn ?? t("sotuvlarJadvali.boshMatn");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [sotuvlar, pageSize]);

  const visibleRows = useMemo(
    () => (serverSahifalash ? sotuvlar : sotuvlar.slice((currentPage - 1) * pageSize, currentPage * pageSize)),
    [currentPage, pageSize, serverSahifalash, sotuvlar]
  );

  return (
    <div className="px-5 pb-6 sm:px-10 sm:pb-10">
      <div className={`overflow-x-auto transition-opacity ${serverSahifalash?.yuklanmoqda ? "opacity-50" : ""}`}>
        <table className={`w-full border-collapse text-left text-sm ${tarixKorinish ? "min-w-[1280px]" : "min-w-[1220px]"}`}>
          <thead className="text-[13px] font-medium text-slate-500">
            <tr>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.savdoRaqami")}</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.mijozNomi")}</th>
              {tarixKorinish && (
                <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.tolovTuri")}</th>
              )}
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.summa")}</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.chegirma")}</th>
              {!tarixKorinish && (
                <>
                  <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.tolov")}</th>
                  <th className="border-b border-gray-200 px-4 py-3 font-medium">{t("sotuvlarJadvali.columns.holat")}</th>
                </>
              )}
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
              {!tarixKorinish && onOchirish && <th className="w-16 border-b border-gray-200 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="text-[13px] text-[#4B4B4B]">
            {visibleRows.map((sotuv) => {
              const sana = sanaVaVaqt(sotuv.createdAt);
              const stat = qaytarishStatistikasi(sotuv, qaytarishlar);
              const paymentType = sotuv.payments?.[0]?.paymentType;
              const holat = sotuvHolati(sotuv);
              const jami = sotuvSummasi(sotuv);
              const chegirma = sotuvChegirmaSummasi(sotuv);
              const tolangan = sotuvTolanganSummasi(sotuv);
              const tolanganFoiz = jami > 0 ? Math.min(100, Math.round((tolangan / jami) * 100)) : 0;
              const qarz = sotuvQarzdorlikSummasi(sotuv);
              const tolovToliq = jami > 0 && qarz <= 0;
              const mijoz = mijozNomi(sotuv);
              const mijozYoq = !sotuv.customer && !sotuv.clientCompany;
              const masul = masulNomi(sotuv);

              return (
                <tr
                  key={sotuv.id}
                  onClick={() => onSotuvniOchish(sotuv)}
                  className="cursor-pointer transition hover:bg-orange-50/45"
                  title={t("sotuvlarJadvali.rowTitle", { raqam: sotuvRaqami(sotuv) })}
                >
                  <td className="border-b border-gray-100 px-4 py-3.5 font-bold tabular-nums text-slate-900">
                    {sotuvJadvalId(sotuv)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5 font-medium">
                    {tarixKorinish ? (
                      mijoz
                    ) : (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar nom={mijoz} bosh={mijozYoq} />
                        <span className="truncate">{mijoz}</span>
                      </span>
                    )}
                  </td>
                  {tarixKorinish && (
                    <td className="border-b border-gray-100 px-4 py-3.5">
                      {paymentType ? t(tolovTuriKaliti[paymentType]) : "-"}
                    </td>
                  )}
                  <td className="whitespace-nowrap border-b border-gray-100 px-4 py-3.5 font-semibold text-emerald-700">
                    {pulniFormatlash(jami)}
                  </td>
                  <td className="whitespace-nowrap border-b border-gray-100 px-4 py-3.5 font-semibold tabular-nums">
                    {chegirma > 0 ? (
                      <span className="text-lime-700">{pulniFormatlash(chegirma)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {!tarixKorinish && (
                    <>
                      <td className="border-b border-gray-100 px-4 py-3.5">
                        {holat === "CANCELLED" ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="w-36">
                            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                              <span className={tolovToliq ? "text-emerald-600" : tolangan > 0 ? "text-[#2563EB]" : "text-slate-400"}>
                                {tolovToliq
                                  ? t("sotuvlarJadvali.tolovHolati.toliq")
                                  : tolangan > 0
                                    ? t("sotuvlarJadvali.tolovHolati.qisman")
                                    : t("sotuvlarJadvali.tolovHolati.yoq")}
                              </span>
                              <span className="tabular-nums text-slate-400">{tolanganFoiz}%</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${tolovToliq ? "bg-emerald-500" : "bg-[#2563EB]"}`}
                                style={{ width: `${tolanganFoiz}%` }}
                              />
                            </div>
                            {holat === "CONFIRMED" && qarz > 0 && (
                              <p className="mt-1.5 whitespace-nowrap text-[11px] font-bold text-rose-500">
                                {t("sotuvlarJadvali.qarzSummasi", { summa: pulniFormatlash(qarz) })}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3.5">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${sotuvHolatiStili[holat]}`}>
                          {t(`sotuvlarJadvali.sotuvHolatlari.${holat}`)}
                        </span>
                      </td>
                    </>
                  )}
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
                    {tarixKorinish ? (
                      masul
                    ) : (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar nom={masul} bosh={masul === "-"} />
                        <span className="truncate">{masul}</span>
                      </span>
                    )}
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
                  {!tarixKorinish && onOchirish && (
                    <td className="border-b border-gray-100 px-4 py-3.5 text-right align-middle">
                      <HujjatOchirish
                        guruh="savdo"
                        status={sotuv.status}
                        nom={`#${sotuvRaqami(sotuv)}`}
                        onTasdiq={() => onOchirish(sotuv.id)}
                        onTiklash={onTiklash ? () => onTiklash(sotuv.id) : undefined}
                      />
                    </td>
                  )}
                </tr>
              );
            })}

            {sotuvlar.length === 0 && (
              <tr>
                <td colSpan={tarixKorinish ? 11 : onOchirish ? 10 : 9} className="px-6 py-20 text-center">
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

      {serverSahifalash ? (
        <TablePagination
          page={serverSahifalash.page}
          pageSize={serverSahifalash.pageSize}
          totalItems={serverSahifalash.total}
          onPageChange={serverSahifalash.onPageChange}
          onPageSizeChange={serverSahifalash.onPageSizeChange}
        />
      ) : (
        <TablePagination page={currentPage} pageSize={pageSize} totalItems={sotuvlar.length} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  );
}
