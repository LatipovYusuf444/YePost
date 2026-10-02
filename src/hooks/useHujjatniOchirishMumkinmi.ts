import { useEffect } from "react";
import { rolniNormallashtirish } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { JoriyFoydalanuvchi } from "@/types/tenant";

export type HujjatGuruhi = "ombor" | "savdo";

// Backend DELETE ruxsati tahrirlash (PATCH) rollari bilan bir xil:
// ombor hujjatlari (kirim, chiqim, ko'chirish, inventarizatsiya) — omborchi, admin, direktor;
// savdo hujjatlari (sotuv, qaytarish) — shu rollar va kassir.
const OMBOR_ROLLARI = ["OMBORCHI", "STOREKEEPER", "ADMIN", "DIREKTOR"];
const SAVDO_ROLLARI = [...OMBOR_ROLLARI, "KASSIR"];

function useProfilniKutish() {
  const profil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);

  useEffect(() => {
    if (!profil) void profilniYuklash();
  }, [profil, profilniYuklash]);

  return profil;
}

export function useHujjatniOchirishMumkinmi(guruh: HujjatGuruhi) {
  const profil = useProfilniKutish();
  const rol = rolniNormallashtirish(profil?.role);
  return (guruh === "ombor" ? OMBOR_ROLLARI : SAVDO_ROLLARI).includes(rol);
}

// Bekor qilish va qayta tiklash (CANCELLED -> DRAFT) ruxsati bir xil (backend: rol, keyin grant):
// - ombor hujjatlari (kirim, chiqim, ko'chirish, inventarizatsiya): admin va direktor;
// - sotuv va qaytarish: direktor, yoki faol RETURN_CANCEL granti bor admin (direktorga grant shart emas).
export function bekorQilishRuxsatiBormi(profil: JoriyFoydalanuvchi | null | undefined, guruh: HujjatGuruhi) {
  const rol = rolniNormallashtirish(profil?.role);
  if (rol === "DIREKTOR") return true;
  if (rol !== "ADMIN") return false;
  if (guruh === "ombor") return true;
  return (profil?.grants ?? []).some((grant) => grant.code === "RETURN_CANCEL" && grant.isActive !== false);
}

export function useHujjatniBekorQilishMumkinmi(guruh: HujjatGuruhi) {
  return bekorQilishRuxsatiBormi(useProfilniKutish(), guruh);
}

export function useHujjatniTiklashMumkinmi(guruh: HujjatGuruhi) {
  return bekorQilishRuxsatiBormi(useProfilniKutish(), guruh);
}
