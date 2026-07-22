// Sozlamalar UI modellari backend preference va organization endpointlariga mos.

export type SozlamaBolim =
  | "profil"
  | "kompaniya"
  | "filiallar"
  | "malumotnoma"
  | "vakolatlar"
  | "integratsiya"
  | "chek"
  | "bildirishnoma";

// --- Ma'lumotnoma (reference) ---
// Bojxona o'lchov birliklari klassifikatori (tarif.customs.uz).
export type OlchovBirligi = {
  id: string;
  kod: string; // bojxona kodi — "796", "166" ...
  nomi: string; // nomi — "Dona", "Kilogramm"
  qisqa: string; // qisqartma / belgi — "dona", "kg"
};

export type Profil = {
  ism: string;
  familiya: string;
  telefon: string;
  email: string;
  lavozim: string;
};

export type Kompaniya = {
  nomi: string;
  stir: string;
  telefon: string;
  manzil: string;
  valyuta: string; // "so'm" | "USD" ...
};

export type Filial = {
  id: string;
  nomi: string;
  manzil: string;
  telefon: string;
  asosiy: boolean; // asosiy filial
};

export type ChekSozlama = {
  sarlavha: string; // chek tepasidagi matn (kompaniya nomi)
  pastMatn: string; // chek pastidagi matn (rahmat va h.k.)
  telefonKorsat: boolean;
  manzilKorsat: boolean;
  logoKorsat: boolean;
};

export type BildirishnomaSozlama = {
  yangiSavdo: boolean;
  kamQoldiq: boolean;
  kunlikHisobot: boolean;
  yangiXaridor: boolean;
};
