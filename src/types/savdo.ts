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
export type SaleAuditLog = { id: string; action: "CREATE"|"UPDATE"|"DELETE"; actor?: NomliMalumot|null; user?: NomliMalumot|null; diff?: {before?:Record<string,unknown>|null;after?:Record<string,unknown>|null}|null; createdAt:string };
export type QaytarishSababi = "DEFECT" | "WRONG" | "OTHER";

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
  refundAmount?: number | string;
  createdAt?: string;
  updatedAt?: string;
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

export type OmborTanlovi = NomliMalumot;
export type MijozTanlovi = NomliMalumot;
export type XodimTanlovi = NomliMalumot & { username?: string };

export type QoldiqTanlovi = {
  id?: string;
  warehouseId?: string;
  productId?: string;
  modificationId: string;
  quantity?: number | string;
  balance?: number | string;
  sellingPrice?: number | string;
  price?: number | string;
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
