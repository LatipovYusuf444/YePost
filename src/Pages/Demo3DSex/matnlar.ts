import i18n from "i18next";

// 3D sex demo matnlari (uz/ru) — modul ichida: asosiy ilova bo'lagiga (bundle) qo'shilmaydi, sahifa ochilganda yuklanadi.
export const DEMO_SEX_NS = "demo_sex";

const uz = {
  title: "3D sex",
  subtitle: "Mebel ishlab chiqarish sexi — stanoklar va joriy topshiriqlar",
  demoBadge: "Demo — sinov ma'lumotlari",
  back: "Ye-Post'ga qaytish",
  loading: "3D sex yuklanmoqda…",
  noWebgl: "Brauzeringiz 3D (WebGL) ni qo'llab-quvvatlamaydi. Ro'yxatdagi ma'lumotlar baribir yangilanib turadi.",
  camera: { title: "Ko'rinish", overview: "Butun sex", top: "Yuqoridan", hint: "Sichqoncha: aylantirish · o'ng tugma: siljitish · g'ildirak: yaqinlashtirish. Barmoq: bir barmoq — aylantirish, ikki barmoq — siljitish va yaqinlashtirish." },
  controls: { title: "Demo boshqaruvi", pause: "Pauza", resume: "Davom ettirish", restart: "Qayta boshlash", paused: "Demo pauzada", second: "{{s}}-soniya", running: "Jonli" },
  list: { title: "Stanoklar", noTask: "Topshiriq yo'q" },
  events: { title: "Hodisalar", empty: "Hali hodisa yo'q" },
  status: { ishlayapti: "Ishlayapti", pauza: "Pauzada", bosh: "Bo'sh", nosoz: "Nosoz", eskirgan: "Ma'lumot eskirgan" },
  panel: {
    close: "Yopish",
    order: "Buyurtma",
    part: "Detal",
    operation: "Operatsiya",
    done: "Bajarilgan",
    next: "Keyingi ish",
    updated: "Oxirgi yangilanish",
    ago: "{{s}} s oldin",
    reason: "Sabab",
    none: "—",
    stale: "Stanok bilan aloqa yo'q: oxirgi ma'lum holat ko'rsatilmoqda.",
    machineId: "Stanok ID",
  },
  zones: { material: "Material ombori", finished: "Tayyor mahsulot", aisle: "Yo'lak" },
  machineType: { kesish: "Format-kesish stanogi", cnc: "CNC frezer (nesting)", qirra: "Qirra yopishtirish stanogi", burgilash: "Burg'ilash stanogi", qadoqlash: "Qadoqlash joyi" },
  selectHint: "Stanokni tanlash uchun uning ustiga, yorlig'iga yoki ro'yxatdagi nomiga bosing",
};

const ru: typeof uz = {
  title: "3D цех",
  subtitle: "Мебельный цех — станки и текущие задания",
  demoBadge: "Демо — тестовые данные",
  back: "Вернуться в Ye-Post",
  loading: "Загрузка 3D цеха…",
  noWebgl: "Ваш браузер не поддерживает 3D (WebGL). Данные в списке всё равно обновляются.",
  camera: { title: "Вид", overview: "Весь цех", top: "Сверху", hint: "Мышь: вращение · правая кнопка: сдвиг · колесо: масштаб. Касание: один палец — вращение, два — сдвиг и масштаб." },
  controls: { title: "Управление демо", pause: "Пауза", resume: "Продолжить", restart: "Начать заново", paused: "Демо на паузе", second: "{{s}}-я секунда", running: "В эфире" },
  list: { title: "Станки", noTask: "Нет задания" },
  events: { title: "События", empty: "Пока нет событий" },
  status: { ishlayapti: "Работает", pauza: "Пауза", bosh: "Свободен", nosoz: "Неисправен", eskirgan: "Данные устарели" },
  panel: {
    close: "Закрыть",
    order: "Заказ",
    part: "Деталь",
    operation: "Операция",
    done: "Выполнено",
    next: "Следующее задание",
    updated: "Последнее обновление",
    ago: "{{s}} с назад",
    reason: "Причина",
    none: "—",
    stale: "Нет связи со станком: показано последнее известное состояние.",
    machineId: "ID станка",
  },
  zones: { material: "Склад материалов", finished: "Готовая продукция", aisle: "Проход" },
  machineType: { kesish: "Форматно-раскроечный станок", cnc: "ЧПУ фрезер (нестинг)", qirra: "Кромкооблицовочный станок", burgilash: "Сверлильный станок", qadoqlash: "Участок упаковки" },
  selectHint: "Чтобы выбрать станок, нажмите на него, на его ярлык или на название в списке",
};

if (!i18n.hasResourceBundle("uz", DEMO_SEX_NS)) i18n.addResourceBundle("uz", DEMO_SEX_NS, uz);
if (!i18n.hasResourceBundle("ru", DEMO_SEX_NS)) i18n.addResourceBundle("ru", DEMO_SEX_NS, ru);
