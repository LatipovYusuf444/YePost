export type SotuvHolati = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type SotuvTuri = "QUICK" | "CLIENT";
export type TolovTuri = "CASH" | "CARD" | "BANK" | "DEBT";
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
};

export type SotuvMahsuloti = {
  id?: string;
  saleItemId?: string;
  modificationId: string;
  quantity: number | string;
  price: number | string;
  discount?: number | string;
  total?: number | string;
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
  createdAt?: string;
  paidAt?: string;
  date?: string;
};

export type Sotuv = {
  id: string;
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
  discountAmount?: number | string;
  paidAmount?: number | string;
  debtAmount?: number | string;
  createdAt?: string;
  date?: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  warehouse?: NomliMalumot;
  customer?: NomliMalumot;
  clientCompany?: NomliMalumot;
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
  note?: string;
  items: Array<{
    modificationId: string;
    quantity: number;
    price: number;
    discount?: number;
  }>;
  payments?: SotuvTolovi[];
};

export type QaytarishMahsuloti = {
  id?: string;
  saleItemId: string;
  modificationId: string;
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
};

// GET /returns/{id}/timeline — hujjat voqealari (kim va qachon).
export type QaytarishVoqeasi = {
  id?: string;
  type: string;
  at?: string | null;
  actor?: { id?: string; fullName?: string | null; name?: string | null } | null;
  payload?: Record<string, unknown> | null;
};

export type OmborTanlovi = NomliMalumot;
export type MijozTanlovi = NomliMalumot;
export type XodimTanlovi = NomliMalumot & { username?: string };

// Valyuta rejimida dollarda saqlangan mahsulot narxi: sotuvga so'mdagi narx (retailPriceUzs) yuboriladi.
export type QoldiqValyutasi = {
  currency: "UZS" | "USD";
  /** Katalogdagi asl (dollardagi) chakana narx. */
  asl: number;
  /** Bugungi kurs; kurs kiritilmagan bo'lsa null. */
  kurs: number | null;
  /** So'mdagi chakana narx; kurs kiritilmagan bo'lsa null (sotuvga qo'shib bo'lmaydi). */
  uzs: number | null;
};

export type QoldiqTanlovi = {
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
    };
  };
  warehouse?: OmborTanlovi;
};
