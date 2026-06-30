export type AccountRoli = "KASSIR" | "OMBORCHI" | "ADMIN" | "DIREKTOR";

export type VakolatKodi =
  | "DELETE"
  | "REPORTS"
  | "EXPENSE"
  | "CASH_IN"
  | "RETURN_CANCEL";

export type AccountFoydalanuvchi = {
  id: string;
  workspaceId: string;
  branchId?: string | null;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  imageUrl?: string | null;
  role: AccountRoli | string;
  telegramId?: string | null;
  isActive: boolean;
  isStaff?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  grants?: AccountVakolati[];
  branch?: {
    id: string;
    name?: string;
  } | null;
};

export type FoydalanuvchiYaratishMalumoti = {
  username: string;
  password: string;
  fullName?: string;
  role?: AccountRoli;
  branchId?: string;
  telegramId?: string;
  isActive?: boolean;
};

export type FoydalanuvchiYangilashMalumoti = Partial<
  FoydalanuvchiYaratishMalumoti
>;

export type AccountVakolati = {
  id: string;
  workspaceId?: string;
  userId: string;
  code: VakolatKodi | string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: AccountFoydalanuvchi;
};

export type VakolatYaratishMalumoti = {
  userId: string;
  code: VakolatKodi;
  isActive?: boolean;
};

export type VakolatYangilashMalumoti = {
  isActive?: boolean;
};
