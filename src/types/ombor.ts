export type HujjatHolati = "DRAFT" | "CONFIRMED" | "CANCELLED" | "SENT" | "RECEIVED";

export type Ombor = {
  id: string;
  name: string;
  branchId?: string | null;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  branch?: { id: string; name?: string };
};

export type OmborSaqlashMalumoti = {
  name: string;
  branchId?: string;
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
  price?: {
    costPrice?: number;
    retailPrice?: number;
    wholesalePrice?: number;
  };
};

export type OmborQoldigi = {
  id?: string;
  warehouseId?: string;
  modificationId: string;
  quantity?: number;
  balance?: number;
  availableQuantity?: number;
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
  warehouseId: string;
  reason: ChiqimSababi | string;
  responsibleId?: string;
  note?: string;
  status?: HujjatHolati | string;
  createdAt?: string;
  warehouse?: Ombor;
  responsible?: NomliEntity;
  items?: Array<{
    id?: string;
    modificationId: string;
    quantity: number;
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
  sourceWarehouseId: string;
  destWarehouseId: string;
  responsibleId?: string;
  note?: string;
  status?: HujjatHolati | string;
  createdAt?: string;
  sourceWarehouse?: Ombor;
  destWarehouse?: Ombor;
  responsible?: NomliEntity;
  items?: Array<{
    id?: string;
    modificationId: string;
    quantity: number;
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
