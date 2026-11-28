// CRM 1-bosqich: faoliyat natijasi (qo'ng'iroq/uchrashuv/xabar) va keyingi qadam qoidalari.
// Backend qoidalarini takrorlaydi (POST /crm/contacts, POST /crm/activities/:id/complete). UI'siz, faqat nisbiy importlar — alohida sinaladi.
import { kunniSurish } from "./hujjatSanasi.ts";
import type {
  ActivityTuri,
  ActivityYakunlash,
  ContactMalumoti,
  ContactNatijasi,
  ContactTuri,
  ContactYaratish,
  KeyingiVazifa,
  RadSababi,
} from "../types/crm.ts";

export const CONTACT_TURLARI: readonly ContactTuri[] = ["CALL", "MEETING", "MESSAGE"];
export const NATIJALAR: readonly ContactNatijasi[] = ["ORDER", "LATER", "THINKING", "NO_ANSWER", "REJECTED"];
export const RAD_SABABLARI: readonly RadSababi[] = ["PRICE", "COMPETITOR", "NOT_NEEDED", "OTHER"];
export const VAZIFA_TURLARI: readonly ActivityTuri[] = ["CALL", "MEETING", "MESSAGE", "DEBT", "TASK"];
export const KUN_TARTIBI_BOLIMLARI = ["overdue", "today", "tomorrow", "later"] as const;
export type KunTartibiBolimi = (typeof KUN_TARTIBI_BOLIMLARI)[number];
/** Topshiriqdagi nom bilan ham. */
export const kunTartibiBolimlari = KUN_TARTIBI_BOLIMLARI;

// Toshkent — doimiy UTC+5 (yozgi vaqt yo'q).
const TOSHKENT_FARQI_MS = 5 * 60 * 60 * 1000;
const KUN_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VAQT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Muddat shuncha daqiqadan ko'p o'tmishda bo'lsa — ogohlantirish (xato emas). */
export const OTGAN_MUDDAT_CHEGARASI_MS = 5 * 60 * 1000;
const STANDART_SOAT = "10:00";

/** Standart mavzular (o'zbekcha); UI tarjimasi `mavzular` bilan almashtiriladi. */
export const STANDART_MAVZULAR: Record<ActivityTuri, string> = {
  CALL: "Qayta qo'ng'iroq",
  MEETING: "Qayta uchrashuv",
  MESSAGE: "Qayta xabar yozish",
  DEBT: "Qarzni eslatish",
  TASK: "Vazifa",
};
export type Mavzular = Partial<Record<ActivityTuri, string>>;

// ---- Vaqt ----

/** Hozirgi Toshkent kuni va vaqti. */
export function toshkentHozir(hozir: Date = new Date()): { kun: string; vaqt: string } {
  const iso = new Date(hozir.getTime() + TOSHKENT_FARQI_MS).toISOString();
  return { kun: iso.slice(0, 10), vaqt: iso.slice(11, 16) };
}

/** "2026-11-29" + "10:00" -> "2026-11-29T10:00:00+05:00"; noto'g'ri qiymatda "". */
export function toshkentIso(kun: string, vaqt: string): string {
  if (!KUN_REGEX.test(kun) || !VAQT_REGEX.test(vaqt)) return "";
  const [yil, oy, kunRaqami] = kun.split("-").map(Number);
  const tekshir = new Date(Date.UTC(yil, oy - 1, kunRaqami));
  if (tekshir.getUTCMonth() !== oy - 1 || tekshir.getUTCDate() !== kunRaqami) return "";
  return `${kun}T${vaqt}:00+05:00`;
}

/** ISO vaqt -> Toshkent bo'yicha { kun: "YYYY-MM-DD", vaqt: "HH:mm" }; noto'g'ri qiymatda bo'sh satrlar. */
export function isoniAjratish(iso?: string | null): { kun: string; vaqt: string } {
  if (!iso) return { kun: "", vaqt: "" };
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return { kun: "", vaqt: "" };
  return toshkentHozir(sana);
}

function vaqtMs(kun: string, vaqt: string): number | null {
  const iso = toshkentIso(kun, vaqt);
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

// ---- Qoidalar ----

/** Keyingi qadam: LATER/THINKING — majburiy, qolganlari — ixtiyoriy. */
export function keyingiQadamKerakmi(result: ContactNatijasi | "" | null | undefined): "majburiy" | "ixtiyoriy" {
  return result === "LATER" || result === "THINKING" ? "majburiy" : "ixtiyoriy";
}

/** Keyingi qadam bloki standart ochiqmi (NO_ANSWER — ertangi taklif bilan ochiq). */
export function keyingiQadamStandartOchiqmi(result: ContactNatijasi | "" | null | undefined): boolean {
  return result === "LATER" || result === "THINKING" || result === "NO_ANSWER";
}

/** Vazifa turidan faoliyat turi: DEBT/TASK (va noma'lum) -> CALL. */
export function vazifaTuridanContactTuri(type?: string | null): ContactTuri {
  return type === "MEETING" || type === "MESSAGE" || type === "CALL" ? type : "CALL";
}

/** Vazifani yakunlashda faoliyat turini tanlash kerakmi (DEBT/TASK — tur aniq emas). */
export function contactTuriTanlanadimi(type?: string | null): boolean {
  return !(type === "MEETING" || type === "MESSAGE" || type === "CALL");
}

/** Natijaga mos standart keyingi vazifa: THINKING — 2 kundan keyin, qolganlari — ertaga, soat 10:00 (Toshkent). */
export function standartKeyingiVazifa(
  result: ContactNatijasi | "" | null | undefined,
  contactType: ContactTuri,
  hozir: Date = new Date(),
  mavzular: Mavzular = {}
): { type: ActivityTuri; subject: string; dueAt: string } {
  const { kun } = toshkentHozir(hozir);
  const kunlar = result === "THINKING" ? 2 : 1;
  const type: ActivityTuri = contactType;
  return { type, subject: mavzular[type] || STANDART_MAVZULAR[type], dueAt: toshkentIso(kunniSurish(kun, kunlar), STANDART_SOAT) };
}

export type TezMuddatKaliti = "bugun18" | "ertaga10" | "uchKun" | "birHafta";
export type TezMuddat = { kalit: TezMuddatKaliti; dueAt: string; kun: string; vaqt: string };

/** Tez muddatlar: bugun 18:00 (o'tib ketgan bo'lsa yo'q), ertaga 10:00, 3 kundan keyin va 1 haftadan keyin 10:00. */
export function tezMuddatlar(hozir: Date = new Date()): TezMuddat[] {
  const { kun } = toshkentHozir(hozir);
  const yasash = (kalit: TezMuddatKaliti, k: string, vaqt: string): TezMuddat => ({ kalit, dueAt: toshkentIso(k, vaqt), kun: k, vaqt });
  const natija: TezMuddat[] = [];
  const bugun18 = vaqtMs(kun, "18:00");
  if (bugun18 !== null && hozir.getTime() < bugun18) natija.push(yasash("bugun18", kun, "18:00"));
  natija.push(yasash("ertaga10", kunniSurish(kun, 1), STANDART_SOAT));
  natija.push(yasash("uchKun", kunniSurish(kun, 3), STANDART_SOAT));
  natija.push(yasash("birHafta", kunniSurish(kun, 7), STANDART_SOAT));
  return natija;
}

// ---- Forma holati ----

export type KeyingiForma = {
  type: ActivityTuri;
  subject: string;
  kun: string; // "YYYY-MM-DD" (Toshkent)
  vaqt: string; // "HH:mm"
  assigneeId: string; // "" — backend o'zi tanlaydi (mijoz mas'uli, bo'lmasa joriy xodim)
  description: string;
  saleId: string;
};

export type NatijaForma = {
  type: ContactTuri;
  result: ContactNatijasi | "";
  rejectReason: RadSababi | "";
  text: string;
  saleId: string; // faqat ORDER
  keyingiOchiq: boolean; // ixtiyoriy blok ochilganmi (majburiyda doim yuboriladi)
  keyingiQolda: boolean; // foydalanuvchi keyingi qadamni o'zgartirganmi (taklif ustidan yozilmaydi)
  keyingi: KeyingiForma;
};

export type NatijaBoshlangich = {
  type?: ContactTuri;
  result?: ContactNatijasi | "";
  rejectReason?: RadSababi | "";
  text?: string;
  saleId?: string;
  keyingi?: Partial<KeyingiForma>;
};

function taklifQismlari(result: ContactNatijasi | "", type: ContactTuri, hozir: Date, mavzular: Mavzular) {
  const taklif = standartKeyingiVazifa(result, type, hozir, mavzular);
  const { kun, vaqt } = isoniAjratish(taklif.dueAt);
  return { type: taklif.type, subject: taklif.subject, kun, vaqt };
}

export function boshNatijaFormasi(boshlangich: NatijaBoshlangich = {}, hozir: Date = new Date(), mavzular: Mavzular = {}): NatijaForma {
  const type = boshlangich.type ?? "CALL";
  const result = boshlangich.result ?? "";
  const taklif = taklifQismlari(result, type, hozir, mavzular);
  return {
    type,
    result,
    rejectReason: result === "REJECTED" ? boshlangich.rejectReason ?? "" : "",
    text: boshlangich.text ?? "",
    saleId: result === "ORDER" || !result ? boshlangich.saleId ?? "" : "",
    keyingiOchiq: keyingiQadamStandartOchiqmi(result),
    keyingiQolda: false,
    keyingi: { ...taklif, assigneeId: "", description: "", saleId: "", ...boshlangich.keyingi },
  };
}

/** Natija tanlanganda: sabab/sotuv tozalanadi, foydalanuvchi tegmagan keyingi qadam natijaga mos taklif bilan yangilanadi. */
export function natijaniOzgartirish(forma: NatijaForma, result: ContactNatijasi, hozir: Date = new Date(), mavzular: Mavzular = {}): NatijaForma {
  const keyingi = forma.keyingiQolda ? forma.keyingi : { ...forma.keyingi, ...taklifQismlari(result, forma.type, hozir, mavzular) };
  return {
    ...forma,
    result,
    rejectReason: result === "REJECTED" ? forma.rejectReason : "",
    saleId: result === "ORDER" ? forma.saleId : "",
    keyingiOchiq: keyingiQadamStandartOchiqmi(result) || (forma.keyingiOchiq && forma.keyingiQolda),
    keyingi,
  };
}

/** Faoliyat turi o'zgarganda: foydalanuvchi tegmagan keyingi vazifa turi va mavzusi ham moslashadi. */
export function contactTuriniOzgartirish(forma: NatijaForma, type: ContactTuri, mavzular: Mavzular = {}): NatijaForma {
  if (forma.keyingiQolda) return { ...forma, type };
  return { ...forma, type, keyingi: { ...forma.keyingi, type, subject: mavzular[type] || STANDART_MAVZULAR[type] } };
}

/** So'rovga keyingi vazifa qo'shiladimi: natija bor va (majburiy yoki blok ochiq). */
export function keyingiYuborilsinmi(forma: NatijaForma): boolean {
  if (!forma.result) return false;
  return keyingiQadamKerakmi(forma.result) === "majburiy" || forma.keyingiOchiq;
}

// ---- Tekshiruv ----

export type NatijaXatoKodi = "turKerak" | "natijaKerak" | "sababKerak" | "keyingiKerak" | "mavzuKerak" | "muddatKerak" | "muddatNotogri";
/** Maydon yo'llari: "type", "result", "rejectReason", "saleId", "text", "nextTask", "nextTask.subject", "nextTask.dueAt", "nextTask.assigneeId". */
export type NatijaXatolari = Record<string, NatijaXatoKodi>;

/** Mijoz tomonidagi tekshiruv (backend qoidalari bilan bir xil). Bo'sh obyekt — xato yo'q. */
export function natijaXatolari(forma: NatijaForma): NatijaXatolari {
  const xatolar: NatijaXatolari = {};
  if (!forma.type) xatolar.type = "turKerak";
  if (!forma.result) {
    xatolar.result = "natijaKerak";
    return xatolar;
  }
  if (forma.result === "REJECTED" && !forma.rejectReason) xatolar.rejectReason = "sababKerak";
  if (keyingiYuborilsinmi(forma)) {
    if (!forma.keyingi.subject.trim()) xatolar["nextTask.subject"] = "mavzuKerak";
    if (!forma.keyingi.kun || !forma.keyingi.vaqt) xatolar["nextTask.dueAt"] = "muddatKerak";
    else if (!toshkentIso(forma.keyingi.kun, forma.keyingi.vaqt)) xatolar["nextTask.dueAt"] = "muddatNotogri";
  }
  return xatolar;
}

/** Keyingi vazifa muddati o'tmishdami (chegaradan ko'p) — faqat ogohlantirish. */
export function muddatOtganmi(forma: NatijaForma, hozir: Date = new Date()): boolean {
  if (!keyingiYuborilsinmi(forma)) return false;
  const ms = vaqtMs(forma.keyingi.kun, forma.keyingi.vaqt);
  return ms !== null && ms < hozir.getTime() - OTGAN_MUDDAT_CHEGARASI_MS;
}

/** Backend xato kodi -> forma maydoni (topilmasa null). */
export function serverXatoMaydoni(kod?: string | null): string | null {
  const oxiri = (kod ?? "").split(".").pop() ?? "";
  switch (oxiri) {
    case "contact_next_task_required":
      return "nextTask";
    case "contact_reject_reason_required":
    case "contact_reject_reason_not_allowed":
      return "rejectReason";
    case "contact_sale_not_order":
    case "contact_sale_already_linked":
    case "sale_partner_mismatch":
    case "contact_not_yours":
      return "saleId";
    case "activity_next_task_needs_contact":
      return "result";
    case "activity_cancel_reason_required":
      return "reason";
    default:
      return null;
  }
}

/** Vazifa allaqachon yopilgan/bekor qilingan (boshqa joyda) — oyna yopilib, ro'yxat yangilanadi. */
export function vazifaYopilganXatosimi(kod?: string | null): boolean {
  return (kod ?? "").split(".").pop() === "activity_not_pending";
}

// ---- So'rov tanalari ----

function keyingiTanasi(forma: NatijaForma): KeyingiVazifa {
  const k = forma.keyingi;
  const tana: KeyingiVazifa = { type: k.type, subject: k.subject.trim(), dueAt: toshkentIso(k.kun, k.vaqt) };
  if (k.assigneeId) tana.assigneeId = k.assigneeId;
  const tavsif = k.description.trim();
  if (tavsif) tana.description = tavsif;
  if (k.saleId) tana.saleId = k.saleId;
  return tana;
}

function contactMalumoti(forma: NatijaForma): ContactMalumoti {
  const malumot: ContactMalumoti = { type: forma.type, result: forma.result as ContactNatijasi };
  const matn = forma.text.trim();
  if (matn) malumot.text = matn;
  if (forma.result === "REJECTED" && forma.rejectReason) malumot.rejectReason = forma.rejectReason;
  if (forma.result === "ORDER" && forma.saleId) malumot.saleId = forma.saleId;
  return malumot;
}

/** POST /crm/contacts tanasi. */
export function contactTanasi(forma: NatijaForma, partnerId: string): ContactYaratish {
  const tana: ContactYaratish = { partnerId, ...contactMalumoti(forma) };
  if (keyingiYuborilsinmi(forma)) tana.nextTask = keyingiTanasi(forma);
  return tana;
}

/** POST /crm/activities/:id/complete (natija bilan) tanasi. */
export function yakunlashTanasi(forma: NatijaForma): ActivityYakunlash {
  const tana: ActivityYakunlash = { contact: contactMalumoti(forma) };
  if (keyingiYuborilsinmi(forma)) tana.nextTask = keyingiTanasi(forma);
  return tana;
}
