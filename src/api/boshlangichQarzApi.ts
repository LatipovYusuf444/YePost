import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type { BoshlangichQarzMalumoti } from "@/lib/boshlangichQarz";
import { tolovNatijasi, type TolovNatijasi } from "../lib/tolovOrtiqchasi.ts";
import type { Sotuv } from "@/types/savdo";

export async function boshlangichQarzYaratish(customerId: string, data: BoshlangichQarzMalumoti): Promise<Sotuv> {
  const response = await apiClient.post<Sotuv | ApiEnvelope<Sotuv>>(
    `/partners/customers/${encodeURIComponent(customerId)}/opening-debt`, data,
  );
  return apiData(response.data);
}

export async function boshlangichQarzShabloni(): Promise<Blob> {
  const response = await apiClient.get<Blob>("/partners/customers/opening-debts/template", { responseType: "blob" });
  return response.data;
}

export async function boshlangichQarzImporti(file: File, dryRun: boolean): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post<unknown>("/partners/customers/opening-debts/import", form, {
    params: { dryRun },
    headers: { "Content-Type": null },
    timeout: 120_000,
  });
  return response.data;
}

// Swagger DebtRepaymentDto: backend to'lovni shu valyutadagi eng eski qarzlardan boshlab taqsimlaydi.
// Mijozning jami qarzidan ortiq NAQD to'lovda ortgan pul so'mda qaytim bo'ladi yoki `keepExcess: true` bilan mijoz hisobiga o'tadi;
// `roundChange: false` — dollar qatnashganda aniq qaytim. Natijada `change` va `excessToBalance` keladi.
export async function mijozQarziniTolash(data: {
  customerId: string;
  amount: number;
  paymentMethod: "CASH" | "CARD" | "BANK";
  currency: "UZS" | "USD";
  note?: string;
  roundChange?: boolean;
  keepExcess?: boolean;
}): Promise<TolovNatijasi> {
  const javob = await apiClient.post<unknown>("/finance/debt-repayment", data);
  return tolovNatijasi(javob.data);
}
