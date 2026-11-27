import { useFoydalanuvchiSozlamasi } from "./useFoydalanuvchiSozlamasi";
import { SOTUV_USTUN_KALITI, STANDART_SOTUV_USTUNLARI, standartTartibmi, ustunTartibiniTahlil, type SotuvUstuni } from "@/lib/sotuvUstunlari";

/** Yangi sotuv jadvalidagi ustunlar tartibi — foydalanuvchi bo'yicha (shu brauzerda; refresh va qayta kirishda ham qoladi). */
export function useSotuvUstunTartibi() {
  const { qiymat, saqlash } = useFoydalanuvchiSozlamasi<SotuvUstuni[]>(SOTUV_USTUN_KALITI, ustunTartibiniTahlil);
  const tartib = qiymat ?? [...STANDART_SOTUV_USTUNLARI];
  return {
    tartib,
    standartmi: standartTartibmi(tartib),
    saqlash: (yangi: SotuvUstuni[]) => saqlash(standartTartibmi(yangi) ? null : yangi),
  };
}
