// Hujjat sanasi (backend `date`): kun ("YYYY-MM-DD"), hisob-kitob Toshkent vaqti bo'yicha.
// Backend qoidasi: bugun yoki yuborilmasa — hozirgi vaqt; o'tgan kun — o'sha kunning 23:59:59 (Toshkent);
// kelajak — 400 errors.document.date_in_future. To'liq vaqt (toISOString) yuborilsa ham Toshkent kuni olinadi.
// UI'siz va tashqi importlarsiz yozilgan — alohida sinash mumkin.

const TOSHKENT = "Asia/Tashkent";
const KUN_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const kunFormati = new Intl.DateTimeFormat("en-US", {
  timeZone: TOSHKENT,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const vaqtFormati = new Intl.DateTimeFormat("en-US", {
  timeZone: TOSHKENT,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function qismlar(format: Intl.DateTimeFormat, sana: Date) {
  const natija: Record<string, string> = {};
  for (const qism of format.formatToParts(sana)) natija[qism.type] = qism.value;
  return natija;
}

function sananiOlish(qiymat: string | number | Date | null | undefined) {
  if (qiymat === undefined || qiymat === null || qiymat === "") return null;
  const sana = qiymat instanceof Date ? qiymat : new Date(qiymat);
  return Number.isNaN(sana.getTime()) ? null : sana;
}

/** Qiymatning Toshkent kuni ("YYYY-MM-DD"); "YYYY-MM-DD" ko'rinishidagi qiymat o'zgarishsiz qaytadi; noto'g'ri qiymatda "". */
export function toshkentKuni(qiymat?: string | number | Date | null): string {
  if (typeof qiymat === "string" && KUN_REGEX.test(qiymat)) return qiymat;
  const sana = sananiOlish(qiymat);
  if (!sana) return "";
  const q = qismlar(kunFormati, sana);
  return `${q.year}-${q.month}-${q.day}`;
}

export function bugungiToshkentKuni(hozir: Date = new Date()): string {
  return toshkentKuni(hozir);
}

/** "YYYY-MM-DD" kunga `farq` kun qo'shadi (manfiy bo'lsa ayiradi); noto'g'ri qiymatda "". */
export function kunniSurish(kun: string, farq: number): string {
  if (!KUN_REGEX.test(kun)) return "";
  const [yil, oy, kunRaqami] = kun.split("-").map(Number);
  const surilgan = new Date(Date.UTC(yil, oy - 1, kunRaqami + farq));
  return surilgan.toISOString().slice(0, 10);
}

/** "2026-09-30" -> "30.09.2026"; Toshkent kuni sifatida ham ISO vaqt qabul qilinadi. */
export function kunMatni(qiymat?: string | number | Date | null): string {
  const kun = toshkentKuni(qiymat);
  if (!kun) return "";
  const [yil, oy, kunRaqami] = kun.split("-");
  return `${kunRaqami}.${oy}.${yil}`;
}

/** ISO vaqt -> "19.10.2026 11:50" (Toshkent vaqti). */
export function vaqtMatni(qiymat?: string | number | Date | null): string {
  const sana = sananiOlish(qiymat);
  if (!sana) return "";
  const q = qismlar(vaqtFormati, sana);
  return `${q.day}.${q.month}.${q.year} ${q.hour}:${q.minute}`;
}

/** Berilgan kun bugundan keyinmi (kelajak sana backendda rad etiladi). */
export function kelajakKunmi(kun: string, bugun: string = bugungiToshkentKuni()): boolean {
  return KUN_REGEX.test(kun) && kun > bugun;
}

/** Bugundan oldingi kunmi (o'tgan sana — hujjat o'sha kunning oxirida yoziladi). */
export function otganKunmi(kun: string, bugun: string = bugungiToshkentKuni()): boolean {
  return KUN_REGEX.test(kun) && kun < bugun;
}

/**
 * Yangi hujjat so'roviga qo'shiladigan `date`: bo'sh yoki bugungi kun bo'lsa hech narsa yuborilmaydi
 * (backend hozirgi vaqtni oladi), o'tgan kun bo'lsa `{ date }`.
 */
export function yangiHujjatSanasi(kun: string, bugun: string = bugungiToshkentKuni()): { date?: string } {
  return KUN_REGEX.test(kun) && kun !== bugun ? { date: kun } : {};
}

/**
 * To'lovga qo'shiladigan `date` (faqat bugundan boshqa kun bo'lsa) va `note` (izoh bo'sh bo'lmasa, qirqilgan).
 * Bo'sh qoldirilsa so'rovga hech narsa qo'shilmaydi — backend to'lovni hozirgi vaqt bilan yozadi.
 */
export function tolovQoshimchasi(kun: string, izoh: string, bugun: string = bugungiToshkentKuni()): { date?: string; note?: string } {
  const matn = izoh.trim();
  return { ...yangiHujjatSanasi(kun, bugun), ...(matn ? { note: matn } : {}) };
}

/**
 * Mavjud qoralamani tahrirlash (PATCH): `date` faqat foydalanuvchi o'zgartirgan bo'lsa yuboriladi.
 * Bo'sh qiymat sanani o'zgartirmaydi.
 */
export function tahrirSanasi(joriy: string, boshlangich: string): { date?: string } {
  return KUN_REGEX.test(joriy) && joriy !== boshlangich ? { date: joriy } : {};
}

/**
 * "Kiritilgan: 19.10.2026 11:50" belgisi uchun vaqt: hujjat sanasi (`date`) va kiritilgan vaqt (`createdAt`)
 * Toshkent kunlari bo'yicha farq qilsa — kiritilgan vaqt matni, aks holda `null` (belgi kerak emas).
 */
export function kiritilganVaqtMatni(
  date: string | number | Date | null | undefined,
  createdAt: string | number | Date | null | undefined
): string | null {
  const hujjatKuni = toshkentKuni(date);
  const kiritilganKuni = toshkentKuni(createdAt);
  if (!hujjatKuni || !kiritilganKuni || hujjatKuni === kiritilganKuni) return null;
  return vaqtMatni(createdAt) || null;
}
