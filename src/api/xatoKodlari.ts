// Mijoz hisobi (wallet), valyuta, hujjat sanasi va davrni yopish bilan bog'liq backend xato kodlari uchun tushunarli matnlar.
// UI'siz va tashqi importlarsiz yozilgan — alohida sinash mumkin. Boshqa kodlar uchun `null` qaytadi:
// ular avvalgidek backend `message` / `errors` orqali ko'rsatiladi.
import { kunMatni } from "../lib/hujjatSanasi.ts";

type Til = "uz" | "ru";

type KodMatni = { uz: string; ru: string };

const MATNLAR: Record<string, KodMatni> = {
  // Hisobdan to'lovda pul yetmaydi.
  "errors.wallet.insufficient_balance": {
    uz: "Mijoz hisobida pul yetarli emas.",
    ru: "На счёте клиента недостаточно средств.",
  },
  // Karta, bank yoki hisobdan qarzdan ko'p to'lanyapti (naqd to'lovda ortiqcha qabul qilinadi: qaytim yoki mijoz hisobiga).
  "errors.sales.overpayment_not_allowed": {
    uz: "Karta, bank yoki hisobdan qarz summasidan ko'p to'lab bo'lmaydi. Ortiqcha pulni faqat naqd to'lovda qabul qilish mumkin (qaytim yoki mijoz hisobiga). Summani kamaytiring.",
    ru: "Картой, банковским переводом или со счёта нельзя заплатить больше суммы долга. Излишек принимается только при оплате наличными (сдача или зачисление на счёт клиента). Уменьшите сумму.",
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
  // To'lov sanasi sotuv kunidan oldin (yangi to'lovda yoki qoralama sanasi oldinga surilganda alohida kunli to'lov oldinda qolsa).
  "errors.sales.payment_before_sale": {
    uz: "To'lov sanasi sotuv sanasidan oldin bo'lishi mumkin emas. To'lov sanasini yoki sotuv sanasini o'zgartiring.",
    ru: "Дата оплаты не может быть раньше даты продажи. Измените дату оплаты или дату продажи.",
  },
  // Telegram bot (nakladnoy va xabarnomalar).
  "errors.integrations.invalid_bot_token": {
    uz: "Telegram bot tokeni noto'g'ri yoki bot yoqilmagan. Sozlamalar → Integratsiya bo'limida tokenni tekshiring.",
    ru: "Токен Telegram-бота неверный или бот не включён. Проверьте токен в разделе Настройки → Интеграции.",
  },
  "errors.integrations.sale_has_no_customer": {
    uz: "Sotuvda mijoz yo'q: mijozsiz (chakana) sotuvga Telegram xabari yuborilmaydi.",
    ru: "В продаже нет клиента: по розничным продажам без клиента сообщения в Telegram не отправляются.",
  },
};

// Nakladnoy PDF va xabar yuborish faqat tasdiqlangan sotuv uchun; bu kodlar boshqa so'rovlarda (masalan, to'lov)
// avvalgidek backend matni bilan ko'rsatiladi, shuning uchun faqat nakladnoy/notify manzillarida almashtiriladi.
const NAKLADNOY_MATNLARI: Record<string, KodMatni> = {
  "errors.sales.only_confirmed_sale_payable": {
    uz: "Nakladnoy va Telegram xabari faqat tasdiqlangan sotuv uchun mavjud. Avval sotuvni tasdiqlang.",
    ru: "Накладная и сообщение в Telegram доступны только для подтверждённой продажи. Сначала подтвердите продажу.",
  },
  "errors.sales.sale_not_found": {
    uz: "Sotuv topilmadi.",
    ru: "Продажа не найдена.",
  },
};

// Sotuvni bekor qilishda hisobdan yechilgan pul qaytadi; hisobga yozilgan pul esa ishlatilgan bo'lsa bekor qilib bo'lmaydi.
const BEKOR_QILISH_MATNI: KodMatni = {
  uz: "Sotuvni bekor qilib bo'lmaydi: sotuvda hisobga yozilgan pul mijoz tomonidan allaqachon ishlatib bo'lingan.",
  ru: "Продажу нельзя отменить: деньги, записанные на счёт клиента по этой продаже, уже использованы.",
};

// ── Hujjat sanasi va davrni yopish ──────────────────────────────────────────────────────────────────

/** Tasdiqlashda "Davom etasizmi?" deb so'raladigan ogohlantirish (409): `confirmWarnings: true` bilan qayta yuboriladi. */
export const OGOHLANTIRISH_KODI = "errors.inventory.before_stock_take";

type Obyekt = Record<string, unknown>;

function obyekt(qiymat: unknown): Obyekt | null {
  return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : null;
}

const TAFSILOT_KONTEYNERLARI = ["details", "data", "meta", "params", "args", "context", "message"];

/** Xato javobidagi qo'shimcha maydon (`closedUntil`, `shortage`, `transfers`...): javob ildizida yoki `details`/`data`/`meta` kabi ichki obyektda. */
export function xatoMaydoni(tafsilot: unknown, kalit: string): unknown {
  const asosiy = obyekt(tafsilot);
  if (!asosiy) return undefined;
  const nomzodlar = [asosiy, ...TAFSILOT_KONTEYNERLARI.map((nom) => obyekt(asosiy[nom]))];
  for (const nomzod of nomzodlar) {
    const qiymat = nomzod?.[kalit];
    if (qiymat !== undefined && qiymat !== null && qiymat !== "") return qiymat;
  }
  return undefined;
}

/** Xato javobidan kod: `code` maydoni, bo'lmasa "errors." bilan boshlangan `message`. */
export function xatoKodi(tafsilot: unknown): string | undefined {
  const asosiy = obyekt(tafsilot);
  if (!asosiy) return undefined;
  if (typeof asosiy.code === "string" && asosiy.code) return asosiy.code;
  return typeof asosiy.message === "string" && asosiy.message.startsWith("errors.") ? asosiy.message : undefined;
}

function matnTil(matn: KodMatni, til: Til) {
  return matn[til];
}

function soniMatni(qiymat: unknown): string {
  const son = Number(qiymat);
  if (qiymat === undefined || qiymat === null || qiymat === "" || !Number.isFinite(son)) return "";
  return son.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
}

function royxatMatni(qiymat: unknown, chegara = 5): string {
  const elementlar = (Array.isArray(qiymat) ? qiymat : [])
    .map((element) => (typeof element === "string" || typeof element === "number" ? String(element) : ""))
    .filter(Boolean);
  if (elementlar.length === 0) return "";
  const korinadigan = elementlar.slice(0, chegara).join(", ");
  return elementlar.length > chegara ? `${korinadigan} (+${elementlar.length - chegara})` : korinadigan;
}

const HARAKAT_TURLARI: Array<[RegExp, KodMatni]> = [
  [/RETURN/i, { uz: "qaytarish", ru: "возврат" }],
  [/SALE/i, { uz: "sotuv", ru: "продажа" }],
  [/PURCHASE|RECEIPT/i, { uz: "kirim", ru: "приход" }],
  [/WRITE/i, { uz: "chiqim", ru: "списание" }],
  [/TRANSFER/i, { uz: "ko'chirma", ru: "перемещение" }],
  [/STOCK/i, { uz: "inventarizatsiya", ru: "инвентаризация" }],
];

function harakatMatni(harakat: unknown, til: Til): string {
  const element = obyekt(harakat);
  if (!element) return "";
  const turi = typeof element.type === "string" ? element.type : "";
  const nomi = HARAKAT_TURLARI.find(([regex]) => regex.test(turi))?.[1][til] ?? turi.toLowerCase();
  const sana = kunMatni(typeof element.date === "string" ? element.date : undefined);
  const miqdor = soniMatni(element.quantity);
  return [nomi, sana, miqdor && `(${miqdor})`].filter(Boolean).join(" ");
}

type DinamikMatn = (til: Til, tafsilot: unknown) => string;

// Javobdagi maydonlarga qarab yig'iladigan matnlar (maydon kelmasa ham jumla tushunarli bo'lib qoladi).
const DINAMIK_MATNLAR: Record<string, DinamikMatn> = {
  "errors.document.date_in_future": (til) =>
    matnTil(
      {
        uz: "Sana bugundan keyin bo'lishi mumkin emas. Bugungi yoki o'tgan sanani tanlang.",
        ru: "Дата не может быть позже сегодняшней. Выберите сегодняшнюю или прошедшую дату.",
      },
      til
    ),
  "errors.document.period_closed": (til, tafsilot) => {
    const kun = kunMatni(String(xatoMaydoni(tafsilot, "closedUntil") ?? ""));
    return til === "ru"
      ? `Период закрыт${kun ? ` до ${kun} включительно` : ""}: документы за эти даты нельзя создавать, менять, проводить или отменять. Выберите более позднюю дату или попросите директора открыть период.`
      : `Davr yopilgan${kun ? `: ${kun} (shu kun ham) va undan oldingi sanalar` : ""}. Bu sanadagi hujjatni yaratib, o'zgartirib, tasdiqlab yoki bekor qilib bo'lmaydi. Keyingi sanani tanlang yoki direktordan davrni ochishni so'rang.`;
  },
  "errors.document.transfers_in_transit": (til, tafsilot) => {
    const royxat = royxatMatni(xatoMaydoni(tafsilot, "transfers"));
    return til === "ru"
      ? `В этом периоде есть перемещения в пути${royxat ? `: ${royxat}` : ""}. Сначала примите их, затем закройте период.`
      : `Shu davrda yo'lda turgan ko'chirmalar bor${royxat ? `: ${royxat}` : ""}. Avval ularni qabul qiling, keyin davrni yoping.`;
  },
  "errors.inventory.negative_stock_after": (til, tafsilot) => {
    const kun = kunMatni(String(xatoMaydoni(tafsilot, "date") ?? ""));
    const yetishmaydi = soniMatni(xatoMaydoni(tafsilot, "shortage"));
    return til === "ru"
      ? `Из-за этого документа остаток на складе уйдёт в минус${kun ? ` ${kun}` : " в одном из следующих дней"}${yetishmaydi ? ` (не хватает: ${yetishmaydi})` : ""}. Измените дату или количество.`
      : `Bu hujjat tufayli ombor qoldig'i${kun ? ` ${kun} kuni` : " keyingi kunda"} minusga tushadi${yetishmaydi ? ` (yetishmaydi: ${yetishmaydi})` : ""}. Sanani yoki miqdorni o'zgartiring.`;
  },
  "errors.finance.negative_cash_after": (til, tafsilot) => {
    const kun = kunMatni(String(xatoMaydoni(tafsilot, "date") ?? ""));
    const yetishmaydi = soniMatni(xatoMaydoni(tafsilot, "shortage"));
    return til === "ru"
      ? `Из-за этого расхода касса в сумах уйдёт в минус${kun ? ` ${kun}` : " в одном из следующих дней"}${yetishmaydi ? ` (не хватает: ${yetishmaydi} сум)` : ""}. Измените дату или сумму.`
      : `Bu chiqim tufayli so'm kassasi${kun ? ` ${kun} kuni` : " keyingi kunda"} minusga tushadi${yetishmaydi ? ` (yetishmaydi: ${yetishmaydi} so'm)` : ""}. Sanani yoki summani o'zgartiring.`;
  },
  "errors.inventory.movements_after_stock_take": (til, tafsilot) => {
    const harakatlar = xatoMaydoni(tafsilot, "movements");
    const royxat = royxatMatni(
      (Array.isArray(harakatlar) ? harakatlar : []).map((harakat) => harakatMatni(harakat, til)),
      3
    );
    return til === "ru"
      ? `Инвентаризация проведена задним числом, а по этим товарам после этой даты уже были движения${royxat ? `: ${royxat}` : ""}. Проведите инвентаризацию сегодняшней датой.`
      : `Inventarizatsiya o'tgan sanada o'tkazilmoqda, lekin shu tovarlar bo'yicha undan keyin harakatlar bo'lgan${royxat ? `: ${royxat}` : ""}. Inventarizatsiyani bugungi sana bilan o'tkazing.`;
  },
  [OGOHLANTIRISH_KODI]: (til, tafsilot) => {
    const raqam = String(xatoMaydoni(tafsilot, "stockTakeNumber") ?? "");
    const kun = kunMatni(String(xatoMaydoni(tafsilot, "stockTakeDate") ?? ""));
    const qavs = [raqam, kun].filter(Boolean).join(", ");
    return til === "ru"
      ? `Дата документа раньше подтверждённой инвентаризации${qavs ? ` (${qavs})` : ""}. Это может повлиять на остатки.`
      : `Hujjat sanasi tasdiqlangan inventarizatsiyadan${qavs ? ` (${qavs})` : ""} oldingi sanada. Bu qoldiqlarga ta'sir qilishi mumkin.`;
  },
};

/**
 * Xato kodi tushunarli matnga; kod noma'lum bo'lsa `null`. `url` — so'rov manzili (sotuvni bekor qilish alohida matn oladi).
 * `tafsilot` — xato javobining tanasi: sana/yetishmovchilik kabi maydonlar matnga qo'shiladi.
 */
export function xatoKodiMatni(kod: unknown, url: string | undefined, til: string, tafsilot?: unknown): string | null {
  if (typeof kod !== "string") return null;
  const tilKodi: Til = til === "ru" ? "ru" : "uz";
  if (kod === "errors.wallet.insufficient_balance" && /\/sales\/[^/?]+\/cancel/.test(url ?? "")) {
    return BEKOR_QILISH_MATNI[tilKodi];
  }
  if (NAKLADNOY_MATNLARI[kod] && /\/sales\/[^/?]+\/(?:notify|nakladnoy\.pdf)/.test(url ?? "")) {
    return NAKLADNOY_MATNLARI[kod][tilKodi];
  }
  const dinamik = DINAMIK_MATNLAR[kod];
  if (dinamik) return dinamik(tilKodi, tafsilot);
  return MATNLAR[kod]?.[tilKodi] ?? null;
}
