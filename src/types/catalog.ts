import type { TovarBirligi } from "../lib/kopBirlik.ts";

export type Kategoriya = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type KategoriyaMalumoti = {
  name: string;
};

export type OlchovBirligi = {
  id: string;
  code?: string | null;
  name: string;
  shortName?: string | null;
  // Kg, litr, metr kabi kasr miqdor mumkin birliklar.
  isFractional?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type OlchovBirligiMalumoti = {
  code?: string;
  name: string;
  shortName?: string;
  isFractional?: boolean;
};

export type StandardUnit = {
  id: number;
  code: string | null;
  nameUz: string;
  nameRu: string;
  shortNameUz: string;
  shortNameRu: string;
  category: string;
  type: "STANDARD" | "LOCAL";
};

export type MahsulotNarxi = {
  id?: string;
  modificationId?: string;
  costPrice?: number | string;
  retailPrice?: number | string;
  wholesalePrice?: number | string;
  // Eski umumiy maydon: endi faqat chakana narx valyutasi (retailCurrency bilan bir xil).
  currency?: string;
  // Har bir narxning o'z valyutasi (UZS/USD). Yo'q bo'lsa — `currency`, u ham yo'q bo'lsa so'm.
  costCurrency?: string | null;
  retailCurrency?: string | null;
  wholesaleCurrency?: string | null;
  // GET /catalog/modifications/search: valyuta rejimi yoqilgan bo'lsa qo'shimcha keladi.
  // USD narx × bugungi kurs, butun so'mgacha yaxlitlangan; UZS narx o'zgarmaydi; kurs yo'q bo'lsa *Uzs = null.
  rate?: number | string | null;
  retailPriceUzs?: number | string | null;
  wholesalePriceUzs?: number | string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MahsulotModifikatsiyasi = {
  id: string;
  productId?: string;
  name?: string | null;
  params?: Record<string, unknown> | null;
  barcode: string;
  article?: string | null;
  imageUrl?: string | null;
  minStock?: number | string | null;
  price?: MahsulotNarxi | null;
  product?: (Pick<Mahsulot, "id" | "name"> & Partial<Mahsulot>) | null;
  // GET /catalog/modifications/search: tovarning sotiladigan/qabul qilinadigan birliklari (asosiy birlik birinchi).
  birliklar?: TovarBirligi[];
  // Qidiruv shtrix-kodi qo'shimcha birlikka (pochka) tegishli bo'lsa — shu birlik.
  qidiruvBirligi?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ModifikatsiyaMalumoti = {
  name?: string;
  params?: Record<string, unknown>;
  barcode: string;
  article?: string;
  imageUrl?: string;
  minStock?: number;
  price?: {
    costPrice?: number;
    retailPrice?: number;
    wholesalePrice?: number;
    currency?: string;
    costCurrency?: "UZS" | "USD";
    retailCurrency?: "UZS" | "USD";
    wholesaleCurrency?: "UZS" | "USD";
  };
};

export type Mahsulot = {
  id: string;
  name: string;
  categoryId: string;
  unitId: string;
  imageUrl?: string | null;
  barcode?: string | null;
  article?: string | null;
  // 1 asosiy birlik og'irligi (kg), faqat ma'lumot uchun.
  infoWeightKg?: number | string | null;
  isActive: boolean;
  category?: Kategoriya;
  unit?: OlchovBirligi;
  modifications?: MahsulotModifikatsiyasi[];
  createdAt?: string;
  updatedAt?: string;
};

export type MahsulotMalumoti = {
  name: string;
  categoryId: string;
  unitId: string;
  imageUrl?: string;
  barcode?: string;
  article?: string;
  infoWeightKg?: number | null;
  isActive?: boolean;
};

export type MahsulotImportNatijasi = {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  createdCategories: Array<{
    id: string | null;
    name: string;
  }>;
  createdUnits: Array<{
    id: string | null;
    name: string;
  }>;
  errors: Array<{
    row: number;
    column: string | null;
    code: string;
    message: string;
    value: string | null;
  }>;
  errorsTruncated: boolean;
};

export type MahsulotExportFiltrlari = {
  categoryId?: string;
  isActive?: boolean;
};

export type NarxMalumoti = {
  costPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  // Eski umumiy maydon (endi faqat chakana narx valyutasi): yangi kodda costCurrency/retailCurrency/wholesaleCurrency yuboriladi.
  currency?: "UZS" | "USD";
  costCurrency?: "UZS" | "USD";
  retailCurrency?: "UZS" | "USD";
  wholesaleCurrency?: "UZS" | "USD";
};
