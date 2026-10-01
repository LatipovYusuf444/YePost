import { useEffect } from "react";
import { rolniNormallashtirish } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";

export type HujjatGuruhi = "ombor" | "savdo";

// Backend DELETE ruxsati tahrirlash (PATCH) rollari bilan bir xil:
// ombor hujjatlari (kirim, chiqim, ko'chirish, inventarizatsiya) — omborchi, admin, direktor;
// savdo hujjatlari (sotuv, qaytarish) — shu rollar va kassir.
const OMBOR_ROLLARI = ["OMBORCHI", "STOREKEEPER", "ADMIN", "DIREKTOR"];
const SAVDO_ROLLARI = [...OMBOR_ROLLARI, "KASSIR"];

export function useHujjatniOchirishMumkinmi(guruh: HujjatGuruhi) {
  const profil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);

  useEffect(() => {
    if (!profil) void profilniYuklash();
  }, [profil, profilniYuklash]);

  const rol = rolniNormallashtirish(profil?.role);
  return (guruh === "ombor" ? OMBOR_ROLLARI : SAVDO_ROLLARI).includes(rol);
}
