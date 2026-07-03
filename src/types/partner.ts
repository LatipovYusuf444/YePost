export type MijozKompaniyasi = {
  id: string;
  name: string;
  inn?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MijozKompaniyasiMalumoti = {
  name: string;
  inn?: string;
  phone?: string;
};

export type Mijoz = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone: string;
  address?: string | null;
  telegramId?: string | null;
  companyId?: string | null;
  company?: MijozKompaniyasi | null;
  customFields?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MijozMalumoti = {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  address?: string;
  telegramId?: string;
  companyId?: string;
  customFields?: Record<string, unknown>;
};

export type YetkazibBeruvchi = {
  id: string;
  name: string;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type YetkazibBeruvchiMalumoti = {
  name: string;
  phone?: string;
};
