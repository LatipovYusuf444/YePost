export type PartnerTuri = "CUSTOMER" | "COMPANY" | "SUPPLIER";

export type PartnerUserSummary = {
  id: string;
  fullName?: string | null;
  role?: string | null;
};

export type PartnerSocials = {
  telegram?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  website?: string | null;
};

export type Partner = {
  id: string;
  type: PartnerTuri | string;
  customFields?: Record<string, unknown> | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdBy?: PartnerUserSummary | null;
  updatedBy?: PartnerUserSummary | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MijozKompaniyasi = {
  id: string;
  name: string;
  inn?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  position?: string | null;
  socials?: PartnerSocials | null;
  partner?: Partner | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MijozKompaniyasiMalumoti = {
  name: string;
  inn?: string;
  phone?: string;
  contactPerson?: string;
  position?: string;
  socials?: PartnerSocials;
  customFields?: Record<string, unknown>;
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
  balance?: number | string | null;
  customFields?: Record<string, unknown> | null;
  socials?: PartnerSocials | null;
  partner?: Partner | null;
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
  inn?: string | null;
  contactPerson?: string | null;
  position?: string | null;
  socials?: PartnerSocials | null;
  partner?: Partner | null;
  createdAt?: string;
  updatedAt?: string;
};

export type YetkazibBeruvchiMalumoti = {
  name: string;
  phone?: string;
  inn?: string;
  contactPerson?: string;
  position?: string;
  socials?: PartnerSocials;
  customFields?: Record<string, unknown>;
};
