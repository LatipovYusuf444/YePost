import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { tokenEgasi } from "@/lib/sessiyaIzolyatsiyasi";

// Shu sessiyada saqlangan qiymatlar: brauzer xotirasi yopiq yoki to'la bo'lsa ham tanlov sahifa yangilanguncha ishlaydi
// (localStorage'dagi eski qiymatdan ustun turadi). null — "o'chirilgan" degani.
const sessiyaXotirasi = new Map<string, string | null>();

function xotira(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Foydalanuvchiga tegishli kalitlar: avval foydalanuvchi ID, zaxira — do'kon|login (ID hali ma'lum bo'lmaganda ham topiladi). */
export function foydalanuvchiKalitlari(prefiks: string, egasi: { id?: string | null; login?: string | null }): string[] {
  const kalitlar: string[] = [];
  const id = egasi.id?.trim();
  const login = egasi.login?.trim();
  if (id) kalitlar.push(`${prefiks}:${id}`);
  if (login) kalitlar.push(`${prefiks}:login:${login}`);
  return kalitlar.length ? kalitlar : [`${prefiks}:mehmon`];
}

/**
 * Foydalanuvchi bo'yicha interfeys sozlamasi (shu brauzerda; refresh, chiqib-kirish va ertasi kuni ham qoladi) — yon menyu tartibi va
 * sotuv kartalari joylashuvi bilan bir xil usul. Egasi token ichidagi foydalanuvchi ID'sidan darhol olinadi, zaxira kalit do'kon|login.
 * Boshqa vkladka yoki boshqa oyna (masalan, Sotuv yaratish va Sotuv tafsiloti) o'zgartirsa, shu yerda ham yangilanadi.
 * `saqlash(null)` — sozlamani o'chiradi (standartga qaytadi).
 */
export function useFoydalanuvchiSozlamasi<T>(prefiks: string, tahlil: (xom: string | null) => T | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const username = useAuthStore((state) => state.username);
  const profil = useAuthProfileStore((state) => state.profil);
  const kalitlar = useMemo(() => {
    const token = tokenEgasi(accessToken);
    const workspaceId = profil?.workspaceId ?? token.workspaceId;
    return foydalanuvchiKalitlari(prefiks, {
      id: profil?.id ?? token.id,
      login: username ? (workspaceId ? `${workspaceId}|${username}` : username) : null,
    });
  }, [accessToken, prefiks, profil?.id, profil?.workspaceId, username]);
  const imzo = kalitlar.join("\n");

  const oqish = useCallback(
    (royxat: readonly string[]): T | null => {
      const saqlash = xotira();
      for (const kalit of royxat) {
        try {
          const xom = sessiyaXotirasi.has(kalit) ? sessiyaXotirasi.get(kalit) ?? null : saqlash?.getItem(kalit) ?? null;
          const qiymat = tahlil(xom);
          if (qiymat !== null) return qiymat;
        } catch {
          // keyingi kalit
        }
      }
      return null;
    },
    [tahlil]
  );

  const [holat, setHolat] = useState(() => ({ imzo, qiymat: oqish(kalitlar) }));
  let qiymat = holat.qiymat;
  if (holat.imzo !== imzo) {
    qiymat = oqish(kalitlar);
    setHolat({ imzo, qiymat });
  }

  // Boshqa vkladka/oyna yozsa — shu yerda ham.
  useEffect(() => {
    const royxat = imzo.split("\n");
    const tingla = (event: StorageEvent) => {
      if (event.key !== null && !royxat.includes(event.key)) return;
      // Boshqa vkladka yozgani yangiroq — shu sessiyadagi nusxa endi ustun turmaydi.
      for (const kalit of event.key === null ? royxat : [event.key]) sessiyaXotirasi.delete(kalit);
      setHolat({ imzo, qiymat: oqish(royxat) });
    };
    // Bir vkladkadagi boshqa komponent (storage hodisasi o'z vkladkasiga kelmaydi).
    const ichki = (event: Event) => {
      if ((event as CustomEvent<string>).detail === prefiks) setHolat({ imzo, qiymat: oqish(royxat) });
    };
    window.addEventListener("storage", tingla);
    window.addEventListener("yepost-sozlama", ichki);
    return () => {
      window.removeEventListener("storage", tingla);
      window.removeEventListener("yepost-sozlama", ichki);
    };
  }, [imzo, oqish, prefiks]);

  const saqlash = useCallback(
    (yangi: T | null) => {
      setHolat({ imzo, qiymat: yangi });
      const ombor = xotira();
      const matn = yangi === null ? null : JSON.stringify(yangi);
      for (const kalit of imzo.split("\n")) sessiyaXotirasi.set(kalit, matn);
      if (ombor) {
        for (const kalit of imzo.split("\n")) {
          try {
            if (matn === null) ombor.removeItem(kalit);
            else ombor.setItem(kalit, matn);
          } catch {
            // Xotira yopiq — sozlama shu sessiya bilan cheklanadi.
          }
        }
      }
      try {
        window.dispatchEvent(new CustomEvent("yepost-sozlama", { detail: prefiks }));
      } catch {
        // eski brauzer
      }
    },
    [imzo, prefiks]
  );

  return { qiymat, saqlash };
}
