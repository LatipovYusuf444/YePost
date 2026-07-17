export type Mahsulot = {
  id: string;
  nomi: string;
  birlik: string;
  narx: number;
  shtrixKod: string;
  tanNarx: number;
  sotuvNarx: number;
  ulgurjiNarx: number;
  kategoriya?: string;
  variatsiya?: string;
  xarakteristika?: string;
};

export type NarxTuri = "tanNarx" | "sotuvNarx" | "ulgurjiNarx";

export type OmborItem = {
  id: string;
  nomi: string;
  manzil: string;
  faol: boolean;
  filial?: string;
  gps?: string;
  ishlashVaqti?: string;
  yaratganShaxs?: string;
  yaratilganSana?: string;
  masulShaxs?: string;
  masulShaxsTel?: string;
};

export type HujjatSatri = {
  id: string;
  mahsulotId: string;
  miqdor: number;
  narx: number;
};

export type HujjatHolati = "qoralama" | "tasdiqlangan";

export type HujjatTuri = "kirim" | "chiqim" | "kochirma" | "inventarizatsiya";

export type Hujjat = {
  id: string;
  raqami: string;
  sana: string;
  valyuta: string;
  kontragentNomi: string;
  omborId: string;
  omborIdTo?: string;
  izoh?: string;
  holati: HujjatHolati;
  satrlar: HujjatSatri[];
  tarix?: TarixYozuvi[];
};

export type KirimSatri = {
  id: string;
  mahsulotId: string;
  shtrixKod: string;
  omborId: string;
  soni: number;
  tanNarx: number;
  sotuvNarx: number;
  ulgurjiNarx: number;
};

export type TarixYozuvi = {
  id: string;
  matn: string;
  vaqt: string;
};

export type KirimHujjat = {
  id: string;
  nomi: string;
  yetkazibBeruvchi: string;
  sana: string;
  masulShaxs: string;
  holati: HujjatHolati;
  satrlar: KirimSatri[];
  omborId?: string;
  yaratilganSana?: string;
  ozgartirilganSana?: string;
  ozgartirganShaxs?: string;
  tarix?: TarixYozuvi[];
};

export type RealizatsiyaSatri = {
  id: string;
  mahsulotId: string;
  shtrixKod: string;
  omborId: string;
  soni: number;
  tanNarx: number;
  sotuvNarx: number;
  ulgurjiNarx: number;
};

export type RealizatsiyaHujjat = {
  id: string;
  nomi: string;
  mijoz: string;
  kompaniya: string;
  sana: string;
  masulShaxs: string;
  holati: HujjatHolati;
  satrlar: RealizatsiyaSatri[];
  omborId?: string;
  savdoId?: string;
  yaratilganSana?: string;
  ozgartirilganSana?: string;
  ozgartirganShaxs?: string;
  tarix?: TarixYozuvi[];
};

export type ChiqimSatri = {
  id: string;
  mahsulotId: string;
  shtrixKod: string;
  omborId: string;
  soni: number;
  tanNarx: number;
};

export type ChiqimHujjat = {
  id: string;
  nomi: string;
  sabab: string;
  sana: string;
  masulShaxs: string;
  holati: HujjatHolati;
  satrlar: ChiqimSatri[];
  omborId?: string;
  yaratilganSana?: string;
  ozgartirilganSana?: string;
  ozgartirganShaxs?: string;
  tarix?: TarixYozuvi[];
};

export type InventarizatsiyaSatri = {
  id: string;
  mahsulotId: string;
  shtrixKod: string;
  omborId: string;
  soni: number;
  tanNarx: number;
};

export type InventarizatsiyaHujjat = {
  id: string;
  nomi: string;
  sana: string;
  masulShaxs: string;
  holati: HujjatHolati;
  satrlar: InventarizatsiyaSatri[];
  omborId?: string;
  yaratilganSana?: string;
  ozgartirilganSana?: string;
  ozgartirganShaxs?: string;
  tarix?: TarixYozuvi[];
};

export type KochirmaSatri = {
  id: string;
  mahsulotId: string;
  shtrixKod: string;
  soni: number;
  tanNarx: number;
};

export type KochirmaHujjat = {
  id: string;
  nomi: string;
  sana: string;
  masulShaxs: string;
  holati: HujjatHolati;
  satrlar: KochirmaSatri[];
  omborIdFrom?: string;
  omborIdTo?: string;
  yaratilganSana?: string;
  ozgartirilganSana?: string;
  ozgartirganShaxs?: string;
  tarix?: TarixYozuvi[];
};
