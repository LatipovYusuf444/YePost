import { useLayoutEffect } from "react";

/**
 * Qism "Shisha" rejimiga tayyorlangan: u ochiq turganda `html[data-shisha-sahifa]` qo'yiladi va shisha ranglari (data-theme="shisha")
 * qo'llanadi — portal orqali chiqadigan ochiladigan ro'yxat va oynalar ham. Hozir asosiy layout (AsosiyPanel — yon paneldagi barcha
 * sahifalar) chaqiradi; login va admin qismlari asosiy ko'rinishda qoladi.
 */
export function useShishaSahifa(nom: string) {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.dataset.shishaSahifa = nom;
    return () => {
      if (html.dataset.shishaSahifa === nom) delete html.dataset.shishaSahifa;
    };
  }, [nom]);
}
