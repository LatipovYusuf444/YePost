import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { tokenEgasi } from "@/lib/sessiyaIzolyatsiyasi";
import { joylashuvKalitlari, joylashuvniTahlil, STANDART_JOYLASHUV, type KartalarJoylashuvi } from "@/lib/sotuvKartalari";

function xotira(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function oqish(kalitlar: readonly string[]): KartalarJoylashuvi | null {
  const saqlash = xotira();
  if (!saqlash) return null;
  for (const kalit of kalitlar) {
    try {
      const joylashuv = joylashuvniTahlil(saqlash.getItem(kalit));
      if (joylashuv) return joylashuv;
    } catch {
      // keyingi kalit
    }
  }
  return null;
}

function yozish(kalitlar: readonly string[], joylashuv: KartalarJoylashuvi | null) {
  const saqlash = xotira();
  if (!saqlash) return;
  for (const kalit of kalitlar) {
    try {
      if (joylashuv) saqlash.setItem(kalit, JSON.stringify(joylashuv));
      else saqlash.removeItem(kalit);
    } catch {
      // Xotira yopiq/to'lgan — joylashuv shu sessiya bilan cheklanadi.
    }
  }
}

/**
 * Yangi sotuv oynasi kartalari joylashuvi — foydalanuvchi bo'yicha, shu brauzerda. Egasi token ichidagi foydalanuvchi ID'sidan
 * darhol olinadi (profil yuklanishini kutmaydi), zaxira kalit — do'kon|login: refresh, chiqib qayta kirish, ertasi kuni ham
 * o'sha joylashuv. `saqlash(null)` — standartga qaytaradi.
 */
export function useSotuvKartalari() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const username = useAuthStore((state) => state.username);
  const profil = useAuthProfileStore((state) => state.profil);
  const kalitlar = useMemo(() => {
    const token = tokenEgasi(accessToken);
    const workspaceId = profil?.workspaceId ?? token.workspaceId;
    return joylashuvKalitlari({
      id: profil?.id ?? token.id,
      login: username ? (workspaceId ? `${workspaceId}|${username}` : username) : null,
    });
  }, [accessToken, profil?.id, profil?.workspaceId, username]);
  const imzo = kalitlar.join("\n");

  const [holat, setHolat] = useState(() => ({ imzo, joylashuv: oqish(kalitlar) }));
  let joylashuv = holat.joylashuv;
  if (holat.imzo !== imzo) {
    joylashuv = oqish(kalitlar);
    setHolat({ imzo, joylashuv });
  }

  // Zaxira kalitda topilgan bo'lsa — asosiy kalitga ham yoziladi.
  useEffect(() => {
    if (!joylashuv) return;
    const saqlash = xotira();
    if (!saqlash) return;
    const matn = JSON.stringify(joylashuv);
    const royxat = imzo.split("\n");
    try {
      if (royxat.some((kalit) => saqlash.getItem(kalit) !== matn)) yozish(royxat, joylashuv);
    } catch {
      // Xotira yopiq.
    }
  }, [imzo, joylashuv]);

  // Boshqa vkladkada o'zgartirilsa shu yerda ham.
  useEffect(() => {
    const royxat = imzo.split("\n");
    const tingla = (event: StorageEvent) => {
      if (event.key === null || royxat.includes(event.key)) setHolat({ imzo, joylashuv: oqish(royxat) });
    };
    window.addEventListener("storage", tingla);
    return () => window.removeEventListener("storage", tingla);
  }, [imzo]);

  const saqlash = useCallback(
    (yangi: KartalarJoylashuvi | null) => {
      setHolat({ imzo, joylashuv: yangi });
      yozish(imzo.split("\n"), yangi);
    },
    [imzo]
  );

  return { joylashuv: joylashuv ?? STANDART_JOYLASHUV, ozgartirilgan: joylashuv !== null, saqlash };
}
