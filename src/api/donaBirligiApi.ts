import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import { donaBirliginiTopish } from "../lib/donaBirligi.ts";
import type { OlchovBirligi } from "@/types/catalog";

// Only invoked when the user selects the missing piece unit, never as a read side effect.
export async function donaBirliginiTaminlash(): Promise<OlchovBirligi> {
  const load = async () => apiList((await apiClient.get<OlchovBirligi[] | ApiListEnvelope<OlchovBirligi>>("/catalog/units")).data);
  const existing = donaBirliginiTopish(await load());
  if (existing) return existing;
  try {
    const created = apiData((await apiClient.post<OlchovBirligi | ApiEnvelope<OlchovBirligi>>("/catalog/units", {
      code: "H87", name: "Dona", shortName: "dona", isFractional: false,
    })).data);
    if (typeof created.id !== "string" || !created.id.trim()) throw new Error("Backend o'lchov birligi ID sini qaytarmadi.");
    return created;
  } catch (error) {
    // Another editor may have created the same unit while this request was in flight.
    if ((error as { response?: { status?: number } })?.response?.status === 409) {
      const concurrent = donaBirliginiTopish(await load());
      if (concurrent) return concurrent;
    }
    throw error;
  }
}
