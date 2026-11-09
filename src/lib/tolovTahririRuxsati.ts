import { bekorQilishRuxsatiBormi, type HujjatRuxsatiProfili } from "./hujjatRuxsati.ts";
import { rolniNormallashtirish } from "./roles.ts";
import { toshkentKuni } from "./hujjatSanasi.ts";

type Sotuv = { status?: string; date?: string; createdAt?: string };
type Tolov = { id?: string; paymentType: string; amount: number | string; cashOperationId?: string | null; fromAccount?: boolean | null; date?: string; paidAt?: string; createdAt?: string };

/** Amallar yashirilmaydi: UI cheklovning sababini ko'rsatadi. Server ruxsatni qayta tekshiradi. */
export function tolovTahririCheklovi(profil: HujjatRuxsatiProfili | null, sotuv: Sotuv, tolov: Tolov, yopilganKun?: string | null): string | null {
  const holat = String(sotuv.status ?? "DRAFT").toUpperCase();
  const kalit = "tolovTahriri.cheklov.";
  if (holat !== "DRAFT" && holat !== "CONFIRMED") return kalit + "bekorQilingan";
  if (yopilganKun && [sotuv.date ?? sotuv.createdAt, tolov.date ?? tolov.paidAt ?? tolov.createdAt]
    .some(sana => { const kun = toshkentKuni(sana); return kun && kun <= yopilganKun; })) return kalit + "davrYopilgan";
  if (tolov.cashOperationId) return kalit + "kassaHujjati";
  if (tolov.fromAccount || !["CASH", "CARD", "BANK"].includes(tolov.paymentType) || !(Number(tolov.amount) > 0)) return kalit + "avtomatikTolov";
  if (holat === "CONFIRMED" && !tolov.id) return kalit + "tolovIdYoq";
  if (!profil) return kalit + "profilYuklanmoqda";
  if (holat === "DRAFT") {
    return ["DIREKTOR", "ADMIN", "KASSIR", "OMBORCHI"].includes(rolniNormallashtirish(profil.role)) ? null : "tolovTahriri.ruxsatYoq";
  }
  // Mavjud API cancel -> restore -> PATCH -> confirm bilan ishlaydi. Bekor qilish huquqini chetlab o'tmaymiz.
  return bekorQilishRuxsatiBormi(profil, "savdo") ? null : "tolovTahriri.ruxsatYoq";
}
