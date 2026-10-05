// Dollar kursi manbai.
//
// Backendda hozircha kurs endpointi YO'Q (openapi.json'da faqat mahsulot narxidagi `currency: "UZS" | "USD"` bor),
// shuning uchun bu yerda DEMO kurs qaytariladi. Real API tayyor bo'lganda faqat shu fayldagi `olish()` ichini
// almashtirish kifoya — qolgan butun frontend (`@/lib/valyuta`) o'zgarmaydi:
//
//   const response = await apiClient.get<{ rate: number; updatedAt?: string }>("/settings/exchange-rate");
//   return { kurs: Number(response.data.rate), manba: "backend", yangilangan: response.data.updatedAt ?? null };

export type KursManbasi = "demo" | "qolda" | "backend";

export type KursMalumoti = {
  /** 1 USD necha so'm. */
  kurs: number;
  manba: KursManbasi;
  yangilangan: string | null;
};

export const DEMO_KURS = 12_700;

export const kursApi = {
  olish: async (): Promise<KursMalumoti> => ({ kurs: DEMO_KURS, manba: "demo", yangilangan: null }),
};
