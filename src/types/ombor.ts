export type HujjatHolati = "DRAFT" | "CONFIRMED" | "CANCELLED" | "SENT" | "RECEIVED";

export type Ombor = {
  id: string;
  name: string;
  branchId?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingTime?: string | null;
  closingTime?: string | null;
  responsibleId?: string | null;
  createdById?: string | null;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  branch?: { id: string; name?: string };
  responsible?: NomliEntity;
  createdBy?: NomliEntity;
};

export type OmborSaqlashMalumoti = {
  name: string;
  branchId?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingTime?: string | null;
  closingTime?: string | null;
  responsibleId?: string | null;
  isActive?: boolean;
};

export type Filial = {
  id: string;
  name: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE" | string;
  responsibleId?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FilialYaratishMalumoti = {
  name: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE";
  responsibleId?: string;
};

export type Kompaniya = {
  id: string;
  name: string;
  inn?: string;
  address?: string;
  phone?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type KompaniyaSaqlashMalumoti = {
  name: string;
  inn?: string;
  address?: string;
  phone?: string;
};

export type NomliEntity = {
  id: string;
  name?: string;
  fullName?: string;
  username?: string;
  phone?: string;
};

export type MahsulotModifikatsiyasi = {
  id: string;
  name?: string;
  barcode?: string;
  article?: string;
  productId?: string;
  product?: NomliEntity;
  params?: Record<string, string | number | null | undefined>;
  price?: {
    costPrice?: number | string;
    retailPrice?: number | string;
    wholesalePrice?: number | string;
  };
};

export type OmborQoldigi = {
  id?: string;
  warehouseId?: string;
  modificationId: string;
  quantity?: number | string;
  balance?: number | string;
  availableQuantity?: number | string;
  warehouse?: Ombor;
  modification?: MahsulotModifikatsiyasi;
};

export type KirimMahsuloti = {
  id?: string;
  modificationId: string;
  quantity: number;
  price: number;
  modification?: MahsulotModifikatsiyasi;
};

export type KirimHujjati = {
  id: string;
  number?: string;
  documentNumber?: string;
  docNumber?: string;
  supplierId: string;
  warehouseId: string;
  responsibleId?: string;
  note?: string;
  status?: HujjatHolati | string;
  total?: number;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  supplier?: NomliEntity;
  warehouse?: Ombor;
  responsible?: NomliEntity;
  items?: KirimMahsuloti[];
};

export type KirimYaratishMalumoti = {
  supplierId: string;
  warehouseId: string;
  responsibleId?: string;
  note?: string;
  items: Array<{
    modificationId: string;
    quantity: number;
    price: number;
  }>;
};

export type ChiqimSababi = "DAMAGE" | "EXPIRY" | "THEFT" | "OTHER";

export type ChiqimHujjati = {
  id: string;
  number?: string;
  documentNumber?: string;
  docNumber?: string;
  warehouseId: string;
  reason: ChiqimSababi | string;
  responsibleId?: string;
  note?: string;
  status?: HujjatHolati | string;
  total?: number;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  createdById?: string;
  updatedById?: string;
  warehouse?: Ombor;
  responsible?: NomliEntity;
  createdBy?: NomliEntity;
  updatedBy?: NomliEntity;
  items?: Array<{
    id?: string;
    modificationId: string;
    quantity: number;
    price?: number | string;
    unitPrice?: number | string;
    costPrice?: number | string;
    modification?: MahsulotModifikatsiyasi;
  }>;
};

export type ChiqimYaratishMalumoti = {
  warehouseId: string;
  reason: ChiqimSababi;
  responsibleId?: string;
  note?: string;
  items: Array<{ modificationId: string; quantity: number }>;
};

export type KochirishHujjati = {
  id: string;
  number?: string;
  documentNumber?: string;
  docNumber?: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  responsibleId?: string;
  note?: string;
  status?: HujjatHolati | string;
  total?: number;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string;
  receivedAt?: string;
  cancelledAt?: string;
  createdById?: string;
  updatedById?: string;
  sourceWarehouse?: Ombor;
  destWarehouse?: Ombor;
  responsible?: NomliEntity;
  createdBy?: NomliEntity;
  updatedBy?: NomliEntity;
  items?: Array<{
    id?: string;
    modificationId: string;
    quantity: number;
    price?: number | string;
    unitPrice?: number | string;
    costPrice?: number | string;
    modification?: MahsulotModifikatsiyasi;
  }>;
};

export type KochirishYaratishMalumoti = {
  sourceWarehouseId: string;
  destWarehouseId: string;
  responsibleId?: string;
  note?: string;
  items: Array<{ modificationId: string; quantity: number }>;
};

export type InventarizatsiyaTuri = "FULL" | "PARTIAL";

export type InventarizatsiyaHujjati = {
  id: string;
  warehouseId: string;
  type?: InventarizatsiyaTuri | string;
  responsibleId?: string;
  note?: string;
  status?: HujjatHolati | string;
  createdAt?: string;
  warehouse?: Ombor;
  responsible?: NomliEntity;
  items?: Array<{
    id?: string;
    modificationId: string;
    actualQuantity: number;
    expectedQuantity?: number;
    modification?: MahsulotModifikatsiyasi;
  }>;
};

export type InventarizatsiyaYaratishMalumoti = {
  warehouseId: string;
  type?: InventarizatsiyaTuri;
  responsibleId?: string;
  note?: string;
  items: Array<{ modificationId: string; actualQuantity: number }>;
};
