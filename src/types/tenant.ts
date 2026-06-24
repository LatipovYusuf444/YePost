export type FoydalanuvchiRoli = "KASSIR" | "OMBORCHI" | "ADMIN" | "DIREKTOR";

export type JoriyFoydalanuvchi = {
  id: string;
  workspaceId: string;
  branchId?: string | null;
  username: string;
  fullName?: string;
  role: FoydalanuvchiRoli | string;
  isActive?: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkspaceSaqlashMalumoti = {
  name: string;
  slug: string;
  isActive?: boolean;
};

export type TarifTuri = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

export type Tarif = {
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

export type TarifSaqlashMalumoti = {
  type: TarifTuri;
  name: string;
  maxBranches?: number | null;
  maxUsers?: number | null;
  monthlyPrice?: number;
  isActive?: boolean;
};

export type ObunaDavri = "MONTHLY" | "QUARTERLY" | "ANNUAL";
export type ObunaHolati = "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type Obuna = {
  id: string;
  workspaceId: string;
  tariffId: string;
  period: ObunaDavri;
  status: ObunaHolati;
  startDate: string;
  endDate: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tariff?: Tarif;
  workspace?: Workspace;
};

export type ObunaYaratishMalumoti = {
  tariffId: string;
  period: ObunaDavri;
  status?: ObunaHolati;
  startDate: string;
  endDate: string;
};
