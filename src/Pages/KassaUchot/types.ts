// Kassa UI modeli backenddagi finance transactionlardan shakllantiriladi.

export type KassaKanali = "naqd" | "bank" | "ilova"; // to'lov turi / hisob
export type KassaYonalishi = "tushum" | "chiqim";

// Amaliyot manbasi. yonalish shundan kelib chiqadi.
export type KassaAmaliyotTuri =
  // --- Tushum (kirim) ---
  | "xaridor_tolovi" // Mijozdan to'lov (xaridorId — qarzi kamayadi)
  | "hisobdor_qaytardi" // Hisobdor shaxs mablag'ini qaytarish (xodim)
  | "taminotchi_qaytardi" // Yetkazib beruvchi mablag'ini qaytarishi
  | "boshqa_kirim" // Boshqa pul mablag'lari tushumi
  | "donalik_savdo" // POS/donalik savdo — savdodan avtomat keladi (qo'lda yaratilmaydi)
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
  raqam: string;
  nomi: string; // amaliyot nomi / asosi
  kontragent: string; // kimdan olindi yoki kimga berildi
  summa: number;
  sana: string; // ISO
  masul: string; // mas'ul shaxs
  izoh: string;
  backendSource?: "SALE" | "RETURN" | "CASH_IN" | "EXPENSE" | "CASH_OPERATION";
  backendRefId?: string;
  backendBranchId?: string;
  readonly?: boolean;
};
