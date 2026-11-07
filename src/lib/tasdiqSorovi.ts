import i18n from "@/i18n";
import { tasdiqniSorash } from "./ogohlantirishSorovi";

type TasdiqImkoniyatlari = {
  /** Oynadagi hujjat/obyekt nomi (ixtiyoriy). */
  nom?: string;
  /** Sarlavha; berilmasa "Tasdiqlaysizmi?". */
  sarlavha?: string;
  /** O'chirish kabi xavfli amal uchun "qizil" (standart "sariq"). */
  ohang?: "qizil" | "sariq";
  /** Tasdiqlash tugmasi matni; berilmasa "Ha, tasdiqlash". */
  ha?: string;
  /** O'chirish: qizil oyna va "Ha, o'chirish" tugmasi. */
  ochirish?: boolean;
  /** `true` bo'lsa, ixtiyoriy sabab maydoni chiqadi (`window.prompt` o'rnida). */
  sabab?: boolean;
};

/**
 * `window.confirm` / `window.prompt` o'rnida: ilova ichidagi TasdiqlashOynasi'ni ochadi.
 * `rozi` — foydalanuvchi tasdiqladi; `sabab` — yozgan matni (bo'sh bo'lishi mumkin).
 */
export function tasdiqSorash(savol: string, imkoniyatlar: TasdiqImkoniyatlari = {}) {
  const t = (kalit: string) => i18n.t(kalit, { ns: "common" });
  return tasdiqniSorash(savol, imkoniyatlar.nom ?? "", {
    sarlavha: imkoniyatlar.sarlavha ?? t("tasdiq.title"),
    savol: "",
    ha: imkoniyatlar.ha ?? t(imkoniyatlar.ochirish ? "tasdiq.delete" : "tasdiq.yes"),
    yoq: t("tasdiq.no"),
    ohang: imkoniyatlar.ohang ?? (imkoniyatlar.ochirish ? "qizil" : "sariq"),
    ...(imkoniyatlar.sabab ? { sababYorligi: t("tasdiq.reason") } : {}),
  });
}
