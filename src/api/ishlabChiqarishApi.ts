import apiClient from "./axios";
import { apiData, apiList, sahifaJavobi, type ApiEnvelope, type ApiListEnvelope } from "./response";
import { idempotentBajarish } from "@/lib/idempotentKalit";
import { mavjudlikOqish, portlashOqish } from "@/lib/ishlabChiqarish";
import type {
  BerishTanasi,
  Buyurtma,
  BuyurtmaTanasi,
  IshlabChiqarishSozlamasi,
  KalkulyatsiyaKartasi,
  KalkulyatsiyaTanasi,
  KunNarxi,
  NavbatQatori,
  Retsept,
  RetseptTanasi,
  Rulon,
  RulonXulosasi,
  SexdanQaytarish,
  SexgaBerish,
  SmenaHisoboti,
  SmenaTanasi,
} from "@/types/ishlabChiqarish";

// Ishlab chiqarish moduli. Modul yoqilmaguncha hamma yo'l 403 errors.production.disabled qaytaradi.
// Xatolar ekranning o'zida (maydon yonida) ko'rsatiladi, shuning uchun umumiy qizil toast chiqmaydi.
const FON = { xatoniYashirish: true };
const YOL = "/production";

type Parametrlar = Record<string, string | number | undefined>;
const tozaParams = (params?: Parametrlar) =>
  params && Object.fromEntries(Object.entries(params).filter(([, qiymat]) => qiymat !== undefined && qiymat !== ""));

const olish = async <T>(url: string, params?: Parametrlar) => apiData((await apiClient.get<T | ApiEnvelope<T>>(url, { ...FON, params: tozaParams(params) })).data);
const royxat = async <T>(url: string, params?: Parametrlar) =>
  apiList((await apiClient.get<T[] | ApiListEnvelope<T>>(url, { ...FON, params: tozaParams(params) })).data);
const yuborish = async <T>(url: string, tana?: unknown, sarlavhalar?: Record<string, string>) =>
  apiData((await apiClient.post<T | ApiEnvelope<T>>(url, tana, { ...FON, ...(sarlavhalar ? { headers: sarlavhalar } : {}) })).data);
const ozgartirish = async <T>(url: string, tana: unknown, usul: "patch" | "put" = "patch") =>
  apiData((await apiClient[usul]<T | ApiEnvelope<T>>(url, tana, FON)).data);
const ochirish = async (url: string) => {
  await apiClient.delete(url, FON);
};

/** Planshetdan yuboriladigan tugmalar: bir bosishga bitta `Idempotency-Key`. */
const idempotent = <T>(url: string, tana?: unknown) =>
  idempotentBajarish(`POST ${url}`, tana, (kalit) => yuborish<T>(url, tana, { "Idempotency-Key": kalit }));

function crud<T, Tana>(yol: string) {
  return {
    royxat: (params?: Parametrlar) => royxat<T>(yol, params),
    olish: (id: string) => olish<T>(`${yol}/${id}`),
    yaratish: (tana: Tana) => yuborish<T>(yol, tana),
    yangilash: (id: string, tana: Partial<Tana>) => ozgartirish<T>(`${yol}/${id}`, tana),
    ochirish: (id: string) => ochirish(`${yol}/${id}`),
  };
}

export const ishlabChiqarishApi = {
  sozlamaOlish: () => olish<IshlabChiqarishSozlamasi>(`${YOL}/settings`),
  sozlamaSaqlash: (tana: Partial<IshlabChiqarishSozlamasi>) => ozgartirish<IshlabChiqarishSozlamasi>(`${YOL}/settings`, tana, "put"),

  retseptlar: {
    ...crud<Retsept, RetseptTanasi>(`${YOL}/recipes`),
    faollashtirish: (id: string) => yuborish<Retsept>(`${YOL}/recipes/${id}/activate`),
    yangiVersiya: (id: string) => yuborish<Retsept>(`${YOL}/recipes/${id}/new-version`),
    // «300 uchun nima kerak»; qty=1 kalkulyatsiya kartasiga miqdorlarni olish uchun.
    portlash: async (id: string, qty: number) => portlashOqish(await olish<unknown>(`${YOL}/recipes/${id}/explode`, { qty })),
  },

  kalkulyatsiya: {
    ...crud<KalkulyatsiyaKartasi, KalkulyatsiyaTanasi>(`${YOL}/costing-cards`),
    faollashtirish: (id: string) => yuborish<KalkulyatsiyaKartasi>(`${YOL}/costing-cards/${id}/activate`),
    arxivlash: (id: string) => yuborish<KalkulyatsiyaKartasi>(`${YOL}/costing-cards/${id}/archive`),
    yangiVersiya: (id: string) => yuborish<KalkulyatsiyaKartasi>(`${YOL}/costing-cards/${id}/new-version`),
    kunNarxi: (modificationId: string, date: string) => olish<KunNarxi>(`${YOL}/costing-cards/price`, { modificationId, date }),
  },

  buyurtmalar: {
    ...crud<Buyurtma, BuyurtmaTanasi>(`${YOL}/orders`),
    // Yetishmovchilik faqat ogohlantirish: buyurtma baribir chiqariladi, material band qilinmaydi.
    chiqarish: async (id: string) => {
      const javob = await yuborish<Buyurtma & { availability?: unknown }>(`${YOL}/orders/${id}/release`);
      return { ...javob, availability: mavjudlikOqish(javob?.availability) };
    },
    mavjudlik: async (id: string) => mavjudlikOqish(await olish<unknown>(`${YOL}/orders/${id}/availability`)),
    yakunlash: (id: string, reason?: string) => yuborish<Buyurtma>(`${YOL}/orders/${id}/complete`, reason ? { reason } : {}),
    yopish: (id: string) => yuborish<Buyurtma>(`${YOL}/orders/${id}/close`),
    bekorQilish: (id: string) => yuborish<Buyurtma>(`${YOL}/orders/${id}/cancel`),
  },

  berishlar: {
    ...crud<SexgaBerish, BerishTanasi>(`${YOL}/issues`),
    buyurtmadan: (orderId: string) => yuborish<SexgaBerish>(`${YOL}/issues/from-order/${orderId}`),
    tasdiqlash: (id: string) => idempotent<SexgaBerish>(`${YOL}/issues/${id}/confirm`),
    bekorQilish: (id: string) => yuborish<SexgaBerish>(`${YOL}/issues/${id}/cancel`),
  },

  qaytarishlar: {
    royxat: (params?: Parametrlar) => royxat<SexdanQaytarish>(`${YOL}/wip-returns`, params),
    yaratish: (tana: { issueId: string; lines: Array<{ issueLineId: string; quantity?: number }> }) => yuborish<SexdanQaytarish>(`${YOL}/wip-returns`, tana),
    tasdiqlash: (id: string) => yuborish<SexdanQaytarish>(`${YOL}/wip-returns/${id}/confirm`),
    bekorQilish: (id: string) => yuborish<SexdanQaytarish>(`${YOL}/wip-returns/${id}/cancel`),
  },

  smena: {
    navbat: (warehouseId?: string) => royxat<NavbatQatori>(`${YOL}/reports/queue`, { warehouseId }),
    royxat: (params?: Parametrlar) => royxat<SmenaHisoboti>(`${YOL}/reports`, params),
    olish: (id: string) => olish<SmenaHisoboti>(`${YOL}/reports/${id}`),
    yaratish: (tana: SmenaTanasi) => idempotent<SmenaHisoboti>(`${YOL}/reports`, tana),
    yangilash: (id: string, tana: Partial<SmenaTanasi>) => ozgartirish<SmenaHisoboti>(`${YOL}/reports/${id}`, tana),
    ochirish: (id: string) => ochirish(`${YOL}/reports/${id}`),
    tasdiqlash: (id: string) => idempotent<SmenaHisoboti>(`${YOL}/reports/${id}/confirm`),
    bekorQilish: (id: string, reason?: string) => yuborish<SmenaHisoboti>(`${YOL}/reports/${id}/cancel`, reason ? { reason } : {}),
    tuzatish: (id: string, tana: { outputId: string; delta: number; reason: string }) => idempotent<SmenaHisoboti>(`${YOL}/reports/${id}/corrections`, tana),
  },

  rulonlar: {
    royxat: async (params: Parametrlar) => {
      const page = Number(params.page ?? 1);
      const pageSize = Number(params.pageSize ?? 50);
      const javob = (await apiClient.get<unknown>(`${YOL}/rolls`, { ...FON, params: tozaParams(params) })).data;
      return sahifaJavobi<Rulon>(javob, page, pageSize);
    },
    xulosa: (warehouseId?: string) => royxat<RulonXulosasi>(`${YOL}/rolls/summary`, { warehouseId }),
    seriyaBoyicha: (serial: string) => olish<Rulon>(`${YOL}/rolls/by-serial/${encodeURIComponent(serial)}`),
    // 58×40 mm PDF yorliq (Code 128 + QR).
    yorliq: async (batchId: string) => (await apiClient.get<Blob>(`${YOL}/rolls/${batchId}/label`, { ...FON, responseType: "blob" })).data,
  },
};

/** Yorliqni yangi oynada ochadi. Oyna so'rovdan oldin ochiladi: brauzer uni popup deb bloklamaydi. */
export async function yorliqniChopEtish(batchId: string) {
  const oyna = window.open("", "_blank");
  try {
    const url = URL.createObjectURL(await ishlabChiqarishApi.rulonlar.yorliq(batchId));
    if (oyna) oyna.location.href = url;
    else window.location.assign(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    oyna?.close();
    throw error;
  }
}
