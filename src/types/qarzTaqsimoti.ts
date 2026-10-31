// Mijoz to'lovi eng eski qarzdan yopiladi (FIFO): kassa to'lovini tasdiqlash javobidagi `allocation`,
// POST /finance/cash-operations/allocation-preview natijasi va GET /partners/customers/:id/debts ro'yxati.

/** Bir savdoga tushgan qism: `amount` to'lov valyutasida, `settledAmount` savdo valyutasida; `rate` faqat valyutalar farq qilsa keladi. */
export type QarzTaqsimotQatori = {
  saleId: string;
  docNumber?: string | null;
  isOpeningDebt?: boolean | null;
  currency?: string | null;
  amount: string | number;
  settledAmount?: string | number | null;
  rate?: string | number | null;
  debtRemaining?: string | number | null;
  // GET /finance/cash-operations/:id `allocations[]` da savdo ichki obyekt bilan keladi.
  sale?: { docNumber?: string | null; currency?: string | null; isOpeningDebt?: boolean | null; date?: string | null } | null;
};

export type QarzTaqsimoti = {
  allocated: QarzTaqsimotQatori[];
  /** Mijoz hisobiga tushgan qism, `accountCurrency` valyutasida. */
  toAccount?: string | number | null;
  accountCurrency?: string | null;
  /** To'liq yopilgan savdolar id'lari; tafsilotdan yig'ilganda null (qoldig'i 0 ga tushgan qatorlar olinadi). */
  closedSales?: string[] | null;
};

/** Oldindan ko'rish so'rovi: hech narsa saqlanmaydi. `saleId` — shu savdo birinchi yopiladi, qolgani eng eskisidan. */
export type TaqsimotOldindanKorishSorovi = {
  customerId: string;
  amount: number;
  currency?: "UZS" | "USD";
  rate?: number;
  saleId?: string;
};

export type MijozQarzQatori = {
  saleId: string;
  docNumber?: string | null;
  isOpeningDebt?: boolean | null;
  date?: string | null;
  currency?: string | null;
  totalAmount?: string | number | null;
  paidAmount?: string | number | null;
  debtAmount: string | number;
  status?: "UNPAID" | "PARTIALLY_PAID" | string | null;
};

/** GET /partners/customers/:id/debts — `items` to'lov tartibida (eng eskisi birinchi). */
export type MijozQarzlari = {
  accountBalance?: string | number | null;
  accountCurrency?: string | null;
  debtTotals?: Record<string, string | number | null> | null;
  items: MijozQarzQatori[];
};
