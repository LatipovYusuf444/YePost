import apiClient from "./axios";
import { qolganSahifalar } from "../lib/parallelBajarish.ts";
import { apiData, type ApiEnvelope } from "./response";
import { taqsimotniOqish } from "@/lib/qarzTaqsimoti";
import type { CashOperation, CashOperationFilter, CashOperationPayload } from "@/types/cashOperation";
import type { AuditLog } from "@/types/reports";
import { bekorSababi } from "@/lib/kassaTahriri";
import type { TaqsimotOldindanKorishSorovi } from "@/types/qarzTaqsimoti";
import type { MajburlashTanasi } from "./valyutaShubhasi";
import { idempotentPost } from "./idempotentSorov";

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
    const pages = await qolganSahifalar(first.totalPages, (page) => cashOperationsApi.royxat({ page, pageSize: 100 }));
    return {
      ...first,
      items: [first.items, ...pages.map((page) => page.items)].flat(),
    };
  },
  // `fon` — xato bo'lsa qizil toast chiqmaydi (masalan, ko'rinish oynasi yopilgan qarzlar ro'yxatini fonda oladi).
  olish: async (id: string, fon = false) =>
    apiData((await apiClient.get<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}`, fon ? { xatoniYashirish: true } : undefined)).data),
  yaratish: async (data: CashOperationPayload) => apiData((await idempotentPost<CashOperation | ApiEnvelope<CashOperation>>("/finance/cash-operations", data)).data),
  yangilash: async (id: string, data: Partial<CashOperationPayload>) => apiData((await apiClient.patch<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}`, data)).data),
  ochirish: async (id: string) => apiClient.delete(`/finance/cash-operations/${id}`),
  // Tasdiqlashda mijozning ochiq qarzlari eng eskisidan yopiladi (javobda `allocation`); `tana` — "Valyuta to'g'rimi?" dan keyin `{ force: true }`.
  tasdiqlash: async (id: string, tana?: MajburlashTanasi) =>
    apiData((await idempotentPost<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}/confirm`, tana)).data),
  // `sabab` — bekor qilish sababi (sotuvni bekor qilishdagi kabi `reason`); bo'sh bo'lsa tana yuborilmaydi (avvalgidek).
  bekorQilish: async (id: string, sabab?: string) => {
    const reason = bekorSababi(sabab);
    return apiData((await apiClient.post<CashOperation | ApiEnvelope<CashOperation>>(`/finance/cash-operations/${id}/cancel`, reason ? { reason } : undefined)).data);
  },
  // GET /audit/logs?resourceId= — amaliyot tarixi (kim, qachon, nima o'zgardi). Fon rejimi: ruxsat bo'lmasa (403) toast chiqmaydi, bo'sh ro'yxat.
  tarix: async (id: string): Promise<AuditLog[]> => {
    const raw = (await apiClient.get<unknown>("/audit/logs", { params: { resourceId: id, page: 1, pageSize: 50 }, xatoniYashirish: true })).data;
    const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const royxat = Array.isArray(raw) ? raw : [obj.items, obj.data, obj.results].find(Array.isArray) ?? [];
    return royxat as AuditLog[];
  },
  // POST /finance/cash-operations/allocation-preview — hech narsa saqlanmaydi: mijoz to'lovi qaysi qarzlarni (eng eskisidan) yopishini oldindan ko'rsatadi.
  taqsimotOldindanKorish: async (sorov: TaqsimotOldindanKorishSorovi) =>
    taqsimotniOqish((await apiClient.post<unknown>("/finance/cash-operations/allocation-preview", sorov, { xatoniYashirish: true })).data),
};
