import apiClient from "./axios";
import { sahifaJavobi, sonlarJavobi } from "./response";
import type { Sotuv, YetkazishMalumoti } from "@/types/savdo";

// Buyurtma = yetkazishi (/sales/:id/delivery) bor sotuv. Backend `orderStatus` ni o'zi hisoblaydi:
// NEW — qoralama sotuv; CONFIRMED — yetkazish PENDING; DELIVERING — DISPATCHED;
// COMPLETED — DELIVERED; CANCELLED — sotuv yoki yetkazish bekor qilingan.
export type BuyurtmaHolati = "NEW" | "CONFIRMED" | "DELIVERING" | "COMPLETED" | "CANCELLED";

export const BUYURTMA_HOLATLARI: BuyurtmaHolati[] = ["NEW", "CONFIRMED", "DELIVERING", "COMPLETED", "CANCELLED"];

export type Buyurtma = Sotuv & {
  orderStatus?: BuyurtmaHolati | string;
  delivery?: YetkazishMalumoti | null;
};

export type BuyurtmalarFiltri = {
  status?: BuyurtmaHolati;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type BuyurtmalarSahifasi = {
  items: Buyurtma[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function buyurtmalarJavobi(raw: unknown, soralganSahifa = 1, soralganHajm = 10): BuyurtmalarSahifasi {
  return sahifaJavobi<Buyurtma>(raw, soralganSahifa, soralganHajm);
}

export const buyurtmalarSoniJavobi = sonlarJavobi;

export const buyurtmalarApi = {
  royxat: async (filtr: BuyurtmalarFiltri = {}) => {
    const params = {
      ...(filtr.status ? { status: filtr.status } : {}),
      ...(filtr.search ? { search: filtr.search } : {}),
      page: filtr.page ?? 1,
      pageSize: filtr.pageSize ?? 10,
    };
    const response = await apiClient.get<unknown>("/orders", { params });
    return buyurtmalarJavobi(response.data, params.page, params.pageSize);
  },
  sonlari: async () => {
    const response = await apiClient.get<unknown>("/orders/counts");
    return buyurtmalarSoniJavobi(response.data);
  },
};
