import { useEffect } from "react";
import { tolovTahririCheklovi } from "@/lib/tolovTahririRuxsati";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useDavrStore } from "@/store/davrStore";

export function useTolovTahririRuxsati() {
  const profil = useAuthProfileStore(state => state.profil);
  const profilniYuklash = useAuthProfileStore(state => state.profilniYuklash);
  const yopilganKun = useDavrStore(state => state.holat?.closedUntil);
  const davrniYuklash = useDavrStore(state => state.yuklash);
  useEffect(() => {
    if (!profil) void profilniYuklash();
    void davrniYuklash();
  }, [profil, profilniYuklash, davrniYuklash]);
  return (sotuv: Parameters<typeof tolovTahririCheklovi>[1], tolov: Parameters<typeof tolovTahririCheklovi>[2]) =>
    tolovTahririCheklovi(profil, sotuv, tolov, yopilganKun);
}
