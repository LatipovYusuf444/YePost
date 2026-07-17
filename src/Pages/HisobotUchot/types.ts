// Hisobot uchoti: mock modul tiplari. Backendga bog'liq emas.
// Yangi maydon qo'shilganda: shu tipga qo'shiladi → mockData.ts ga qiymat → jadvalga ustun.

export type HisobotTab = "stock" | "counterparty" | "profit" | "income" | "audit";

// Tanlov ro'yxati (filter selectlari / ko'p tanlovli maydonlar uchun)
export type Tanlov = {
  id: string;
  nomi: string;
};

export type Maxsulot = {
  id: string;
  nomi: string;
  categoryId: string;
  boshQoldiq: number; // davr boshidagi qoldiq
  barkod: string;
  artikul: string;
  birlik: string;
  tanNarx: number;
  sotuvNarx: number;
  ulgurjiNarx: number;
};

// Hujjat turi: kirim/inventarizatsiya → qoldiqni oshiradi (Kirim ustuni),
// chiqim/realizatsiya → qoldiqni kamaytiradi (Chiqim ustuni).
export type HujjatTuri = "kirim" | "inventarizatsiya" | "chiqim" | "realizatsiya";

// Tovar harakati — bitta hujjat qatori (barcha filtrlarga bog'langan)
export type TovarHarakati = {
  id: string;
  sana: string;
  hujjatTuri: HujjatTuri;
  hujjatRaqam: string;
  productId: string;
  xarakteristikaId: string;
  categoryId: string;
  warehouseId: string;
  filialId: string;
  miqdor: number;
  customerId: string; // realizatsiyada to'ldiriladi, aks holda ""
  supplierId: string; // kirimda to'ldiriladi, aks holda ""
};

// Tovar harakati filtri (ko'p tanlovli → id massivlari)
export type TovarHarakatiFilter = {
  dateFrom: string;
  dateTo: string;
  warehouseIds: string[];
  filialIds: string[];
  categoryIds: string[];
  productIds: string[];
  xarakteristikaIds: string[];
  customerIds: string[];
  supplierIds: string[];
};

// O'zaro hisob-kitob (kontragent)
export type Kontragent = {
  refId: string; // mijoz (mij-*) yoki yetkazib beruvchi (ytk-*) id
  turi: "mijoz" | "yetkazibBeruvchi";
};

// Tovar hujjatlari (realizatsiya/xarid) ombor modalida ochiladi;
// to'lov hujjatlari (kassaKirim/tolov) hozircha ochilmaydi.
export type HisobKitobTuri = "realizatsiya" | "xarid" | "kassaKirim" | "tolov";

// Hisob-kitob hujjati: Konech = Nach + Kirim(prixod) − Chiqim(rasxod).
// balans > 0 → biz qarzdormiz (ular oldindan to'lagan); < 0 → ular bizga qarzdor.
export type HisobKitobHujjati = {
  id: string;
  refId: string;
  sana: string; // ISO datetime
  hujjat: string; // "Realizatsiya № FP1", "Kassa kirim № K1", ...
  turi: HisobKitobTuri;
  prixod: number; // Kirim (Приход)
  rasxod: number; // Chiqim (Расход)
  productId?: string; // tovar hujjatlarida — ombor modalidagi satr uchun
  soni?: number;
};

// Mahsulot foydasi
export type MahsulotFoydasi = {
  id: string;
  mahsulot: string;
  categoryId: string;
  sotilgan: number;
  tushum: number;
  tannarx: number;
  foyda: number;
};

// Kirim-chiqim harakati
export type KirimChiqim = {
  id: string;
  sana: string;
  branchId: string;
  turi: "kirim" | "chiqim";
  kategoriya: string;
  summa: number;
};

// Audit logi
export type AuditYozuvi = {
  id: string;
  sana: string;
  foydalanuvchi: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  resurs: string;
  tafsilot: string;
};

// index.tsx dagi qolgan tablar uchun oddiy filter
export type Filterlar = {
  dateFrom: string;
  dateTo: string;
  customerId: string;
  supplierId: string;
  categoryId: string;
  branchId: string;
  auditAction: string;
  auditResource: string;
};
