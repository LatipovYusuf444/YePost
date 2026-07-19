import type { Bolim, Davomat, Lavozim, Vakolat, Xodim, XodimTarixi } from "./types";

// Mock ma'lumot — backendga bitta ham so'rov yo'q.

export const mockVakolatlar: Vakolat[] = [
  { kod: "SAVDO_KORISH", nom: "Savdolarni ko'rish", izoh: "Sotuv hujjatlarini ochadi.", guruh: "Savdo" },
  { kod: "SAVDO_YARATISH", nom: "Savdo yaratish", izoh: "Yangi sotuv rasmiylashtiradi.", guruh: "Savdo" },
  { kod: "QAYTARISH_BEKOR", nom: "Qaytarishni bekor qilish", izoh: "Tasdiqlangan qaytarishni bekor qiladi.", guruh: "Savdo" },
  { kod: "OMBOR_KORISH", nom: "Ombor qoldig'ini ko'rish", izoh: "Qoldiq va harakatlarni ko'radi.", guruh: "Ombor" },
  { kod: "KIRIM_QILISH", nom: "Kirim qilish", izoh: "Omborga mahsulot qabul qiladi.", guruh: "Ombor" },
  { kod: "INVENTARIZATSIYA", nom: "Inventarizatsiya", izoh: "Sanoq hujjatlarini yuritadi.", guruh: "Ombor" },
  { kod: "KASSA_KIRIM", nom: "Kassaga kirim qilish", izoh: "Kassaga pul kirimini kiritadi.", guruh: "Kassa" },
  { kod: "XARAJAT", nom: "Xarajat kiritish", izoh: "Kassa xarajatlarini ro'yxatga oladi.", guruh: "Kassa" },
  { kod: "HISOBOT", nom: "Hisobotlarni ko'rish", izoh: "Savdo va moliya hisobotlarini ochadi.", guruh: "Hisobot" },
  { kod: "XODIM_BOSHQARUV", nom: "Xodimlarni boshqarish", izoh: "Xodim, lavozim va vakolatlarni tahrirlaydi.", guruh: "Boshqaruv" },
  { kod: "OCHIRISH", nom: "Ma'lumotlarni o'chirish", izoh: "Ruxsat etilgan bo'limlarda o'chiradi.", guruh: "Boshqaruv" },
];

export const mockLavozimlar: Lavozim[] = [
  {
    id: "lav-1",
    nomi: "Direktor",
    izoh: "Barcha bo'limlarga to'liq ruxsat.",
    vakolatlar: mockVakolatlar.map((vakolat) => vakolat.kod),
    yaratganMasul: "Administrator",
    yaratilganSana: "2025-01-04",
    ozgartirilganSana: "2025-01-04",
  },
  {
    id: "lav-2",
    nomi: "Administrator",
    izoh: "Kundalik boshqaruv, xodimlarsiz.",
    vakolatlar: ["SAVDO_KORISH", "SAVDO_YARATISH", "OMBOR_KORISH", "KIRIM_QILISH", "KASSA_KIRIM", "HISOBOT"],
    yaratganMasul: "Administrator",
    yaratilganSana: "2025-01-04",
    ozgartirilganSana: "2025-03-12",
  },
  {
    id: "lav-3",
    nomi: "Kassir",
    izoh: "Kassa va sotuv nuqtasi.",
    vakolatlar: ["SAVDO_KORISH", "SAVDO_YARATISH", "KASSA_KIRIM"],
    yaratganMasul: "Administrator",
    yaratilganSana: "2025-01-06",
    ozgartirilganSana: "2025-05-20",
  },
  {
    id: "lav-4",
    nomi: "Omborchi",
    izoh: "Ombor hujjatlari va sanoq.",
    vakolatlar: ["OMBOR_KORISH", "KIRIM_QILISH", "INVENTARIZATSIYA"],
    yaratganMasul: "Administrator",
    yaratilganSana: "2025-01-06",
    ozgartirilganSana: "2025-04-02",
  },
  {
    id: "lav-5",
    nomi: "Sotuv menejeri",
    izoh: "Xaridorlar bilan ishlash.",
    vakolatlar: ["SAVDO_KORISH", "SAVDO_YARATISH", "HISOBOT"],
    yaratganMasul: "Administrator",
    yaratilganSana: "2025-02-18",
    ozgartirilganSana: "2025-06-11",
  },
];

// Bo'limlar daraxti — cho'qqi kompaniyaning o'zi (otaId: "").
export const mockBolimlar: Bolim[] = [
  { id: "bol-1", nomi: "YePost", otaId: "", rahbarIdlar: ["xod-1"] },
  { id: "bol-2", nomi: "Boshqaruv", otaId: "bol-1", rahbarIdlar: ["xod-2"] },
  { id: "bol-3", nomi: "Savdo bo'limi", otaId: "bol-1", rahbarIdlar: ["xod-4"] },
  { id: "bol-4", nomi: "Ombor", otaId: "bol-1", rahbarIdlar: ["xod-5"] },
  { id: "bol-5", nomi: "Chilonzor savdo nuqtasi", otaId: "bol-3", rahbarIdlar: [] },
  { id: "bol-6", nomi: "Yunusobod savdo nuqtasi", otaId: "bol-3", rahbarIdlar: [] },
];

export const mockFiliallar = ["Chilonzor filiali", "Yunusobod filiali", "Sergeli ombori"];

export const mockXodimlar: Xodim[] = [
  {
    id: "xod-1",
    ism: "Aziz",
    familiya: "Karimov",
    telefonlar: ["+998 90 123 45 67", "+998 71 200 10 10"],
    login: "aziz.karimov",
    lavozimId: "lav-1",
    bolimId: "bol-1",
    filial: "Chilonzor filiali",
    manzil: "Toshkent, Chilonzor 9-kvartal",
    ishBoshlaganSana: "2023-02-01",
    oylik: 12000000,
    holat: "faol",
    izoh: "Ta'sischi.",
    vakolatlar: [],
    yaratganMasul: "Administrator",
    yaratilganSana: "2023-02-01",
    ozgartirilganSana: "2026-01-15",
    ozgartirganMasul: "Administrator",
  },
  {
    id: "xod-2",
    ism: "Dilnoza",
    familiya: "Rahimova",
    telefonlar: ["+998 93 555 22 11"],
    login: "dilnoza.r",
    lavozimId: "lav-2",
    bolimId: "bol-2",
    filial: "Chilonzor filiali",
    manzil: "Toshkent, Yunusobod 4-mavze",
    ishBoshlaganSana: "2024-03-11",
    oylik: 7500000,
    holat: "faol",
    izoh: "Ofis boshqaruvi.",
    vakolatlar: ["OCHIRISH"],
    yaratganMasul: "Aziz Karimov",
    yaratilganSana: "2024-03-11",
    ozgartirilganSana: "2026-05-04",
    ozgartirganMasul: "Aziz Karimov",
  },
  {
    id: "xod-3",
    ism: "Sardor",
    familiya: "To'xtayev",
    telefonlar: ["+998 91 777 88 99"],
    login: "sardor.t",
    lavozimId: "lav-3",
    bolimId: "bol-5",
    filial: "Yunusobod filiali",
    manzil: "Toshkent, Yunusobod 19-mavze",
    ishBoshlaganSana: "2025-01-20",
    oylik: 5200000,
    holat: "faol",
    izoh: "",
    vakolatlar: [],
    yaratganMasul: "Dilnoza Rahimova",
    yaratilganSana: "2025-01-20",
    ozgartirilganSana: "2026-06-01",
    ozgartirganMasul: "Dilnoza Rahimova",
  },
  {
    id: "xod-4",
    ism: "Nodira",
    familiya: "Yo'ldosheva",
    telefonlar: ["+998 94 300 40 50"],
    login: "nodira.y",
    lavozimId: "lav-5",
    bolimId: "bol-3",
    filial: "Chilonzor filiali",
    manzil: "Toshkent, Mirzo Ulug'bek",
    ishBoshlaganSana: "2025-04-07",
    oylik: 6100000,
    holat: "tatilda",
    izoh: "Mehnat ta'tili 20-iyulgacha.",
    vakolatlar: ["OMBOR_KORISH"],
    yaratganMasul: "Dilnoza Rahimova",
    yaratilganSana: "2025-04-07",
    ozgartirilganSana: "2026-07-01",
    ozgartirganMasul: "Administrator",
  },
  {
    id: "xod-5",
    ism: "Jasur",
    familiya: "Ergashev",
    telefonlar: ["+998 97 111 22 33"],
    login: "jasur.e",
    lavozimId: "lav-4",
    bolimId: "bol-4",
    filial: "Sergeli ombori",
    manzil: "Toshkent, Sergeli 6-kvartal",
    ishBoshlaganSana: "2024-09-16",
    oylik: 5800000,
    holat: "faol",
    izoh: "",
    vakolatlar: [],
    yaratganMasul: "Aziz Karimov",
    yaratilganSana: "2024-09-16",
    ozgartirilganSana: "2026-03-22",
    ozgartirganMasul: "Dilnoza Rahimova",
  },
  {
    id: "xod-6",
    ism: "Malika",
    familiya: "Sobirova",
    telefonlar: ["+998 99 654 32 10"],
    login: "malika.s",
    lavozimId: "lav-3",
    bolimId: "bol-6",
    filial: "Yunusobod filiali",
    manzil: "Toshkent, Olmazor",
    ishBoshlaganSana: "2023-11-02",
    oylik: 4900000,
    holat: "ishdan-ketgan",
    izoh: "2026-yil 30-iyunda ariza bo'yicha bo'shatildi.",
    vakolatlar: [],
    yaratganMasul: "Administrator",
    yaratilganSana: "2023-11-02",
    ozgartirilganSana: "2026-06-30",
    ozgartirganMasul: "Aziz Karimov",
  },
];

// Oxirgi 14 kun uchun davomat: hafta oxiri tashlab ketiladi, ishdan ketgan xodim hisobga olinmaydi.
function davomatYasash(): Davomat[] {
  const yozuvlar: Davomat[] = [];
  const boshlanish = new Date("2026-07-17T00:00:00");

  mockXodimlar.forEach((xodim, xodimIndex) => {
    if (xodim.holat === "ishdan-ketgan") return;
    for (let kun = 0; kun < 14; kun += 1) {
      const sana = new Date(boshlanish);
      sana.setDate(boshlanish.getDate() - kun);
      const haftaKuni = sana.getDay();
      if (haftaKuni === 0) continue; // yakshanba dam

      const belgi = (xodimIndex + kun) % 7;
      const holat: Davomat["holat"] =
        xodim.holat === "tatilda" && kun < 5
          ? "tatil"
          : belgi === 3
            ? "kechikdi"
            : belgi === 6
              ? "kelmadi"
              : "keldi";

      const kelgan =
        holat === "kechikdi" ? "09:34" : holat === "keldi" ? (belgi % 2 ? "08:52" : "09:00") : "";
      const ketgan = holat === "kechikdi" ? "18:20" : holat === "keldi" ? (belgi % 2 ? "18:05" : "18:00") : "";

      yozuvlar.push({
        id: `dav-${xodim.id}-${kun}`,
        xodimId: xodim.id,
        sana: sana.toISOString().slice(0, 10),
        kelgan,
        ketgan,
        holat,
        izoh:
          holat === "kechikdi"
            ? "Yo'l tirbandligi"
            : holat === "kelmadi"
              ? "Sababsiz"
              : holat === "tatil"
                ? "Mehnat ta'tili"
                : "",
      });
    }
  });

  return yozuvlar.sort((a, b) => (a.sana < b.sana ? 1 : -1));
}

export const mockDavomat: Davomat[] = davomatYasash();

export const mockTarix: XodimTarixi[] = [
  {
    id: "tar-1",
    xodimId: "xod-2",
    turi: "vakolat",
    sarlavha: "Vakolat qo'shildi",
    matn: "\"Ma'lumotlarni o'chirish\" vakolati berildi.",
    sana: "2026-05-04T10:12:00",
    muallif: "Aziz Karimov",
  },
  {
    id: "tar-2",
    xodimId: "xod-2",
    turi: "ozgarish",
    sarlavha: "Oylik yangilandi",
    matn: "6 800 000 so'mdan 7 500 000 so'mga oshirildi.",
    sana: "2026-02-01T09:30:00",
    muallif: "Aziz Karimov",
  },
  {
    id: "tar-3",
    xodimId: "xod-3",
    turi: "davomat",
    sarlavha: "Kechikish qayd etildi",
    matn: "Oy davomida 3-marta kechikdi.",
    sana: "2026-06-01T18:40:00",
    muallif: "Dilnoza Rahimova",
  },
  {
    id: "tar-4",
    xodimId: "xod-4",
    turi: "izoh",
    sarlavha: "Ta'til arizasi",
    matn: "1-iyuldan 20-iyulgacha mehnat ta'tili tasdiqlandi.",
    sana: "2026-06-25T14:05:00",
    muallif: "Administrator",
  },
  {
    id: "tar-5",
    xodimId: "xod-1",
    turi: "ozgarish",
    sarlavha: "Telefon qo'shildi",
    matn: "Ikkinchi raqam kiritildi.",
    sana: "2026-01-15T11:20:00",
    muallif: "Administrator",
  },
];
