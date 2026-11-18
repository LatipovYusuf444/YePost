// Yetkazib beruvchiga qaytarish (GET/POST /inventory/supplier-returns): kirimda kelgan nuqsonli yoki ortiqcha tovar yetkazib beruvchiga
// qaytariladi. Tasdiqlanganda tovar ombordan chiqadi va yetkazib beruvchiga qarzimiz `total` ga kamayadi; kassaga pul tegmaydi
// (bu SUPPLIER_RETURN kassa operatsiyasi — yetkazib beruvchi bizga qaytargan pul — emas).
export type Son = number | string | null;

export type TaminotchiQaytarishQatori = {
  id?: string;
  position?: number;
  modificationId: string;
  productName?: string | null;
  modificationName?: string | null;
  warehouseId: string;
  warehouseName?: string | null;
  purchaseId?: string | null;
  batchId?: string | null;
  quantity: Son;
  price: Son;
  wentNegative?: boolean;
};

export type TaminotchiQaytarishHujjati = {
  id: string;
  // Qoralamada "", tasdiqlanganda VOZ-000001 (bekor qilib qayta tasdiqlansa ham o'zgarmaydi).
  docNumber?: string;
  status: string;
  date?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  currency?: "UZS" | "USD" | string | null;
  rate?: Son;
  supplierId: string;
  supplier?: { id?: string; name?: string | null } | null;
  responsibleId?: string | null;
  note?: string | null;
  // Σ quantity × price — qarz shuncha kamayadi.
  total?: Son;
  // Faqat tasdiqlangan hujjatda: tovar ombordan qanchaga (tannarx, FIFO) chiqdi va total − costTotal.
  costTotal?: Son;
  costDifference?: Son;
  items?: TaminotchiQaytarishQatori[];
  warnings?: unknown[];
};

export type TaminotchiQaytarishTanasi = {
  date?: string;
  supplierId: string;
  currency?: "UZS" | "USD";
  responsibleId?: string;
  note?: string;
  items: Array<{ modificationId: string; warehouseId: string; quantity: number; purchaseId?: string; batchId?: string; price?: number }>;
};
