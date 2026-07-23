import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
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
  const totalAmount = numberValue(sale.totalAmount ?? sale.total);
  const discountAmount =
    numberValue(sale.discountAmount) ||
    items.reduce((sum, item) => sum + item.discount, 0);

  return {
    id: sale.id,
    draftNumber: sale.documentNumber || sale.number || sale.docNumber || sale.id.slice(0, 8),
    customerId: sale.customerId || sale.clientCompanyId,
    customerName: customerName(sale),
    customerPhone: sale.customer?.phone || sale.clientCompany?.phone || "",
    items,
    totalAmount,
    discountAmount,
    finalAmount: Math.max(totalAmount - discountAmount, 0),
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
    const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>("/sales", data);
    return saleToDraftSale(apiData(response.data));
  },
  updateDraft: async (id: string, data: Partial<SotuvYaratishMalumoti>) => {
    const response = await apiClient.patch<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}`, data);
    return saleToDraftSale(apiData(response.data));
  },
  deleteDraft: async (id: string) => {
    await apiClient.post(`/sales/${id}/cancel`);
  },
  continueDraft: async (id: string) => {
    return draftSalesService.getDraftById(id);
  },
  duplicateDraft: async (id: string) => {
    const response = await apiClient.get<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}`);
    const sale = apiData(response.data);
    const payload: SotuvYaratishMalumoti = {
      warehouseId: sale.warehouseId ?? "",
      customerId: sale.customerId,
      clientCompanyId: sale.clientCompanyId,
      responsibleId: sale.responsibleId,
      saleType: sale.saleType,
      note: sale.note ? `${sale.note}\nNusxa olingan draft: ${sale.id}` : `Nusxa olingan draft: ${sale.id}`,
      items: (sale.items ?? []).map((item) => ({
        modificationId: item.modificationId,
        quantity: numberValue(item.quantity),
        price: numberValue(item.price),
        discount: numberValue(item.discount),
      })),
      payments: [],
    };
    const created = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>("/sales", payload);
    return saleToDraftSale(apiData(created.data));
  },
  cancelDraft: async (id: string, reason?: string) => {
    const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}/cancel`, {
      reason,
    });
    return saleToDraftSale(apiData(response.data));
  },
  payDraft: async (id: string) => {
    const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>(`/sales/${id}/confirm`);
    return saleToDraftSale(apiData(response.data));
  },
};
