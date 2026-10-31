// Kassa UI modeli backenddagi finance transactionlardan shakllantiriladi.
import type { QarzTaqsimotQatori } from "@/types/qarzTaqsimoti";

export type KassaKanali = "naqd" | "bank" | "ilova"; // to'lov turi / hisob
export type KassaYonalishi = "tushum" | "chiqim";

// Amaliyot manbasi. yonalish shundan kelib chiqadi.
export type KassaAmaliyotTuri =
  // --- Tushum (kirim) ---
  | "xaridor_tolovi" // Mijozdan to'lov (xaridorId — qarzi kamayadi)
  | "hisobdor_qaytardi" // Hisobdor shaxs mablag'ini qaytarish (xodim)
  | "taminotchi_qaytardi" // Yetkazib beruvchi mablag'ini qaytarishi
  | "boshqa_kirim" // Boshqa pul mablag'lari tushumi
  | "donalik_savdo" // POS/donalik savdo (mijozsiz) — savdodan avtomat keladi (qo'lda yaratilmaydi)
  | "xaridor_sotuv_tolovi" // Mijozli sotuvning to'lovi — savdodan avtomat keladi (qo'lda yaratilmaydi)
  // --- Chiqim ---
  | "taminot_tolovi" // Yetkazib beruvchiga to'lov (yetkazib)
  | "xaridorga_qaytarish" // Xaridorga pul mablag'larini qaytarish (xaridor)
  | "ish_haqi" // Ish haqini to'lash (xodim)
  | "boshqa_chiqim" // Boshqa pul xarajatlari (izoh majburiy)
  | "xarajat"; // eski/tarixiy xarajat yozuvlari

export type KassaHolati = "qoralama" | "tasdiqlangan" | "bekor_qilingan";

export type KassaAmaliyoti = {
  id: string;
  kanal: KassaKanali;
  yonalish: KassaYonalishi;
  turi: KassaAmaliyotTuri;
  holat?: KassaHolati; // qoralama = saqlangan, tasdiqlangan = tasdiqlangan (bo'sh = tasdiqlangan)
  xaridorId?: string; // xaridor_tolovi uchun — shu xaridor qarzidan ayiriladi
  supplierId?: string;
  employeeId?: string;
  responsibleId?: string;
  saleId?: string;
  purchaseId?: string;
  raqam: string; // jadvalda va ko'rinishda: har bir bo'limda K1, K2, ... (hujjatning o'z raqami `hujjatRaqami`da)
  hujjatRaqami?: string; // backend hujjat raqami: sotuv uchun SOT-000014, kassa amaliyoti uchun uning docNumber'i
  nomi: string; // amaliyot nomi / asosi
  nomSarlavhasi?: string; // jadvalda "Nomi": masalan "Sotuv SOT-000014" (yo'q bo'lsa — nomi)
  nomTafsiloti?: string; // ...va sotuvdagi mahsulotlar: "Konfet, Pishloq va yana 2 ta"
  kontragent: string; // kimdan olindi yoki kimga berildi
  summa: number;
  sana: string; // ISO yoki kun (YYYY-MM-DD)
  kiritilgan?: string; // yozuv kiritilgan vaqt (createdAt, ISO) — sana boshqa kunda bo'lsa "kiritilgan" belgisi uchun
  masul: string; // mas'ul shaxs
  izoh: string;
  backendSource?: "SALE" | "RETURN" | "CASH_IN" | "EXPENSE" | "CASH_OPERATION";
  backendRefId?: string;
  backendBranchId?: string;
  // Valyuta: pul qaysi valyutada olingan/berilgan (yo'q — so'm), mijoz/yetkazib beruvchi hisobi valyutasi,
  // shu summaning hisob valyutasidagi qiymati va kurs (backend tasdiqlaganda hisoblaydi yoki kassir yozadi).
  valyuta?: "UZS" | "USD";
  hisobValyutasi?: "UZS" | "USD";
  hisoblanganSumma?: number;
  kurs?: number;
  // Mijoz to'lovi tasdiqlanganda yopilgan qarzlar (backend `allocations`) va hisobga tushgan qism; ro'yxatda kelmasa ko'rinish oynasi o'zi oladi.
  taqsimot?: QarzTaqsimotQatori[];
  hisobgaTushgan?: number;
  readonly?: boolean;
};
