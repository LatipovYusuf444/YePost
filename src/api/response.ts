import axios from "axios";

// KASSIR/OMBORCHI kabi rollar uchun ba'zi ro'yxatlar (xodimlar, filiallar,
// kompaniyalar, to'liq mahsulot katalogi) backendda 403 qaytaradi. Bunday
// chaqiruvlar bir nechtasi bitta Promise.all ichida bo'lsa, 403 butun
// so'rovni yiqitib, sahifani bo'sh qilib qo'yardi — shuning uchun 403 bo'sh
// ro'yxat sifatida qabul qilinadi, boshqa xatolar esa avvalgidek otiladi.
export async function ruxsatsizBulsaBosh<T>(chaqiruv: () => Promise<T[]>): Promise<T[]> {
  try {
    return await chaqiruv();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) return [];
    throw error;
  }
}

export type ApiEnvelope<T> = {
  success?: boolean;
  statusCode?: number;
  data?: T;
};

export function apiData<T>(response: T | ApiEnvelope<T>) {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as ApiEnvelope<T>).data !== undefined
  ) {
    return (response as ApiEnvelope<T>).data as T;
  }

  return response as T;
}

export type ApiListEnvelope<T> = ApiEnvelope<T[]> & {
  items?: T[];
  results?: T[];
  value?: T[];
};

export function apiList<T>(response: T[] | ApiListEnvelope<T>) {
  if (Array.isArray(response)) return response;

  if (response && typeof response === "object") {
    return response.data ?? response.items ?? response.results ?? response.value ?? [];
  }

  return [];
}
