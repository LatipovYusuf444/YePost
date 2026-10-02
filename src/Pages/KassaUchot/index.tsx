import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Landmark,
  Plus,
  Search,
  Smartphone,
  LoaderCircle,
  Trash2,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { barchaFinanceTransactions } from "@/api/tolovApi";
import { cashOperationsApi } from "@/api/cashOperationsApi";
import { kassaKirimApi, xarajatApi } from "@/api/financeApi";
import { sotuvniBekorQilish, sotuvniOchirish } from "@/api/savdoApi";
import { foydalanuvchilarApi } from "@/api/accountsApi";
import { filiallarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { FinanceTransaction } from "@/types/tolov";
import type { TolovUsuli } from "@/types/finance";
import type { AccountFoydalanuvchi } from "@/types/account";
import type { Filial } from "@/types/ombor";
import type {
  CashOperation,
  CashOperationPayload,
  CashOperationType,
} from "@/types/cashOperation";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KassaAmaliyotModal from "./KassaAmaliyotModal";
import type { KassaAmaliyoti, KassaAmaliyotTuri, KassaKanali, KassaYonalishi } from "./types";
import { sanaFormat, summaFormat } from "./yordamchilar";

import ModalTablari from "@/Components/common/ModalTablari";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import LoadingState from "@/Components/common/LoadingState";
import { useHujjatniBekorQilishMumkinmi } from "@/hooks/useHujjatniOchirishMumkinmi";
type Bolim = { yonalish: KassaYonalishi };
type Guruh = { kanal: KassaKanali; icon: typeof Banknote; bolimlar: Bolim[] };

// 3 ta guruh, har birining ichida 2 bo'lim (tushum/chiqim).
const guruhlar: Guruh[] = [
  { kanal: "naqd", icon: Banknote, bolimlar: [{ yonalish: "tushum" }, { yonalish: "chiqim" }] },
  { kanal: "bank", icon: Landmark, bolimlar: [{ yonalish: "tushum" }, { yonalish: "chiqim" }] },
  { kanal: "ilova", icon: Smartphone, bolimlar: [{ yonalish: "tushum" }, { yonalish: "chiqim" }] },
];

// Kassa uchoti backenddagi yagona finance transaction oqimidan foydalanadi.
function kanalniMoslash(paymentType: string): KassaKanali {
  if (paymentType === "BANK") return "bank";
  if (paymentType === "CARD") return "ilova";
  return "naqd";
}

function backendTuriniMoslash(item: FinanceTransaction): KassaAmaliyotTuri {
  if (item.source === "SALE") return "donalik_savdo";
  if (item.source === "RETURN") return "xaridorga_qaytarish";
  if (item.source === "CASH_IN") return "boshqa_kirim";
  return "xarajat";
}

const cashOperationTuri: Record<CashOperationType, KassaAmaliyotTuri> = {
  CUSTOMER_PAYMENT: "xaridor_tolovi",
  EMPLOYEE_RETURN: "hisobdor_qaytardi",
  SUPPLIER_RETURN: "taminotchi_qaytardi",
  OTHER_INCOME: "boshqa_kirim",
  RETAIL_SALE: "donalik_savdo",
  SUPPLIER_PAYMENT: "taminot_tolovi",
  CUSTOMER_REFUND: "xaridorga_qaytarish",
  SALARY_PAYMENT: "ish_haqi",
  OTHER_EXPENSE: "boshqa_chiqim",
};

const uiOperationTuri: Record<KassaAmaliyotTuri, CashOperationType> = {
  xaridor_tolovi: "CUSTOMER_PAYMENT",
  hisobdor_qaytardi: "EMPLOYEE_RETURN",
  taminotchi_qaytardi: "SUPPLIER_RETURN",
  boshqa_kirim: "OTHER_INCOME",
  donalik_savdo: "RETAIL_SALE",
  taminot_tolovi: "SUPPLIER_PAYMENT",
  xaridorga_qaytarish: "CUSTOMER_REFUND",
  ish_haqi: "SALARY_PAYMENT",
  boshqa_chiqim: "OTHER_EXPENSE",
  xarajat: "OTHER_EXPENSE",
};

export default function KassaUchot() {
  const { t } = useTranslation(["kassa_uchot", "common"]);
  const sotuvniBekorQilishMumkin = useHujjatniBekorQilishMumkinmi("savdo");

  function amaliyotgaMoslash(
    item: FinanceTransaction,
    users: Map<string, AccountFoydalanuvchi>,
    branches: Map<string, Filial>
  ): KassaAmaliyoti {
    const responsible = item.responsibleId
      ? users.get(item.responsibleId)
      : undefined;
    const branch = item.branchId
      ? branches.get(item.branchId)
      : undefined;
    return {
      id: item.id,
      kanal: kanalniMoslash(item.paymentType),
      yonalish: item.type === "INCOME" ? "tushum" : "chiqim",
      turi: backendTuriniMoslash(item),
      // Backend sotuv to'lovlarini ham holati bilan qaytaradi — bekor qilingan sotuvning to'lovi kassada hisobga olinmaydi.
      holat: item.status === "CANCELLED" ? "bekor_qilingan" : item.status === "DRAFT" ? "qoralama" : "tasdiqlangan",
      raqam: item.refDocNumber || item.id.slice(0, 8).toUpperCase(),
      nomi: item.refDocNumber || item.note || item.source,
      kontragent: item.counterpartyName || branch?.name || "",
      summa: Number(item.amount ?? 0),
      sana: item.date,
      masul: item.responsibleName || responsible?.fullName || responsible?.username || t("systemFallback"),
      izoh: item.note ?? "",
      backendSource: item.source,
      backendRefId: item.refId ?? item.id,
      backendBranchId: item.branchId ?? undefined,
      readonly: true,
    };
  }

  function cashOperationgaMoslash(
    item: CashOperation,
    users: Map<string, AccountFoydalanuvchi>,
    branches: Map<string, Filial>
  ): KassaAmaliyoti {
    const responsible = item.responsibleId ? users.get(item.responsibleId) : undefined;
    const branch = item.branchId ? branches.get(item.branchId) : undefined;
    const counterparty =
      item.counterparty?.name ||
      item.counterparty?.fullName ||
      [item.customer?.firstName, item.customer?.lastName].filter(Boolean).join(" ") ||
      item.supplier?.name ||
      item.employee?.fullName ||
      item.employee?.username ||
      branch?.name ||
      item.branch?.name ||
      "";
    return {
      id: item.id,
      kanal: kanalniMoslash(item.paymentMethod),
      yonalish: item.direction === "INCOME" ? "tushum" : "chiqim",
      turi: cashOperationTuri[item.type],
      holat:
        item.status === "DRAFT"
          ? "qoralama"
          : item.status === "CANCELLED"
            ? "bekor_qilingan"
            : "tasdiqlangan",
      xaridorId: item.customerId ?? undefined,
      supplierId: item.supplierId ?? undefined,
      employeeId: item.employeeId ?? undefined,
      responsibleId: item.responsibleId ?? undefined,
      saleId: item.saleId ?? undefined,
      purchaseId: item.purchaseId ?? undefined,
      raqam: item.docNumber,
      nomi: item.name || t(`types.${cashOperationTuri[item.type]}`),
      kontragent: counterparty,
      summa: Number(item.amount ?? 0),
      sana: item.date,
      masul:
        item.responsible?.fullName ||
        responsible?.fullName ||
        responsible?.username ||
        t("systemFallback"),
      izoh: item.note || "",
      backendSource: "CASH_OPERATION",
      backendRefId: item.id,
      backendBranchId: item.branchId ?? undefined,
      readonly: item.status === "CANCELLED",
    };
  }

  // Amaliyotlar umumiy store'da — xaridordan to'lov xaridor qarzini kamaytiradi.
  const [amaliyotlar, setAmaliyotlar] = useState<KassaAmaliyoti[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [kanal, setKanal] = useState<KassaKanali>("naqd");
  const [yonalish, setYonalish] = useState<KassaYonalishi>("tushum");
  const [qidiruv, setQidiruv] = useState("");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirAmaliyot, setTahrirAmaliyot] = useState<KassaAmaliyoti | null>(null);
  const [tasdiqAmaliyot, setTasdiqAmaliyot] = useState<KassaAmaliyoti | null>(null);

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      const [transactions, cashOperations, users, branches] = await Promise.all([
        barchaFinanceTransactions(),
        cashOperationsApi.barchasi(),
        foydalanuvchilarApi.royxat(),
        filiallarApi.royxat(),
      ]);
      const userMap = new Map(users.map((item) => [item.id, item]));
      const branchMap = new Map(branches.map((item) => [item.id, item]));
      const operationRows = cashOperations.items.map((item) =>
        cashOperationgaMoslash(item, userMap, branchMap)
      );
      const transactionRows = transactions
        .filter((item) => item.source !== "CASH_OPERATION")
        .map((item) => amaliyotgaMoslash(item, userMap, branchMap));
      setAmaliyotlar([...operationRows, ...transactionRows]);
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void yuklash(); }, [yuklash]);

  function modalniOchish(amaliyot?: KassaAmaliyoti) {
    setTahrirAmaliyot(amaliyot ?? null);
    setModalOchiq(true);
  }

  async function saqlash(amaliyot: KassaAmaliyoti) {
    setXatolik("");
    try {
      const paymentMethod: TolovUsuli =
        amaliyot.kanal === "bank" ? "BANK" : amaliyot.kanal === "ilova" ? "CARD" : "CASH";
      const payload: CashOperationPayload = {
        type: uiOperationTuri[amaliyot.turi],
        date: amaliyot.sana,
        amount: amaliyot.summa,
        paymentMethod,
        name: amaliyot.nomi,
        note: amaliyot.izoh || amaliyot.nomi,
        branchId: amaliyot.backendBranchId,
        responsibleId: amaliyot.responsibleId,
        customerId: amaliyot.xaridorId,
        supplierId: amaliyot.supplierId,
        employeeId: amaliyot.employeeId,
        saleId: amaliyot.saleId,
        purchaseId: amaliyot.purchaseId,
      };
      let saved: CashOperation;
      if (amaliyot.backendSource === "CASH_OPERATION" && amaliyot.backendRefId) {
        saved = await cashOperationsApi.yangilash(amaliyot.backendRefId, payload);
      } else {
        saved = await cashOperationsApi.yaratish(payload);
      }
      if (amaliyot.holat === "tasdiqlangan" && saved.status === "DRAFT") {
        await cashOperationsApi.tasdiqlash(saved.id);
      }
      setKanal(amaliyot.kanal);
      setYonalish(amaliyot.yonalish);
      setModalOchiq(false);
      await yuklash();
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    }
  }

  // Qatorga qarab qaysi amal bajariladi:
  // - tasdiqlangan kassa operatsiyasi va sotuv to'lovi — bekor qilinadi (sotuvda butun sotuv bekor bo'ladi, tovar omborga qaytadi);
  // - qoralama / bekor qilingan kassa operatsiyasi, eski kirim va xarajat, bekor qilingan sotuv — o'chiriladi.
  function amalTuri(amaliyot: KassaAmaliyoti): "bekor" | "ochirish" {
    if (amaliyot.backendSource === "CASH_OPERATION" || amaliyot.backendSource === "SALE") {
      return amaliyot.holat === "tasdiqlangan" ? "bekor" : "ochirish";
    }
    return "ochirish";
  }

  // Qaysi qatorni o'chirish/bekor qilish mumkin: faqat backendda endpointi bor yozuvlar.
  // Sotuv to'lovi sotuv orqali (POST /sales/:id/cancel, DELETE /sales/:id) boshqariladi.
  function ochirishHolati(amaliyot: KassaAmaliyoti): { mumkin: boolean; sarlavha?: string } {
    if (amaliyot.backendSource === "RETURN") {
      return { mumkin: false, sarlavha: t("deleteBlocked.RETURN") };
    }
    if (amaliyot.backendSource === "SALE") {
      if (amaliyot.holat === "qoralama") return { mumkin: false };
      // Sotuvni bekor qilish (va o'chirish) direktor yoki RETURN_CANCEL granti bor admin uchun.
      if (!sotuvniBekorQilishMumkin) return { mumkin: false, sarlavha: t("saleNoPermission") };
      return {
        mumkin: Boolean(amaliyot.backendRefId),
        sarlavha: t(amalTuri(amaliyot) === "bekor" ? "saleTooltip.cancel" : "saleTooltip.delete"),
      };
    }
    return { mumkin: Boolean(amaliyot.backendRefId) };
  }

  function ochirishniSorash(amaliyot: KassaAmaliyoti) {
    if (!ochirishHolati(amaliyot).mumkin) return;
    setXatolik("");
    setTasdiqAmaliyot(amaliyot);
  }

  async function ochirish(amaliyot: KassaAmaliyoti) {
    const id = amaliyot.backendRefId;
    if (!id) return false;
    try {
      if (amaliyot.backendSource === "CASH_OPERATION") {
        if (amalTuri(amaliyot) === "bekor") await cashOperationsApi.bekorQilish(id);
        else await cashOperationsApi.ochirish(id);
      } else if (amaliyot.backendSource === "SALE") {
        // Kassadagi sotuv to'lovi `refId` orqali sotuvga bog'langan.
        if (amalTuri(amaliyot) === "bekor") await sotuvniBekorQilish(id);
        else await sotuvniOchirish(id);
        window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { sotuvId: id } }));
      } else if (amaliyot.backendSource === "CASH_IN") {
        await kassaKirimApi.ochirish(id);
      } else if (amaliyot.backendSource === "EXPENSE") {
        await xarajatApi.ochirish(id);
      } else {
        return false;
      }
      await yuklash();
      return true;
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
      // Yozuv shu orada boshqa joyda o'zgargan bo'lishi mumkin — ro'yxatni backend holatiga moslaymiz.
      await yuklash();
      return false;
    }
  }

  // Bo'limga qarab modalning boshlang'ich turi.
  const boshlangichTuri: KassaAmaliyotTuri = yonalish === "tushum" ? "boshqa_kirim" : "xarajat";

  const tushum = yonalish === "tushum";
  const joriyGuruh = guruhlar.find((g) => g.kanal === kanal) ?? guruhlar[0];
  const joriyBolim =
    joriyGuruh.bolimlar.find((b) => b.yonalish === yonalish) ?? joriyGuruh.bolimlar[0];
  const joriyBolimNomi = t(`groups.${joriyGuruh.kanal}.${joriyBolim.yonalish}`);

  function bolimniTanlash(yangiKanal: KassaKanali, yangiYonalish: KassaYonalishi) {
    setKanal(yangiKanal);
    setYonalish(yangiYonalish);
  }

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    return amaliyotlar.filter((amaliyot) => {
      if (amaliyot.kanal !== kanal) return false;
      if (amaliyot.yonalish !== yonalish) return false;
      if (!soz) return true;
      return [amaliyot.raqam, amaliyot.nomi, amaliyot.kontragent, amaliyot.masul, amaliyot.izoh]
        .join(" ")
        .toLowerCase()
        .includes(soz);
    });
  }, [amaliyotlar, kanal, yonalish, qidiruv]);

  // Bekor qilingan amaliyotlar kassa jamiga kirmaydi.
  // Birinchi yuklanishda (ma'lumot hali yo'q) sahifa o'rtasida yuklanish holati ko'rsatiladi.
  const dastlabkiYuklanish = yuklanmoqda && amaliyotlar.length === 0;
  const jami = royxat.reduce((sum, amaliyot) => sum + (amaliyot.holat === "bekor_qilingan" ? 0 : amaliyot.summa), 0);

  const ustunlar: Ustun<KassaAmaliyoti>[] = [
    {
      id: "raqam",
      nom: t("table.raqam"),
      kenglik: 130,
      katak: (a) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-black text-slate-900">{a.raqam}</span>
          {(a.holat === "bekor_qilingan" || a.holat === "qoralama") && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${a.holat === "bekor_qilingan" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}>
              {t(`holatlar.${a.holat}`)}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "nomi",
      nom: t("table.nomi"),
      kenglik: 200,
      katak: (a) => <span className="font-semibold text-slate-700">{a.nomi}</span>,
    },
    {
      id: "kontragent",
      nom: tushum ? t("table.kontragentFrom") : t("table.kontragentTo"),
      kenglik: 180,
      katak: (a) => <span className="text-slate-500">{a.kontragent}</span>,
    },
    {
      id: "tur",
      nom: t("table.tur"),
      kenglik: 160,
      katak: (a) => (
        <span className="inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#2563EB]">
          {t(`types.${a.turi}`)}
        </span>
      ),
    },
    {
      id: "masul",
      nom: t("table.masul"),
      kenglik: 160,
      katak: (a) => <span className="text-slate-500">{a.masul}</span>,
    },
    {
      id: "izoh",
      nom: t("table.izoh"),
      kenglik: 180,
      katak: (a) => <span className="text-slate-500">{a.izoh || "—"}</span>,
    },
    {
      id: "sana",
      nom: t("table.sana"),
      kenglik: 130,
      katak: (a) => <span className="text-slate-500">{sanaFormat(a.sana)}</span>,
    },
    {
      id: "summa",
      nom: t("table.summa"),
      kenglik: 150,
      katak: (a) => (
        <span className={`font-black ${tushum ? "text-emerald-600" : "text-red-500"}`}>
          {tushum ? "+" : "−"} {summaFormat(a.summa)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">{t("eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("subtitle")}
        </p>
      </header>

      {xatolik && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {xatolik}
        </div>
      )}

      {/* Har kanal uchun tushum va chiqim alohida tab */}
      <ModalTablari
        tablar={guruhlar.flatMap((guruh) => {
          const Ikonka = guruh.icon;
          return guruh.bolimlar.map((bolim) => ({
            id: `${guruh.kanal}:${bolim.yonalish}`,
            nom: t(`groups.${guruh.kanal}.${bolim.yonalish}`),
            icon: <Ikonka size={15} />,
          }));
        })}
        faol={`${kanal}:${yonalish}`}
        onChange={(id) => {
          const [yangiKanal, yangiYonalish] = id.split(":");
          bolimniTanlash(yangiKanal as KassaKanali, yangiYonalish as KassaYonalishi);
        }}
      />

      {/* Chapda: qidiruv + jami. O'ngda: yaratish tugmasi. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm">
            <Search size={17} className="text-gray-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              className="min-w-0 flex-1 text-sm font-semibold outline-none"
              placeholder={t("searchPlaceholder")}
            />
          </label>

          {!dastlabkiYuklanish && (
            <div
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-black ${
                tushum ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}
            >
              {tushum ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              {t("totalLabel", { value: summaFormat(jami) })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => modalniOchish()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          {t("createButton")}
        </button>
      </div>

      {/* Joriy bo'lim nomi */}
      <h2 className="flex items-center gap-2 text-lg font-black text-gray-800">
        {joriyBolimNomi}
        {yuklanmoqda && !dastlabkiYuklanish && <LoaderCircle size={18} className="animate-spin text-orange-500" aria-label={t("loading")} />}
      </h2>

      {dastlabkiYuklanish ? (
        <LoadingState matn={t("loading")} ikonka={<Wallet size={24} />} />
      ) : royxat.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center font-bold text-gray-400">
          {t("emptyList", { section: joriyBolimNomi })}
        </p>
      ) : (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={modalniOchish}
          qatorKlass={(a) => (a.holat === "bekor_qilingan" ? "opacity-60" : "")}
          onQatorOchirish={ochirishniSorash}
          qatorOchirishHolati={ochirishHolati}
        />
      )}

      {tasdiqAmaliyot && (() => {
        const bekor = amalTuri(tasdiqAmaliyot) === "bekor";
        const sotuv = tasdiqAmaliyot.backendSource === "SALE";
        const kalit = sotuv ? (bekor ? "saleCancelDialog" : "saleDeleteDialog") : bekor ? "cancelDialog" : "deleteDialog";
        return (
          <TasdiqlashOynasi
            ikonka={bekor ? <Ban size={24} /> : <Trash2 size={24} />}
            ohang={bekor ? "sariq" : "qizil"}
            sarlavha={t(`${kalit}.title`)}
            nom={`${tasdiqAmaliyot.raqam} · ${summaFormat(tasdiqAmaliyot.summa)}`}
            tavsif={t(`${kalit}.description`)}
            izoh={sotuv && bekor ? t("saleCancelDialog.note") : undefined}
            ortgaMatni={t("common:hujjatOchirish.no")}
            tasdiqMatni={t(bekor ? `${sotuv ? "saleCancelDialog" : "cancelDialog"}.yes` : "common:hujjatOchirish.yes")}
            jarayonMatni={t(bekor ? "cancelDialog.cancelling" : "common:hujjatOchirish.deleting")}
            onTasdiq={() => ochirish(tasdiqAmaliyot)}
            onYopish={() => setTasdiqAmaliyot(null)}
          />
        );
      })()}

      {modalOchiq && (
        <KassaAmaliyotModal
          boshlangich={tahrirAmaliyot}
          boshlangichKanal={kanal}
          boshlangichTuri={boshlangichTuri}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={saqlash}
        />
      )}
    </div>
  );
}
