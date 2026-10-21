import apiClient from "./axios";
import { stockBalanceReport, type StockBalanceItem, type StockBalanceResponse } from "./reportsApi";
import { apiData } from "./response";
import { kategoriyaMahsulotlariJavobi } from "../lib/kategoriyaQoldigi.ts";
import type { Mahsulot } from "../types/catalog.ts";

const sorovlar = new Map<string, Promise<StockBalanceItem[]>>();

const ENG_KO_P_SAHIFA = 50;

// GET /catalog/products?categoryId=<id>: shu kategoriyadagi mahsulotlar (qoldig'i yo'qlari ham). Fon rejimi: xato toasti chiqmaydi,
// chaqiruvchi xatoda avvalgi (umumiy ro'yxatdan filtrlash) usulga qaytadi. `page` faqat server `totalPages` > 1 desa yuboriladi.
export async function kategoriyaMahsulotlariniOlish(kategoriyaId: string): Promise<Mahsulot[]> {
  const natija = new Map<string, Mahsulot>();
  for (let page = 1; page <= ENG_KO_P_SAHIFA; page += 1) {
    const javob = kategoriyaMahsulotlariJavobi(
      (await apiClient.get<unknown>("/catalog/products", {
        params: { categoryId: kategoriyaId, ...(page > 1 ? { page } : {}) },
        xatoniYashirish: true,
      })).data
    );
    const oldin = natija.size;
    for (const mahsulot of javob.items) if (!natija.has(mahsulot.id)) natija.set(mahsulot.id, mahsulot);
    // Yangi mahsulot qo'shilmasa (server `page`ni bilmaydi) yoki sahifalar tugagan bo'lsa to'xtaydi.
    if (natija.size === oldin || page >= javob.totalPages) break;
  }
  return Array.from(natija.values());
}

// Faqat davom etayotgan so'rov birlashtiriladi. Modal qayta ochilganda yangi qoldiq olinadi.
export function kategoriyaQoldiginiOlish(kategoriyaId: string): Promise<StockBalanceItem[]> {
  const mavjud = sorovlar.get(kategoriyaId);
  if (mavjud) return mavjud;
  const sorov = (async () => {
    const params = {
      categoryIds: kategoriyaId,
      groupByWarehouse: true,
      balanceStatus: "ALL" as const,
      includeReserved: true,
      priceType: "RETAIL" as const,
      pageSize: 500,
    };
    const olish = async (page: number) => apiData<StockBalanceResponse>(
      await stockBalanceReport({ ...params, page }, { xatoniYashirish: true })
    );
    const birinchi = await olish(1);
    const qatorlar = [...birinchi.items];
    // Barcha sahifalar olinadi; serverga bir paytda yuzlab so'rov yuborilmaydi.
    for (let page = 2; page <= Number(birinchi.totalPages ?? 1); page++) {
      qatorlar.push(...(await olish(page)).items);
    }
    return qatorlar;
  })().finally(() => { sorovlar.delete(kategoriyaId); });
  sorovlar.set(kategoriyaId, sorov);
  return sorov;
}
