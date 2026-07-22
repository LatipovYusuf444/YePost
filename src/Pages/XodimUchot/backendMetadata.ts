import type { Lavozim, Vakolat } from "./types";

export const backendVakolatlar: Vakolat[] = [
  { kod: "DELETE", nom: "O'chirish", izoh: "Ruxsat berilgan obyektlarni o'chirish", guruh: "Umumiy" },
  { kod: "REPORTS", nom: "Hisobotlar", izoh: "Hisobotlarni ko'rish", guruh: "Hisobotlar" },
  { kod: "EXPENSE", nom: "Xarajat", izoh: "Xarajatlarni boshqarish", guruh: "Kassa" },
  { kod: "CASH_IN", nom: "Kassa kirimi", izoh: "Kassa kirimlarini boshqarish", guruh: "Kassa" },
  { kod: "RETURN_CANCEL", nom: "Qaytarishni bekor qilish", izoh: "Qaytarish hujjatini bekor qilish", guruh: "Savdo" },
];

export const backendLavozimlar: Lavozim[] = [
  { id: "DIRECTOR", nomi: "Direktor", izoh: "Tizim direktori", vakolatlar: backendVakolatlar.map((item) => item.kod), yaratganMasul: "Tizim", yaratilganSana: "", ozgartirilganSana: "" },
  { id: "ADMIN", nomi: "Administrator", izoh: "Tizim administratori", vakolatlar: backendVakolatlar.map((item) => item.kod), yaratganMasul: "Tizim", yaratilganSana: "", ozgartirilganSana: "" },
  { id: "STOREKEEPER", nomi: "Omborchi", izoh: "Ombor xodimi", vakolatlar: [], yaratganMasul: "Tizim", yaratilganSana: "", ozgartirilganSana: "" },
  { id: "CASHIER", nomi: "Kassir", izoh: "Kassa xodimi", vakolatlar: [], yaratganMasul: "Tizim", yaratilganSana: "", ozgartirilganSana: "" },
];
