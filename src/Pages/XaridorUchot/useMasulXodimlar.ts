import { useEffect, useState } from "react";
import { xodimlarRoyxatiniOlish } from "@/api/savdoApi";
import { xodimNomi } from "@/lib/mijozMasuli";

export type MasulXodim = { id: string; nom: string };

// Mas'ul xodim tanlovi uchun xodimlar (/accounts/users, keshlangan). Kassir/omborchiga 403 — bo'sh ro'yxat: maydon yashiriladi.
export function useMasulXodimlar(yoqilgan = true) {
  const [xodimlar, setXodimlar] = useState<MasulXodim[]>([]);
  const [yuklandi, setYuklandi] = useState(false);

  useEffect(() => {
    if (!yoqilgan) return;
    let faol = true;
    void xodimlarRoyxatiniOlish()
      .then((royxat) => {
        if (!faol) return;
        setXodimlar(
          royxat
            .map((xodim) => ({ id: xodim.id, nom: xodimNomi(xodim) || xodim.id }))
            .sort((a, b) => a.nom.localeCompare(b.nom))
        );
      })
      .catch(() => { if (faol) setXodimlar([]); })
      .finally(() => { if (faol) setYuklandi(true); });
    return () => { faol = false; };
  }, [yoqilgan]);

  return { xodimlar, yuklandi };
}
