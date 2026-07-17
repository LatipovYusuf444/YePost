import type {
  ChiqimHujjat,
  Hujjat,
  InventarizatsiyaHujjat,
  KirimHujjat,
  KochirmaHujjat,
  Mahsulot,
  NarxTuri,
  OmborItem,
  RealizatsiyaHujjat,
} from "./types";

export const mockOmborlar: OmborItem[] = [
  {
    id: "omb-1",
    nomi: "Markaziy ombor",
    manzil: "Toshkent, Chilonzor",
    faol: true,
    filial: "Chilonzor filiali",
    gps: "41.285361, 69.203941",
    ishlashVaqti: "08:00 - 20:00",
    yaratganShaxs: "Aziz Rahimov",
    yaratilganSana: "2026-01-12",
    masulShaxs: "Aziz Rahimov",
    masulShaxsTel: "+998 90 123 45 67",
  },
  {
    id: "omb-2",
    nomi: "Do'kon ombori",
    manzil: "Toshkent, Yunusobod",
    faol: true,
    filial: "Yunusobod filiali",
    gps: "41.364722, 69.286944",
    ishlashVaqti: "09:00 - 18:00",
    yaratganShaxs: "Malika Yusupova",
    yaratilganSana: "2026-02-03",
    masulShaxs: "Malika Yusupova",
    masulShaxsTel: "+998 93 555 12 34",
  },
  {
    id: "omb-3",
    nomi: "Transit ombor",
    manzil: "Toshkent, Sergeli",
    faol: false,
    filial: "Sergeli filiali",
    gps: "41.226111, 69.213056",
    ishlashVaqti: "24/7",
    yaratganShaxs: "Jasur Tursunov",
    yaratilganSana: "2026-03-21",
    masulShaxs: "Jasur Tursunov",
    masulShaxsTel: "+998 97 777 88 99",
  },
];

export const mockYetkazibBeruvchilar: string[] = [
  "Coca-Cola Icecek O'zbekiston",
  "Nestle O'zbekiston",
  "PepsiCo Markaziy Osiyo",
  "Oq don un kombinati",
  "Mahalliy fermer xo'jaligi",
];

export const mockMijozlar: string[] = [
  "Sardor Aliyev",
  "Dilnoza Ismoilova",
  "Bekzod Qodirov",
  "Nigora Sattorova",
  "Chakana mijoz",
];

export const mockKompaniyalar: string[] = [
  "YePost Savdo MChJ",
  "Baraka Market",
  "Oq Bozor Retail",
  "Nur Trade Group",
];

export const mockChiqimSabablari: string[] = [
  "Kamomad (inventarizatsiya)",
  "Brak/Yaroqsiz mahsulot",
  "Ichki iste'mol",
  "Muddati o'tgan",
  "Boshqa",
];

export const mockMasulShaxslar: string[] = [
  "Aziz Rahimov",
  "Malika Yusupova",
  "Jasur Tursunov",
  "Nodira Karimova",
];

export const mockFiliallar: string[] = [
  "Chilonzor filiali",
  "Yunusobod filiali",
  "Sergeli filiali",
];

export const mockKategoriyalar: string[] = [
  "Ichimliklar",
  "Shirinlik va gazak",
  "Meva-sabzavot",
  "Bakaleya",
];

export const mockXarakteristikalar: string[] = ["Hajm", "Og'irlik", "Ta'm"];

export const mockNarxTurlari: { kalit: NarxTuri; nom: string }[] = [
  { kalit: "tanNarx", nom: "Tan narhi" },
  { kalit: "sotuvNarx", nom: "Sotuv narhi" },
  { kalit: "ulgurjiNarx", nom: "Ulgurji narhi" },
];

export const mockRezervlar: Record<string, number> = {
  "mah-1": 20,
  "mah-2": 5,
  "mah-4": 8,
};

export const mockMahsulotlar: Mahsulot[] = [
  {
    id: "mah-1",
    nomi: "Coca-Cola 1.5L",
    birlik: "dona",
    narx: 12000,
    shtrixKod: "4870204012345",
    tanNarx: 10500,
    sotuvNarx: 12000,
    ulgurjiNarx: 11000,
    kategoriya: "Ichimliklar",
    variatsiya: "1.5L",
    xarakteristika: "Hajm",
  },
  {
    id: "mah-2",
    nomi: "Lays chips 150g",
    birlik: "dona",
    narx: 18500,
    shtrixKod: "4870204023456",
    tanNarx: 15500,
    sotuvNarx: 18500,
    ulgurjiNarx: 16800,
    kategoriya: "Shirinlik va gazak",
    variatsiya: "150g",
    xarakteristika: "Og'irlik",
  },
  {
    id: "mah-3",
    nomi: "Nestle suv 0.5L",
    birlik: "dona",
    narx: 3500,
    shtrixKod: "4870204034567",
    tanNarx: 2800,
    sotuvNarx: 3500,
    ulgurjiNarx: 3100,
    kategoriya: "Ichimliklar",
    variatsiya: "0.5L",
    xarakteristika: "Hajm",
  },
  {
    id: "mah-4",
    nomi: "Olma 1kg",
    birlik: "kg",
    narx: 9000,
    shtrixKod: "4870204045678",
    tanNarx: 7000,
    sotuvNarx: 9000,
    ulgurjiNarx: 8000,
    kategoriya: "Meva-sabzavot",
    variatsiya: "1kg",
    xarakteristika: "Og'irlik",
  },
  {
    id: "mah-5",
    nomi: "Un 'Oq don' 5kg",
    birlik: "qop",
    narx: 42000,
    shtrixKod: "4870204056789",
    tanNarx: 36000,
    kategoriya: "Bakaleya",
    variatsiya: "5kg",
    xarakteristika: "Og'irlik",
    sotuvNarx: 42000,
    ulgurjiNarx: 39000,
  },
];

function satr(mahsulotId: string, miqdor: number, narx: number) {
  return { id: crypto.randomUUID(), mahsulotId, miqdor, narx };
}

export const boshlangichHujjatlar: Record<"chiqim" | "kochirma", Hujjat[]> = {
  chiqim: [
    {
      id: crypto.randomUUID(),
      raqami: "CHQ-0001",
      sana: new Date().toISOString().slice(0, 10),
      valyuta: "UZS",
      kontragentNomi: "Do'kon 'Boshoq'",
      omborId: "omb-1",
      izoh: "Chakana savdo uchun chiqim",
      holati: "qoralama",
      satrlar: [satr("mah-2", 30, 18500)],
    },
  ],
  kochirma: [
    {
      id: crypto.randomUUID(),
      raqami: "KOC-0001",
      sana: new Date().toISOString().slice(0, 10),
      valyuta: "UZS",
      kontragentNomi: "Ichki ko'chirma",
      omborId: "omb-1",
      omborIdTo: "omb-2",
      izoh: "Do'kon omboriga to'ldirish",
      holati: "tasdiqlangan",
      satrlar: [satr("mah-4", 50, 9000)],
    },
  ],
};

function kirimSatri(mahsulotId: string, omborId: string, soni: number) {
  const mahsulot = mockMahsulotlar.find((item) => item.id === mahsulotId);
  return {
    id: crypto.randomUUID(),
    mahsulotId,
    shtrixKod: mahsulot?.shtrixKod ?? "",
    omborId,
    soni,
    tanNarx: mahsulot?.tanNarx ?? 0,
    sotuvNarx: mahsulot?.sotuvNarx ?? 0,
    ulgurjiNarx: mahsulot?.ulgurjiNarx ?? 0,
  };
}

export const boshlangichKirimlar: KirimHujjat[] = [
  {
    id: crypto.randomUUID(),
    nomi: "Kirim hujjati #1",
    yetkazibBeruvchi: "Coca-Cola Icecek O'zbekiston",
    sana: new Date().toISOString().slice(0, 10),
    masulShaxs: "Aziz Rahimov",
    holati: "tasdiqlangan",
    satrlar: [kirimSatri("mah-1", "omb-1", 200), kirimSatri("mah-3", "omb-1", 500)],
    omborId: "omb-1",
    yaratilganSana: new Date().toISOString().slice(0, 10),
    ozgartirilganSana: new Date().toISOString().slice(0, 10),
    ozgartirganShaxs: "Aziz Rahimov",
  },
];

function realizatsiyaSatri(mahsulotId: string, omborId: string, soni: number) {
  const mahsulot = mockMahsulotlar.find((item) => item.id === mahsulotId);
  return {
    id: crypto.randomUUID(),
    mahsulotId,
    shtrixKod: mahsulot?.shtrixKod ?? "",
    omborId,
    soni,
    tanNarx: mahsulot?.tanNarx ?? 0,
    sotuvNarx: mahsulot?.sotuvNarx ?? 0,
    ulgurjiNarx: mahsulot?.ulgurjiNarx ?? 0,
  };
}

export const boshlangichRealizatsiyalar: RealizatsiyaHujjat[] = [
  {
    id: crypto.randomUUID(),
    nomi: "Realizatsiya hujjati #1",
    mijoz: "Sardor Aliyev",
    kompaniya: "YePost Savdo MChJ",
    sana: new Date().toISOString().slice(0, 10),
    masulShaxs: "Aziz Rahimov",
    holati: "tasdiqlangan",
    satrlar: [realizatsiyaSatri("mah-1", "omb-1", 12), realizatsiyaSatri("mah-2", "omb-1", 5)],
    omborId: "omb-1",
    savdoId: "SAV-0001",
    yaratilganSana: new Date().toISOString().slice(0, 10),
    ozgartirilganSana: new Date().toISOString().slice(0, 10),
    ozgartirganShaxs: "Aziz Rahimov",
  },
];

function chiqimSatri(mahsulotId: string, omborId: string, soni: number) {
  const mahsulot = mockMahsulotlar.find((item) => item.id === mahsulotId);
  return {
    id: crypto.randomUUID(),
    mahsulotId,
    shtrixKod: mahsulot?.shtrixKod ?? "",
    omborId,
    soni,
    tanNarx: mahsulot?.tanNarx ?? 0,
  };
}

export const boshlangichChiqimlar: ChiqimHujjat[] = [
  {
    id: crypto.randomUUID(),
    nomi: "Chiqim hujjati #1",
    sabab: "Brak/Yaroqsiz mahsulot",
    sana: new Date().toISOString().slice(0, 10),
    masulShaxs: "Malika Yusupova",
    holati: "tasdiqlangan",
    satrlar: [chiqimSatri("mah-2", "omb-1", 30), chiqimSatri("mah-4", "omb-1", 15)],
    omborId: "omb-1",
    yaratilganSana: new Date().toISOString().slice(0, 10),
    ozgartirilganSana: new Date().toISOString().slice(0, 10),
    ozgartirganShaxs: "Malika Yusupova",
  },
];

function inventarizatsiyaSatri(mahsulotId: string, omborId: string, soni: number) {
  const mahsulot = mockMahsulotlar.find((item) => item.id === mahsulotId);
  return {
    id: crypto.randomUUID(),
    mahsulotId,
    shtrixKod: mahsulot?.shtrixKod ?? "",
    omborId,
    soni,
    tanNarx: mahsulot?.tanNarx ?? 0,
  };
}

export const boshlangichInventarizatsiyalar: InventarizatsiyaHujjat[] = [
  {
    id: crypto.randomUUID(),
    nomi: "Inventarizatsiya hujjati #1",
    sana: new Date().toISOString().slice(0, 10),
    masulShaxs: "Nodira Karimova",
    holati: "qoralama",
    satrlar: [inventarizatsiyaSatri("mah-5", "omb-1", 12)],
    omborId: "omb-1",
    yaratilganSana: new Date().toISOString().slice(0, 10),
    ozgartirilganSana: new Date().toISOString().slice(0, 10),
    ozgartirganShaxs: "Nodira Karimova",
  },
];

function kochirmaSatri(mahsulotId: string, soni: number) {
  const mahsulot = mockMahsulotlar.find((item) => item.id === mahsulotId);
  return {
    id: crypto.randomUUID(),
    mahsulotId,
    shtrixKod: mahsulot?.shtrixKod ?? "",
    soni,
    tanNarx: mahsulot?.tanNarx ?? 0,
  };
}

export const boshlangichKochirmalar: KochirmaHujjat[] = [
  {
    id: crypto.randomUUID(),
    nomi: "Ko'chirma hujjati #1",
    sana: new Date().toISOString().slice(0, 10),
    masulShaxs: "Jasur Tursunov",
    holati: "tasdiqlangan",
    satrlar: [kochirmaSatri("mah-4", 50), kochirmaSatri("mah-1", 100)],
    omborIdFrom: "omb-1",
    omborIdTo: "omb-2",
    yaratilganSana: new Date().toISOString().slice(0, 10),
    ozgartirilganSana: new Date().toISOString().slice(0, 10),
    ozgartirganShaxs: "Jasur Tursunov",
  },
];
