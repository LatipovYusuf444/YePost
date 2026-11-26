import { useCallback } from "react";
import { useFoydalanuvchiSozlamasi } from "@/hooks/useFoydalanuvchiSozlamasi";
import { QISQA_KORINISH_KALITI, qisqaKorinishniTahlil, STANDART_QISQA, type QisqaKorinish } from "@/lib/qisqaKorinish";

const tahlil = (xom: string | null) => (xom === null ? null : qisqaKorinishniTahlil(xom));

/**
 * Foydalanuvchining "Qisqa ko'rinish" tanlovi (Sotuv yaratish va Sotuv tafsiloti oynalari uchun bitta). Sotuv yozuvidan alohida —
 * brauzerda, foydalanuvchi bo'yicha. `saqlangan` — foydalanuvchi bir marta "Ko'rinishni saqlash" bosganmi.
 */
export function useQisqaSozlamasi() {
  const { qiymat, saqlash } = useFoydalanuvchiSozlamasi<QisqaKorinish>(QISQA_KORINISH_KALITI, tahlil);
  const saqla = useCallback((yangi: QisqaKorinish) => saqlash(yangi), [saqlash]);
  return { korinish: qiymat ?? STANDART_QISQA, saqlangan: qiymat !== null, saqlash: saqla };
}
