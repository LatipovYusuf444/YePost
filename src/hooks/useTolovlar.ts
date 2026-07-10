import { useCallback, useEffect, useMemo, useState } from "react";
import { moliyaTolovManbalariniOlish } from "@/api/tolovApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Qaytarish, Sotuv } from "@/types/savdo";
import type {
  TolovFiltrlari,
  TolovMoliyaManbalari,
  TolovUsuliKeng,
  TolovYozuvi,
} from "@/types/tolov";

const boshlangichFiltrlar: TolovFiltrlari = {
  search: "",
  turi: "BARCHASI",
  tolovTuri: "BARCHASI",
  startDate: "",
  endDate: "",
  page: 1,
  pageSize: 10,
};

function raqam(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function sotuvRaqami(sotuv: Sotuv) {
  return sotuv.documentNumber || sotuv.number || sotuv.id?.slice(0, 8).toUpperCase() || "SOTUV";
}

function mijozNomi(sotuv?: Sotuv) {
  if (!sotuv) return "Mijoz";
  const customerName = [sotuv.customer?.firstName, sotuv.customer?.lastName].filter(Boolean).join(" ");
  return (
    customerName ||
    sotuv.customer?.fullName ||
    sotuv.customer?.name ||
    sotuv.clientCompany?.name ||
    "Donalik mijoz"
  );
}

function qaytarishSummasi(qaytarish: Qaytarish) {
  const itemsTotal =
    qaytarish.items?.reduce(
      (sum, item) => sum + raqam(item.quantity) * raqam(item.price),
      0
    ) ?? 0;
  const backendTotal = raqam(qaytarish.totalAmount ?? qaytarish.total);
  return backendTotal > 0 || itemsTotal === 0 ? backendTotal : itemsTotal;
}

function sanasi(value?: string) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sanaFilterdanOtadi(value: string | undefined, startDate: string, endDate: string) {
  if (!startDate && !endDate) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (date < start) return false;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`);
    if (date > end) return false;
  }

  return true;
}

function mosTolovTuri(value?: string): TolovUsuliKeng {
  const normalized = String(value ?? "OTHER").toUpperCase();
  if (["CASH", "CARD", "CLICK", "PAYME", "BANK", "DEBT"].includes(normalized)) {
    return normalized;
  }
  return "OTHER";
}

function moliyaNomi(value?: string | null) {
  const labels: Record<string, string> = {
    OWNER: "Egalik kirimi",
    INVESTOR: "Investor",
    LOAN: "Qarz",
    OTHER: "Boshqa",
    SALARY: "Maosh",
    RENT: "Ijara",
    UTILITIES: "Kommunal",
    LOGISTICS: "Logistika",
    MARKETING: "Marketing",
  };
  const normalized = String(value ?? "OTHER").toUpperCase();
  return labels[normalized] ?? "Boshqa";
}

function tolovlarniNormalizatsiyaQilish(
  sotuvlar: Sotuv[],
  qaytarishlar: Qaytarish[],
  moliya: TolovMoliyaManbalari
): TolovYozuvi[] {
  const sotuvTolovlari = sotuvlar.flatMap((sotuv) =>
    (sotuv.payments ?? []).map((tolov, index) => ({
      id: `sale-${tolov.id ?? `${sotuv.id}-${index}`}`,
      sotuvId: sotuvRaqami(sotuv),
      mijoz: mijozNomi(sotuv),
      turi: "KIRIM" as const,
      tolovTuri: mosTolovTuri(tolov.paymentType),
      summa: raqam(tolov.amount),
      sana: (tolov as { createdAt?: string }).createdAt ?? sotuv.confirmedAt ?? sotuv.createdAt,
      manba: "SALE" as const,
      sotuv,
      raw: sotuv,
    }))
  );

  const qaytarimTolovlari = qaytarishlar
    .filter((qaytarish) => String(qaytarish.status ?? "").toUpperCase() === "CONFIRMED")
    .map((qaytarish) => {
      const sotuv = qaytarish.sale ?? sotuvlar.find((item) => item.id === qaytarish.saleId);
      const paymentType =
        sotuv?.payments?.find((tolov) =>
          ["CASH", "CARD", "CLICK", "PAYME", "BANK"].includes(String(tolov.paymentType).toUpperCase())
        )?.paymentType ?? "OTHER";

      return {
        id: `return-${qaytarish.id}`,
        sotuvId: sotuv ? sotuvRaqami(sotuv) : qaytarish.saleId?.slice(0, 8).toUpperCase() || "QAYTARISH",
        mijoz: mijozNomi(sotuv),
        turi: "CHIQIM" as const,
        tolovTuri: mosTolovTuri(paymentType),
        summa: qaytarishSummasi(qaytarish),
        sana: qaytarish.updatedAt ?? qaytarish.createdAt,
        manba: "RETURN" as const,
        sotuv,
        raw: qaytarish,
      };
    });

  const kassaKirimlari = moliya.kassaKirimlari.map((item) => ({
    id: `cash-in-${item.id}`,
    sotuvId: `KIRIM-${item.id.slice(0, 8).toUpperCase()}`,
    mijoz: item.branch?.name ?? moliyaNomi(item.source),
    turi: "KIRIM" as const,
    tolovTuri: mosTolovTuri(item.paymentMethod),
    summa: raqam(item.amount),
    sana: item.date ?? item.createdAt,
    manba: "CASH_IN" as const,
    raw: item,
  }));

  const xarajatlar = moliya.xarajatlar.map((item) => ({
    id: `expense-${item.id}`,
    sotuvId: `CHIQIM-${item.id.slice(0, 8).toUpperCase()}`,
    mijoz: item.branch?.name ?? moliyaNomi(item.category),
    turi: "CHIQIM" as const,
    tolovTuri: mosTolovTuri(item.paymentMethod),
    summa: raqam(item.amount),
    sana: item.date ?? item.createdAt,
    manba: "EXPENSE" as const,
    raw: item,
  }));

  return [...sotuvTolovlari, ...qaytarimTolovlari, ...kassaKirimlari, ...xarajatlar]
    .filter((item) => item.summa > 0)
    .sort((a, b) => sanasi(b.sana) - sanasi(a.sana));
}

export function useTolovlar(sotuvlar: Sotuv[], qaytarishlar: Qaytarish[]) {
  const [moliya, setMoliya] = useState<TolovMoliyaManbalari>({
    kassaKirimlari: [],
    xarajatlar: [],
  });
  const [filtrlar, setFiltrlar] = useState<TolovFiltrlari>(boshlangichFiltrlar);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xatolik, setXatolik] = useState<string | null>(null);

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik(null);
    try {
      setMoliya(await moliyaTolovManbalariniOlish());
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const barchaTolovlar = useMemo(
    () => tolovlarniNormalizatsiyaQilish(sotuvlar, qaytarishlar, moliya),
    [moliya, qaytarishlar, sotuvlar]
  );

  const filterlangan = useMemo(() => {
    const search = filtrlar.search.trim().toLowerCase();
    return barchaTolovlar.filter((tolov) => {
      const searchMos =
        !search ||
        [tolov.sotuvId, tolov.mijoz, tolov.turi, tolov.tolovTuri]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const turiMos = filtrlar.turi === "BARCHASI" || tolov.turi === filtrlar.turi;
      const tolovTuriMos =
        filtrlar.tolovTuri === "BARCHASI" ||
        String(tolov.tolovTuri).toUpperCase() === String(filtrlar.tolovTuri).toUpperCase();

      return (
        searchMos &&
        turiMos &&
        tolovTuriMos &&
        sanaFilterdanOtadi(tolov.sana, filtrlar.startDate, filtrlar.endDate)
      );
    });
  }, [barchaTolovlar, filtrlar]);

  const totalPages = Math.max(Math.ceil(filterlangan.length / filtrlar.pageSize), 1);
  const currentPage = Math.min(filtrlar.page, totalPages);
  const rows = filterlangan.slice(
    (currentPage - 1) * filtrlar.pageSize,
    currentPage * filtrlar.pageSize
  );

  function filtrniYangilash(patch: Partial<TolovFiltrlari>) {
    setFiltrlar((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
    }));
  }

  return {
    rows,
    jami: filterlangan.length,
    barchaJami: barchaTolovlar.length,
    currentPage,
    totalPages,
    filtrlar: { ...filtrlar, page: currentPage },
    yuklanmoqda,
    xatolik,
    refetch: yuklash,
    filtrniYangilash,
  };
}
