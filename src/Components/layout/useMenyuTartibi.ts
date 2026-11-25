import { useCallback, useEffect, useState } from "react";
import { tartibKalitlari, tartibniTopish, type MenyuTartibi, type TartibEgasi } from "@/lib/menyuTartibi";

function xotira(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function oqish(kalitlar: readonly string[]) {
  const saqlash = xotira();
  if (!saqlash) return null;
  return tartibniTopish((kalit) => saqlash.getItem(kalit), kalitlar)?.tartib ?? null;
}

function yozish(kalitlar: readonly string[], tartib: MenyuTartibi | null) {
  const saqlash = xotira();
  if (!saqlash) return;
  const matn = tartib ? JSON.stringify(tartib) : null;
  for (const kalit of kalitlar) {
    try {
      if (matn) saqlash.setItem(kalit, matn);
      else saqlash.removeItem(kalit);
    } catch {
      // Brauzer xotirasi yopiq yoki to'lgan bo'lsa (private rejim) tartib shu sessiya bilan cheklanadi.
    }
  }
}

/**
 * Foydalanuvchining menyu tartibi (shu brauzerda, foydalanuvchi bo'yicha). `saqlash(null)` — standart tartibga qaytaradi.
 * Tartib foydalanuvchi ID va login nomi kalitlariga yoziladi: profil yuklanguncha, token yangilanganda yoki qayta kirganda ham
 * o'sha tartib topiladi (eski versiya yozgan kalitdan ham o'qiladi va asosiy kalitga ko'chiriladi). Boshqa vkladkada o'zgartirilsa
 * shu yerda ham yangilanadi.
 */
export function useMenyuTartibi(egasi: TartibEgasi) {
  const { yozish: yozishKalitlari, oqish: oqishKalitlari } = tartibKalitlari(egasi);
  const imzo = oqishKalitlari.join("\n");
  const yozishImzo = yozishKalitlari.join("\n");
  const [holat, setHolat] = useState(() => ({ imzo, tartib: oqish(oqishKalitlari) }));
  // Egasi aniqlansa (profil yuklandi) yoki almashsa (boshqa xodim kirdi) — o'zining tartibi o'qiladi (render paytidagi holat
  // yangilanishi: React shu renderni darhol yangi holat bilan qaytaradi).
  let tartib = holat.tartib;
  if (holat.imzo !== imzo) {
    tartib = oqish(oqishKalitlari);
    setHolat({ imzo, tartib });
  }

  // Tartib zaxira yoki eski kalitda topilgan bo'lsa — barcha yozish kalitlariga ko'chiriladi (keyingi kirishda ham shu tartib).
  useEffect(() => {
    if (!tartib) return;
    const saqlash = xotira();
    if (!saqlash) return;
    const matn = JSON.stringify(tartib);
    const kalitlar = yozishImzo.split("\n");
    try {
      if (kalitlar.some((kalit) => saqlash.getItem(kalit) !== matn)) yozish(kalitlar, tartib);
    } catch {
      // Xotira yopiq — ko'chirish shart emas.
    }
  }, [yozishImzo, tartib]);

  useEffect(() => {
    const kalitlar = imzo.split("\n");
    const tingla = (event: StorageEvent) => {
      if (event.key === null || kalitlar.includes(event.key)) setHolat({ imzo, tartib: oqish(kalitlar) });
    };
    window.addEventListener("storage", tingla);
    return () => window.removeEventListener("storage", tingla);
  }, [imzo]);

  const saqlash = useCallback((yangi: MenyuTartibi | null) => {
    const kalitlar = imzo.split("\n");
    setHolat({ imzo, tartib: yangi });
    // Yangi tartib — barcha yozish kalitlariga; standartga qaytarish — barcha kalitlardan (eski tartib zaxiradan "tirilmasin").
    if (yangi) yozish(yozishImzo.split("\n"), yangi);
    else yozish(kalitlar, null);
  }, [imzo, yozishImzo]);

  return { tartib, saqlash };
}
