import apiClient from "./axios";
import { idempotentPost } from "./idempotentSorov";
import { ogohlantirishBilanBajarish } from "./hujjatOgohlantirishi";
import { bekorQilishSababi } from "../lib/bekorQilishSababi.ts";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import { qatorniQaytaYuborish } from "../lib/kopBirlik";
import { rejimgaMosEmasValyuta } from "../lib/qoralamaTahriri";
import { useValyutaStore, yagonaValyuta } from "../lib/valyuta";
import { xatolikXabari } from "../lib/toast";
import { sotuvSummasi, sotuvValyutasi } from "../Pages/Savdo/savdoYordamchilari";
import i18n from "i18next";
import { valyutaYokiAsosiy } from "../lib/asosiyValyuta.ts";
import type {
  DraftSale,
  DraftSaleItem,
  DraftStatus,
  Sotuv,
  SotuvMahsuloti,
  SotuvYaratishMalumoti,
} from "@/types/savdo";

type RoyxatJavobi<T> = T[] | { value?: T[]; items?: T[]; results?: T[]; data?: T[] };

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function draftStatus(status?: string): DraftStatus {
  const normalized = String(status ?? "DRAFT").toUpperCase();
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "cancelled";
  if (normalized === "CONFIRMED" || normalized === "PAID") return "paid";
  if (normalized === "WAITING") return "waiting";
  if (normalized === "EDITING") return "editing";
  return "draft";
}

function customerName(sale: Sotuv) {
  return (
    [sale.customer?.firstName, sale.customer?.lastName].filter(Boolean).join(" ") ||
    sale.customer?.fullName ||
    sale.customer?.name ||
    sale.clientCompany?.name ||
    sale.clientCompany?.fullName ||
    sale.walkInCustomerName?.trim() ||
    "Mijoz tanlanmagan"
  );
}

function productName(item: SotuvMahsuloti) {
  return (
    item.modification?.product?.name ||
    item.modification?.name ||
    item.modificationId ||
    "Mahsulot"
  );
}

export function saleToDraftSale(sale: Sotuv): DraftSale {
  const items: DraftSaleItem[] = (sale.items ?? []).map((item) => {
    const quantity = numberValue(item.quantity);
    const unitPrice = numberValue(item.price);
    const discount = numberValue(item.discount);
    return {
      productId: item.modification?.product?.id,
      productName: productName(item),
      barcode: undefined,
      quantity,
      unitPrice,
      discount,
      totalPrice: numberValue(item.total ?? quantity * unitPrice - discount),
      stockAvailable: 0,
    };
  });
  // Backend jami; u 0 bo'lsa (rejim almashguncha yaratilgan qoralama) — qatorlar yoki `totalsByCurrency` bo'yicha (sotuv valyutasida).
  const totalAmount = sotuvSummasi(sale);
  // Aralash sotuvda qator chegirmalari turli valyutada bo'lishi mumkin — ularni qo'shib bo'lmaydi, faqat backend `discountAmount` olinadi.
  const saleCurrency = sotuvValyutasi(sale);
  const aralash = (sale.items ?? []).some((item) => String(item.currency ?? saleCurrency).toUpperCase() !== saleCurrency);
  const discountAmount =
    numberValue(sale.discountAmount) ||
    (aralash ? 0 : items.reduce((sum, item) => sum + item.discount, 0));

  return {
    id: sale.id,
    draftNumber: sale.documentNumber || sale.number || sale.docNumber || sale.id.slice(0, 8),
    customerId: sale.customerId || sale.clientCompanyId,
    customerName: customerName(sale),
    customerPhone: sale.customer?.phone || sale.clientCompany?.phone || sale.walkInCustomerPhone || "",
    items,
    totalAmount,
    discountAmount,
    finalAmount: Math.max(totalAmount - discountAmount, 0),
    // Ko'rsatish valyutasi: bir valyutali rejimdagi ochiq qoralama — haqiqiy (qatorlar) valyutasi ("1.18 so'm" emas, "$1.18").
    currency: sotuvValyutasi(sale),
    status: draftStatus(sale.status),
    note: sale.note,
    responsibleUserId: sale.responsibleId,
    responsibleUserName:
      sale.responsible?.fullName || sale.responsible?.name || sale.responsible?.email || "Biriktirilmagan",
    createdAt: sale.createdAt || sale.date,
    updatedAt: sale.updatedAt,
    cancelledAt: sale.cancelledAt,
    cancellationReason: undefined,
  };
}

async function salesList() {
  const response = await apiClient.get<RoyxatJavobi<Sotuv> | ApiListEnvelope<Sotuv>>("/sales");
  return apiList(response.data);
}

export const draftSalesService = {
  getDrafts: async () => {
    const sales = await salesList();
    return sales
      .filter((sale) => draftStatus(sale.status) !== "paid")
      .map(saleToDraftSale);
  },
  getDraftById: async (id: string) => {
    const response = await apiClient.get<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}`);
    return saleToDraftSale(apiData(response.data));
  },
  createDraft: async (data: SotuvYaratishMalumoti) => {
    const response = await idempotentPost<Sotuv | ApiEnvelope<Sotuv>>("/sales", data);
    return saleToDraftSale(apiData(response.data));
  },
  updateDraft: async (id: string, data: Partial<SotuvYaratishMalumoti>) => {
    const response = await apiClient.patch<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}`, data);
    return saleToDraftSale(apiData(response.data));
  },
  deleteDraft: async (id: string) => {
    await apiClient.delete(`/sales/${id}`);
  },
  continueDraft: async (id: string) => {
    return draftSalesService.getDraftById(id);
  },
  duplicateDraft: async (id: string) => {
    const response = await apiClient.get<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}`);
    const sale = apiData(response.data);
    // Nusxada valyutalar saqlanadi: dollar qator narxi so'm sifatida qayta yuborilmasligi kerak.
    const saleCurrency = valyutaYokiAsosiy(sale.currency);
    // Nusxa — yangi hujjat: bir valyutali rejimda boshqa valyutadagi qoralama (yoki qator) nusxasini backend rad etadi
    // (errors.currency.not_allowed), shuning uchun so'rov yuborilmaydi. Rejim hali o'qilmagan bo'lsa tekshirilmaydi (ikki valyutali
    // do'kon noto'g'ri to'xtatilmasin) — u holda backend xatosi chiqadi.
    const yagona = useValyutaStore.getState().yuklandi ? yagonaValyuta() : null;
    const boshqaValyuta = rejimgaMosEmasValyuta(sale, yagona);
    if (yagona && boshqaValyuta) {
      const matn = i18n.t("savdo_yangi:errors.modeDuplicateDraft", { from: boshqaValyuta, to: yagona });
      xatolikXabari(matn);
      throw new Error(matn);
    }
    const payload: SotuvYaratishMalumoti = {
      // Valyuta har doim aniq yuboriladi: berilmasa backend mijozli savdoni USD deb oladi (so'mdagi narxlar dollar bo'lib qolardi).
      currency: saleCurrency,
      warehouseId: sale.warehouseId ?? "",
      customerId: sale.customerId,
      clientCompanyId: sale.clientCompanyId,
      responsibleId: sale.responsibleId,
      saleType: sale.saleType,
      note: sale.note ? `${sale.note}\nNusxa olingan draft: ${sale.id}` : `Nusxa olingan draft: ${sale.id}`,
      items: (sale.items ?? []).map((item) => ({
        modificationId: item.modificationId,
        // Pochka kabi birlikda sotilgan qator birlikdagi son va narx bilan nusxalanadi.
        ...qatorniQaytaYuborish(item),
        discount: numberValue(item.discount),
        ...(String(item.currency ?? saleCurrency).toUpperCase() !== saleCurrency
          ? { currency: String(item.currency).toUpperCase() }
          : {}),
      })),
      payments: [],
    };
    const created = await idempotentPost<Sotuv | ApiEnvelope<Sotuv>>("/sales", payload);
    return saleToDraftSale(apiData(created.data));
  },
  cancelDraft: async (id: string, reason?: string) => {
    // Backend sababni saqlaydi (`cancelReason`): bo'sh sabab yuborilmaydi, uzuni 500 belgigacha qisqartiriladi.
    const sabab = bekorQilishSababi(reason);
    const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}/cancel`, sabab ? { reason: sabab } : undefined);
    return saleToDraftSale(apiData(response.data));
  },
  payDraft: async (id: string) => {
    const response = await ogohlantirishBilanBajarish((tana) =>
      idempotentPost<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}/confirm`, tana)
    );
    return saleToDraftSale(apiData(response.data));
  },
};
