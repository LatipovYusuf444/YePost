export type SotuvHolati = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type SotuvTuri = "QUICK" | "CLIENT";
// Savdo narx turi (Sozlamalar → Sotuv: qaysilari yoqilgan bo'lsa shular ishlatiladi; o'chirilgan tur yuborilsa backend rad etadi).
export type SotuvNarxTuri = "COST" | "RETAIL" | "WHOLESALE";
// BALANCE — mijoz hisobidan to'lov (faqat mijozli savdoda; kassa yashigiga tushmaydi).
export type TolovTuri = "CASH" | "CARD" | "BANK" | "DEBT" | "BALANCE";
export type YetkazishHolati = "PENDING" | "DISPATCHED" | "DELIVERED" | "CANCELLED";

export type YetkazishMalumoti = {
  id: string;
  saleId?: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  address?: string | null;
  courierName?: string | null;
  cost?: number | string | null;
  scheduledAt?: string | null;
  note?: string | null;
  status: YetkazishHolati;
  createdAt?: string;
  updatedAt?: string;
};

export type YetkazishPayload = {
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  courierName?: string;
  cost?: number;
  scheduledAt?: string;
  note?: string;
};
export type SaleAuditLog = { id: string; action: "CREATE"|"UPDATE"|"DELETE"; actor?: NomliMalumot|null; user?: NomliMalumot|null; diff?: Record<string,unknown>|null; createdAt:string };
// Backend qaytarish sabablari (CreateReturnDto.reason).
export type QaytarishSababi = "CUSTOMER_CHANGED_MIND" | "NOT_SUITABLE" | "DEFECT" | "WRONG" | "OTHER";

export type QaytarishToloviniQaytarishUsuli = "CASH" | "CARD" | "BALANCE" | "NONE";
export type DraftStatus = "draft" | "waiting" | "editing" | "paid" | "cancelled";

export type NomliMalumot = {
  id: string;
  name?: string;
  fullName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  companyId?: string | null;
  company?: NomliMalumot | null;
  partner?: { id: string } | null;
  // Mijoz hisobi (oldindan to'langan pul) va uning valyutasi (valyuta rejimida USD).
  balance?: number | string | null;
  balanceCurrency?: string | null;
};

export type SotuvMahsuloti = {
  id?: string;
  saleItemId?: string;
  modificationId: string;
  quantity: number | string;
  price: number | string;
  discount?: number | string;
  total?: number | string;
  // Qator valyutasi (UZS/USD): price, discount va total shu valyutada. Berilmasa — sotuv valyutasi.
  currency?: string | null;
  // Qator narx turi (chakana/ulgurji/tannarx); eski qatorlarda bo'lmasligi mumkin.
  priceType?: SotuvNarxTuri | null;
  // Katalogdagi narx (qo'lda yozilgan narx bilan solishtirish uchun) va chegirma foizi (hisobot uchun; summa `discount`da).
  catalogPrice?: number | string | null;
  discountPercent?: number | string | null;
  modification?: {
    id: string;
    name?: string;
    product?: NomliMalumot;
  };
};

export type DraftSaleItem = {
  productId?: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  stockAvailable: number;
};

export type SotuvTolovi = {
  id?: string;
  paymentType: TolovTuri;
  amount: number | string;
  // To'lov valyutasi: amount shu valyutada. Berilmasa — sotuv valyutasi. Qaytim doim so'mda beriladi.
  currency?: string | null;
  // Shu to'lovning sotuv valyutasidagi qiymati va hisoblangan kurs (backend saqlaydi, javobda keladi).
  settledAmount?: number | string | null;
  rate?: number | string | null;
  createdAt?: string;
  paidAt?: string;
  date?: string;
};

export type Sotuv = {
  id: string;
  // Sotuv valyutasi: jami, qarz va foyda shu valyutada (UZS/USD). Berilmasa — so'm.
  currency?: string | null;
  number?: string;
  documentNumber?: string;
  docNumber?: string;
  warehouseId?: string;
  customerId?: string;
  clientCompanyId?: string;
  responsibleId?: string;
  saleType?: SotuvTuri;
  status?: SotuvHolati | string;
  note?: string;
  total?: number | string;
  totalAmount?: number | string;
  // Sotuv summasi valyutalar bo'yicha (aralash sotuvda): { UZS: "15000", USD: "2" }.
  totalsByCurrency?: Record<string, number | string> | null;
  discountAmount?: number | string;
  paidAmount?: number | string;
  debtAmount?: number | string;
  // `keepExcess` bilan ortiqcha pulning mijoz hisobiga yozilgan qismi (sotuv valyutasida).
  excessToBalance?: number | string | null;
  // Ortiqcha pulning mijozning eski qarzini yopishga ketgan qismi (sotuv valyutasida).
  excessToDebt?: number | string | null;
  createdAt?: string;
  date?: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  warehouse?: NomliMalumot;
  customer?: NomliMalumot;
  clientCompany?: NomliMalumot;
  // Donalik savdo: kassir yozgan mijoz ismi/telefoni (oddiy matn; mijoz bazasiga yozilmaydi, qarz yuritilmaydi). Yo'q bo'lsa null.
  walkInCustomerName?: string | null;
  walkInCustomerPhone?: string | null;
  responsible?: NomliMalumot;
  items?: SotuvMahsuloti[];
  payments?: SotuvTolovi[];
};

export type DraftSale = {
  id: string;
  draftNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: DraftSaleItem[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  // Jami summalar valyutasi (sotuv valyutasi; berilmasa — so'm).
  currency?: string | null;
  status: DraftStatus;
  note?: string;
  responsibleUserId?: string;
  responsibleUserName: string;
  createdAt?: string;
  updatedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
};

export type SotuvYaratishMalumoti = {
  warehouseId: string;
  customerId?: string;
  clientCompanyId?: string;
  responsibleId?: string;
  saleType?: SotuvTuri;
  // Sotuv (hisob-kitob) valyutasi: jami va qarz shu valyutada. Berilmasa backend valyuta rejimida mijozli savdoni USD, mijozsizni UZS deb oladi.
  currency?: string;
  // Dollar qatnashsa qaytim mingtagacha yaxlitlanadi (standart true); false — aniq qaytim (tanga).
  roundChange?: boolean;
  // Ortiqcha pul (eski qarzlar yopilgach) qaytim emas, mijoz hisobiga yoziladi. Faqat mijozli savdoda (standart false).
  keepExcess?: boolean;
  note?: string;
  // Donalik savdo uchun mijoz ismi (≤200 belgi) va telefoni (≤50 belgi). Qarzga sotish uchun baribir customerId kerak.
  walkInCustomerName?: string;
  walkInCustomerPhone?: string;
  items: Array<{
    modificationId: string;
    quantity: number;
    price: number;
    discount?: number;
    // Qator o'z valyutasida (masalan, dollarda saqlangan mahsulot narxi). Berilmasa — sotuv valyutasi.
    currency?: string;
    // Qator qaysi narx turida sotilgani (hisobotlarda narx turi bo'yicha ko'rinadi). Sozlamada o'chirilgan tur yuborilmaydi.
    priceType?: SotuvNarxTuri;
    // Chegirma foizda kiritilgan bo'lsa — foiz (hisobot uchun); chegirma summasi `discount`da.
    discountPercent?: number;
  }>;
  payments?: SotuvTolovi[];
};

export type QaytarishMahsuloti = {
  id?: string;
  saleItemId: string;
  modificationId: string;
  // Qator valyutasi (price shu valyutada); berilmasa — hujjat valyutasi.
  currency?: string | null;
  quantity: number;
  price: number;
  modification?: SotuvMahsuloti["modification"];
};

export type Qaytarish = {
  id: string;
  docNumber?: string;
  documentNumber?: string;
  number?: string;
  saleId: string;
  warehouseId: string;
  reason?: QaytarishSababi | string;
  // Sabab izohi (backendda `note` dan alohida maydon).
  reasonComment?: string | null;
  responsibleId?: string;
  note?: string;
  status?: SotuvHolati | string;
  total?: number | string;
  totalAmount?: number | string;
  restock?: boolean;
  refundMethod?: QaytarishToloviniQaytarishUsuli | string;
  // Backend `confirm` da hisoblaydi (satr ko'rinishida kelishi mumkin): mijozga qaytariladigan pul va sotuvdagi qarzdan ayirilgan summa.
  refundAmount?: number | string | null;
  debtReduction?: number | string | null;
  // Tasdiqlash vaqtidagi sotuv qarzi snapshot'i (qaytarishdan oldin / keyin). Eski hujjatlarda null bo'lishi mumkin —
  // null "ma'lumot yo'q" degani, 0 emas.
  debtBefore?: number | string | null;
  debtAfter?: number | string | null;
  returnedQuantity?: number | string | null;
  // Hujjat summalari valyutasi (berilmasa — bog'langan sotuv valyutasi, u ham bo'lmasa so'm).
  currency?: string | null;
  customer?: NomliMalumot | null;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  sale?: Sotuv;
  warehouse?: NomliMalumot;
  responsible?: NomliMalumot;
  items?: QaytarishMahsuloti[];
};

export type QaytarishYaratishMalumoti = {
  saleId: string;
  warehouseId: string;
  reason?: QaytarishSababi;
  // Sabab izohi (OTHER uchun majburiy); umumiy izoh `note` da qoladi.
  reasonComment?: string;
  responsibleId?: string;
  restock?: boolean;
  refundMethod?: QaytarishToloviniQaytarishUsuli;
  note?: string;
  items: Array<{
    saleItemId: string;
    modificationId: string;
    quantity: number;
    price: number;
  }>;
};

// GET /sales/{saleId}/returnable-items — sotuv qatori bo'yicha qaytarilishi mumkin bo'lgan miqdor (backend hisoblaydi).
export type QaytariladiganQator = {
  saleItemId: string;
  modificationId?: string;
  soldQuantity?: number | string | null;
  returnedQuantity?: number | string | null;
  remainingQuantity?: number | string | null;
  price?: number | string | null;
  // Qaytarishda bir dona uchun hisoblanadigan qiymat (backend beradi).
  unitValue?: number | string | null;
  // Qator valyutasi: price va unitValue shu valyutada (aralash sotuvda dollar qatori). Berilmasa — sotuv valyutasi.
  currency?: string | null;
  modification?: SotuvMahsuloti["modification"];
};

// POST /returns/preview — hech narsa saqlanmaydi; backend qarz/pul taqsimotini hisoblab qaytaradi.
export type QaytarishOldindanSorovi = {
  saleId: string;
  refundMethod?: QaytarishToloviniQaytarishUsuli;
  items: Array<{ saleItemId: string; quantity: number }>;
};

export type QaytarishOldindanJavobi = {
  goodsValue?: number | string | null;
  debtBefore?: number | string | null;
  debtReduction?: number | string | null;
  refundAmount?: number | string | null;
  debtAfter?: number | string | null;
  returnedQuantity?: number | string | null;
  currency?: string;
};

// GET /returns/{id}/timeline — hujjat voqealari (kim va qachon).
export type QaytarishVoqeasi = {
  id?: string;
  type: string;
  at?: string | null;
  actor?: { id?: string; fullName?: string | null; name?: string | null } | null;
  // Voqeaga xos ma'lumotlar: DEBT_UPDATED { debtBefore, debtReduction, debtAfter }, REFUND_COMPLETED { amount, method }.
  metadata?: Record<string, unknown> | null;
};

export type OmborTanlovi = NomliMalumot;
export type MijozTanlovi = NomliMalumot;
export type XodimTanlovi = NomliMalumot & { username?: string };

// Valyuta rejimida dollarda saqlangan mahsulot narxi: sotuvga so'mdagi narx (retailPriceUzs) yuboriladi.
// Har bir narxning valyutasi alohida: `currency` — chakana narx valyutasi, `ulgurjiCurrency` — ulgurji narx valyutasi.
// Obyekt chakana yoki ulgurji narxlardan kamida bittasi dollarda bo'lsagina yaratiladi.
export type QoldiqValyutasi = {
  /** Chakana narx valyutasi. */
  currency: "UZS" | "USD";
  /** Katalogdagi asl (dollardagi) chakana narx; chakana narx dollarda bo'lmasa 0. */
  asl: number;
  /** Bugungi kurs; kurs kiritilmagan bo'lsa null. */
  kurs: number | null;
  /** So'mdagi chakana narx (chakana narx dollarda bo'lsa kurs bilan hisoblangan); kurs kiritilmagan bo'lsa null (sotuvga qo'shib bo'lmaydi). */
  uzs: number | null;
  /** Ulgurji narx valyutasi; berilmasa — chakana narx valyutasi bilan bir xil. */
  ulgurjiCurrency?: "UZS" | "USD";
  /** Katalogdagi asl (dollardagi) ulgurji narx; ulgurji narx dollarda bo'lmasa yoki yo'q bo'lsa 0. */
  ulgurjiAsl?: number;
  /** So'mdagi ulgurji narx (dollarda bo'lsa kurs bilan hisoblangan); yo'q bo'lsa null. */
  ulgurjiUzs?: number | null;
};

export type QoldiqTanlovi = {
  /** False: hisobotdagi narx valyutasi hali katalogdan tekshirilmagan, uni sotuvga bermaslik kerak. */
  narxAniq?: boolean;
  id?: string;
  warehouseId?: string;
  productId?: string;
  modificationId: string;
  quantity?: number | string;
  balance?: number | string;
  sellingPrice?: number | string;
  price?: number | string;
  valyuta?: QoldiqValyutasi;
  modification?: {
    id: string;
    name?: string;
    barcode?: string;
    article?: string | null;
    product?: NomliMalumot;
    price?: {
      costPrice?: number | string;
      retailPrice?: number | string;
      wholesalePrice?: number | string;
      sellingPrice?: number | string;
      // Tannarx valyutasi (UZS/USD); berilmasa — so'm.
      costCurrency?: string | null;
    };
  };
  warehouse?: OmborTanlovi;
};
