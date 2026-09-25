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
  createdAt?: string;
  updatedAt?: string;
};

export type OlchovBirligiMalumoti = {
  code?: string;
  name: string;
  shortName?: string;
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
  currency?: string;
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
};
