import { createContext, useContext } from "react";
import { kartaKorinadimi, matnKorinadimi, STANDART_QISQA, type QisqaKarta, type QisqaKorinish, type QisqaMatn } from "@/lib/qisqaKorinish";

export type QisqaKontekstQiymati = { qisqa: boolean; korinish: QisqaKorinish };

// Standart — To'liq rejim (hammasi ko'rinadi): kontekstsiz ishlatilgan komponentlar (boshqa sahifalar) o'zgarmaydi.
export const QisqaKonteksti = createContext<QisqaKontekstQiymati>({ qisqa: false, korinish: STANDART_QISQA });

/** Sotuv tafsiloti ichidagi bo'limlar uchun: karta/matn hozirgi rejim va foydalanuvchi tanlovi bo'yicha ko'rinadimi. */
export function useQisqaKorinishi() {
  const { qisqa, korinish } = useContext(QisqaKonteksti);
  return {
    qisqa,
    karta: (kalit: QisqaKarta) => kartaKorinadimi(qisqa, korinish, kalit),
    matn: (kalit: QisqaMatn) => matnKorinadimi(qisqa, korinish, kalit),
  };
}
