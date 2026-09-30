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

function foydalanuvchiRoli(user?: RoleLike | null): NormalizedRole {
  return rolniNormallashtirish(user?.role) || rolniNormallashtirish(user?.roleName);
}

// KASSIR va OMBORCHI kira oladigan sahifalar (backend shu rollar uchun
// qolgan ro'yxatlarni — xodimlar, filiallar, kompaniyalar, to'liq katalog —
// 403 bilan yopadi, shuning uchun menyu va marshrutlar ham shunga mos
// cheklanadi). ADMIN va DIREKTOR uchun cheklov yo'q — hammasi ochiq.
const KASSIR_YOLLARI = ["/", "/savdo", "/mijozlar", "/kassa", "/sozlamalar"];

function yolPrefiksiMosmi(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

// Sahifa/menyu ko'rinishi uchun: profil hali yuklanmagan bo'lsa (null),
// chaqiruvchi buni alohida hisobga olishi kerak — bu funksiya faqat
// profil aniq bo'lganda chaqiriladi deb hisoblaydi.
export function sahifagaRuxsatBormi(user: RoleLike | null | undefined, pathname: string): boolean {
  const rol = foydalanuvchiRoli(user);
  if (rol === "ADMIN" || rol === "DIREKTOR") return true;

  const kassirRuxsati = KASSIR_YOLLARI.some((yol) => yolPrefiksiMosmi(pathname, yol));
  if (rol === "KASSIR") return kassirRuxsati;
  if (rol === "OMBORCHI") {
    return kassirRuxsati || (pathname.startsWith("/ombor") && pathname !== "/ombor/omborlar");
  }
  return false;
}
