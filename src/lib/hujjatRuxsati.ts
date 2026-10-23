import { rolniNormallashtirish } from "./roles.ts";

export type HujjatGuruhi = "ombor" | "savdo";
export type HujjatRuxsatiProfili = {
  role?: string | null;
  grants?: Array<{ code: string; isActive?: boolean }>;
};

// Sotuv va boshlang'ich qarz bir xil endpointdan bekor qilinadi: ADMIN uchun faol RETURN_CANCEL kerak.
export function bekorQilishRuxsatiBormi(profil: HujjatRuxsatiProfili | null | undefined, guruh: HujjatGuruhi) {
  const rol = rolniNormallashtirish(profil?.role);
  if (rol === "DIREKTOR") return true;
  if (rol !== "ADMIN") return false;
  if (guruh === "ombor") return true;
  return (profil?.grants ?? []).some((grant) => grant.code === "RETURN_CANCEL" && grant.isActive !== false);
}
