type RoleLike = {
  role?: string | null;
  roleName?: string | null;
};

export type NormalizedRole = "DIREKTOR" | "ADMIN" | "KASSIR" | "OMBORCHI" | string;

export function rolniNormallashtirish(role?: string | null): NormalizedRole {
  const cleanRole = String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (!cleanRole) return "";

  const aliases: Record<string, NormalizedRole> = {
    DIRECTOR: "DIREKTOR",
    DIREKTOR: "DIREKTOR",
    OWNER: "DIREKTOR",
    SUPERADMIN: "DIREKTOR",
    SUPER_ADMIN: "DIREKTOR",
    ADMINISTRATOR: "ADMIN",
    ADMIN: "ADMIN",
    CASHIER: "KASSIR",
    KASSIR: "KASSIR",
    WAREHOUSE: "OMBORCHI",
    WAREHOUSEMAN: "OMBORCHI",
    OMBORCHI: "OMBORCHI",
  };

  return aliases[cleanRole] ?? cleanRole;
}

export function foydalanuvchiDirektormi(user?: RoleLike | null) {
  return (
    rolniNormallashtirish(user?.role) === "DIREKTOR" ||
    rolniNormallashtirish(user?.roleName) === "DIREKTOR"
  );
}
