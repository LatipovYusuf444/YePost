import axios from "axios";
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
  qaytarishniOchirish,
  qaytarishniTiklash,
  qaytarishniYangilash,
  qaytarishniTasdiqlash,
  qaytarishYaratish,
  sotuvlarRoyxatiniOlish,
  sotuvniBekorQilish,
  sotuvniOchirish,
  sotuvniTasdiqlash,
  sotuvniTiklash,
  sotuvgaTolovQoshish as sotuvgaTolovQoshishApi,
  sotuvTafsilotiniOlish,
  sotuvniYangilash as sotuvniYangilashApi,
  sotuvYaratish,
  xodimlarRoyxatiniOlish,
} from "@/api/savdoApi";
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
import { sotuvQarzdorlikSummasi } from "@/Pages/Savdo/savdoYordamchilari";

function xatolikKodi(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const response = (error as { response?: { data?: { code?: string } } }).response;
  return response?.data?.code;
}

function tasdiqlashXatoligiMatni(error: unknown) {
  if (xatolikKodi(error) === "errors.inventory.out_of_stock") {
    return "Ombordagi mahsulot qoldig'i yetarli emas. Sotuvni tasdiqlashdan oldin ombor qoldig'ini to'ldiring yoki sotuvdagi miqdorni kamaytiring.";
  }
  return getApiErrorMessage(error);
}

type SavdoSet = (partial: Partial<SavdoState>) => void;

// Qaytarishni bekor qilish/tiklashdan keyin sotuvdagi qarz va ombor qoldig'i backenddan qayta olinadi
// (qarz, qoldiq va refundni backend o'zi o'zgartiradi — frontend hech narsa hisoblamaydi).
async function sotuvVaQoldiqniYangilash(set: SavdoSet, get: () => SavdoState, warehouseId?: string) {
  try {
    const sotuvlar = await sotuvlarRoyxatiniOlish();
    const boglanganMalumotlar = get();
    set({ sotuvlar: sotuvlar.map((sotuv) => sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, boglanganMalumotlar)) });
    if (warehouseId) await get().qoldiqlarniYuklash(warehouseId);
  } catch {
    // Yangilash muvaffaqiyatsiz bo'lsa ham asosiy amal bajarilgan; ma'lumot keyingi yuklashda yangilanadi.
  }
}

function qoldiqBirlashtirishKaliti(item: Pick<QoldiqTanlovi, "modificationId" | "warehouseId">) {
  // Bitta mahsulot bir nechta omborda alohida qoldiqqa ega bo'lishi mumkin,
  // shuning uchun faqat modificationId emas, ombor bilan birga kalit qilinadi
  // (aks holda bir xil mahsulotning boshqa ombordagi qoldig'i tasodifan
  // ustidan yozilib, yo'qolib qolar edi).
  return item.warehouseId ? `${item.modificationId}::${item.warehouseId}` : item.modificationId;
}

function qoldiqlarniKatalogBilanBirlashtirish(
  stockQoldiqlar: QoldiqTanlovi[],
  katalogQoldiqlar: QoldiqTanlovi[]
) {
  const map = new Map<string, QoldiqTanlovi>();

  for (const item of katalogQoldiqlar) {
    if (!item.modificationId) continue;
    map.set(qoldiqBirlashtirishKaliti(item), item);
  }

  for (const item of stockQoldiqlar) {
    const kalit = qoldiqBirlashtirishKaliti(item);
    // ID'si yo'q qator boshqa mahsulotning katalog yozuvi bilan aralashib ketmasligi uchun izlanmaydi.
    const katalogItem = item.modificationId ? map.get(kalit) ?? map.get(item.modificationId) : undefined;
    const modification = item.modification ?? katalogItem?.modification;

    map.set(kalit, {
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
  sotuvniOchirish: (sotuvId: string) => Promise<boolean>;
  sotuvniTiklash: (sotuvId: string) => Promise<boolean>;
  yangiQaytarishYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<Qaytarish | null>;
  qaytarishTafsilotiniYuklash: (qaytarishId: string) => Promise<Qaytarish | null>;
  qaytarishniYangilash: (
    qaytarishId: string,
    malumot: Partial<QaytarishYaratishMalumoti>
  ) => Promise<Qaytarish | null>;
  qaytarishniTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  qaytarishniBekorQilish: (qaytarishId: string) => Promise<boolean>;
  qaytarishniOchirish: (qaytarishId: string) => Promise<boolean>;
  qaytarishniTiklash: (qaytarishId: string) => Promise<boolean>;
  sotuvlarniBoyitish: (sotuvlar: Sotuv[]) => Sotuv[];
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
      set({ amalBajarilmoqda: false, xatolik: tasdiqlashXatoligiMatni(error) });
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

  sotuvniOchirish: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      await sotuvniOchirish(sotuvId);
      set((state) => ({
        sotuvlar: state.sotuvlar.filter((sotuv) => sotuv.id !== sotuvId),
        tanlanganSotuv: state.tanlanganSotuv?.id === sotuvId ? null : state.tanlanganSotuv,
        amalBajarilmoqda: false,
      }));
      window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { sotuvId } }));
      return true;
    } catch (error) {
      // Xatolik toasti axios interceptor orqali allaqachon ko'rsatilgan.
      // Sotuv shu orada tasdiqlangan/o'chirilgan bo'lishi mumkin — ro'yxatni backend holatiga moslaymiz.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      let haqiqiy: Sotuv | null = null;
      if (status === 400) {
        try {
          haqiqiy = sotuvniBoglanganMalumotlarBilanBoyitish(await sotuvTafsilotiniOlish(sotuvId), get());
        } catch {
          haqiqiy = null;
        }
      }
      set((state) => ({
        sotuvlar:
          status === 404
            ? state.sotuvlar.filter((sotuv) => sotuv.id !== sotuvId)
            : haqiqiy
              ? state.sotuvlar.map((sotuv) => (sotuv.id === sotuvId ? haqiqiy : sotuv))
              : state.sotuvlar,
        amalBajarilmoqda: false,
      }));
      // Boshqa sahifalardagi (masalan, Ombor → Amalga oshirilganlar) ro'yxat ham moslansin.
      window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { sotuvId } }));
      return false;
    }
  },

  sotuvniTiklash: async (sotuvId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const tiklangan = await sotuvniTiklash(sotuvId);
      const mavjud = get().sotuvlar.find((sotuv) => sotuv.id === sotuvId);
      // Javobda bog'langan maydonlar (mijoz, mahsulotlar) bo'lmasligi mumkin — avvalgi nusxa bilan birlashtiramiz.
      const boyitilgan = sotuvniBoglanganMalumotlarBilanBoyitish({ ...mavjud, ...tiklangan }, get());
      set((state) => ({
        sotuvlar: state.sotuvlar.map((sotuv) => (sotuv.id === sotuvId ? boyitilgan : sotuv)),
        tanlanganSotuv: state.tanlanganSotuv?.id === sotuvId ? boyitilgan : state.tanlanganSotuv,
        amalBajarilmoqda: false,
      }));
      window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { sotuvId } }));
      return true;
    } catch {
      // Xatolik toasti axios interceptor orqali allaqachon ko'rsatilgan (masalan, tasdiqlangan qaytarishi bor sotuv).
      // Sotuv shu orada o'zgargan bo'lishi mumkin — backenddagi holatga moslaymiz.
      try {
        const haqiqiy = sotuvniBoglanganMalumotlarBilanBoyitish(await sotuvTafsilotiniOlish(sotuvId), get());
        set((state) => ({
          sotuvlar: state.sotuvlar.map((sotuv) => (sotuv.id === sotuvId ? haqiqiy : sotuv)),
          amalBajarilmoqda: false,
        }));
      } catch {
        set({ amalBajarilmoqda: false });
      }
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
        // Ro'yxatdan (tafsilot oynasi ochilmagan holda) bekor qilinsa, oyna o'zi ochilib qolmasin.
        tanlanganSotuv: state.tanlanganSotuv?.id === sotuvId ? boyitilgan : state.tanlanganSotuv,
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
      // POST /returns/{id}/confirm: refundAmount, debtReduction, ombor qoldig'i va kassa/balans yozuvlarini backend o'zi bajaradi.
      // Frontend qo'shimcha kassa operatsiyasi (CUSTOMER_REFUND) YARATMAYDI — aks holda pul ikki marta chiqib ketadi.
      const yangilangan = await qaytarishniTasdiqlash(qaytarishId);

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

  qaytarishniOchirish: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      await qaytarishniOchirish(qaytarishId);
      set((state) => ({
        qaytarishlar: state.qaytarishlar.filter((qaytarish) => qaytarish.id !== qaytarishId),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      // Xatolik toasti axios interceptor orqali allaqachon ko'rsatilgan.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      let haqiqiy: Qaytarish | null = null;
      if (status === 400) {
        try {
          haqiqiy = await qaytarishTafsilotiniOlish(qaytarishId);
        } catch {
          haqiqiy = null;
        }
      }
      set((state) => ({
        qaytarishlar:
          status === 404
            ? state.qaytarishlar.filter((qaytarish) => qaytarish.id !== qaytarishId)
            : haqiqiy
              ? state.qaytarishlar.map((qaytarish) => (qaytarish.id === qaytarishId ? haqiqiy : qaytarish))
              : state.qaytarishlar,
        amalBajarilmoqda: false,
      }));
      return false;
    }
  },

  qaytarishniTiklash: async (qaytarishId) => {
    set({ amalBajarilmoqda: true, xatolik: null });

    try {
      const tiklangan = await qaytarishniTiklash(qaytarishId);
      set((state) => ({
        qaytarishlar: state.qaytarishlar.map((qaytarish) =>
          qaytarish.id === qaytarishId ? { ...qaytarish, ...tiklangan } : qaytarish
        ),
        amalBajarilmoqda: false,
      }));
      await sotuvVaQoldiqniYangilash(set, get, tiklangan.warehouseId);
      return true;
    } catch {
      // Xatolik toasti axios interceptor orqali allaqachon ko'rsatilgan.
      try {
        const haqiqiy = await qaytarishTafsilotiniOlish(qaytarishId);
        set((state) => ({
          qaytarishlar: state.qaytarishlar.map((qaytarish) => (qaytarish.id === qaytarishId ? haqiqiy : qaytarish)),
          amalBajarilmoqda: false,
        }));
      } catch {
        set({ amalBajarilmoqda: false });
      }
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
      await sotuvVaQoldiqniYangilash(set, get, yangilangan.warehouseId);
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  // Server sahifasidan kelgan sotuvlarga mijoz, xodim va ombor nomlarini (yuklangan ro'yxatlardan) biriktiradi.
  sotuvlarniBoyitish: (sotuvlar) => sotuvlar.map((sotuv) => sotuvniBoglanganMalumotlarBilanBoyitish(sotuv, get())),
  tanlanganSotuvniTozalash: () => set({ tanlanganSotuv: null }),
  xatolikniTozalash: () => set({ xatolik: null }),
}));
