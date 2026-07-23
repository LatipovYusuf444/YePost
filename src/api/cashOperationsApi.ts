import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type { CashOperation, CashOperationFilter, CashOperationPayload } from "@/types/cashOperation";

type Page<T> = { data?: T[]; items?: T[]; page?: number; pageSize?: number; total?: number; totalPages?: number };

export const cashOperationsApi = {
  royxat: async (params: CashOperationFilter = {}) => {
    const raw = (await apiClient.get<Page<CashOperation> | CashOperation[]>("/finance/cash-operations", { params })).data;
    if (Array.isArray(raw)) return { items: raw, page: 1, pageSize: raw.length, total: raw.length, totalPages: 1 };
    const items = raw.data ?? raw.items ?? [];
    return { items, page: Number(raw.page ?? 1), pageSize: Number(raw.pageSize ?? items.length), total: Number(raw.total ?? items.length), totalPages: Number(raw.totalPages ?? 1) };
  },
  barchasi: async () => {
    const first = await cashOperationsApi.royxat({ page: 1, pageSize: 100 });
    if (first.totalPages <= 1) return first;
    const pages = await Promise.all(
      Array.from({ length: first.totalPages - 1 }, (_, index) =>
        cashOperationsApi.royxat({ page: index + 2, pageSize: 100 })
      )
    );
    return {
      ...first,
      items: [first.items, ...pages.map((page) => page.items)].flat(),
    };
  },
  olish: async (id: string) => apiData((await apiClient.get<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}`)).data),
  yaratish: async (data: CashOperationPayload) => apiData((await apiClient.post<CashOperation | ApiEnvelope<CashOperation>>("/finance/cash-operations", data)).data),
  yangilash: async (id: string, data: Partial<CashOperationPayload>) => apiData((await apiClient.patch<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}`, data)).data),
  ochirish: async (id: string) => apiClient.delete(`/finance/cash-operations/${id}`),
  tasdiqlash: async (id: string) => apiData((await apiClient.post<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}/confirm`)).data),
  bekorQilish: async (id: string) => apiData((await apiClient.post<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}/cancel`)).data),
};
