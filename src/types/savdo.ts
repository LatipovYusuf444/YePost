export type SotuvHolati = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type SotuvTuri = "QUICK" | "CLIENT";
export type TolovTuri = "CASH" | "CARD" | "BANK" | "DEBT";
export type QaytarishSababi = "DEFECT" | "WRONG" | "OTHER";

export type NomliMalumot = {
  id: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
};

export type SotuvMahsuloti = {
  id?: string;
  saleItemId?: string;
  modificationId: string;
  quantity: number;
  price: number;
  discount?: number;
  modification?: {
    id: string;
    name?: string;
    product?: NomliMalumot;
  };
};

export type SotuvTolovi = {
  id?: string;
  paymentType: TolovTuri;
  amount: number;
};

export type Sotuv = {
  id: string;
  number?: string;
  documentNumber?: string;
  warehouseId?: string;
  customerId?: string;
  clientCompanyId?: string;
  responsibleId?: string;
  saleType?: SotuvTuri;
  status?: SotuvHolati | string;
  note?: string;
  total?: number;
  totalAmount?: number;
  paidAmount?: number;
  debtAmount?: number;
  createdAt?: string;
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
  total?: number;
  totalAmount?: number;
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
  modificationId: string;
  quantity?: number;
  balance?: number;
  sellingPrice?: number;
  price?: number;
  modification?: {
    id: string;
    name?: string;
    product?: NomliMalumot;
    price?: {
      retailPrice?: number;
      wholesalePrice?: number;
      sellingPrice?: number;
    };
  };
  warehouse?: OmborTanlovi;
};
