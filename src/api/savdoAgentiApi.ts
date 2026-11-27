import apiClient from "./axios";
import { apiData, sahifaJavobi } from "./response";
import {
  agentQoralamasiniTozalash,
  agentSozlamalariniTozalash,
  type AgentQoralamasi,
  type AgentSozlamaPatch,
} from "@/lib/savdoAgentiSozlama";

// Sahifa o'zining aniq xabarini ko'rsatadi ("Tasdiqlandi", "Rad etildi", "Sozlamalar saqlandi") — umumiy toast takrorlanmasin.
const JIM = { muvaffaqiyatniYashirish: true };

export type AgentQarori = { saleId: string; customerNotified: boolean };

function qarorniTozalash(xom: unknown, saleId: string): AgentQarori {
  const javob = apiData(xom as AgentQarori) as Partial<AgentQarori> | undefined;
  return { saleId: javob?.saleId ?? saleId, customerNotified: javob?.customerNotified === true };
}

// Savdo agenti: sozlamalar (ADMIN, DIRECTOR) va tasdiq kutayotgan agent buyurtmalari (ro'yxat — kassir/omborchiga ham; qaror — ADMIN, DIRECTOR).
export const savdoAgentiApi = {
  sozlamalar: async () => agentSozlamalariniTozalash(apiData((await apiClient.get<unknown>("/settings/sales-agent")).data)),
  // Qisman: faqat o'zgargan maydonlar yuboriladi. Javob — butun sozlama.
  sozlamalarniYangilash: async (patch: AgentSozlamaPatch) =>
    agentSozlamalariniTozalash(apiData((await apiClient.patch<unknown>("/settings/sales-agent", patch, JIM)).data)),

  // Eng yangisi birinchi. `fon` — davriy yangilash / tab belgisi: xato bo'lsa toast chiqmaydi.
  qoralamalar: async (filtr: { threadId?: string | null; page?: number; pageSize?: number } = {}, fon = false) => {
    const page = filtr.page ?? 1;
    const pageSize = filtr.pageSize ?? 20;
    const params: Record<string, unknown> = { page, pageSize };
    if (filtr.threadId) params.threadId = filtr.threadId;
    const sahifa = sahifaJavobi<unknown>((await apiClient.get<unknown>("/sales-agent/drafts", { params, xatoniYashirish: fon })).data, page, pageSize);
    return {
      ...sahifa,
      items: sahifa.items.map(agentQoralamasiniTozalash).filter((q): q is AgentQoralamasi => q !== null),
    };
  },
  tasdiqlash: async (saleId: string) =>
    qarorniTozalash((await apiClient.post<unknown>(`/sales-agent/drafts/${saleId}/approve`, undefined, JIM)).data, saleId),
  radEtish: async (saleId: string, body: { lostReason: string; note?: string }) =>
    qarorniTozalash((await apiClient.post<unknown>(`/sales-agent/drafts/${saleId}/reject`, body, JIM)).data, saleId),
};
