import { apiTiliniOlish } from "@/api/apiLanguage";

// Android qatlamining qisqa matnlari (umumiy i18n fayllariga tegmaslik uchun shu yerda).
const MATNLAR = {
  uz: {
    offline: "Internet aloqasi yo'q. Sotuv va to'lovlar server tasdiqlamaguncha saqlanmaydi — aloqa tiklangach qayta bosing.",
    online: "Aloqa tiklandi",
    saqlandi: "Fayl saqlandi",
    ochish: "Ochish",
    saqlanmadi: "Faylni saqlab bo'lmadi",
    ochilmadi: "Faylni ochib bo'lmadi",
    chopXato: "Chop etib bo'lmadi",
    havolaXato: "Havolani ochib bo'lmadi",
    yangiVersiya: "Ilovaning yangi versiyasi tayyor",
    yangiVersiyaIzoh: "Ochiq ishingizni saqlab, \"Yangilash\" ni bosing.",
    yangilash: "Yangilash",
  },
  ru: {
    offline: "Нет подключения к интернету. Продажи и оплаты не сохраняются, пока сервер не подтвердит — нажмите снова после восстановления связи.",
    online: "Соединение восстановлено",
    saqlandi: "Файл сохранён",
    ochish: "Открыть",
    saqlanmadi: "Не удалось сохранить файл",
    ochilmadi: "Не удалось открыть файл",
    chopXato: "Не удалось распечатать",
    havolaXato: "Не удалось открыть ссылку",
    yangiVersiya: "Доступна новая версия приложения",
    yangiVersiyaIzoh: "Сохраните открытую работу и нажмите «Обновить».",
    yangilash: "Обновить",
  },
  en: {
    offline: "No internet connection. Sales and payments are not saved until the server confirms — tap again once you are back online.",
    online: "Connection restored",
    saqlandi: "File saved",
    ochish: "Open",
    saqlanmadi: "Could not save the file",
    ochilmadi: "Could not open the file",
    chopXato: "Could not print",
    havolaXato: "Could not open the link",
    yangiVersiya: "A new version of the app is ready",
    yangiVersiyaIzoh: "Save your open work, then tap \"Update\".",
    yangilash: "Update",
  },
} as const;

export type NativMatnKaliti = keyof (typeof MATNLAR)["uz"];

export function nativMatn(kalit: NativMatnKaliti) {
  return MATNLAR[apiTiliniOlish()][kalit];
}
