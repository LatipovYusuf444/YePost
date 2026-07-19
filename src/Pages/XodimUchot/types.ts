// Xodim uchoti: mock modul tiplari. Backendga bog'liq emas.
// Yangi maydon qo'shilganda: shu tipga qo'shiladi → mockData.ts ga qiymat → modalkaga input.

export type XodimHolati = "faol" | "tatilda" | "ishdan-ketgan";

export type Xodim = {
  id: string;
  ism: string;
  familiya: string;
  telefonlar: string[]; // kamida bitta, formada yana qo'shish mumkin
  login: string;
  lavozimId: string; // "" — lavozim biriktirilmagan
  bolimId: string; // "" — bo'lim biriktirilmagan
  filial: string;
  manzil: string;
  ishBoshlaganSana: string;
  oylik: number;
  holat: XodimHolati;
  izoh: string;
  vakolatlar: string[]; // lavozim vakolatlaridan tashqari shaxsiy vakolatlar (VakolatKodi)
  yaratganMasul: string;
  yaratilganSana: string;
  ozgartirilganSana: string;
  ozgartirganMasul: string;
};

// Tashkilot tuzilmasi: bo'limlar daraxti (Bitrix "Структура компании" uslubida).
export type Bolim = {
  id: string;
  nomi: string;
  otaId: string; // "" — tuzilma cho'qqisi (kompaniyaning o'zi)
  rahbarIdlar: string[]; // shu bo'lim rahbarlari (xodim id)
};

export type Lavozim = {
  id: string;
  nomi: string;
  izoh: string;
  vakolatlar: string[]; // shu lavozimga biriktirilgan vakolat kodlari
  yaratganMasul: string;
  yaratilganSana: string;
  ozgartirilganSana: string;
};

export type Vakolat = {
  kod: string;
  nom: string;
  izoh: string;
  guruh: string; // menyudagi bo'lim nomi (Savdo, Ombor, Kassa...)
};

export type DavomatHolati = "keldi" | "kechikdi" | "kelmadi" | "tatil";

export type Davomat = {
  id: string;
  xodimId: string;
  sana: string; // YYYY-MM-DD
  kelgan: string; // "09:02" — kelmadi/tatil bo'lsa ""
  ketgan: string;
  holat: DavomatHolati;
  izoh: string;
};

export type TarixTuri = "ozgarish" | "izoh" | "davomat" | "vakolat";

export type XodimTarixi = {
  id: string;
  xodimId: string;
  turi: TarixTuri;
  sarlavha: string;
  matn: string;
  sana: string;
  muallif: string;
};
