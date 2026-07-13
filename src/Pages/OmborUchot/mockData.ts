import type { ChiqimHujjat, Hujjat, InventarizatsiyaHujjat, KirimHujjat, Mahsulot, OmborItem } from "./types";

export const mockOmborlar: OmborItem[] = [
  { id: "omb-1", nomi: "Markaziy ombor", manzil: "Toshkent, Chilonzor", faol: true },
  { id: "omb-2", nomi: "Do'kon ombori", manzil: "Toshkent, Yunusobod", faol: true },
  { id: "omb-3", nomi: "Transit ombor", manzil: "Toshkent, Sergeli", faol: false },
];

export const mockYetkazibBeruvchilar: string[] = [
  "Coca-Cola Icecek O'zbekiston",
  "Nestle O'zbekiston",
  "PepsiCo Markaziy Osiyo",
  "Oq don un kombinati",
  "Mahalliy fermer xo'jaligi",
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
  },
  {
    id: "mah-5",
    nomi: "Un 'Oq don' 5kg",
    birlik: "qop",
    narx: 42000,
    shtrixKod: "4870204056789",
    tanNarx: 36000,
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
