import { useEffect, useState, useSyncExternalStore } from "react";
import { sotuvTafsilotiniFondaOlish } from "@/api/savdoApi";
import { sotuvHujjatRaqami, sotuvMahsulotNomlari } from "@/lib/kassaNomlari";
import { KassaSotuvKeshi, type KassaSotuvi } from "@/lib/kassaSotuvKeshi";

export type { KassaSotuvi };

// Kassa sahifasi ochiq turgan vaqt uchun bitta kesh: sahifa qayta ochilsa sotuvlar yangidan olinadi (tahrirlangan bo'lishi mumkin).
export function useKassaSotuvKeshi(): KassaSotuvKeshi {
  const [kesh] = useState(
    () =>
      new KassaSotuvKeshi(async (sotuvId) => {
        const sotuv = await sotuvTafsilotiniFondaOlish(sotuvId);
        return { raqam: sotuvHujjatRaqami(sotuv), mahsulotlar: sotuvMahsulotNomlari(sotuv.items) };
      })
  );
  return kesh;
}

// Jadval katagi ekranda turganda sotuvni so'raydi va natija kelganda yangilanadi.
export function useKassaSotuvi(kesh: KassaSotuvKeshi, sotuvId: string | undefined): KassaSotuvi | undefined {
  const sotuv = useSyncExternalStore(kesh.obuna, () => kesh.olingan(sotuvId));
  useEffect(() => {
    if (!sotuvId) return;
    kesh.talab(sotuvId);
    return () => kesh.bekor(sotuvId);
  }, [kesh, sotuvId]);
  return sotuv;
}
