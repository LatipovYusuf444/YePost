import { useRef } from "react";

// Forma ochilgandagi holat bilan joriy holatni solishtiradi (arzon: faqat JSON satrlari). AppModal'ning
// `ozgarishBor` propiga beriladi. `joriy` — foydalanuvchi o'zgartiradigan maydonlar (obyekt yoki massiv).
export function ozgarishBormi(asl: string | null, joriy: unknown) {
  return asl !== null && JSON.stringify(joriy) !== asl;
}

// `faol` — oyna ochiqmi: sahifa darajasida turadigan (har doim mount bo'lgan) formalar uchun. Oyna har
// ochilganda boshlang'ich holat qayta olinadi; yopiq paytda o'zgarish yo'q hisoblanadi.
export function useOzgarishBormi(joriy: unknown, faol = true) {
  const asl = useRef<string | null>(null);
  if (!faol) asl.current = null;
  else if (asl.current === null) asl.current = JSON.stringify(joriy);
  return ozgarishBormi(asl.current, joriy);
}
