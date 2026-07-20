import type {
  AuditYozuvi,
  FoydaXarajatYozuvi,
  HisobKitobHujjati,
  KassaHujjati,
  KirimChiqim,
  Kontragent,
  MahsulotFoydasi,
  Maxsulot,
  Tanlov,
  TovarHarakati,
} from "./types";

// --- Filter tanlovlari ---

export const mockOmborlar: Tanlov[] = [
  { id: "omb-1", nomi: "Markaziy ombor" },
  { id: "omb-2", nomi: "Chilonzor ombori" },
  { id: "omb-3", nomi: "Samarqand ombori" },
];

export const mockFiliallar: Tanlov[] = [
  { id: "fil-1", nomi: "Bosh filial" },
  { id: "fil-2", nomi: "Chilonzor filiali" },
  { id: "fil-3", nomi: "Samarqand filiali" },
];

export const mockKategoriyalar: Tanlov[] = [
  { id: "kat-1", nomi: "Ichimliklar" },
  { id: "kat-2", nomi: "Shirinliklar" },
  { id: "kat-3", nomi: "Maishiy tovarlar" },
];

export const mockMaxsulotlar: Maxsulot[] = [
  { id: "prod-1", nomi: "Coca-Cola, 1 litr", categoryId: "kat-1", boshQoldiq: 34, barkod: "4780001234567", artikul: "COC-100145", birlik: "Dona", tanNarx: 6000, sotuvNarx: 8000, ulgurjiNarx: 7000 },
  { id: "prod-2", nomi: "Snickers, 50 g", categoryId: "kat-2", boshQoldiq: 1, barkod: "4780002234512", artikul: "SNK-500231", birlik: "Dona", tanNarx: 2000, sotuvNarx: 3000, ulgurjiNarx: 2500 },
  { id: "prod-3", nomi: "Fairy, 500 ml", categoryId: "kat-3", boshQoldiq: 32, barkod: "4780003234598", artikul: "FRY-500112", birlik: "Dona", tanNarx: 12000, sotuvNarx: 15000, ulgurjiNarx: 13500 },
  { id: "prod-4", nomi: "Nescafe Gold, 100 g", categoryId: "kat-1", boshQoldiq: 10, barkod: "4780004234533", artikul: "NSC-100977", birlik: "Dona", tanNarx: 25000, sotuvNarx: 35000, ulgurjiNarx: 30000 },
];

export const mockXarakteristikalar: Tanlov[] = [
  { id: "xar-1", nomi: "1 litr" },
  { id: "xar-2", nomi: "0.5 litr" },
  { id: "xar-3", nomi: "50 g" },
  { id: "xar-4", nomi: "500 ml" },
  { id: "xar-5", nomi: "100 g" },
];

export const mockVariatsiyalar: Tanlov[] = [
  { id: "var-1", nomi: "Qizil" },
  { id: "var-2", nomi: "Ko'k" },
  { id: "var-3", nomi: "S o'lcham" },
  { id: "var-4", nomi: "M o'lcham" },
  { id: "var-5", nomi: "L o'lcham" },
];

export const mockMijozlar: Tanlov[] = [
  { id: "mij-1", nomi: "Sardor Rahimov" },
  { id: "mij-2", nomi: "Dilnoza Karimova" },
  { id: "mij-3", nomi: "Jasur To'xtayev" },
];

// Kompaniya — BIZNING firmalarimiz (MoySklad'dagi "Организация"), mijozniki emas.
export const mockKompaniyalar: Tanlov[] = [
  { id: "kmp-1", nomi: "Aisa" },
  { id: "kmp-2", nomi: "Aisa Savdo MChJ" },
];

// Har bir filial qaysi kompaniyamizga tegishli.
export const filialKompaniyasi: Record<string, string> = {
  "fil-1": "kmp-1",
  "fil-2": "kmp-1",
  "fil-3": "kmp-2",
};

export const mockYetkazibBeruvchilar: Tanlov[] = [
  { id: "ytk-1", nomi: "Nestle Uzbekistan" },
  { id: "ytk-2", nomi: "Imkon Distribution" },
  { id: "ytk-3", nomi: "Baraka Oziq-ovqat" },
];

// --- Tovar harakati (har bir mahsulot uchun ketma-ket hujjatlar) ---
// hujjatTuri: kirim/inventarizatsiya → Kirim ustuni; chiqim/realizatsiya → Chiqim ustuni.

export const mockTovarHarakati: TovarHarakati[] = [
  // --- Aprel 2026: zaxira + sotuvlar (Foyda hisobotida oylik ajratma uchun) ---
  { id: "th-20", sana: "2026-04-05", hujjatTuri: "kirim", hujjatRaqam: "2", productId: "prod-1", xarakteristikaId: "xar-1", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 100, customerId: "", supplierId: "ytk-2" },
  { id: "th-21", sana: "2026-04-12", hujjatTuri: "realizatsiya", hujjatRaqam: "1", productId: "prod-1", xarakteristikaId: "xar-1", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 20, customerId: "mij-1", supplierId: "" },
  { id: "th-22", sana: "2026-04-20", hujjatTuri: "kirim", hujjatRaqam: "3", productId: "prod-2", xarakteristikaId: "xar-3", categoryId: "kat-2", warehouseId: "omb-2", filialId: "fil-2", miqdor: 60, customerId: "", supplierId: "ytk-1" },
  { id: "th-23", sana: "2026-04-22", hujjatTuri: "realizatsiya", hujjatRaqam: "2", productId: "prod-2", xarakteristikaId: "xar-3", categoryId: "kat-2", warehouseId: "omb-2", filialId: "fil-2", miqdor: 15, customerId: "mij-2", supplierId: "" },

  // --- May 2026: zaxira + sotuvlar ---
  { id: "th-24", sana: "2026-05-08", hujjatTuri: "kirim", hujjatRaqam: "5", productId: "prod-4", xarakteristikaId: "xar-5", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 50, customerId: "", supplierId: "ytk-1" },
  { id: "th-25", sana: "2026-05-14", hujjatTuri: "kirim", hujjatRaqam: "6", productId: "prod-3", xarakteristikaId: "xar-4", categoryId: "kat-3", warehouseId: "omb-3", filialId: "fil-3", miqdor: 30, customerId: "", supplierId: "ytk-3" },
  { id: "th-26", sana: "2026-05-18", hujjatTuri: "realizatsiya", hujjatRaqam: "3", productId: "prod-4", xarakteristikaId: "xar-5", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 10, customerId: "mij-1", supplierId: "" },
  { id: "th-27", sana: "2026-05-25", hujjatTuri: "realizatsiya", hujjatRaqam: "5", productId: "prod-3", xarakteristikaId: "xar-4", categoryId: "kat-3", warehouseId: "omb-3", filialId: "fil-3", miqdor: 4, customerId: "mij-3", supplierId: "" },

  // Coca-Cola (bosh qoldiq 34): 34 → −5 → +40 → −1 = 68
  { id: "th-1", sana: "2026-06-25", hujjatTuri: "realizatsiya", hujjatRaqam: "11", productId: "prod-1", xarakteristikaId: "xar-1", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 5, customerId: "mij-1", supplierId: "" },
  { id: "th-2", sana: "2026-06-26", hujjatTuri: "kirim", hujjatRaqam: "6", productId: "prod-1", xarakteristikaId: "xar-1", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 40, customerId: "", supplierId: "ytk-2" },
  { id: "th-3", sana: "2026-06-28", hujjatTuri: "realizatsiya", hujjatRaqam: "20", productId: "prod-1", xarakteristikaId: "xar-1", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 1, customerId: "mij-2", supplierId: "" },

  // Snickers (bosh qoldiq 1): 1 → +20 → −1 → −7 → −1 → −10 = 2
  { id: "th-4", sana: "2026-06-26", hujjatTuri: "kirim", hujjatRaqam: "6", productId: "prod-2", xarakteristikaId: "xar-3", categoryId: "kat-2", warehouseId: "omb-2", filialId: "fil-2", miqdor: 20, customerId: "", supplierId: "ytk-1" },
  { id: "th-5", sana: "2026-06-26", hujjatTuri: "chiqim", hujjatRaqam: "9", productId: "prod-2", xarakteristikaId: "xar-3", categoryId: "kat-2", warehouseId: "omb-2", filialId: "fil-2", miqdor: 1, customerId: "", supplierId: "" },
  { id: "th-6", sana: "2026-06-26", hujjatTuri: "realizatsiya", hujjatRaqam: "6", productId: "prod-2", xarakteristikaId: "xar-3", categoryId: "kat-2", warehouseId: "omb-2", filialId: "fil-2", miqdor: 7, customerId: "mij-3", supplierId: "" },
  { id: "th-7", sana: "2026-06-28", hujjatTuri: "realizatsiya", hujjatRaqam: "20", productId: "prod-2", xarakteristikaId: "xar-3", categoryId: "kat-2", warehouseId: "omb-2", filialId: "fil-2", miqdor: 1, customerId: "mij-2", supplierId: "" },
  { id: "th-8", sana: "2026-06-30", hujjatTuri: "realizatsiya", hujjatRaqam: "27", productId: "prod-2", xarakteristikaId: "xar-3", categoryId: "kat-2", warehouseId: "omb-2", filialId: "fil-2", miqdor: 10, customerId: "mij-1", supplierId: "" },

  // Fairy (bosh qoldiq 32): 32 → +40 → −8 = 64
  { id: "th-9", sana: "2026-06-26", hujjatTuri: "kirim", hujjatRaqam: "8", productId: "prod-3", xarakteristikaId: "xar-4", categoryId: "kat-3", warehouseId: "omb-3", filialId: "fil-3", miqdor: 40, customerId: "", supplierId: "ytk-3" },
  { id: "th-10", sana: "2026-06-29", hujjatTuri: "realizatsiya", hujjatRaqam: "25", productId: "prod-3", xarakteristikaId: "xar-4", categoryId: "kat-3", warehouseId: "omb-3", filialId: "fil-3", miqdor: 8, customerId: "mij-1", supplierId: "" },

  // Nescafe Gold (bosh qoldiq 10): 10 → +80 → +5 → −3 → −22 = 70 (barcha 4 hujjat turi)
  { id: "th-11", sana: "2026-06-26", hujjatTuri: "kirim", hujjatRaqam: "10", productId: "prod-4", xarakteristikaId: "xar-5", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 80, customerId: "", supplierId: "ytk-1" },
  { id: "th-12", sana: "2026-06-27", hujjatTuri: "inventarizatsiya", hujjatRaqam: "4", productId: "prod-4", xarakteristikaId: "xar-5", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 5, customerId: "", supplierId: "" },
  { id: "th-13", sana: "2026-06-29", hujjatTuri: "chiqim", hujjatRaqam: "15", productId: "prod-4", xarakteristikaId: "xar-5", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 3, customerId: "", supplierId: "" },
  { id: "th-14", sana: "2026-06-30", hujjatTuri: "realizatsiya", hujjatRaqam: "30", productId: "prod-4", xarakteristikaId: "xar-5", categoryId: "kat-1", warehouseId: "omb-1", filialId: "fil-1", miqdor: 22, customerId: "mij-1", supplierId: "" },
];

// --- Boshqa tablar (index.tsx) ---

export const mockKontragentlar: Kontragent[] = [
  { refId: "mij-1", turi: "mijoz" },
  { refId: "mij-2", turi: "mijoz" },
  { refId: "mij-3", turi: "mijoz" },
  { refId: "ytk-1", turi: "yetkazibBeruvchi" },
  { refId: "ytk-2", turi: "yetkazibBeruvchi" },
  { refId: "ytk-3", turi: "yetkazibBeruvchi" },
];

// O'zaro hisob-kitob hujjatlari (bir necha oyga taqsimlangan — oy oxiri qoldig'i ajralib tursin).
// Mijoz: Realizatsiya → Chiqim (rasxod), Kassa kirim → Kirim (prixod).
// Yetkazib beruvchi: Xarid → Kirim (prixod, biz qarzdor bo'lamiz), Tolov → Chiqim (rasxod).
export const mockHisobKitob: HisobKitobHujjati[] = [
  // mij-1 Sardor (oxiri manfiy — ular bizga qarzdor)
  { id: "hk-1", refId: "mij-1", sana: "2026-05-12T10:32", hujjat: "Realizatsiya № FP4", turi: "realizatsiya", prixod: 0, rasxod: 8000, productId: "prod-1", soni: 1 },
  { id: "hk-2", refId: "mij-1", sana: "2026-05-28T14:05", hujjat: "Kassa kirim № K3", turi: "kassaKirim", prixod: 3000, rasxod: 0 },
  { id: "hk-3", refId: "mij-1", sana: "2026-06-20T12:47", hujjat: "Realizatsiya № FP19", turi: "realizatsiya", prixod: 0, rasxod: 4500, productId: "prod-2", soni: 1 },
  { id: "hk-4", refId: "mij-1", sana: "2026-06-29T16:10", hujjat: "Kassa kirim № K11", turi: "kassaKirim", prixod: 2000, rasxod: 0 },

  // mij-2 Dilnoza (oxiri musbat — biz qarzdormiz)
  { id: "hk-5", refId: "mij-2", sana: "2026-04-15T09:20", hujjat: "Realizatsiya № FP2", turi: "realizatsiya", prixod: 0, rasxod: 2000, productId: "prod-2", soni: 1 },
  { id: "hk-6", refId: "mij-2", sana: "2026-04-30T17:00", hujjat: "Kassa kirim № K2", turi: "kassaKirim", prixod: 6000, rasxod: 0 },
  { id: "hk-7", refId: "mij-2", sana: "2026-06-10T11:15", hujjat: "Realizatsiya № FP15", turi: "realizatsiya", prixod: 0, rasxod: 1500, productId: "prod-2", soni: 1 },

  // mij-3 Jasur (oxiri 0)
  { id: "hk-8", refId: "mij-3", sana: "2026-05-05T13:40", hujjat: "Realizatsiya № FP3", turi: "realizatsiya", prixod: 0, rasxod: 3500, productId: "prod-3", soni: 1 },
  { id: "hk-9", refId: "mij-3", sana: "2026-05-20T15:25", hujjat: "Kassa kirim № K4", turi: "kassaKirim", prixod: 3500, rasxod: 0 },

  // ytk-1 Nestle (oxiri musbat — biz qarzdormiz)
  { id: "hk-10", refId: "ytk-1", sana: "2026-04-08T10:00", hujjat: "Xarid № P1", turi: "xarid", prixod: 40000, rasxod: 0, productId: "prod-4", soni: 2 },
  { id: "hk-11", refId: "ytk-1", sana: "2026-04-25T16:30", hujjat: "Tolov № T1", turi: "tolov", prixod: 0, rasxod: 25000 },
  { id: "hk-12", refId: "ytk-1", sana: "2026-06-05T09:45", hujjat: "Xarid № P7", turi: "xarid", prixod: 15000, rasxod: 0, productId: "prod-4", soni: 1 },
  { id: "hk-13", refId: "ytk-1", sana: "2026-06-28T14:20", hujjat: "Tolov № T5", turi: "tolov", prixod: 0, rasxod: 10000 },

  // ytk-2 Imkon (oxiri manfiy — ular bizga qarzdor, oldindan to'langan)
  { id: "hk-14", refId: "ytk-2", sana: "2026-05-10T11:00", hujjat: "Tolov № T2", turi: "tolov", prixod: 0, rasxod: 30000 },
  { id: "hk-15", refId: "ytk-2", sana: "2026-05-22T13:10", hujjat: "Xarid № P4", turi: "xarid", prixod: 12000, rasxod: 0, productId: "prod-1", soni: 2 },

  // ytk-3 Baraka (oxiri manfiy)
  { id: "hk-16", refId: "ytk-3", sana: "2026-06-12T10:30", hujjat: "Tolov № T3", turi: "tolov", prixod: 0, rasxod: 8000 },
  { id: "hk-17", refId: "ytk-3", sana: "2026-06-26T15:50", hujjat: "Xarid № P8", turi: "xarid", prixod: 5000, rasxod: 0, productId: "prod-3", soni: 1 },
];

export const mockMahsulotFoydasi: MahsulotFoydasi[] = [
  { id: "mf-1", mahsulot: "Coca-Cola 1L", categoryId: "kat-1", sotilgan: 320, tushum: 2560000, tannarx: 1920000, foyda: 640000 },
  { id: "mf-2", mahsulot: "Snickers 50g", categoryId: "kat-2", sotilgan: 540, tushum: 1620000, tannarx: 1080000, foyda: 540000 },
  { id: "mf-3", mahsulot: "Fairy 500ml", categoryId: "kat-3", sotilgan: 95, tushum: 1425000, tannarx: 1140000, foyda: 285000 },
  { id: "mf-4", mahsulot: "Nescafe Gold 100g", categoryId: "kat-1", sotilgan: 60, tushum: 2100000, tannarx: 1500000, foyda: 600000 },
];

// Kassalar — kirim-chiqim hisoboti dimensiyasi.
// Bank hisobi: Payme/Click integratsiyasidan tushgan pullar ham shu yerga tushadi.
// Karta: kartadan o'tkazma.
export const mockKassalar: Tanlov[] = [
  { id: "kas-1", nomi: "Naqd kassa" },
  { id: "kas-2", nomi: "Bank hisobi" },
  { id: "kas-3", nomi: "Karta" },
];

// Har bir kassaning davr boshidagi bazaviy qoldig'i (mock)
export const kassaBoshlangichQoldiq: Record<string, number> = {
  "kas-1": 5000000,
  "kas-2": 12000000,
  "kas-3": 3000000,
};

export const mockKirimChiqim: KirimChiqim[] = [
  { id: "kc-1", sana: "2026-07-14", branchId: "fil-1", kassaId: "kas-1", turi: "kirim", kategoriya: "Sotuv tushumi", summa: 632000 },
  { id: "kc-2", sana: "2026-07-13", branchId: "fil-1", kassaId: "kas-1", turi: "chiqim", kategoriya: "Ijara", summa: 1500000 },
  { id: "kc-3", sana: "2026-07-12", branchId: "fil-2", kassaId: "kas-2", turi: "kirim", kategoriya: "Sotuv tushumi", summa: 480000 },
  { id: "kc-4", sana: "2026-07-11", branchId: "fil-2", kassaId: "kas-1", turi: "chiqim", kategoriya: "Ish haqi", summa: 3200000 },
  { id: "kc-5", sana: "2026-07-10", branchId: "fil-3", kassaId: "kas-3", turi: "kirim", kategoriya: "Sotuv tushumi", summa: 150000 },
  { id: "kc-6", sana: "2026-07-09", branchId: "fil-3", kassaId: "kas-2", turi: "chiqim", kategoriya: "Kommunal", summa: 420000 },
];

// To'lov turlari — kirim-chiqim filtri uchun.
// Payme/Click → Bank hisobiga tushadi; Karta → kartadan o'tkazma.
export const mockTolovTurlari: Tanlov[] = [
  { id: "naqd", nomi: "Naqd" },
  { id: "karta", nomi: "Karta" },
  { id: "bank", nomi: "Bank o'tkazma" },
  { id: "payme", nomi: "Payme" },
  { id: "click", nomi: "Click" },
];

// Kassa pul hujjatlari — aylanma tafsiloti (hujjat bo'yicha qoldiq).
// nomi: Bank → to'lov topshiriqnomasi, Naqd → kassa orderi, Karta → o'tkazma.
export const mockKassaHujjatlari: KassaHujjati[] = [
  { id: "kh-1", sana: "2026-07-06", raqam: "FP1", nomi: "Kiruvchi to'lov topshiriqnomasi №FP1", branchId: "fil-1", kassaId: "kas-2", tolovTuri: "bank", turi: "kirim", summa: 480000 },
  { id: "kh-2", sana: "2026-07-06", raqam: "FP1", nomi: "Kirim kassa orderi №FP1", branchId: "fil-1", kassaId: "kas-1", tolovTuri: "naqd", turi: "kirim", summa: 632000 },
  { id: "kh-3", sana: "2026-07-07", raqam: "FP1", nomi: "Kartadan o'tkazma (kirim) №FP1", branchId: "fil-2", kassaId: "kas-3", tolovTuri: "karta", turi: "kirim", summa: 150000 },
  { id: "kh-4", sana: "2026-07-08", raqam: "FP2", nomi: "Kiruvchi to'lov topshiriqnomasi №FP2 (Payme)", branchId: "fil-1", kassaId: "kas-2", tolovTuri: "payme", turi: "kirim", summa: 320000 },
  { id: "kh-5", sana: "2026-07-09", raqam: "FP1", nomi: "Chiqim kassa orderi №FP1", branchId: "fil-1", kassaId: "kas-1", tolovTuri: "naqd", turi: "chiqim", summa: 1500000 },
  { id: "kh-6", sana: "2026-07-10", raqam: "FP1", nomi: "Chiquvchi to'lov topshiriqnomasi №FP1", branchId: "fil-1", kassaId: "kas-2", tolovTuri: "bank", turi: "chiqim", summa: 150000 },
  { id: "kh-7", sana: "2026-07-11", raqam: "FP2", nomi: "Chiqim kassa orderi №FP2", branchId: "fil-2", kassaId: "kas-1", tolovTuri: "naqd", turi: "chiqim", summa: 3200000 },
  { id: "kh-8", sana: "2026-07-12", raqam: "FP3", nomi: "Kiruvchi to'lov topshiriqnomasi №FP3 (Click)", branchId: "fil-2", kassaId: "kas-2", tolovTuri: "click", turi: "kirim", summa: 210000 },
  { id: "kh-9", sana: "2026-07-13", raqam: "FP2", nomi: "Kartadan o'tkazma (chiqim) №FP2", branchId: "fil-2", kassaId: "kas-3", tolovTuri: "karta", turi: "chiqim", summa: 40000 },
  { id: "kh-10", sana: "2026-07-14", raqam: "FP3", nomi: "Kirim kassa orderi №FP3", branchId: "fil-3", kassaId: "kas-1", tolovTuri: "naqd", turi: "kirim", summa: 150000 },
  { id: "kh-11", sana: "2026-07-15", raqam: "FP4", nomi: "Kiruvchi to'lov topshiriqnomasi №FP4", branchId: "fil-3", kassaId: "kas-2", tolovTuri: "bank", turi: "kirim", summa: 90000 },
  { id: "kh-12", sana: "2026-07-16", raqam: "FP3", nomi: "Kartadan o'tkazma (kirim) №FP3", branchId: "fil-3", kassaId: "kas-3", tolovTuri: "karta", turi: "kirim", summa: 75000 },
];

// Foyda va xarajat (P&L) yozuvlari — Muddat/Filial bo'yicha filtrlanadi.
export const mockFoydaXarajat: FoydaXarajatYozuvi[] = [
  // Daromad (sotuvdan tushum va xizmat)
  { id: "fx-1", sana: "2026-07-04", filialId: "fil-1", tur: "daromad", kategoriya: "Sotuvdan tushum", summa: 18500000 },
  { id: "fx-2", sana: "2026-07-11", filialId: "fil-1", tur: "daromad", kategoriya: "Sotuvdan tushum", summa: 14200000 },
  { id: "fx-3", sana: "2026-07-08", filialId: "fil-2", tur: "daromad", kategoriya: "Sotuvdan tushum", summa: 9600000 },
  { id: "fx-4", sana: "2026-07-15", filialId: "fil-3", tur: "daromad", kategoriya: "Sotuvdan tushum", summa: 7300000 },
  // Sotilgan tovar tannarxi (COGS)
  { id: "fx-6", sana: "2026-07-04", filialId: "fil-1", tur: "tannarx", kategoriya: "Sotilgan tovar tannarxi", summa: 12800000 },
  { id: "fx-7", sana: "2026-07-11", filialId: "fil-1", tur: "tannarx", kategoriya: "Sotilgan tovar tannarxi", summa: 9700000 },
  { id: "fx-8", sana: "2026-07-08", filialId: "fil-2", tur: "tannarx", kategoriya: "Sotilgan tovar tannarxi", summa: 6500000 },
  { id: "fx-9", sana: "2026-07-15", filialId: "fil-3", tur: "tannarx", kategoriya: "Sotilgan tovar tannarxi", summa: 5000000 },
  // Operatsion xarajatlar
  { id: "fx-10", sana: "2026-07-05", filialId: "fil-1", tur: "xarajat", kategoriya: "Ijara", summa: 3500000 },
  { id: "fx-11", sana: "2026-07-10", filialId: "fil-1", tur: "xarajat", kategoriya: "Ish haqi", summa: 6200000 },
  { id: "fx-12", sana: "2026-07-09", filialId: "fil-1", tur: "xarajat", kategoriya: "Kommunal", summa: 850000 },
  { id: "fx-13", sana: "2026-07-12", filialId: "fil-2", tur: "xarajat", kategoriya: "Reklama", summa: 1200000 },
  { id: "fx-14", sana: "2026-07-14", filialId: "fil-2", tur: "xarajat", kategoriya: "Transport", summa: 640000 },
  { id: "fx-15", sana: "2026-07-16", filialId: "fil-3", tur: "xarajat", kategoriya: "Boshqa xarajatlar", summa: 430000 },
];

export const mockAudit: AuditYozuvi[] = [
  { id: "au-1", sana: "2026-07-14T17:39:00", foydalanuvchi: "Abdulaziz", action: "CREATE", resurs: "Sale", tafsilot: "57463423 raqamli sotuv yaratildi" },
  { id: "au-2", sana: "2026-07-14T17:40:00", foydalanuvchi: "Abdulaziz", action: "CREATE", resurs: "Payment", tafsilot: "2 000 so'm to'lov qabul qilindi" },
  { id: "au-3", sana: "2026-07-13T11:20:00", foydalanuvchi: "Nodira", action: "UPDATE", resurs: "Product", tafsilot: "Coca-Cola 1L narxi 8 000 → 8 500" },
  { id: "au-4", sana: "2026-07-12T09:05:00", foydalanuvchi: "Abdulaziz", action: "DELETE", resurs: "Sale", tafsilot: "57459771 sotuv bekor qilindi" },
  { id: "au-5", sana: "2026-07-11T15:44:00", foydalanuvchi: "Nodira", action: "CREATE", resurs: "Customer", tafsilot: "Yangi mijoz: Dilnoza Karimova" },
  { id: "au-6", sana: "2026-07-10T10:12:00", foydalanuvchi: "Abdulaziz", action: "UPDATE", resurs: "Warehouse", tafsilot: "Markaziy ombor qoldig'i qayta hisoblandi" },
];
