import type { AxiosRequestConfig } from "axios";
import apiClient from "./axios";
import { idempotentBajarish } from "@/lib/idempotentKalit";

/**
 * Pul yozadigan POST (K2): har bir foydalanuvchi amaliga bitta `Idempotency-Key`. Javob kelmay qolsa (timeout, 5xx, 409 request_in_progress)
 * qayta bosish o'sha kalit bilan ketadi va backend birinchi javobni qaytaradi — savdo/to'lov ikki marta yozilmaydi. Muvaffaqiyatdan yoki aniq
 * xatodan (4xx) keyin kalit tashlanadi: keyingi amal yangi kalit oladi. Tana o'zgarsa (masalan `force: true`) — boshqa amal, boshqa kalit.
 */
export function idempotentPost<T>(url: string, tana?: unknown, sozlama: AxiosRequestConfig = {}) {
  return idempotentBajarish(`POST ${url}`, tana, (kalit) =>
    apiClient.post<T>(url, tana, { ...sozlama, headers: { ...(sozlama.headers as Record<string, string> | undefined), "Idempotency-Key": kalit } })
  );
}
