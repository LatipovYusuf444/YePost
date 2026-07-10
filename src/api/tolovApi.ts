import { kassaKirimApi, xarajatApi } from "./financeApi";
import type { TolovMoliyaManbalari } from "@/types/tolov";

// Swagger bo'yicha mavjud real moliya endpointlari:
// GET /finance/cash-ins va GET /finance/expenses.
export async function moliyaTolovManbalariniOlish(): Promise<TolovMoliyaManbalari> {
  const [kassaKirimlari, xarajatlar] = await Promise.all([
    kassaKirimApi.royxat(),
    xarajatApi.royxat(),
  ]);

  return { kassaKirimlari, xarajatlar };
}
