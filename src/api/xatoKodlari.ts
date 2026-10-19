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
  // Ko'p birlikli tovarlar (pochka, qop, korobka).
  "errors.catalog.unit_not_allowed": {
    uz: "Bu birlik shu tovarda yo'q yoki bu hujjatda ishlatib bo'lmaydi (masalan, pochka kirimda yoki korobka sotuvda).",
    ru: "Эта единица не задана у товара или не допускается в этом документе (например, пачка в приходе или коробка в продаже).",
  },
  "errors.catalog.quantity_not_whole": {
    uz: "Bu birlikda faqat butun miqdor kiritiladi (masalan, 1,5 korobka bo'lmaydi).",
    ru: "В этой единице можно указывать только целое количество (например, 1,5 коробки нельзя).",
  },
  "errors.catalog.base_unit_factor": {
    uz: "Asosiy birlikning koeffitsienti 1 bo'lishi kerak.",
    ru: "Коэффициент базовой единицы должен быть равен 1.",
  },
  "errors.catalog.base_unit_in_use": {
    uz: "Qoldig'i yoki hujjatlari bor tovarning asosiy birligini o'zgartirib bo'lmaydi.",
    ru: "Нельзя менять базовую единицу у товара, по которому есть остатки или документы.",
  },
  "errors.catalog.unit_not_found": {
    uz: "Tanlangan birlik topilmadi.",
    ru: "Выбранная единица не найдена.",
  },
  "errors.catalog.unit_duplicate": {
    uz: "Bir birlik ikki marta kiritilgan.",
    ru: "Одна единица указана дважды.",
  },
  "errors.catalog.barcode_already_exists": {
    uz: "Bu shtrix-kod boshqa tovar yoki birlikda allaqachon bor.",
    ru: "Этот штрихкод уже используется другим товаром или единицей.",
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
