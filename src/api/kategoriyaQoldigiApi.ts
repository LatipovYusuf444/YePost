import { stockBalanceReport, type StockBalanceItem, type StockBalanceResponse } from "./reportsApi";
import { apiData } from "./response";

const sorovlar = new Map<string, Promise<StockBalanceItem[]>>();

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
