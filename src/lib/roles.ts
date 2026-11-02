type RoleLike = {
  role?: string | null;
  roleName?: string | null;
  grants?: Array<{ code: string; isActive?: boolean; isDeleted?: boolean }> | null;
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
    STOREKEEPER: "OMBORCHI",
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

// Valyuta rejimi va dollar kursini faqat ADMIN va DIREKTOR o'zgartira oladi (backend ham shunday cheklaydi).
export function foydalanuvchiKursniOzgartiraOladimi(user?: RoleLike | null) {
  const rol = foydalanuvchiRoli(user);
  return rol === "ADMIN" || rol === "DIREKTOR";
}

export type IshlabChiqarishBolimi = "buyurtmalar" | "retseptlar" | "kalkulyatsiya" | "sexga-berish" | "smena" | "rulonlar";

function faolHuquqBormi(user: RoleLike | null | undefined, kod: string) {
  return (user?.grants ?? []).some((huquq) => huquq.code === kod && huquq.isActive !== false && !huquq.isDeleted);
}

// Ishlab chiqarish: buyurtma — ADMIN/DIREKTOR; retsept va kalkulyatsiya — o'z huquqi yoki DIREKTOR; sexga berish va smena hisoboti — o'z huquqi, ADMIN yoki DIREKTOR.
// Menyu uchun; yakuniy qarorni server beradi.
export function ishlabChiqarishRuxsati(user: RoleLike | null | undefined, bolim: IshlabChiqarishBolimi) {
  const rol = foydalanuvchiRoli(user);
  const rahbar = rol === "ADMIN" || rol === "DIREKTOR";
  if (bolim === "buyurtmalar") return rahbar;
  if (bolim === "retseptlar") return rol === "DIREKTOR" || faolHuquqBormi(user, "PRODUCTION_RECIPE");
  if (bolim === "kalkulyatsiya") return rol === "DIREKTOR" || faolHuquqBormi(user, "COSTING");
  if (bolim === "sexga-berish") return rahbar || faolHuquqBormi(user, "PRODUCTION_ISSUE");
  if (bolim === "smena") return rahbar || faolHuquqBormi(user, "PRODUCTION_REPORT");
  return rahbar || faolHuquqBormi(user, "PRODUCTION_ISSUE") || faolHuquqBormi(user, "PRODUCTION_REPORT");
}

const ISHLAB_CHIQARISH_BOLIMLARI: IshlabChiqarishBolimi[] = ["buyurtmalar", "retseptlar", "kalkulyatsiya", "sexga-berish", "smena", "rulonlar"];

export function ishlabChiqarishYoliRuxsati(user: RoleLike | null | undefined, pathname: string) {
  const bolim = pathname.split("/")[2];
  return bolim
    ? ISHLAB_CHIQARISH_BOLIMLARI.includes(bolim as IshlabChiqarishBolimi) && ishlabChiqarishRuxsati(user, bolim as IshlabChiqarishBolimi)
    : ISHLAB_CHIQARISH_BOLIMLARI.some((nom) => ishlabChiqarishRuxsati(user, nom));
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
  if (yolPrefiksiMosmi(pathname, "/ishlab-chiqarish")) return ishlabChiqarishYoliRuxsati(user, pathname);
  const rol = foydalanuvchiRoli(user);
  if (rol === "ADMIN" || rol === "DIREKTOR") return true;

  const kassirRuxsati = KASSIR_YOLLARI.some((yol) => yolPrefiksiMosmi(pathname, yol));
  if (rol === "KASSIR") return kassirRuxsati;
  if (rol === "OMBORCHI") {
    return kassirRuxsati || (pathname.startsWith("/ombor") && pathname !== "/ombor/omborlar");
  }
  return false;
}
