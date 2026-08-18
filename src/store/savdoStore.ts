import { create } from "zustand";
import {
  mijozKompaniyalariRoyxatiniOlish,
  mijozlarRoyxatiniOlish,
  katalogModifikatsiyalariniQoldiqTanlovigaOlish,
  omborlarRoyxatiniOlish,
  omborQoldiqlariniOlish,
  qoldiqNomlariniBoyitish,
  qaytarishlarRoyxatiniOlish,
  qaytarishTafsilotiniOlish,
  qaytarishniBekorQilish,
  qaytarishniYangilash,
  qaytarishniTasdiqlash,
  qaytarishYaratish,
  sotuvlarRoyxatiniOlish,
  sotuvniBekorQilish,
  sotuvniTasdiqlash,
  sotuvgaTolovQoshish as sotuvgaTolovQoshishApi,
  sotuvTafsilotiniOlish,
  sotuvniYangilash as sotuvniYangilashApi,
  sotuvYaratish,
  xodimlarRoyxatiniOlish,
} from "@/api/savdoApi";
import { cashOperationsApi } from "@/api/cashOperationsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  MijozTanlovi,
  OmborTanlovi,
  Qaytarish,
  QaytarishYaratishMalumoti,
  QoldiqTanlovi,
  Sotuv,
  SotuvTolovi,
  SotuvYaratishMalumoti,
  XodimTanlovi,
} from "@/types/savdo";
import type { CashPaymentMethod } from "@/types/cashOperation";
import { sotuvQarzdorlikSummasi } from "@/Pages/Savdo/savdoYordamchilari";

const kassagaYoziladiganTolovUsullari = new Set(["CASH", "CARD"]);

async function qaytarishToloviniKassagaYozish(qaytarish: Qaytarish) {
  const refundMethod = String(qaytarish.refundMethod ?? "CASH").toUpperCase();
  if (!kassagaYoziladiganTolovUsullari.has(refundMethod)) return;

  const summa = Number(
    qaytarish.refundAmount ??
      qaytarish.totalAmount ??
      qaytarish.total ??
      qaytarish.items?.reduce(
        (jami, item) => jami + Number(item.quantity ?? 0) * Number(item.price ?? 0),
        0
      ) ??
      0
  );
  if (summa <= 0) return;

  // POST /finance/expenses eskirgan (Swagger: "o'rniga POST /finance/cash-operations
  // ishlating"). Yaratilgan operatsiya qoralama holatida keladi, shu uchun kassa
  // hisobotlarida (masalan /reports/cash-flow) ko'rinishi uchun darhol tasdiqlanadi.
  const operatsiya = await cashOperationsApi.yaratish({
    type: "CUSTOMER_REFUND",
    amount: summa,
    paymentMethod: refundMethod as CashPaymentMethod,
    date: new Date().toISOString(),
    saleId: qaytarish.saleId || undefined,
    name: "Sotuv qaytarimi",
    note: [
      `Qaytarish ID: ${qaytarish.id}`,
      qaytarish.saleId ? `Sotuv ID: ${qaytarish.saleId}` : "",
      qaytarish.reason ? `Sabab: ${qaytarish.reason}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  });
  await cashOperationsApi.tasdiqlash(operatsiya.id);
}

function qoldiqlarniKatalogBilanBirlashtirish(
  stockQoldiqlar: QoldiqTanlovi[],
  katalogQoldiqlar: QoldiqTanlovi[]
) {
  const map = new Map<string, QoldiqTanlovi>();

  for (const item of katalogQoldiqlar) {
    map.set(item.modificationId, item);
  }

  for (const item of stockQoldiqlar) {
    const katalogItem = map.get(item.modificationId);
    const modification = item.modification ?? katalogItem?.modification;

    map.set(item.modificationId, {
      ...katalogItem,
      ...item,
      modification: modification
        ? {
            ...katalogItem?.modification,
            ...item.modification,
            id: modification.id,
            product: item.modification?.product ?? katalogItem?.modification?.product,
            price: item.modification?.price ?? katalogItem?.modification?.price,
          }
        : undefined,
      sellingPrice:
        item.sellingPrice ??
        item.price ??
        katalogItem?.sellingPrice ??
        katalogItem?.price,
      price:
        item.price ??
        item.sellingPrice ??
        katalogItem?.price ??
        katalogItem?.sellingPrice,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const aName = a.modification?.product?.name ?? a.modification?.name ?? a.modificationId;
    const bName = b.modification?.product?.name ?? b.modification?.name ?? b.modificationId;
    return aName.localeCompare(bName, "uz");
  });
}

function sotuvniBoglanganMalumotlarBilanBoyitish(
  sotuv: Sotuv,
  malumotlar: {
    mijozlar: MijozTanlovi[];
    mijozKompaniyalari: MijozTanlovi[];
    xodimlar: XodimTanlovi[];
    omborlar: OmborTanlovi[];
    qoldiqlar?: QoldiqTanlovi[];
  }
) {
  const customer = sotuv.customer ?? malumotlar.mijozlar.find((item) => item.id === sotuv.customerId);
  const clientCompany =
    sotuv.clientCompany ??
    malumotlar.mijozKompaniyalari.find((item) => item.id === sotuv.clientCompanyId);
  const responsible =
    sotuv.responsible ?? malumotlar.xodimlar.find((item) => item.id === sotuv.responsibleId);
  const warehouse = sotuv.warehouse ?? malumotlar.omborlar.find((item) => item.id === sotuv.warehouseId);
  const items = sotuv.items?.map((item) => {
    const qoldiq = malumotlar.qoldiqlar?.find(
      (qoldiqItem) => qoldiqItem.modificationId === item.modificationId
    );

    if (!qoldiq?.modification) return item;

    return {
      ...item,
      modification: {
        id: item.modification?.id ?? qoldiq.modification.id,
        name: item.modification?.name ?? qoldiq.modification.name,
        product: item.modification?.product ?? qoldiq.modification.product,
      },
    };
  });

  return {
    ...sotuv,
    customer,
    clientCompany,
    responsible,
    warehouse,
    items,
  };
}

type SavdoState = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
  omborlar: OmborTanlovi[];
  mijozlar: MijozTanlovi[];
  mijozKompaniyalari: MijozTanlovi[];
  xodimlar: XodimTanlovi[];
  qoldiqlar: QoldiqTanlovi[];
  tanlanganSotuv: Sotuv | null;
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  boshlangichMalumotlarniYuklash: () => Promise<void>;
  qoldiqlarniYuklash: (warehouseId?: string) => Promise<void>;
  sotuvTafsilotiniYuklash: (sotuvId: string) => Promise<Sotuv | null>;
  yangiSotuvYaratish: (malumot: SotuvYaratishMalumoti) => Promise<Sotuv | null>;
  sotuvniYangilash: (
    sotuvId: string,
    malumot: Partial<SotuvYaratishMalumoti>
  ) => Promise<boolean>;
  sotuvniTasdiqlash: (sotuvId: string) => Promise<boolean>;
  sotuvgaTolovQoshish: (
    sotuvId: string,
    tolov: Pick<SotuvTolovi, "paymentType" | "amount">
  ) => Promise<boolean>;
  sotuvniBekorQilish: (sotuvId: string) => Promise<boolean>;
  yangiQaytarishYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<Qaytarish | null>;
  qaytarishTafsilotiniYuklash: (qaytarishId: string) => Promise<Qaytarish | null>;
  qaytarishniYangilash: (
    qaytarishId: string,
    malumot: Partial<QaytarishYaratishMalumoti>
  ) => Promise<Qaytarish | null>;
  qaytarishniTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  qaytarishniBekorQilish: (qaytarishId: string) => Promise<boolean>;
  tanlanganSotuvniTozalash: () => void;
  xatolikniTozalash: () => void;
};

export const useSavdoStore = create<SavdoState>((set, get) => ({
  sotuvlar: [],
  qaytarishlar: [],
  omborlar: [],
  mijozlar: [],
  mijozKompaniyalari: [],
  xodimlar: [],
  qoldiqlar: [],
  tanlanganSotuv: null,
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,

  boshlangichMalumotlarniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });

    try {
      const [
        sotuvlar,
        qaytarishlar,
        omborlar,
        mijozlar,
        mijozKompaniyalari,
        xodimlar,
        stockQoldiqlar,
        katalogQoldiqlar,
      ] = await Promise.all([
        sotuvlarRoyxatiniOlish(),
        qaytarishlarRoyxatiniOlish(),
        omborlarRoyxatiniOlish(),
        mijozlarRoyxatiniOlish(),
        mijozKompaniyalariRoyxatiniOlish(),
        xodimlarRoyxatiniOlish(),
        omborQoldiqlariniOlish(),
        katalogModifikatsiyalariniQoldiqTanlovigaOlish(),
      ]);

      const qoldiqlar = await qoldiqNomlariniBoyitish(
        qoldiqlarniKatalogBilanBirlashtirish(stockQoldiqlar, katalogQoldiqlar)
      );
      const boglanganMalumotlar = { mijozlar, mijozKompaniyalari, xodimlar, omborlar, qoldiqlar };

      set({
        sotuvlar: sotuvlar.map((sotuv) =>
          sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, boglanganMalumotlar)
        ),
        qaytarishlar,
        omborlar,
        mijozlar,
        mijozKompaniyalari,
        xodimlar,
        qoldiqlar,
        yuklanmoqda: false,
      });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  qoldiqlarniYuklash: async (warehouseId) => {
    try {
      const [stockQoldiqlar, katalogQoldiqlar] = await Promise.all([
        omborQoldiqlariniOlish(warehouseId),
        katalogModifikatsiyalariniQoldiqTanlovigaOlish(),
      ]);
      const qoldiqlar = await qoldiqNomlariniBoyitish(
        qoldiqlarniKatalogBilanBirlashtirish(stockQoldiqlar, katalogQoldiqlar)
      );
      set({ qoldiqlar });
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
    }
  },

  sotuvTafsilotiniYuklash: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const sotuv = await sotuvTafsilotiniOlish(sotuvId);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, get());
      set({ tanlanganSotuv: boyitilgan, amalBajarilmoqda: false });
      return boyitilgan;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  yangiSotuvYaratish: async (malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const sotuv = await sotuvYaratish(malumot);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, get());
      set((state) => ({
        sotuvlar: [boyitilgan, ...state.sotuvlar],
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      return boyitilgan;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  sotuvniYangilash: async (sotuvId, malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await sotuvniYangilashApi(sotuvId, malumot);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(yangilangan, get());
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? boyitilgan : sotuv
        ),
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  sotuvniTasdiqlash: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const tekshiriladiganSotuv = await sotuvTafsilotiniOlish(sotuvId);

      if (
        sotuvQarzdorlikSummasi(tekshiriladiganSotuv) > 0 &&
        !tekshiriladiganSotuv.customerId &&
        !tekshiriladiganSotuv.customer?.id &&
        !tekshiriladiganSotuv.clientCompanyId &&
        !tekshiriladiganSotuv.clientCompany?.id
      ) {
        set({
          amalBajarilmoqda: false,
          xatolik: "Qarzga sotuv uchun xaridorni tanlang.",
        });
        return false;
      }

      const yangilangan = await sotuvniTasdiqlash(sotuvId);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(yangilangan, get());
      const warehouseId =
        yangilangan.warehouseId ?? get().sotuvlar.find((sotuv) => sotuv.id === sotuvId)?.warehouseId;
      if (warehouseId) {
        await get().qoldiqlarniYuklash(warehouseId);
      }
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? boyitilgan : sotuv
        ),
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { sotuvId } }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  sotuvgaTolovQoshish: async (sotuvId, tolov) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await sotuvgaTolovQoshishApi(sotuvId, tolov);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(yangilangan, get());
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? boyitilgan : sotuv
        ),
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { sotuvId } }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  sotuvniBekorQilish: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await sotuvniBekorQilish(sotuvId);
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish(yangilangan, get());
      const warehouseId =
        yangilangan.warehouseId ?? get().sotuvlar.find((sotuv) => sotuv.id === sotuvId)?.warehouseId;
      if (warehouseId) {
        await get().qoldiqlarniYuklash(warehouseId);
      }
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) =>
          sotuv.id === sotuvId ? boyitilgan : sotuv
        ),
        tanlanganSotuv: boyitilgan,
        amalBajarilmoqda: false,
      }));
      window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { sotuvId } }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  yangiQaytarishYaratish: async (malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const qaytarish = await qaytarishYaratish(malumot);
      set((state) => ({
        qaytarishlar: [qaytarish, ...state.qaytarishlar],
        amalBajarilmoqda: false,
      }));
      return qaytarish;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  qaytarishTafsilotiniYuklash: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const qaytarish = await qaytarishTafsilotiniOlish(qaytarishId);
      set({ amalBajarilmoqda: false });
      return qaytarish;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  qaytarishniYangilash: async (qaytarishId, malumot) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const yangilangan = await qaytarishniYangilash(qaytarishId, malumot);
      set((state) => ({
        qaytarishlar: state.qaytarishlar.map((qaytarish) =>
          qaytarish.id === qaytarishId ? yangilangan : qaytarish
        ),
        amalBajarilmoqda: false,
      }));
      return yangilangan;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  qaytarishniTasdiqlash: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await qaytarishniTasdiqlash(qaytarishId);

      try {
        await qaytarishToloviniKassagaYozish(yangilangan);
      } catch (error) {
        set({ xatolik: `Qaytarish tasdiqlandi, lekin to'lov qaytarimi kassaga yozilmadi: ${getApiErrorMessage(error)}` });
      }

      const [sotuvlar, qaytarishlar] = await Promise.all([
        sotuvlarRoyxatiniOlish(),
        qaytarishlarRoyxatiniOlish(),
      ]);
      const qoldiqlarniYangilashKerak = yangilangan.warehouseId;

      if (qoldiqlarniYangilashKerak) {
        await get().qoldiqlarniYuklash(qoldiqlarniYangilashKerak);
      }

      const boglanganMalumotlar = get();
      set({
        sotuvlar: sotuvlar.map((sotuv) =>
          sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, boglanganMalumotlar)
        ),
        qaytarishlar,
        amalBajarilmoqda: false,
      });
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  qaytarishniBekorQilish: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const yangilangan = await qaytarishniBekorQilish(qaytarishId);
      set((state) => ({
        qaytarishlar: state.qaytarishlar.map((qaytarish) =>
          qaytarish.id === qaytarishId ? yangilangan : qaytarish
        ),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  tanlanganSotuvniTozalash: () => set({ tanlanganSotuv: null }),
  xatolikniTozalash: () => set({ xatolik: null }),
}));
