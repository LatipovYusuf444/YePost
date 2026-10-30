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
  // Mijoz hisobi (oldindan to'langan pul) va uning valyutasi (valyuta rejimida USD).
  balance?: number | string | null;
  balanceCurrency?: string | null;
  // Mijoz kartasida tanlangan hisob valyutasi ("UZS" | "USD"); null — belgilanmagan (dollar rejimida hisob dollarda yuritiladi).
  // Hisobda pul bo'lsa o'zgarish hisob bo'shaguncha kutadi, shu sabab `balanceCurrency`dan farq qilishi mumkin.
  currency?: string | null;
  // Telegram bot: ulangan mijozning chat id'si (null — ulanmagan), ulangan vaqt, xabar yoqilganligi (mijoz /stop bossa false)
  // va mijoz botni bloklaganmi.
  telegramChatId?: string | null;
  telegramLinkedAt?: string | null;
  telegramNotify?: boolean | null;
  telegramBlocked?: boolean | null;
  customFields?: Record<string, unknown> | null;
  socials?: PartnerSocials | null;
  partner?: Partner | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MijozMalumoti = {
  firstName: string;
  lastName?: string;
  middleName?: string;
  phone: string;
  address?: string;
  telegramId?: string;
  companyId?: string;
  // PATCH'da null — tanlovni olib tashlash; POST'da belgilanmagan valyuta yuborilmaydi.
  currency?: "UZS" | "USD" | null;
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
