import { useCallback, useEffect, useState } from "react";
import { tartibKaliti, tartibniTahlil, type MenyuTartibi } from "@/lib/menyuTartibi";

function oqish(kalit: string) {
  try {
    return tartibniTahlil(window.localStorage.getItem(kalit));
  } catch {
    return null;
  }
}

/**
 * Foydalanuvchining menyu tartibi (shu brauzerda, foydalanuvchi bo'yicha). `saqlash(null)` — standart tartibga qaytaradi.
 * Boshqa vkladkada o'zgartirilsa shu yerda ham yangilanadi.
 */
export function useMenyuTartibi(egasi: string | null | undefined) {
  const kalit = tartibKaliti(egasi);
  const [holat, setHolat] = useState(() => ({ kalit, tartib: oqish(kalit) }));
  // Foydalanuvchi almashsa (boshqa xodim kirdi) — o'zining tartibi o'qiladi.
  const tartib = holat.kalit === kalit ? holat.tartib : oqish(kalit);

  useEffect(() => {
    const tingla = (event: StorageEvent) => {
      if (event.key === kalit) setHolat({ kalit, tartib: tartibniTahlil(event.newValue) });
    };
    window.addEventListener("storage", tingla);
    return () => window.removeEventListener("storage", tingla);
  }, [kalit]);

  const saqlash = useCallback((yangi: MenyuTartibi | null) => {
    setHolat({ kalit, tartib: yangi });
    try {
      if (yangi) window.localStorage.setItem(kalit, JSON.stringify(yangi));
      else window.localStorage.removeItem(kalit);
    } catch {
      // Brauzer xotirasi yopiq bo'lsa (private rejim) tartib shu sessiya bilan cheklanadi.
    }
  }, [kalit]);

  return { tartib, saqlash };
}
