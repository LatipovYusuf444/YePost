import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type { MijozQarzlari } from "@/types/qarzTaqsimoti";

// GET /partners/customers/:id/debts — mijozning ochiq qarzlari to'lov tartibida (eng eskisi birinchi),
// hisob qoldig'i va valyutalar bo'yicha jami qarz. `fon` — xato bo'lsa qizil toast chiqmaydi (oyna o'zi ko'rsatadi).
export async function mijozQarzlariniOlish(customerId: string, fon = false): Promise<MijozQarzlari> {
  const javob = apiData(
    (await apiClient.get<MijozQarzlari | ApiEnvelope<MijozQarzlari>>(`/partners/customers/${customerId}/debts`, fon ? { xatoniYashirish: true } : undefined)).data
  );
  return { ...javob, items: Array.isArray(javob?.items) ? javob.items : [] };
}
