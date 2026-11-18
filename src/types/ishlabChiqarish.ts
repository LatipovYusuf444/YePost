// Ishlab chiqarish moduli (GET/POST /production/...). Narx faqat kalkulyatsiya kartalarida keladi: buyurtma, sexga berish va smena hisobotida narx yo'q.
export type Son = number | string | null;

export type IshlabChiqarishSozlamasi = {
  enabled: boolean;
  deviationPercent?: Son;
  yieldWarnPercent?: Son;
  commentRequired?: boolean;
  // Qabulda brak ulushi shu foizdan oshsa qizil ogohlantirish va do'kon Telegram guruhiga xabar (standart 10).
  scrapAlertPercent?: Son;
  // false: "Xomashyo berish" bosqichi yo'q — xomashyo qabulda asosiy ombordan sarflanadi (standart true).
  issueStageEnabled?: boolean;
  defaultSourceWarehouseId?: string | null;
  defaultDestWarehouseId?: string | null;
  scrapWarehouseId?: string | null;
};

/** Brak sababi (GET /production/scrap-reasons): tayyorlari (Kuygan, Xom qolgan, ...) birinchi o'qishda o'zi qo'shiladi. */
export type BrakSababi = { id: string; name: string; isPreset?: boolean; position?: number };

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
  // Qabul qilingan brak shu mahsulot bo'lib brak omboriga kiradi (masalan "Brak non").
  scrapModificationId?: string | null;
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
  scrapModificationId?: string | null;
  note?: string;
  inputs: Array<{ modificationId: string; kind: RetseptKirimi["kind"]; quantity?: number; tolerancePercent?: number; min?: number; max?: number }>;
  outputs: Array<{ modificationId: string; role: RetseptChiqimi["role"]; quantity: number; quantityType?: "PROPORTIONAL" | "PER_BATCH" }>;
};

export type PortlashQatori = NomliQator & { modificationId?: string; quantity?: Son; min?: Son; max?: Son; kind?: string | null; role?: string | null };
/** GET /production/recipes/:id/explode: kirishlar va chiqishlar alohida keladi. */
export type Portlash = { inputs: PortlashQatori[]; outputs: PortlashQatori[] };

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

/** GET /production/costing-cards/price: shu kuni amaldagi 1 dona narxi. */
export type KunNarxi = { cardId?: string; version?: number | null; unitCost?: Son };

export type KalkulyatsiyaTanasi = {
  modificationId: string;
  recipeId?: string;
  validFrom?: string;
  normalScrapPercent?: number;
  note?: string;
  lines: Array<{ modificationId: string; quantity: number; price: number; currency?: "UZS" | "USD"; costingRate?: number }>;
};

// Buyurtma `requirements` qatorida faqat `quantity` keladi; required/issued/reserved/available/shortage — availability javobida.
// reserved — shu buyurtmaga band qilingan; available — boshqa buyurtmalar bandi ayirilgan (ombor + sex).
export type MavjudlikQatori = NomliQator & { modificationId?: string; quantity?: Son; required?: Son; issued?: Son; reserved?: Son; available?: Son; shortage?: Son };
/** hasShortage — "Xomashyo kutilmoqda"; issuedFully: false — xomashyo to'liq berilmagan. */
export type Mavjudlik = { items: MavjudlikQatori[]; hasShortage: boolean; issuedFully: boolean };

/** Yopish hujjati qatori: berildi, sarflandi, ortishi kerak, qaytadi, sexda qoladi, yo'qotish. */
export type YopishQatori = NomliQator & { modificationId: string; issued?: Son; consumed?: Son; expected?: Son; returned?: Son; kept?: Son; loss?: Son };
export type YopishHujjati = { id?: string; date?: string | null; note?: string | null; createdById?: string | null; createdAt?: string | null; lines?: YopishQatori[] };

export type Buyurtma = NomliQator & {
  id: string;
  docNumber?: string | null;
  status: string;
  modificationId: string;
  quantity: Son;
  // Qabul qilingan yaroqli va brak (qabul aktlaridan).
  produced?: Son;
  scrap?: Son;
  completionSuggested?: boolean;
  requirements?: MavjudlikQatori[];
  sourceWarehouseId?: string;
  destWarehouseId?: string;
  recipeId?: string | null;
  dueDate?: string | null;
  date?: string | null;
  note?: string | null;
  completionNote?: string | null;
  createdAt?: string | null;
  availability?: Mavjudlik;
  // Yopilgan buyurtmaning yopish hujjati.
  close?: YopishHujjati | null;
};

export type BuyurtmaTanasi = {
  modificationId: string;
  quantity: number;
  // Berilmasa sozlamadagi standart ombor (u ham bo'lmasa server VALIDATION_FAILED, field: sourceWarehouseId/destWarehouseId).
  sourceWarehouseId?: string;
  destWarehouseId?: string;
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
};

export type SexgaBerish = {
  id: string;
  docNumber?: string | null;
  status: string;
  orderId?: string | null;
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
  date?: string | null;
  // Qatorda mahsulot nomi yo'q: u `issueLineId` orqali sexga berish hujjatidan olinadi.
  lines?: Array<{ id?: string; issueLineId?: string; quantity?: Son; restored?: Array<{ batchId: string; quantity: Son }> }>;
};

export type NavbatQatori = {
  orderId: string;
  docNumber?: string | null;
  modificationId?: string;
  status?: string | null;
  productName?: string | null;
  quantity?: Son;
  produced?: Son;
  remaining?: Son;
  dueDate?: string | null;
};

export type TozaxtashSababi = "BREAKDOWN" | "MAINTENANCE" | "NO_STAFF" | "OTHER_WORK" | "NO_MATERIAL" | "NO_POWER" | "OTHER";

export type SmenaTuzatishi = { id?: string; outputId?: string; delta: Son; reason?: string | null; createdById?: string | null; createdAt?: string | null };

export type SmenaChiqimi = NomliQator & {
  id?: string;
  quantity?: Son;
  scrapQuantity?: Son;
  scrapReasonId?: string | null;
  serial?: string | null;
  modificationId?: string | null;
  role?: string | null;
  batchId?: string | null;
  corrections?: SmenaTuzatishi[];
};

export type SmenaKirimi = NomliQator & { id?: string; modificationId: string; normQuantity?: Son; quantity?: Son; entryMethod?: "NORM" | "ACTUAL" | null; offRecipe?: boolean | null };

export type SmenaHisoboti = {
  id: string;
  docNumber?: string | null;
  status: string;
  date?: string | null;
  orderId?: string | null;
  recipeId?: string | null;
  destWarehouseId?: string | null;
  shiftEndsAt?: string | null;
  comment?: string | null;
  cancelReason?: string | null;
  // Oxirgi qabul akti: qaytarilgan bo'lsa ustaga sababi shu yerdan ko'rsatiladi.
  acceptance?: { id?: string; status?: string | null; returnReason?: string | null; docNumber?: string | null; acceptedAt?: string | null } | null;
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
  outputs: Array<{ quantity: number; scrapQuantity?: number; scrapReasonId?: string; serial?: string; modificationId?: string; role?: string }>;
  inputs?: Array<{ modificationId: string; quantity: number; entryMethod?: "NORM" | "ACTUAL" }>;
  downtime?: Array<{ reason: TozaxtashSababi; hours: number; note?: string }>;
};

// Javobda ombor nomi va holat yo'q: nom omborlar ro'yxatidan olinadi, holat so'rov filtri bilan tanlanadi.
export type Rulon = {
  batchId: string;
  serial?: string | null;
  modificationId?: string;
  productName?: string | null;
  warehouseId?: string | null;
  weight?: Son;
  weightLeft?: Son;
  receivedAt?: string | null;
};

export type RulonXulosasi = { modificationId?: string; warehouseId?: string | null; productName?: string | null; rolls?: Son; weight?: Son };

/** Qabul akti qatori: usta yozgani (master*) va PM soni (boshida ustanikiga teng), farqi bilan. */
export type QabulQatori = {
  id: string;
  outputId?: string;
  modificationId: string;
  productName?: string | null;
  masterGood?: Son;
  masterScrap?: Son;
  masterScrapReasonId?: string | null;
  masterScrapReasonName?: string | null;
  good?: Son;
  scrap?: Son;
  scrapReasonId?: string | null;
  scrapReasonName?: string | null;
  goodDifference?: Son;
  scrapDifference?: Son;
};

/** Qabul akti (GET /production/acceptances): DRAFT — qabul kutilmoqda, CONFIRMED — qabul qilingan, CANCELLED — qaytarilgan yoki bekor. */
export type QabulAkti = {
  id: string;
  docNumber?: string | null;
  status: string;
  date?: string | null;
  reportId?: string;
  orderId?: string | null;
  scrapPercent?: Son;
  scrapAlert?: boolean;
  note?: string | null;
  returnReason?: string | null;
  cancelReason?: string | null;
  acceptedById?: string | null;
  acceptedAt?: string | null;
  createdAt?: string | null;
  returned?: boolean;
  totals?: { good?: Son; scrap?: Son; total?: Son; planned?: Son; scrapPercent?: Son };
  order?: { id?: string; docNumber?: string | null; quantity?: Son } | null;
  report?: { id?: string; docNumber?: string | null; date?: string | null; shiftEndsAt?: string | null; warehouseId?: string | null } | null;
  lines?: QabulQatori[];
};

export type QabulOgohlantirishi = { code: string; percent?: Son; limit?: Son };
export type QabulTanasi = { lines?: Array<{ lineId: string; good?: number; scrap?: number; scrapReasonId?: string }>; note?: string };
export type YopishTanasi = { lines?: Array<{ modificationId: string; returned?: number; kept?: number }>; note?: string };
