// Mijoz hisobi (wallet) va valyuta bilan bog'liq backend xato kodlari uchun tushunarli matnlar.
// UI'siz va tashqi importlarsiz yozilgan — alohida sinash mumkin. Boshqa kodlar uchun `null` qaytadi:
// ular avvalgidek backend `message` / `errors` orqali ko'rsatiladi.

type Til = "uz" | "ru";

type KodMatni = { uz: string; ru: string };

const MATNLAR: Record<string, KodMatni> = {
  // Hisobdan to'lovda pul yetmaydi.
  "errors.wallet.insufficient_balance": {
    uz: "Mijoz hisobida pul yetarli emas.",
    ru: "На счёте клиента недостаточно средств.",
  },
  // Hisobdan chekka keragidan ko'p yechilyapti.
  "errors.sales.overpayment_not_allowed": {
    uz: "Hisobdan sotuvga kerakli summadan ko'p yechib bo'lmaydi. Summani kamaytiring.",
    ru: "Со счёта нельзя списать больше суммы, нужной для продажи. Уменьшите сумму.",
  },
  // $ uchun valyuta rejimi o'chiq.
  "errors.currency.mode_off": {
    uz: "Dollar bilan ishlash uchun valyuta rejimi yoqilgan bo'lishi kerak (Sozlamalar → Valyuta).",
    ru: "Для работы с долларом должен быть включён валютный режим (Настройки → Валюта).",
  },
};

// Sotuvni bekor qilishda hisobdan yechilgan pul qaytadi; hisobga yozilgan pul esa ishlatilgan bo'lsa bekor qilib bo'lmaydi.
const BEKOR_QILISH_MATNI: KodMatni = {
  uz: "Sotuvni bekor qilib bo'lmaydi: sotuvda hisobga yozilgan pul mijoz tomonidan allaqachon ishlatib bo'lingan.",
  ru: "Продажу нельзя отменить: деньги, записанные на счёт клиента по этой продаже, уже использованы.",
};

/** Xato kodi tushunarli matnga; kod noma'lum bo'lsa `null`. `url` — so'rov manzili (sotuvni bekor qilish alohida matn oladi). */
export function xatoKodiMatni(kod: unknown, url: string | undefined, til: string): string | null {
  if (typeof kod !== "string") return null;
  const tilKodi: Til = til === "ru" ? "ru" : "uz";
  if (kod === "errors.wallet.insufficient_balance" && /\/sales\/[^/?]+\/cancel/.test(url ?? "")) {
    return BEKOR_QILISH_MATNI[tilKodi];
  }
  return MATNLAR[kod]?.[tilKodi] ?? null;
}
