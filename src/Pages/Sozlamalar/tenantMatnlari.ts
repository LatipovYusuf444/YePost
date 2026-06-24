import type {
  ObunaDavri,
  ObunaHolati,
  TarifTuri,
} from "@/types/tenant";

export const tarifTuriMatni: Record<TarifTuri, string> = {
  FREE: "Bepul",
  BASIC: "Asosiy",
  PRO: "Professional",
  ENTERPRISE: "Korporativ",
};

export const obunaDavriMatni: Record<ObunaDavri, string> = {
  MONTHLY: "Oylik",
  QUARTERLY: "Choraklik",
  ANNUAL: "Yillik",
};

export const obunaHolatiMatni: Record<ObunaHolati, string> = {
  TRIAL: "Sinov muddati",
  ACTIVE: "Faol",
  EXPIRED: "Muddati tugagan",
  CANCELLED: "Bekor qilingan",
};
