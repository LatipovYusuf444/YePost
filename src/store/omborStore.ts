import { create } from "zustand";
import {
  barchaModifikatsiyalar,
  chiqimApi,
  filiallarApi,
  inventarizatsiyaApi,
  kirimApi,
  kochirishApi,
  kompaniyalarApi,
  omborlarApi,
  omborMasullari as omborMasullariApi,
  omborQoldiqlari,
  xodimlar,
  yetkazibBeruvchiYaratish,
  yetkazibBeruvchilar,
} from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  ChiqimHujjati,
  ChiqimYaratishMalumoti,
  Filial,
  FilialYaratishMalumoti,
  InventarizatsiyaHujjati,
  InventarizatsiyaYaratishMalumoti,
  KirimHujjati,
  KirimYaratishMalumoti,
  Kompaniya,
  KompaniyaSaqlashMalumoti,
  KochirishHujjati,
  KochirishYaratishMalumoti,
  MahsulotModifikatsiyasi,
  NomliEntity,
  Ombor,
  OmborQoldigi,
  OmborSaqlashMalumoti,
} from "@/types/ombor";

type OmborState = {
  kompaniyalar: Kompaniya[];
  omborlar: Ombor[];
  filiallar: Filial[];
  kirimlar: KirimHujjati[];
  chiqimlar: ChiqimHujjati[];
  kochirishlar: KochirishHujjati[];
  inventarizatsiyalar: InventarizatsiyaHujjati[];
  qoldiqlar: OmborQoldigi[];
  modifikatsiyalar: MahsulotModifikatsiyasi[];
  yetkazibBeruvchilar: NomliEntity[];
  xodimlar: NomliEntity[];
  omborMasullari: NomliEntity[];
  yuklanmoqda: boolean;
  amalBajarilmoqda: boolean;
  xatolik: string | null;
  malumotlarniYuklash: () => Promise<void>;
  amalgaOshirilganlarniYuklash: () => Promise<void>;
  omborMalumotlariniYuklash: () => Promise<void>;
  kochirishMalumotlariniYuklash: () => Promise<void>;
  qoldiqlarniYuklash: (warehouseId?: string) => Promise<void>;
  kompaniyaOlish: (id: string) => Promise<Kompaniya | null>;
  kompaniyaYaratish: (data: KompaniyaSaqlashMalumoti) => Promise<boolean>;
  kompaniyaYangilash: (id: string, data: Partial<KompaniyaSaqlashMalumoti>) => Promise<boolean>;
  kompaniyaOchirish: (id: string) => Promise<boolean>;
  filialOlish: (id: string) => Promise<Filial | null>;
  omborYaratish: (data: OmborSaqlashMalumoti) => Promise<boolean>;
  omborOlish: (id: string) => Promise<Ombor | null>;
  omborYangilash: (id: string, data: Partial<OmborSaqlashMalumoti>) => Promise<boolean>;
  omborOchirish: (id: string) => Promise<boolean>;
  filialYaratish: (data: FilialYaratishMalumoti) => Promise<Filial | null>;
  filialYangilash: (id: string, data: Partial<FilialYaratishMalumoti>) => Promise<boolean>;
  filialOchirish: (id: string) => Promise<boolean>;
  yetkazibBeruvchiYaratish: (data: { name: string; phone?: string }) => Promise<boolean>;
  kirimYaratish: (data: KirimYaratishMalumoti) => Promise<KirimHujjati | null>;
  kirimOlish: (id: string) => Promise<KirimHujjati | null>;
  kirimYangilash: (id: string, data: Partial<KirimYaratishMalumoti>) => Promise<boolean>;
  kirimTasdiqlash: (id: string) => Promise<boolean>;
  kirimBekorQilish: (id: string) => Promise<boolean>;
  chiqimYaratish: (data: ChiqimYaratishMalumoti) => Promise<ChiqimHujjati | null>;
  chiqimOlish: (id: string) => Promise<ChiqimHujjati | null>;
  chiqimYangilash: (id: string, data: Partial<ChiqimYaratishMalumoti>) => Promise<boolean>;
  chiqimTasdiqlash: (id: string) => Promise<boolean>;
  chiqimBekorQilish: (id: string) => Promise<boolean>;
  kochirishYaratish: (data: KochirishYaratishMalumoti) => Promise<KochirishHujjati | null>;
  kochirishOlish: (id: string) => Promise<KochirishHujjati | null>;
  kochirishYangilash: (id: string, data: Partial<KochirishYaratishMalumoti>) => Promise<boolean>;
  kochirishJonatish: (id: string) => Promise<boolean>;
  kochirishQabulQilish: (id: string) => Promise<boolean>;
  kochirishBekorQilish: (id: string) => Promise<boolean>;
  inventarizatsiyaYaratish: (
    data: InventarizatsiyaYaratishMalumoti
  ) => Promise<InventarizatsiyaHujjati | null>;
  inventarizatsiyaOlish: (id: string) => Promise<InventarizatsiyaHujjati | null>;
  inventarizatsiyaYangilash: (id: string, data: Partial<InventarizatsiyaYaratishMalumoti>) => Promise<boolean>;
  inventarizatsiyaTasdiqlash: (id: string) => Promise<boolean>;
  xatolikniTozalash: () => void;
};

function hujjatniAlmashtirish<T extends { id: string }>(royxat: T[], hujjat: T) {
  return royxat.map((item) => (item.id === hujjat.id ? hujjat : item));
}

function kochirishHujjatiniAlmashtirish(
  royxat: KochirishHujjati[],
  hujjat: KochirishHujjati
) {
  return royxat.map((item) =>
    item.id === hujjat.id
      ? { ...item, ...hujjat, items: hujjat.items ?? item.items }
      : item
  );
}

async function omborlarniToliqlash(omborlar: Ombor[]) {
  return Promise.all(
    omborlar.map(async (ombor) => {
      try {
        const tafsilot = await omborlarApi.olish(ombor.id);
        return { ...ombor, ...tafsilot };
      } catch {
        return ombor;
      }
    })
  );
}

function qoldiqlarniBoglash(
  qoldiqlar: OmborQoldigi[],
  omborlar: Ombor[],
  modifikatsiyalar: MahsulotModifikatsiyasi[]
) {
  const omborMap = new Map(omborlar.map((ombor) => [ombor.id, ombor]));
  const modifikatsiyaMap = new Map(
    modifikatsiyalar.map((modifikatsiya) => [modifikatsiya.id, modifikatsiya])
  );

  return qoldiqlar.map((qoldiq) => ({
    ...qoldiq,
    warehouse: qoldiq.warehouse ?? (qoldiq.warehouseId ? omborMap.get(qoldiq.warehouseId) : undefined),
    modification: qoldiq.modification ?? modifikatsiyaMap.get(qoldiq.modificationId),
  }));
}

export const useOmborStore = create<OmborState>((set, get) => ({
  kompaniyalar: [],
  omborlar: [],
  filiallar: [],
  kirimlar: [],
  chiqimlar: [],
  kochirishlar: [],
  inventarizatsiyalar: [],
  qoldiqlar: [],
  modifikatsiyalar: [],
  yetkazibBeruvchilar: [],
  xodimlar: [],
  omborMasullari: [],
  yuklanmoqda: false,
  amalBajarilmoqda: false,
  xatolik: null,

  malumotlarniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const [
        kompaniyalar,
        omborlar,
        filiallar,
        kirimlar,
        chiqimlar,
        kochirishlar,
        inventarizatsiyalar,
        qoldiqlar,
        modifikatsiyalar,
        suppliers,
        users,
      ] = await Promise.all([
        kompaniyalarApi.royxat(),
        omborlarApi.royxat(),
        filiallarApi.royxat(),
        kirimApi.royxat(),
        chiqimApi.royxat(),
        kochirishApi.royxat(),
        inventarizatsiyaApi.royxat(),
        omborQoldiqlari(),
        barchaModifikatsiyalar(),
        yetkazibBeruvchilar(),
        xodimlar(),
      ]);
      set({
        kompaniyalar,
        omborlar,
        filiallar,
        kirimlar,
        chiqimlar,
        kochirishlar,
        inventarizatsiyalar,
        qoldiqlar: qoldiqlarniBoglash(qoldiqlar, omborlar, modifikatsiyalar),
        modifikatsiyalar,
        yetkazibBeruvchilar: suppliers,
        xodimlar: users,
        yuklanmoqda: false,
      });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  amalgaOshirilganlarniYuklash: async () => {
    if (get().yuklanmoqda) return;
    set({ yuklanmoqda: true, xatolik: null });

    const natijalar = await Promise.allSettled([
      kirimApi.royxat(),
      chiqimApi.royxat(),
      kochirishApi.royxat(),
      inventarizatsiyaApi.royxat(),
      omborlarApi.royxat(),
      xodimlar(),
    ] as const);

    const [kirimlar, chiqimlar, kochirishlar, inventarizatsiyalar, omborlar, users] =
      natijalar;
    const hujjatXatolari = natijalar.slice(0, 4).filter((natija) => natija.status === "rejected");

    set((state) => ({
      kirimlar: kirimlar.status === "fulfilled" ? kirimlar.value : state.kirimlar,
      chiqimlar: chiqimlar.status === "fulfilled" ? chiqimlar.value : state.chiqimlar,
      kochirishlar:
        kochirishlar.status === "fulfilled" ? kochirishlar.value : state.kochirishlar,
      inventarizatsiyalar:
        inventarizatsiyalar.status === "fulfilled"
          ? inventarizatsiyalar.value
          : state.inventarizatsiyalar,
      omborlar: omborlar.status === "fulfilled" ? omborlar.value : state.omborlar,
      xodimlar: users.status === "fulfilled" ? users.value : state.xodimlar,
      yuklanmoqda: false,
      xatolik:
        hujjatXatolari.length === 4
          ? "Amalga oshirilgan hujjatlarni yuklab bo'lmadi. Qayta urinib ko'ring."
          : hujjatXatolari.length > 0
            ? "Ayrim hujjatlar yuklanmadi. Mavjud ma'lumotlar ko'rsatildi."
            : null,
    }));
  },

  omborMalumotlariniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const [omborlar, filiallar, users, masullar] = await Promise.all([
        omborlarApi.royxat(),
        filiallarApi.royxat(),
        xodimlar(),
        omborMasullariApi(),
      ]);
      const toliqOmborlar = await omborlarniToliqlash(omborlar);
      set({
        omborlar: toliqOmborlar,
        filiallar,
        xodimlar: users,
        omborMasullari: masullar,
        yuklanmoqda: false,
      });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  kochirishMalumotlariniYuklash: async () => {
    set({ yuklanmoqda: true, xatolik: null });
    try {
      const [kochirishlar, omborlar, users, modifikatsiyalar] = await Promise.all([
        kochirishApi.royxat(),
        omborlarApi.royxat(),
        xodimlar(),
        barchaModifikatsiyalar().catch(() => []),
      ]);
      const toliqKochirishlar = await Promise.all(
        kochirishlar.map(async (hujjat) => {
          if (hujjat.items?.length) return hujjat;
          try {
            const tafsilot = await kochirishApi.olish(hujjat.id);
            return { ...hujjat, ...tafsilot, items: tafsilot.items ?? hujjat.items };
          } catch {
            return hujjat;
          }
        })
      );
      set({ kochirishlar: toliqKochirishlar, omborlar, xodimlar: users, modifikatsiyalar, yuklanmoqda: false });
    } catch (error) {
      set({ yuklanmoqda: false, xatolik: getApiErrorMessage(error) });
    }
  },

  qoldiqlarniYuklash: async (warehouseId) => {
    set({ xatolik: null });
    try {
      let { omborlar, modifikatsiyalar } = get();
      if (omborlar.length === 0 || modifikatsiyalar.length === 0) {
        [omborlar, modifikatsiyalar] = await Promise.all([
          omborlar.length ? Promise.resolve(omborlar) : omborlarApi.royxat(),
          modifikatsiyalar.length ? Promise.resolve(modifikatsiyalar) : barchaModifikatsiyalar(),
        ]);
      }
      const qoldiqlar = await omborQoldiqlari(warehouseId);
      set({
        omborlar,
        modifikatsiyalar,
        qoldiqlar: qoldiqlarniBoglash(qoldiqlar, omborlar, modifikatsiyalar),
        xatolik: null,
      });
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
    }
  },

  kompaniyaOlish: async (id) => {
    try {
      return await kompaniyalarApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  kompaniyaYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const kompaniya = await kompaniyalarApi.yaratish(data);
      set((state) => ({
        kompaniyalar: [kompaniya, ...state.kompaniyalar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kompaniyaYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const kompaniya = await kompaniyalarApi.yangilash(id, data);
      set((state) => ({
        kompaniyalar: hujjatniAlmashtirish(state.kompaniyalar, kompaniya),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kompaniyaOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await kompaniyalarApi.ochirish(id);
      set((state) => ({
        kompaniyalar: state.kompaniyalar.filter((item) => item.id !== id),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  filialOlish: async (id) => {
    try {
      return await filiallarApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  omborYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const ombor = await omborlarApi.yaratish(data);
      const toliqOmbor = { ...data, ...ombor };
      set((state) => ({
        omborlar: [toliqOmbor, ...state.omborlar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  omborOlish: async (id) => {
    try {
      return await omborlarApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },

  omborYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const ombor = await omborlarApi.yangilash(id, data);
      set((state) => ({
        omborlar: state.omborlar.map((item) =>
          item.id === id ? { ...item, ...data, ...ombor } : item
        ),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  omborOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await omborlarApi.ochirish(id);
      set((state) => ({
        omborlar: state.omborlar.filter((ombor) => ombor.id !== id),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  filialYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const filial = await filiallarApi.yaratish(data);
      set((state) => ({
        filiallar: [filial, ...state.filiallar],
        amalBajarilmoqda: false,
      }));
      return filial;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  filialYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const filial = await filiallarApi.yangilash(id, data);
      set((state) => ({
        filiallar: hujjatniAlmashtirish(state.filiallar, filial),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  filialOchirish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      await filiallarApi.ochirish(id);
      set((state) => ({
        filiallar: state.filiallar.filter((item) => item.id !== id),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  yetkazibBeruvchiYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const supplier = await yetkazibBeruvchiYaratish(data);
      set((state) => ({
        yetkazibBeruvchilar: [supplier, ...state.yetkazibBeruvchilar],
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  kirimYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kirimApi.yaratish(data);
      set((state) => ({ kirimlar: [hujjat, ...state.kirimlar], amalBajarilmoqda: false }));
      return hujjat;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  kirimOlish: async (id) => {
    try {
      return await kirimApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  kirimYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kirimApi.yangilash(id, data);
      set((state) => ({
        kirimlar: hujjatniAlmashtirish(state.kirimlar, hujjat),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kirimTasdiqlash: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kirimApi.tasdiqlash(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        kirimlar: hujjatniAlmashtirish(state.kirimlar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kirimBekorQilish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kirimApi.bekorQilish(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        kirimlar: hujjatniAlmashtirish(state.kirimlar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  chiqimYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await chiqimApi.yaratish(data);
      set((state) => ({ chiqimlar: [hujjat, ...state.chiqimlar], amalBajarilmoqda: false }));
      return hujjat;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  chiqimOlish: async (id) => {
    try {
      return await chiqimApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  chiqimYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await chiqimApi.yangilash(id, data);
      set((state) => ({
        chiqimlar: hujjatniAlmashtirish(state.chiqimlar, hujjat),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  chiqimTasdiqlash: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await chiqimApi.tasdiqlash(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        chiqimlar: hujjatniAlmashtirish(state.chiqimlar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  chiqimBekorQilish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await chiqimApi.bekorQilish(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        chiqimlar: hujjatniAlmashtirish(state.chiqimlar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  kochirishYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kochirishApi.yaratish(data);
      const toliqHujjat = { ...hujjat, items: hujjat.items ?? data.items };
      set((state) => ({
        kochirishlar: [toliqHujjat, ...state.kochirishlar],
        amalBajarilmoqda: false,
      }));
      return toliqHujjat;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  kochirishOlish: async (id) => {
    try {
      return await kochirishApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  kochirishYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kochirishApi.yangilash(id, data);
      set((state) => ({
        kochirishlar: kochirishHujjatiniAlmashtirish(state.kochirishlar, hujjat),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kochirishJonatish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kochirishApi.jonatish(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        kochirishlar: kochirishHujjatiniAlmashtirish(state.kochirishlar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kochirishQabulQilish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kochirishApi.qabulQilish(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        kochirishlar: kochirishHujjatiniAlmashtirish(state.kochirishlar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  kochirishBekorQilish: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await kochirishApi.bekorQilish(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        kochirishlar: kochirishHujjatiniAlmashtirish(state.kochirishlar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  inventarizatsiyaYaratish: async (data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await inventarizatsiyaApi.yaratish(data);
      set((state) => ({
        inventarizatsiyalar: [hujjat, ...state.inventarizatsiyalar],
        amalBajarilmoqda: false,
      }));
      return hujjat;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  inventarizatsiyaOlish: async (id) => {
    try {
      return await inventarizatsiyaApi.olish(id);
    } catch (error) {
      set({ xatolik: getApiErrorMessage(error) });
      return null;
    }
  },
  inventarizatsiyaYangilash: async (id, data) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await inventarizatsiyaApi.yangilash(id, data);
      set((state) => ({
        inventarizatsiyalar: hujjatniAlmashtirish(
          state.inventarizatsiyalar,
          hujjat
        ),
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },
  inventarizatsiyaTasdiqlash: async (id) => {
    set({ amalBajarilmoqda: true, xatolik: null });
    try {
      const hujjat = await inventarizatsiyaApi.tasdiqlash(id);
      const { omborlar, modifikatsiyalar } = get();
      const qoldiqlar = qoldiqlarniBoglash(await omborQoldiqlari(), omborlar, modifikatsiyalar);
      set((state) => ({
        inventarizatsiyalar: hujjatniAlmashtirish(state.inventarizatsiyalar, hujjat),
        qoldiqlar,
        amalBajarilmoqda: false,
      }));
      return true;
    } catch (error) {
      set({ amalBajarilmoqda: false, xatolik: getApiErrorMessage(error) });
      return false;
    }
  },

  xatolikniTozalash: () => set({ xatolik: null }),
}));
