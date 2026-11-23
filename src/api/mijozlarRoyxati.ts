import apiClient from "./axios";
import { apiList, type ApiListEnvelope } from "./response.ts";

// GET /partners/customers bir sahifada bir necha joydan bir vaqtda so'ralardi (Bosh sahifa + savdo store, Hisobotlar, remount).
// Faqat bir vaqtdagi so'rovlar bitta bo'ladi; tugagach keyingi chaqiruv yangi so'rov yuboradi — mijoz balansi (qarz/avans)
// har sotuv va to'lovda o'zgaradi, shuning uchun vaqt bo'yicha kesh YO'Q.
let sorov: Promise<unknown[]> | null = null;

export function mijozlarRoyxati<T>(): Promise<T[]> {
  sorov ??= apiClient
    .get<unknown[] | ApiListEnvelope<unknown>>("/partners/customers")
    .then((response) => apiList(response.data))
    .finally(() => { sorov = null; });
  // Har chaqiruvchiga alohida massiv: biri saralasa yoki qo'shsa boshqasiga ta'sir qilmaydi.
  return sorov.then((royxat) => [...royxat] as T[]);
}
