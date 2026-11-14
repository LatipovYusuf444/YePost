import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tolovRangi } from "@/lib/tolovTuriRanglari";
import {
  Ban,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Gift,
  Landmark,
  Plus,
  Search,
  Smartphone,
  LoaderCircle,
  Trash2,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { barchaFinanceTransactionsHisoboti } from "@/api/tolovApi";
import { cashOperationsApi } from "@/api/cashOperationsApi";
import { shubhaliValyutaBilanBajarish } from "@/api/valyutaShubhasi";
import { useYagonaValyuta } from "@/lib/valyuta";
import { muvaffaqiyatXabari } from "@/lib/toast";
import type { EskiTahrirMalumoti } from "./KassaEskiTahrir";
import { almashtirishIzohi } from "@/lib/kassaTahriri";
import { kunMatni } from "@/lib/hujjatSanasi";
import { taqsimotniOqish } from "@/lib/qarzTaqsimoti";
import { taqsimotXabariniKorsatish } from "./taqsimotXabari";
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
import NomiKatagi from "./NomiKatagi";
import { amaliyotSotuvIdsi, nomQismlari } from "./nomQismlari";
import ZavodBonusi from "./ZavodBonusi";
import type { KassaAmaliyoti, KassaAmaliyotTuri, KassaKanali, KassaYonalishi } from "./types";
import { kassaSummasi, sanaFormat } from "./yordamchilar";
import MuddatTanlov from "../HisobotUchot/MuddatTanlov";
import { cashAmount } from "@/lib/cashReports";
import type { FinanceCurrencySummary } from "@/types/cashReports";

import ModalTablari from "@/Components/common/ModalTablari";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { KiritilganBelgisi } from "@/Components/common/HujjatSanasi";
import { toshkentKuni } from "@/lib/hujjatSanasi";
import { kassaRaqamlari, kassaTartibi } from "@/lib/kassaNomlari";
import LoadingState from "@/Components/common/LoadingState";
import { useHujjatniBekorQilishMumkinmi } from "@/hooks/useHujjatniOchirishMumkinmi";
import { useKassaSotuvKeshi } from "@/hooks/useKassaSotuvlari";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { rolniNormallashtirish } from "@/lib/roles";
import { hujjatRaqamiMatni } from "@/lib/hujjatRaqamiMatni";
import { valyutaYokiAsosiy } from "@/lib/asosiyValyuta";
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
  // Sotuv to'lovi: mijozli sotuvda backend counterpartyType = "CUSTOMER" beradi, chakana (donalik) sotuvda null.
  if (item.source === "SALE") return item.counterpartyType === "CUSTOMER" ? "xaridor_sotuv_tolovi" : "donalik_savdo";
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
  // Mijozli sotuv to'lovi savdodan avtomat keladi (faqat o'qiladi), shuning uchun bu moslik amalda ishlatilmaydi.
  xaridor_sotuv_tolovi: "CUSTOMER_PAYMENT",
  taminot_tolovi: "SUPPLIER_PAYMENT",
  xaridorga_qaytarish: "CUSTOMER_REFUND",
  ish_haqi: "SALARY_PAYMENT",
  boshqa_chiqim: "OTHER_EXPENSE",
  xarajat: "OTHER_EXPENSE",
};

export default function KassaUchot() {
  const { t } = useTranslation(["kassa_uchot", "common"]);
  // Bir valyutali rejim (Faqat so'm / Faqat dollar): jami faqat shu valyutada; boshqa valyutadagi (rejimdan oldingi) summa bo'lsa — u ham.
  const yagonaValyuta = useYagonaValyuta();
  const [searchParams, setSearchParams] = useSearchParams();
  const boshlangichXaridorId = searchParams.get("customerId") || undefined;
  const sotuvniBekorQilishMumkin = useHujjatniBekorQilishMumkinmi("savdo");
  // Zavod bonusi: yaratish/tasdiqlash — direktor yoki CASH_IN huquqi; o'chirish — DELETE huquqi (direktor ham).
  const profil = useAuthProfileStore((holat) => holat.profil);
  const profilRoli = rolniNormallashtirish(profil?.role);
  const faolHuquq = (kod: string) => (profil?.grants ?? []).some((huquq) => huquq.code === kod && huquq.isActive !== false);
  const zavodBonusiRuxsati = profilRoli === "DIREKTOR" || faolHuquq("CASH_IN");
  const zavodBonusiOchirish = profilRoli === "DIREKTOR" || faolHuquq("DELETE");
  const [zavodBonusiOchiq, setZavodBonusiOchiq] = useState(false);

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
      // `raqam` ro'yxat yig'ilganda K1, K2... ga almashadi; hujjatning o'z raqami (SOT-000014) `hujjatRaqami`da qoladi.
      raqam: hujjatRaqamiMatni(item.refDocNumber),
      hujjatRaqami: item.refDocNumber || undefined,
      nomi: item.refDocNumber || item.note || t(`types.${backendTuriniMoslash(item)}`),
      kontragent: item.counterpartyName || branch?.name || "",
      summa: Number(item.amount ?? 0),
      valyuta: valyutaYokiAsosiy(item.currency),
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
      hujjatRaqami: item.docNumber || undefined,
      nomi: item.name || t(`types.${cashOperationTuri[item.type]}`),
      kontragent: counterparty,
      summa: Number(item.amount ?? 0),
      valyuta: item.currency === "USD" ? "USD" : item.currency === "UZS" ? "UZS" : undefined,
      hisobValyutasi: item.settleCurrency === "USD" ? "USD" : item.settleCurrency === "UZS" ? "UZS" : undefined,
      hisoblanganSumma: item.settledAmount != null && Number(item.settledAmount) > 0 ? Number(item.settledAmount) : undefined,
      kurs: item.rate != null && Number(item.rate) > 0 ? Number(item.rate) : undefined,
      taqsimot: taqsimotniOqish(item)?.allocated,
      hisobgaTushgan: item.accountAmount != null ? Number(item.accountAmount) : undefined,
      sana: item.date,
      kiritilgan: item.createdAt,
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
  const raqamQidiruvi = /^K\d+$/i.test(qidiruv.trim());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currency, setCurrency] = useState<"UZS" | "USD" | "ALL">("ALL");
  const [summary, setSummary] = useState<FinanceCurrencySummary>();
  const yuklashId = useRef(0);
  const raqamManbasi = useRef<Promise<FinanceTransaction[]> | null>(null);
  const [hujjatRaqamlari, setHujjatRaqamlari] = useState<Map<string, string>>(new Map());
  const [modalOchiq, setModalOchiq] = useState(Boolean(boshlangichXaridorId));
  const [tahrirAmaliyot, setTahrirAmaliyot] = useState<KassaAmaliyoti | null>(null);
  const [tasdiqAmaliyot, setTasdiqAmaliyot] = useState<KassaAmaliyoti | null>(null);

  const yuklash = useCallback(async () => {
    const requestId = ++yuklashId.current;
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setXatolik("Boshlanish sanasi tugash sanasidan keyin bo'lmasin.");
      setAmaliyotlar([]);
      setSummary(undefined);
      setYuklanmoqda(false);
      return;
    }
    setYuklanmoqda(true);
    setXatolik("");
    setSummary(undefined);
    try {
      // K1, K2... qidiruv, sana yoki valyuta filtridan keyin qayta raqamlanmasin.
      if (!raqamManbasi.current) {
        raqamManbasi.current = barchaFinanceTransactionsHisoboti({ currency: "ALL" }).then((data) => data.items);
      }
      const [report, cashOperations, users, branches, fullTransactions] = await Promise.all([
        barchaFinanceTransactionsHisoboti({
          currency,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          paymentType: kanal === "bank" ? "BANK" : kanal === "ilova" ? "CARD" : "CASH",
          type: yonalish === "tushum" ? "INCOME" : "EXPENSE",
          search: raqamQidiruvi ? undefined : qidiruv.trim() || undefined,
        }),
        cashOperationsApi.barchasi(),
        foydalanuvchilarApi.royxat(),
        filiallarApi.royxat(),
        raqamManbasi.current,
      ]);
      if (requestId !== yuklashId.current) return;
      const userMap = new Map(users.map((item) => [item.id, item]));
      const branchMap = new Map(branches.map((item) => [item.id, item]));
      setHujjatRaqamlari(kassaRaqamlari([
        ...cashOperations.items.map((item) => cashOperationgaMoslash(item, userMap, branchMap)),
        ...fullTransactions.filter((item) => item.source !== "CASH_OPERATION").map((item) => amaliyotgaMoslash(item, userMap, branchMap)),
      ]));
      const operationMap = new Map(cashOperations.items.map((item) => [item.id, item]));
      const transactionRows = report.items.map((item) => {
        const operation = item.source === "CASH_OPERATION" ? operationMap.get(item.refId ?? item.id) : undefined;
        if (!operation) return amaliyotgaMoslash(item, userMap, branchMap);
        return { ...cashOperationgaMoslash(operation, userMap, branchMap), summa: Number(item.amount), valyuta: valyutaYokiAsosiy(item.currency), sana: item.date };
      });
      const transactionOperationIds = new Set(report.items.filter((item) => item.source === "CASH_OPERATION").map((item) => item.refId ?? item.id));
      // Tasdiqlangan pul harakatlari faqat umumiy ledgerdan. Qoralama/bekor hujjatlar boshqarish uchun qoladi.
      const operationRows = cashOperations.items
        .filter((item) => item.status !== "CONFIRMED" && !transactionOperationIds.has(item.id))
        .map((item) => cashOperationgaMoslash(item, userMap, branchMap))
        .filter((item) => {
          const day = toshkentKuni(item.sana);
          const text = [item.raqam, item.nomi, item.kontragent, item.masul, item.izoh].join(" ").toLowerCase();
          return item.kanal === kanal && item.yonalish === yonalish &&
            (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo) &&
            (currency === "ALL" || valyutaYokiAsosiy(item.valyuta) === currency) &&
            (raqamQidiruvi || !qidiruv.trim() || text.includes(qidiruv.trim().toLowerCase()));
        });
      setAmaliyotlar([...operationRows, ...transactionRows]);
      setSummary(report.summary);
    } catch (error) {
      if (requestId !== yuklashId.current) return;
      raqamManbasi.current = null;
      setAmaliyotlar([]);
      setXatolik(getApiErrorMessage(error));
    } finally {
      if (requestId === yuklashId.current) setYuklanmoqda(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, dateFrom, dateTo, kanal, yonalish, qidiruv, raqamQidiruvi]);

  useEffect(() => { void yuklash(); }, [yuklash]);

  // Sotuv to'lovi tahrirlanganda (bekor qilish, qayta tasdiqlash) kassa yozuvlari qayta olinadi.
  useEffect(() => {
    const yangilash = () => { raqamManbasi.current = null; void yuklash(); };
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => window.removeEventListener("savdo:yangilandi", yangilash);
  }, [yuklash]);

  function modalniOchish(amaliyot?: KassaAmaliyoti) {
    setTahrirAmaliyot(amaliyot ?? null);
    setModalOchiq(true);
  }

  // Modal tugmasi qulflangan bo'lsa ham (K3) bu yerda ikkinchi himoya: bir vaqtda faqat bitta saqlash.
  const saqlashQulfi = useRef(false);
  async function saqlash(amaliyot: KassaAmaliyoti) {
    if (saqlashQulfi.current) return;
    saqlashQulfi.current = true;
    try {
      return await saqlashniBajarish(amaliyot);
    } finally {
      saqlashQulfi.current = false;
    }
  }

  // Matn qaytarsa — oyna tepasida ko'rsatiladi (almashtirish zanjiri yarim yo'lda to'xtaganini kassir oynaning o'zida ko'rishi kerak).
  async function saqlashniBajarish(amaliyot: KassaAmaliyoti): Promise<string | undefined> {
    setXatolik("");
    let tasdiqlanmagan: CashOperation | null = null;
    // Almashtirishda (tasdiqlangan amaliyot tahriri) yangi amaliyot izohiga "KAS-000001 o'rniga: Summa … → …; Sabab: …" qo'shiladi:
    // backend bekor qilish sababini va tahrirni saqlamaydi, izoh esa saqlanadi va oynada, tarixda ko'rinadi.
    const almashtirishMatni = amaliyot.almashtiriladi
      ? almashtirishIzohi({
          eskiRaqam: amaliyot.almashtiriladi.raqam ?? "",
          oldin: amaliyot.almashtiriladi.oldin ?? { summa: amaliyot.summa, valyuta: amaliyot.valyuta, kun: kunMatni(amaliyot.sana), tolovTuri: t(`channels.${amaliyot.kanal}`), turi: t(`types.${amaliyot.turi}`), kontragent: amaliyot.kontragent },
          keyin: { summa: amaliyot.summa, valyuta: amaliyot.valyuta, kun: kunMatni(amaliyot.sana), tolovTuri: t(`channels.${amaliyot.kanal}`), turi: t(`types.${amaliyot.turi}`), kontragent: amaliyot.kontragent },
          sabab: amaliyot.almashtiriladi.sabab !== t("amallar.replaceReason") ? amaliyot.almashtiriladi.sabab : undefined,
          summaMatni: (summa, valyuta) => kassaSummasi(summa, valyuta),
          matn: {
            orniga: t("amallar.note.orniga"), summa: t("amallar.note.summa"), sana: t("amallar.note.sana"), tolovTuri: t("amallar.note.tolovTuri"),
            turi: t("amallar.note.turi"), kontragent: t("amallar.note.kontragent"), sabab: t("amallar.note.sabab"),
          },
        })
      : "";
    try {
      const paymentMethod: TolovUsuli =
        amaliyot.kanal === "bank" ? "BANK" : amaliyot.kanal === "ilova" ? "CARD" : "CASH";
      const payload: CashOperationPayload = {
        type: uiOperationTuri[amaliyot.turi],
        date: toshkentKuni(amaliyot.sana) || undefined,
        amount: amaliyot.summa,
        // So'mda berilgan pul hisob valyutasiga (dollarga) `rate` bilan o'giriladi; kurs yozilmasa backend kunlik kursni oladi.
        ...(amaliyot.valyuta ? { currency: amaliyot.valyuta } : {}),
        ...(amaliyot.hisobValyutasi ? { settleCurrency: amaliyot.hisobValyutasi } : {}),
        ...(amaliyot.kurs ? { rate: amaliyot.kurs } : {}),
        paymentMethod,
        name: amaliyot.nomi,
        note: [amaliyot.izoh, almashtirishMatni].filter(Boolean).join("\n") || undefined,
        branchId: amaliyot.backendBranchId,
        responsibleId: amaliyot.responsibleId,
        customerId: amaliyot.xaridorId,
        supplierId: amaliyot.supplierId,
        employeeId: amaliyot.employeeId,
        saleId: amaliyot.saleId,
        purchaseId: amaliyot.purchaseId,
      };
      // Savdo ko'rsatilgan mijoz to'lovida dollar savdoga juda kichik so'm summasi (400 suspicious_currency): "Valyuta to'g'rimi?" so'raladi,
      // "ha" bo'lsa xuddi shu so'rov `force: true` bilan qayta yuboriladi.
      const mavjudId = amaliyot.backendSource === "CASH_OPERATION" ? amaliyot.backendRefId : undefined;
      const saved: CashOperation = await shubhaliValyutaBilanBajarish((tana) =>
        mavjudId ? cashOperationsApi.yangilash(mavjudId, { ...payload, ...tana }) : cashOperationsApi.yaratish({ ...payload, ...tana })
      );
      // Tasdiqlangan amaliyot tahriri (backend uni joyida o'zgartirmaydi): tuzatilgani qoralama bo'lib yaratildi — endi eskisi sabab bilan bekor
      // qilinadi (ledger teskari yozuv, kontragent hisobi qaytadi), keyin pastda yangisi tasdiqlanadi. Bekor qilish o'tmasa yangi qoralama
      // o'chiriladi: hech narsa o'zgarmaydi.
      const eski = amaliyot.almashtiriladi;
      if (eski && saved.status === "DRAFT") {
        try {
          await cashOperationsApi.bekorQilish(eski.id, eski.sabab);
        } catch (error) {
          // Yangi qoralama orqaga qaytariladi. U ham o'chmasa (masalan, o'chirish huquqi yo'q) — kassirga aniq aytiladi va ro'yxat yangilanadi.
          const ochirildi = await cashOperationsApi.ochirish(saved.id).then(() => true, () => false);
          if (!ochirildi) {
            raqamManbasi.current = null;
            await yuklash();
            throw new Error(t("amallar.replaceCancelFailedDraftLeft", { yangi: saved.docNumber ?? "", xato: getApiErrorMessage(error) }));
          }
          throw new Error(t("amallar.replaceCancelFailed", { xato: getApiErrorMessage(error) }));
        }
      }
      if (amaliyot.holat === "tasdiqlangan" && saved.status === "DRAFT") {
        tasdiqlanmagan = saved;
        // Tasdiqlashda mijozning ochiq qarzlari eng eskisidan yopiladi: javobdagi `allocation` kassirga ko'rsatiladi.
        const tasdiq = await shubhaliValyutaBilanBajarish((tana) => cashOperationsApi.tasdiqlash(saved.id, tana), saved.docNumber);
        taqsimotXabariniKorsatish(tasdiq);
        if (eski) muvaffaqiyatXabari(t("amallar.replaced", { eski: eski.raqam ?? "", yangi: tasdiq?.docNumber ?? saved.docNumber ?? "" }));
      }
      setKanal(amaliyot.kanal);
      setYonalish(amaliyot.yonalish);
      setModalOchiq(false);
      if (boshlangichXaridorId) setSearchParams({}, { replace: true });
      raqamManbasi.current = null;
      await yuklash();
    } catch (error) {
      // Qoralama saqlangan, tasdiqlash o'tmagan ("Valyuta to'g'rimi?" ga "yo'q" yoki boshqa xato): oyna shu qoralamaga bog'lanadi —
      // qayta bosish ikkinchi hujjat yaratmaydi, ro'yxatda ham qoralama ko'rinadi.
      if (tasdiqlanmagan) {
        // Almashtirishda eski amaliyot allaqachon bekor qilingan: oyna endi yangi qoralamaga bog'lanadi (qayta bekor qilinmaydi).
        setTahrirAmaliyot({ ...amaliyot, id: tasdiqlanmagan.id, holat: "qoralama", raqam: tasdiqlanmagan.docNumber, backendSource: "CASH_OPERATION", backendRefId: tasdiqlanmagan.id, almashtiriladi: undefined });
        raqamManbasi.current = null;
        await yuklash();
      }
      const matn =
        tasdiqlanmagan && amaliyot.almashtiriladi
          ? t("amallar.replaceConfirmFailed", { xato: getApiErrorMessage(error) })
          : error instanceof Error && !("isAxiosError" in error) ? error.message : getApiErrorMessage(error);
      setXatolik(matn);
      // Almashtirish xatolari oynaning o'zida ham (sahifa xabari oyna ortida qoladi); oddiy xatolar avvalgidek maydon/toast orqali.
      return amaliyot.almashtiriladi ? matn : undefined;
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
    setTasdiqAmaliyot(nomBilan(amaliyot));
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
      raqamManbasi.current = null;
      await yuklash();
      return true;
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
      // Yozuv shu orada boshqa joyda o'zgargan bo'lishi mumkin — ro'yxatni backend holatiga moslaymiz.
      await yuklash();
      return false;
    }
  }

  // "Amaliyot" oynasidagi amallar (TZ 11.11.2026). Server xatosi interceptor toastida ko'rinadi; muvaffaqiyatda ro'yxat (va "Jami") yangilanib
  // oyna yopiladi.
  async function oynadanBekorQilish(amaliyot: KassaAmaliyoti, sabab: string) {
    const id = amaliyot.backendRefId;
    if (!id || amaliyot.backendSource !== "CASH_OPERATION") return false;
    try {
      await cashOperationsApi.bekorQilish(id, sabab);
    } catch {
      raqamManbasi.current = null;
      await yuklash();
      return false;
    }
    muvaffaqiyatXabari(t("amallar.cancelled", { raqam: amaliyot.hujjatRaqami ?? amaliyot.raqam }));
    setModalOchiq(false);
    raqamManbasi.current = null;
    await yuklash();
    return true;
  }

  async function oynadanOchirish(amaliyot: KassaAmaliyoti) {
    const id = amaliyot.backendRefId;
    if (!id) return false;
    try {
      if (amaliyot.backendSource === "CASH_OPERATION") await cashOperationsApi.ochirish(id);
      else if (amaliyot.backendSource === "CASH_IN") await kassaKirimApi.ochirish(id);
      else if (amaliyot.backendSource === "EXPENSE") await xarajatApi.ochirish(id);
      else return false;
    } catch {
      raqamManbasi.current = null;
      await yuklash();
      return false;
    }
    muvaffaqiyatXabari(t("amallar.deleted", { raqam: amaliyot.hujjatRaqami ?? amaliyot.raqam }));
    setModalOchiq(false);
    raqamManbasi.current = null;
    await yuklash();
    return true;
  }

  // Eski kirim/xarajat yozuvi: PATCH /finance/cash-ins|expenses/:id. Xato rad etiladi — oyna maydonlariga bog'lanadi.
  async function eskiYozuvniSaqlash(amaliyot: KassaAmaliyoti, malumot: EskiTahrirMalumoti) {
    const id = amaliyot.backendRefId;
    if (!id) return;
    if (amaliyot.backendSource === "CASH_IN") await kassaKirimApi.yangilash(id, malumot);
    else if (amaliyot.backendSource === "EXPENSE") await xarajatApi.yangilash(id, malumot);
    else return;
    muvaffaqiyatXabari(t("amallar.saved"));
    setModalOchiq(false);
    raqamManbasi.current = null;
    await yuklash();
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

  // K raqamlari eski tartibda saqlanadi; ekranda eng yangi amaliyot birinchi.
  const raqamlangan = useMemo(() => {
    return amaliyotlar
      .map((amaliyot) => ({ ...amaliyot, raqam: hujjatRaqamlari.get(amaliyot.id) ?? amaliyot.raqam }))
      .sort((a, b) => kassaTartibi(b, a));
  }, [amaliyotlar, hujjatRaqamlari]);

  // "Nomi" katagidagi sotuv raqami va mahsulot nomlari ekranda turgan qatorlar uchungina, fonda olinadi (NomiKatagi).
  const sotuvKeshi = useKassaSotuvKeshi();

  // Ochilayotgan oynaga (ko'rinish, o'chirish tasdig'i) jadvaldagi bilan bir xil nom beriladi; sotuv hali olinmagan bo'lsa — sarlavhaning o'zi.
  function nomBilan(amaliyot: KassaAmaliyoti): KassaAmaliyoti {
    const { sarlavha, tafsilot } = nomQismlari(amaliyot, sotuvKeshi.olingan(amaliyotSotuvIdsi(amaliyot)), t);
    return { ...amaliyot, nomSarlavhasi: sarlavha, nomTafsiloti: tafsilot };
  }

  const royxat = useMemo(() => {
    return raqamlangan.filter((amaliyot) => {
      if (amaliyot.kanal !== kanal) return false;
      if (amaliyot.yonalish !== yonalish) return false;
      if (raqamQidiruvi) return amaliyot.raqam.toUpperCase().includes(qidiruv.trim().toUpperCase());
      return true;
    });
  }, [raqamlangan, kanal, yonalish, qidiruv, raqamQidiruvi]);

  // Bekor qilingan amaliyotlar kassa jamiga kirmaydi.
  // Birinchi yuklanishda (ma'lumot hali yo'q) sahifa o'rtasida yuklanish holati ko'rsatiladi.
  const dastlabkiYuklanish = yuklanmoqda && amaliyotlar.length === 0;
  // Dollardagi operatsiyalar so'mga qo'shilmaydi: jami valyutalar bo'yicha alohida ko'rsatiladi.
  const summaryField = tushum ? "income" : "expense";
  // Bir valyutali rejimda "Jami" faqat asosiy valyutada (so'm/$ alohida ko'rsatilmaydi).
  const jamiMatni = (["UZS", "USD"] as const)
    .filter((valyuta) => !yagonaValyuta || valyuta === yagonaValyuta)
    .map((valyuta) => cashAmount(summary?.[valyuta]?.[summaryField], valyuta))
    .join(" · ");

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
      kenglik: 280,
      katak: (a) => <NomiKatagi amaliyot={a} kesh={sotuvKeshi} />,
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
      katak: (a) => (
        <span className="text-slate-500">
          {sanaFormat(a.sana)}
          <KiritilganBelgisi date={a.sana} createdAt={a.kiritilgan} />
        </span>
      ),
    },
    {
      id: "summa",
      nom: t("table.summa"),
      kenglik: 150,
      katak: (a) => (
        <span className={`font-black ${tushum ? "text-emerald-600" : "text-red-500"}`}>
          {tushum ? "+" : "−"} {kassaSummasi(a.summa, a.valyuta)}
          {a.hisoblanganSumma !== undefined && a.hisobValyutasi && valyutaYokiAsosiy(a.valyuta) !== a.hisobValyutasi && (
            <span className="block text-[11px] font-semibold text-slate-400">
              → {kassaSummasi(a.hisoblanganSumma, a.hisobValyutasi)}
              {a.kurs ? ` · ${a.kurs.toLocaleString("uz-UZ")}` : ""}
            </span>
          )}
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
        tablar={[
          ...guruhlar.flatMap((guruh) => {
            const Ikonka = guruh.icon;
            return guruh.bolimlar.map((bolim) => ({
              id: `${guruh.kanal}:${bolim.yonalish}`,
              nom: t(`groups.${guruh.kanal}.${bolim.yonalish}`),
              // Ikonka to'lov turi rangida (TOLOV_TURI_RANGLARI): naqd — yashil, ilova/karta — ko'k, bank — siyohrang.
              icon: <Ikonka size={15} style={{ color: tolovRangi(guruh.kanal).matn }} />,
            }));
          }),
          ...(zavodBonusiRuxsati ? [{ id: "zavod-bonusi", nom: t("zavodBonusi.tab"), icon: <Gift size={15} /> }] : []),
        ]}
        faol={zavodBonusiOchiq ? "zavod-bonusi" : `${kanal}:${yonalish}`}
        onChange={(id) => {
          if (id === "zavod-bonusi") {
            setZavodBonusiOchiq(true);
            return;
          }
          setZavodBonusiOchiq(false);
          const [yangiKanal, yangiYonalish] = id.split(":");
          bolimniTanlash(yangiKanal as KassaKanali, yangiYonalish as KassaYonalishi);
        }}
      />

      {zavodBonusiOchiq && zavodBonusiRuxsati ? (
        <ZavodBonusi ochirishMumkin={zavodBonusiOchirish} />
      ) : (
        <>
      <section className={`grid gap-4 rounded-2xl border border-orange-100 bg-white p-4 ${yagonaValyuta ? "" : "sm:grid-cols-2"}`}>
        <MuddatTanlov timeZone="Asia/Tashkent" dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        {/* Bir valyutali rejimda (Faqat so'm / Faqat dollar) valyuta filtri ko'rsatilmaydi. */}
        {!yagonaValyuta && (
        <label className="text-xs font-bold text-gray-700">
          Valyuta
          <select aria-label="Kassa valyutasi" value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">So'm va dollar</option><option value="UZS">So'm</option><option value="USD">Dollar ($)</option>
          </select>
        </label>
        )}
      </section>
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
              {t(raqamQidiruvi ? "periodTotalLabel" : "totalLabel", { value: jamiMatni })}
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
        <KengaytiriladiganJadval tableId="KassaUchot/index/kengaytiriladiganjadval-1"
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={(a) => modalniOchish(nomBilan(a))}
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
            nom={[tasdiqAmaliyot.raqam, tasdiqAmaliyot.nomSarlavhasi, kassaSummasi(tasdiqAmaliyot.summa, tasdiqAmaliyot.valyuta)].filter(Boolean).join(" · ")}
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
          boshlangichTuri={boshlangichXaridorId ? "xaridor_tolovi" : boshlangichTuri}
          boshlangichXaridorId={boshlangichXaridorId}
          onYopish={() => { setModalOchiq(false); if (boshlangichXaridorId) setSearchParams({}, { replace: true }); }}
          onSaqlash={saqlash}
          onBekorQilish={oynadanBekorQilish}
          onOchirish={oynadanOchirish}
          onEskiSaqlash={eskiYozuvniSaqlash}
        />
      )}
        </>
      )}
    </div>
  );
}

