import type {
  BildirishnomaSozlama,
  ChekSozlama,
  Filial,
  Kompaniya,
  OlchovBirligi,
  Profil,
} from "./types";

// Bojxona o'lchov birliklari klassifikatori (tarif.customs.uz / ОКЕИ), kodlari bilan.
export const mockOlchovBirliklari: OlchovBirligi[] = [
  { id: "ob-006", kod: "006", nomi: "Metr", qisqa: "m" },
  { id: "ob-055", kod: "055", nomi: "Kvadrat metr", qisqa: "m²" },
  { id: "ob-112", kod: "112", nomi: "Litr", qisqa: "l" },
  { id: "ob-113", kod: "113", nomi: "Kub metr", qisqa: "m³" },
  { id: "ob-114", kod: "114", nomi: "1000 kub metr", qisqa: "1000 m³" },
  { id: "ob-130", kod: "130", nomi: "1000 litr", qisqa: "1000 l" },
  { id: "ob-162", kod: "162", nomi: "Metrik karat", qisqa: "kar" },
  { id: "ob-163", kod: "163", nomi: "Gramm", qisqa: "g" },
  { id: "ob-166", kod: "166", nomi: "Kilogramm", qisqa: "kg" },
  { id: "ob-185", kod: "185", nomi: "Yuk ko'tarish (tonna)", qisqa: "t yuk" },
  { id: "ob-246", kod: "246", nomi: "1000 kilovatt-soat", qisqa: "1000 kVt·s" },
  { id: "ob-305", kod: "305", nomi: "Kyuri", qisqa: "Ki" },
  { id: "ob-306", kod: "306", nomi: "Bo'linuvchi izotoplar grammi", qisqa: "g d/i" },
  { id: "ob-715", kod: "715", nomi: "Juft", qisqa: "juft" },
  { id: "ob-796", kod: "796", nomi: "Dona", qisqa: "dona" },
  { id: "ob-797", kod: "797", nomi: "Yuz dona", qisqa: "100 dona" },
  { id: "ob-798", kod: "798", nomi: "Ming dona", qisqa: "1000 dona" },
  { id: "ob-831", kod: "831", nomi: "Sof (100%) spirt litri", qisqa: "l 100% spirt" },
  { id: "ob-841", kod: "841", nomi: "Vodorod peroksidi kilogrammi", qisqa: "kg H₂O₂" },
  { id: "ob-845", kod: "845", nomi: "90% quruq modda kilogrammi", qisqa: "kg 90% q/m" },
  { id: "ob-852", kod: "852", nomi: "Kaliy oksidi kilogrammi", qisqa: "kg K₂O" },
  { id: "ob-859", kod: "859", nomi: "Kaliy gidroksidi kilogrammi", qisqa: "kg KOH" },
  { id: "ob-861", kod: "861", nomi: "Azot kilogrammi", qisqa: "kg N" },
  { id: "ob-863", kod: "863", nomi: "Natriy gidroksidi kilogrammi", qisqa: "kg NaOH" },
  { id: "ob-865", kod: "865", nomi: "Fosfor pentaoksidi kilogrammi", qisqa: "kg P₂O₅" },
  { id: "ob-867", kod: "867", nomi: "Uran kilogrammi", qisqa: "kg U" },
];

export const mockProfil: Profil = {
  ism: "Sardor",
  familiya: "Rahimov",
  telefon: "+998 90 123 45 67",
  email: "sardor@yepost.uz",
  lavozim: "Direktor",
};

export const mockKompaniya: Kompaniya = {
  nomi: "YePost Savdo MChJ",
  stir: "301234567",
  telefon: "+998 71 200 10 10",
  manzil: "Toshkent sh., Chilonzor tumani, 12-kvartal",
  valyuta: "so'm",
};

export const mockFiliallar: Filial[] = [
  {
    id: "fl-1",
    nomi: "Markaziy ombor",
    manzil: "Toshkent sh., Chilonzor tumani",
    telefon: "+998 71 200 10 11",
    asosiy: true,
  },
  {
    id: "fl-2",
    nomi: "Chilonzor filiali",
    manzil: "Toshkent sh., Chilonzor, 19-kvartal",
    telefon: "+998 71 200 10 12",
    asosiy: false,
  },
  {
    id: "fl-3",
    nomi: "Samarqand filiali",
    manzil: "Samarqand sh., Registon ko'chasi 5",
    telefon: "+998 66 233 44 55",
    asosiy: false,
  },
];

export const mockChek: ChekSozlama = {
  sarlavha: "YePost Savdo",
  pastMatn: "Xaridingiz uchun rahmat! Yana kutamiz.",
  telefonKorsat: true,
  manzilKorsat: true,
  logoKorsat: false,
};

export const mockBildirishnoma: BildirishnomaSozlama = {
  yangiSavdo: true,
  kamQoldiq: true,
  kunlikHisobot: false,
  yangiXaridor: true,
};
