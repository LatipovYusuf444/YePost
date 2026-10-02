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

export type SahifaliRoyxat<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Obyekt = Record<string, unknown>;

function obyektmi(value: unknown): value is Obyekt {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Backend ro'yxati `[...]`, `{ data: [...], total, page, ... }` yoki `{ data: { items, total, ... } }`
// ko'rinishida kelishi mumkin — hammasi yagona shaklga keltiriladi.
export function sahifaJavobi<T>(raw: unknown, soralganSahifa = 1, soralganHajm = 10): SahifaliRoyxat<T> {
  const asosiy: Obyekt = obyektmi(raw) ? raw : {};
  const ichki = obyektmi(asosiy.data) ? asosiy.data : undefined;
  const royxat = [
    Array.isArray(raw) ? raw : undefined,
    Array.isArray(asosiy.data) ? asosiy.data : undefined,
    Array.isArray(ichki?.items) ? ichki?.items : undefined,
    Array.isArray(asosiy.items) ? asosiy.items : undefined,
  ].find(Boolean) as T[] | undefined;
  const items = royxat ?? [];
  const olish = (kalit: string) => ichki?.[kalit] ?? asosiy[kalit];
  const total = Number(olish("total") ?? items.length);
  const pageSize = Number(olish("pageSize") ?? soralganHajm);
  const jami = Number.isFinite(total) ? total : items.length;
  const hajm = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : soralganHajm;
  return {
    items,
    total: jami,
    page: Number(olish("page") ?? soralganSahifa),
    pageSize: hajm,
    totalPages: Number(olish("totalPages") ?? Math.max(1, Math.ceil(jami / Math.max(1, hajm)))),
  };
}

// `{ HOLAT: son }`, `{ counts: {...} }` yoki `[{ status, count }]` ko'rinishidagi hisoblar — yagona `{ HOLAT: son }` shaklga keltiriladi.
export function sonlarJavobi(raw: unknown): Record<string, number> {
  const asosiy: Obyekt = obyektmi(raw) ? raw : {};
  const tugun: unknown = Array.isArray(raw) ? raw : (asosiy.data ?? raw);
  const manba: unknown = obyektmi(tugun) && (obyektmi(tugun.counts) || Array.isArray(tugun.counts)) ? tugun.counts : tugun;
  const natija: Record<string, number> = {};
  if (Array.isArray(manba)) {
    for (const item of manba) {
      if (!obyektmi(item)) continue;
      const kalit = String(item.status ?? item.key ?? "").toUpperCase();
      const son = Number(item.count ?? item.total ?? item.value);
      if (kalit && Number.isFinite(son)) natija[kalit] = son;
    }
  } else if (obyektmi(manba)) {
    for (const [kalit, qiymat] of Object.entries(manba)) {
      const son = Number(qiymat);
      if (typeof qiymat !== "object" && Number.isFinite(son)) natija[kalit.toUpperCase()] = son;
    }
  }
  return natija;
}
