import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import { narxTurlariniTozalash } from "@/lib/savdoNarxTurlari";
import type { SotuvNarxTuri } from "@/types/savdo";

type SavdoSozlamalari = { priceTypes?: SotuvNarxTuri[] };

// Sozlamalar → Sotuv narx turlari: qaysi turlar (tannarx / chakana / ulgurji) savdoda ishlatilishi.
export const savdoSozlamalariApi = {
  // GET /settings/sales → { priceTypes: ["RETAIL","WHOLESALE"] }; noto'g'ri javobda null (sozlama noma'lum).
  narxTurlariniOlish: async () =>
    narxTurlariniTozalash(
      apiData((await apiClient.get<SavdoSozlamalari | ApiEnvelope<SavdoSozlamalari>>("/settings/sales")).data)
    ),

  // PATCH /settings/sales { priceTypes } — bo'sh ro'yxat yuborilmaydi (backend rad etadi).
  narxTurlariniYangilash: async (priceTypes: SotuvNarxTuri[]) =>
    narxTurlariniTozalash(
      apiData(
        (await apiClient.patch<SavdoSozlamalari | ApiEnvelope<SavdoSozlamalari>>("/settings/sales", { priceTypes })).data
      )
    ),
};
