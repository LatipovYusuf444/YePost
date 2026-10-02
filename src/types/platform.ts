// Super admin (platforma) moduli: /platform/* endpointlari. Faqat isStaff: true foydalanuvchi uchun.

export type PlatformKompaniya = {
  id: string;
  name: string;
  slug: string;
  timezone?: string | null;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Backend qo'shimcha hisoblarni qaytarishi mumkin.
  usersCount?: number;
  _count?: { users?: number };
};

export type PlatformKompaniyaDirektori = {
  username: string;
  password: string;
  fullName?: string;
};

export type PlatformKompaniyaYaratish = {
  name: string;
  slug: string;
  timezone?: string;
  isActive?: boolean;
  director?: PlatformKompaniyaDirektori;
};

export type PlatformKompaniyaYangilash = {
  name?: string;
  slug?: string;
  timezone?: string;
};

export type TarifTuri = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

export type PlatformTarif = {
  id: string;
  type: TarifTuri;
  name: string;
  maxBranches: number | null;
  maxUsers: number | null;
  monthlyPrice: number | string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PlatformTarifSaqlash = {
  type?: TarifTuri;
  name?: string;
  // null — cheksiz.
  maxBranches?: number | null;
  maxUsers?: number | null;
  monthlyPrice?: number;
  isActive?: boolean;
};

export type ObunaDavri = "MONTHLY" | "QUARTERLY" | "ANNUAL";
export type ObunaHolati = "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type PlatformObuna = {
  id: string;
  workspaceId: string;
  tariffId: string;
  period: ObunaDavri;
  status: ObunaHolati;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
  tariff?: Pick<PlatformTarif, "id" | "name" | "type"> | null;
  workspace?: Pick<PlatformKompaniya, "id" | "name" | "slug"> | null;
};

export type PlatformObunaYaratish = {
  workspaceId: string;
  tariffId: string;
  period: ObunaDavri;
  status?: ObunaHolati;
  startDate: string;
  endDate: string;
};

// Kompaniya (workspaceId) o'zgarmaydi.
export type PlatformObunaYangilash = {
  tariffId?: string;
  period?: ObunaDavri;
  status?: ObunaHolati;
  endDate?: string;
};

export type PlatformFoydalanuvchi = {
  id: string;
  username: string;
  fullName?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  isStaff?: boolean;
  workspaceId?: string | null;
  workspace?: { id: string; name: string } | null;
  lastLoginAt?: string | null;
  createdAt?: string;
};

export type PlatformFoydalanuvchiFiltri = {
  workspaceId?: string;
  search?: string;
  role?: string;
};

export type PlatformDashboard = {
  workspaces: { total: number; active: number; inactive: number; createdLast30Days: number };
  users: { total: number; active: number; inactive: number };
  // Har holat bo'yicha son: { TRIAL: 2, ACTIVE: 5, EXPIRED: 0, CANCELLED: 1 }.
  subscriptions: Record<string, number>;
};
