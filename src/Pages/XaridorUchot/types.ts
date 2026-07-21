// Xaridor uchoti UI view-model tiplari. Backend DTO'lari backendAdapters.ts orqali moslanadi.

export type IjtimoiyTarmoqlar = {
  telegram: string;
  whatsapp: string;
  instagram: string;
  website?: string;
};

export type Xaridor = {
  id: string;
  partnerId?: string;
  ism: string;
  familiya: string;
  telefonlar: string[]; // kamida bitta, formada yana qo'shish mumkin
  ijtimoiy: IjtimoiyTarmoqlar;
  manzil: string;
  kompaniyaId: string; // "" — kompaniya biriktirilmagan
  lavozim: string;
  balans: number;
  yaratganMasul: string; // yaratgan mas'ul shaxs
  yaratilganSana: string;
  ozgartirilganSana: string; // oxirgi o'zgartirilgan sana
  customFields?: Record<string, unknown>;
};

export type XaridorKompaniyasi = {
  id: string;
  partnerId?: string;
  nomi: string;
  stir: string;
  telefon: string;
  aloqaShaxsi: string; // xaridor ulangan shaxs
  aloqaTelefoni: string; // shu shaxsning telefoni
  lavozim: string;
  ijtimoiy: IjtimoiyTarmoqlar;
  yaratganMasul: string;
  yaratilganSana: string;
  ozgartirilganSana: string;
  ozgartirganMasul: string; // o'zgartirgan mas'ul shaxs
  customFields?: Record<string, unknown>;
};

export type YetkazibBeruvchi = {
  id: string;
  partnerId?: string;
  nomi: string;
  stir: string;
  telefon: string;
  aloqaShaxsi: string;
  aloqaTelefoni: string;
  lavozim: string;
  ijtimoiy: IjtimoiyTarmoqlar;
  yaratganMasul: string;
  yaratilganSana: string;
  ozgartirilganSana: string;
  ozgartirganMasul: string;
  customFields?: Record<string, unknown>;
};

export type Xodim = {
  id: string;
  ism: string;
  lavozim: string;
  telefon: string;
};

// --- Tafsilotlar modalkasi (Ma'lumotlar / Savdolar / To'lovlar / Tarix) ---

export type SavdoHolati = "qoralama" | "tolangan" | "qarzdor" | "bekor";

export type XaridorSavdosi = {
  id: string;
  xaridorId: string;
  nomi: string; // savdo nomi
  raqam: string;
  sana: string;
  summa: number;
  tolangan: number;
  holat: SavdoHolati;
  ombor: string;
  masul: string; // mas'ul shaxs
};

export type TolovTuri = "naqd" | "karta" | "bank";

export type XaridorTolovi = {
  id: string;
  xaridorId: string;
  savdoRaqami: string;
  sana: string;
  summa: number;
  turi: TolovTuri;
  izoh: string;
};

export type KirimHolati = "qabul" | "kutilmoqda" | "bekor";

export type Kirim = {
  id: string;
  yetkazibBeruvchiId: string;
  nomi: string;
  raqam: string;
  sana: string;
  summa: number;
  masul: string;
  ombor: string;
  holat: KirimHolati;
};

export type TarixTuri = "savdo" | "tolov" | "izoh" | "ozgarish";

export type TarixYozuvi = {
  id: string;
  xaridorId: string;
  turi: TarixTuri;
  sarlavha: string;
  matn: string;
  sana: string;
  muallif: string;
};
