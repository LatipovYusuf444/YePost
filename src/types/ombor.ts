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
  phone?: string;
  status?: "ACTIVE" | "INACTIVE" | string;
  isPrimary?: boolean;
  responsibleId?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FilialYaratishMalumoti = {
  name: string;
  address?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE";
  isPrimary?: boolean;
  responsibleId?: string | null;
};

export type Kompaniya = {
  id: string;
  name: string;
  inn?: string;
  address?: string;
  phone?: string;
  currency?: "UZS" | "USD" | string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type KompaniyaSaqlashMalumoti = {
  name: string;
  inn?: string;
  address?: string;
  phone?: string;
  currency?: "UZS" | "USD";
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
    currency?: string;
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
  // Qo'shimcha birlikda kiritilgan qator: kiritilgan son/narx shu birlikda, `quantity`/`price` esa asosiy birlikda.
  unitId?: string | null;
  unitName?: string | null;
  baseUnitName?: string | null;
  unitQuantity?: number | string | null;
  unitPrice?: number | string | null;
  factorSnapshot?: number | string | null;
  modification?: MahsulotModifikatsiyasi;
};

// Kirimda sanalgan miqdor kartochkadagi koeffitsientdan 2% dan ko'p farq qilsa backend hujjatni saqlab, shuni qaytaradi.
export type KirimOgohlantirishi = {
  code: string;
  modificationId?: string;
  unitId?: string;
  unitName?: string;
  cardFactor?: string | number;
  actualFactor?: string | number;
};

export type KirimHujjati = {
  id: string;
  currency?: "UZS" | "USD" | string;
  number?: string;
  documentNumber?: string;
  docNumber?: string;
  date?: string;
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
  warnings?: KirimOgohlantirishi[];
};

export type KirimYaratishMalumoti = {
  // Hujjat sanasi (kun, YYYY-MM-DD, Toshkent): berilmasa yoki bugun bo'lsa — hozirgi vaqt; o'tgan kun — o'sha kunning 23:59:59.
  date?: string;
  supplierId: string;
  warehouseId: string;
  responsibleId?: string;
  note?: string;
  items: Array<{
    modificationId: string;
    quantity: number;
    price: number;
    // Qo'shimcha birlik (qop, korobka): `quantity` va `price` shu birlikda.
    unitId?: string;
    // Koeffitsient tekshiruvi: sanalgan birlik va uning soni (masalan 120 pochka).
    checkUnitId?: string;
    checkCount?: number;
  }>;
};

export type ChiqimSababi = "DAMAGE" | "EXPIRY" | "THEFT" | "OTHER";

export type ChiqimHujjati = {
  id: string;
  number?: string;
  documentNumber?: string;
  docNumber?: string;
  date?: string;
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
  // Hujjat sanasi (kun, YYYY-MM-DD, Toshkent): berilmasa yoki bugun bo'lsa — hozirgi vaqt; o'tgan kun — o'sha kunning 23:59:59.
  date?: string;
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
  date?: string;
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
  // Hujjat sanasi (kun, YYYY-MM-DD, Toshkent): berilmasa yoki bugun bo'lsa — hozirgi vaqt; o'tgan kun — o'sha kunning 23:59:59.
  date?: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  responsibleId?: string;
  note?: string;
  items: Array<{ modificationId: string; quantity: number }>;
};

export type InventarizatsiyaTuri = "FULL" | "PARTIAL";

export type InventarizatsiyaHujjati = {
  id: string;
  date?: string;
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
    actualQuantity: number | string;
    systemQuantity?: number | string;
    expectedQuantity?: number | string;
    modification?: MahsulotModifikatsiyasi;
  }>;
};

export type InventarizatsiyaYaratishMalumoti = {
  // Hujjat sanasi (kun, YYYY-MM-DD, Toshkent): berilmasa yoki bugun bo'lsa — hozirgi vaqt; o'tgan kun — o'sha kunning 23:59:59.
  date?: string;
  warehouseId: string;
  type?: InventarizatsiyaTuri;
  responsibleId?: string;
  note?: string;
  items: Array<{ modificationId: string; actualQuantity: number }>;
};
