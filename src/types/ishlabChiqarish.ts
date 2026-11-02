// Ishlab chiqarish moduli (GET/POST /production/...). Narx faqat kalkulyatsiya kartalarida keladi: buyurtma, sexga berish va smena hisobotida narx yo'q.
export type Son = number | string | null;

export type IshlabChiqarishSozlamasi = {
  enabled: boolean;
  deviationPercent?: Son;
  yieldWarnPercent?: Son;
  commentRequired?: boolean;
};

export type MahsulotTuri = "RAW" | "SEMI" | "FINISHED" | "PACKAGING" | "WASTE" | "SERVICE";
export type OmborTuri = "STORE" | "WIP";

// Serverdagi qatorlar nomni turlicha beradi (productName yoki modification ichida): lib/ishlabChiqarish.ts dagi qatorNomi o'qiydi.
export type NomliQator = {
  productName?: string | null;
  modificationName?: string | null;
  name?: string | null;
  modification?: { id?: string; name?: string | null; barcode?: string | null; product?: { id?: string; name?: string | null } | null } | null;
  product?: { id?: string; name?: string | null } | null;
};

export type RetseptKirimi = NomliQator & {
  id?: string;
  modificationId: string;
  kind: "FIXED" | "RANGE" | "FREE";
  quantity?: Son;
  tolerancePercent?: Son;
  min?: Son;
  max?: Son;
};

export type RetseptChiqimi = NomliQator & {
  id?: string;
  modificationId: string;
  role: "MAIN" | "WASTE";
  quantity: Son;
  quantityType?: "PROPORTIONAL" | "PER_BATCH" | null;
};

export type Retsept = NomliQator & {
  id: string;
  docNumber?: string | null;
  version?: number | null;
  status: string;
  modificationId: string;
  warehouseId: string;
  warehouse?: { id: string; name?: string | null } | null;
  baseQuantity: Son;
  outputMin?: Son;
  outputMax?: Son;
  normalScrapPercent?: Son;
  consumeOnIssue?: boolean;
  note?: string | null;
  inputs?: RetseptKirimi[];
  outputs?: RetseptChiqimi[];
};

export type RetseptTanasi = {
  modificationId: string;
  warehouseId: string;
  baseQuantity: number;
  outputMin?: number;
  outputMax?: number;
  normalScrapPercent?: number;
  consumeOnIssue?: boolean;
  note?: string;
  inputs: Array<{ modificationId: string; kind: RetseptKirimi["kind"]; quantity?: number; tolerancePercent?: number; min?: number; max?: number }>;
  outputs: Array<{ modificationId: string; role: RetseptChiqimi["role"]; quantity: number; quantityType?: "PROPORTIONAL" | "PER_BATCH" }>;
};

export type PortlashQatori = NomliQator & { modificationId?: string; quantity?: Son; required?: Son; min?: Son; max?: Son; kind?: string | null };

export type KalkulyatsiyaQatori = NomliQator & {
  id?: string;
  modificationId: string;
  quantity: Son;
  price: Son;
  currency?: "UZS" | "USD" | null;
  costingRate?: Son;
  amount?: Son;
};

export type KalkulyatsiyaKartasi = NomliQator & {
  id: string;
  docNumber?: string | null;
  version?: number | null;
  status: string;
  modificationId: string;
  recipeId?: string | null;
  validFrom?: string | null;
  normalScrapPercent?: Son;
  note?: string | null;
  total?: Son;
  lines?: KalkulyatsiyaQatori[];
};

export type KalkulyatsiyaTanasi = {
  modificationId: string;
  recipeId?: string;
  validFrom?: string;
  normalScrapPercent?: number;
  note?: string;
  lines: Array<{ modificationId: string; quantity: number; price: number; currency?: "UZS" | "USD"; costingRate?: number }>;
};

export type MavjudlikQatori = NomliQator & { modificationId?: string; required?: Son; issued?: Son; available?: Son; shortage?: Son };
export type Mavjudlik = { items: MavjudlikQatori[]; hasShortage: boolean };

export type Buyurtma = NomliQator & {
  id: string;
  docNumber?: string | null;
  status: string;
  modificationId: string;
  quantity: Son;
  produced?: Son;
  completionSuggested?: boolean;
  requirements?: MavjudlikQatori[];
  sourceWarehouseId?: string;
  destWarehouseId?: string;
  recipeId?: string | null;
  dueDate?: string | null;
  date?: string | null;
  note?: string | null;
  availability?: Mavjudlik;
};

export type BuyurtmaTanasi = {
  modificationId: string;
  quantity: number;
  sourceWarehouseId: string;
  destWarehouseId: string;
  recipeId?: string;
  dueDate?: string;
  date?: string;
  note?: string;
};

export type BerishQatori = NomliQator & {
  id?: string;
  modificationId?: string;
  quantity?: Son;
  batchId?: string | null;
  serial?: string | null;
  weight?: Son;
};

export type SexgaBerish = {
  id: string;
  docNumber?: string | null;
  status: string;
  orderId?: string | null;
  order?: { id: string; docNumber?: string | null } | null;
  sourceWarehouseId?: string | null;
  wipWarehouseId?: string | null;
  consumeOnIssue?: boolean;
  date?: string | null;
  note?: string | null;
  lines?: BerishQatori[];
};

export type BerishTanasi = {
  orderId?: string;
  sourceWarehouseId?: string;
  wipWarehouseId?: string;
  consumeOnIssue?: boolean;
  date?: string;
  note?: string;
  lines: Array<{ modificationId?: string; quantity?: number; batchId?: string }>;
};

export type SexdanQaytarish = {
  id: string;
  docNumber?: string | null;
  status: string;
  issueId?: string | null;
  issue?: { id: string; docNumber?: string | null } | null;
  date?: string | null;
  lines?: Array<NomliQator & { id?: string; issueLineId?: string; quantity?: Son; serial?: string | null }>;
};

export type NavbatQatori = {
  orderId: string;
  docNumber?: string | null;
  productName?: string | null;
  quantity?: Son;
  produced?: Son;
  remaining?: Son;
  dueDate?: string | null;
};

export type TozaxtashSababi = "BREAKDOWN" | "MAINTENANCE" | "NO_STAFF" | "OTHER_WORK" | "NO_MATERIAL" | "NO_POWER" | "OTHER";

export type SmenaChiqimi = NomliQator & {
  id?: string;
  quantity?: Son;
  scrapQuantity?: Son;
  serial?: string | null;
  modificationId?: string | null;
  role?: string | null;
  batchId?: string | null;
};

export type SmenaKirimi = NomliQator & { id?: string; modificationId: string; quantity?: Son; entryMethod?: "NORM" | "ACTUAL" | null; offRecipe?: boolean | null };

export type SmenaHisoboti = {
  id: string;
  docNumber?: string | null;
  status: string;
  orderId?: string | null;
  order?: { id: string; docNumber?: string | null } | null;
  recipeId?: string | null;
  destWarehouseId?: string | null;
  shiftEndsAt?: string | null;
  comment?: string | null;
  outputs?: SmenaChiqimi[];
  inputs?: SmenaKirimi[];
  downtime?: Array<{ reason: TozaxtashSababi; hours: Son; note?: string | null }>;
};

export type SmenaTanasi = {
  orderId?: string;
  recipeId?: string;
  destWarehouseId?: string;
  shiftEndsAt?: string;
  comment?: string;
  outputs: Array<{ quantity: number; scrapQuantity?: number; serial?: string; modificationId?: string; role?: string }>;
  inputs?: Array<{ modificationId: string; quantity: number; entryMethod?: "NORM" | "ACTUAL"; offRecipe?: boolean }>;
  downtime?: Array<{ reason: TozaxtashSababi; hours: number; note?: string }>;
};

export type Rulon = {
  batchId: string;
  serial?: string | null;
  productName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  weight?: Son;
  weightLeft?: Son;
  status?: string | null;
};

export type RulonXulosasi = { productName?: string | null; rolls?: Son; weight?: Son };
