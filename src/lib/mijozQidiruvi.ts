// Mijoz qidiruvi va "Yangi xaridor" oynasini qidiruv matnidan to'ldirish (UI'siz — testlarda to'g'ridan-to'g'ri ishlaydi).
// Kirill va lotin bir xil topiladi ("жам" ↔ "jam" ↔ "Jam" → JAMSHID), telefon raqam qismi bilan ham ("77777").
import { qidiruvKorinishi } from "./kategoriyaQidiruvi.ts";

/** Matn faqat telefon belgilaridan iboratmi: raqam, "+", bo'sh joy, "-", qavslar. */
function telefonMatnimi(matn: string) {
  return /^[\d+\s\-()]+$/.test(matn.trim()) && /\d/.test(matn);
}

/**
 * Mijoz qidiruv so'ziga mosmi. Bo'sh so'z — hammasi mos.
 * Nomlar (ism, familiya, kompaniya, email, manzil) kirill/lotin farqisiz solishtiriladi; so'z telefon raqami ko'rinishida bo'lsa
 * (kamida 3 ta raqam) telefonning raqamlari bilan ham solishtiriladi ("77777", "+998 77", "90-123").
 */
export function mijozMosmi(nomlar: readonly (string | null | undefined)[], telefon: string | null | undefined, soz: string): boolean {
  const q = qidiruvKorinishi(soz);
  if (!q) return true;
  const matnlar = nomlar.filter((nom): nom is string => Boolean(nom)).map(qidiruvKorinishi);
  if (matnlar.some((nom) => nom.includes(q))) return true;
  if (telefon && qidiruvKorinishi(telefon).includes(q)) return true;
  if (telefon && telefonMatnimi(soz)) {
    const raqamlar = soz.replace(/\D/g, "");
    if (raqamlar.length >= 3 && telefon.replace(/\D/g, "").includes(raqamlar)) return true;
  }
  return false;
}

export type MijozBoshlangichi = { ism: string; familiya: string; telefon: string };

/**
 * Qidiruvga yozilgan matndan "Yangi xaridor" oynasining boshlang'ich qiymatlari:
 *  - faqat raqam (va +, bo'sh joy) bo'lsa — telefon ("901234567", "+998 90 123 45 67" → "+998901234567");
 *  - aks holda birinchi so'z — ism, qolgani — familiya ("Abdulaziz Karimov").
 * Bo'sh matn — hamma maydon bo'sh.
 */
export function mijozMatniniAjratish(matn: string | null | undefined): MijozBoshlangichi {
  const toza = (matn ?? "").trim().replace(/\s+/g, " ");
  if (!toza) return { ism: "", familiya: "", telefon: "" };
  if (telefonMatnimi(toza)) {
    let raqamlar = toza.replace(/\D/g, "");
    if (raqamlar.startsWith("998") && (toza.startsWith("+998") || raqamlar.length >= 12)) raqamlar = raqamlar.slice(3);
    raqamlar = raqamlar.slice(0, 9);
    return { ism: "", familiya: "", telefon: raqamlar ? `+998${raqamlar}` : "" };
  }
  const [ism, ...qolgan] = toza.split(" ");
  return { ism, familiya: qolgan.join(" "), telefon: "" };
}

/** Ro'yxatda ko'rinadigan telefon: "+998777777777" → "+998 77 777 77 77"; boshqa ko'rinish o'zgarmaydi. */
export function telefonKorinishi(telefon: string | null | undefined) {
  const raqamlar = (telefon ?? "").replace(/\D/g, "");
  if (raqamlar.length === 12 && raqamlar.startsWith("998")) {
    return `+998 ${raqamlar.slice(3, 5)} ${raqamlar.slice(5, 8)} ${raqamlar.slice(8, 10)} ${raqamlar.slice(10, 12)}`;
  }
  return telefon ?? "";
}
