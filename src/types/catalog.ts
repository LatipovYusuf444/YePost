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
  name: string;
  shortName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OlchovBirligiMalumoti = {
  name: string;
  shortName?: string;
};

export type MahsulotNarxi = {
  id?: string;
  modificationId?: string;
  costPrice?: number | string;
  retailPrice?: number | string;
  wholesalePrice?: number | string;
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
  price?: MahsulotNarxi | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ModifikatsiyaMalumoti = {
  name?: string;
  params?: Record<string, unknown>;
  barcode: string;
  article?: string;
  price?: {
    costPrice?: number;
    retailPrice?: number;
    wholesalePrice?: number;
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

export type NarxMalumoti = {
  costPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
};
