// Savdo agenti: sozlamalar formasi (GET/PATCH /settings/sales-agent) va tasdiq kutayotgan agent buyurtmalari (GET /sales-agent/drafts)
// uchun toza yordamchilar — sahifa ham, testlar ham shularni ishlatadi.

export type AgentNarxTuri = "RETAIL" | "WHOLESALE";
export const AGENT_NARX_TURLARI: AgentNarxTuri[] = ["RETAIL", "WHOLESALE"];

/** Backend javobi (summalar satr: "1500000.00"). */
export type SavdoAgentiSozlamalari = {
  isEnabled: boolean;
  priceType: string;
  warehouseId: string | null;
  draftOwnerId: string | null;
  debtLimitUzs: string | null;
  debtLimitUsd: string | null;
  managerQuietMinutes: number;
  workStart: string | null;
  workEnd: string | null;
  extraInstructions: string;
  customerMessagesPerHour: number;
  agentRunsPerDay: number;
};

/** Backend standartlari (sozlama hali saqlanmagan do'kon uchun ham shu keladi). */
export const STANDART_AGENT_SOZLAMALARI: SavdoAgentiSozlamalari = {
  isEnabled: false,
  priceType: "RETAIL",
  warehouseId: null,
  draftOwnerId: null,
  debtLimitUzs: null,
  debtLimitUsd: null,
  managerQuietMinutes: 30,
  workStart: null,
  workEnd: null,
  extraInstructions: "",
  customerMessagesPerHour: 20,
  agentRunsPerDay: 500,
};

/** Son chegaralari backend DTO bilan bir xil. */
export const AGENT_SON_CHEGARALARI = {
  managerQuietMinutes: { min: 0, max: 1440 },
  customerMessagesPerHour: { min: 1, max: 1000 },
  agentRunsPerDay: { min: 1, max: 2000 },
} as const;
export const AGENT_KORSATMA_UZUNLIGI = 2000;

type Obyekt = Record<string, unknown>;
const obyekt = (qiymat: unknown): Obyekt => (qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : {});
const matnYokiNull = (qiymat: unknown) => (typeof qiymat === "string" && qiymat.trim() ? qiymat.trim() : null);
const summaYokiNull = (qiymat: unknown) => {
  if (qiymat === null || qiymat === undefined || qiymat === "") return null;
  const son = Number(qiymat);
  return Number.isFinite(son) && son >= 0 ? String(qiymat) : null;
};
const butun = (qiymat: unknown, standart: number) => {
  const son = Number(qiymat);
  return Number.isInteger(son) ? son : standart;
};
const soatMi = (qiymat: string | null) => qiymat !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(qiymat);

/** Javob kutilgan shaklda bo'lmasa ham forma yiqilmasin: yetishmagan maydon standart qiymat oladi. */
export function agentSozlamalariniTozalash(xom: unknown): SavdoAgentiSozlamalari {
  const s = obyekt(xom);
  const st = STANDART_AGENT_SOZLAMALARI;
  const boshi = matnYokiNull(s.workStart);
  const oxiri = matnYokiNull(s.workEnd);
  return {
    isEnabled: s.isEnabled === true,
    priceType: typeof s.priceType === "string" && s.priceType ? s.priceType : st.priceType,
    warehouseId: matnYokiNull(s.warehouseId),
    draftOwnerId: matnYokiNull(s.draftOwnerId),
    debtLimitUzs: summaYokiNull(s.debtLimitUzs),
    debtLimitUsd: summaYokiNull(s.debtLimitUsd),
    managerQuietMinutes: butun(s.managerQuietMinutes, st.managerQuietMinutes),
    workStart: soatMi(boshi) ? boshi : null,
    workEnd: soatMi(oxiri) ? oxiri : null,
    extraInstructions: typeof s.extraInstructions === "string" ? s.extraInstructions : "",
    customerMessagesPerHour: butun(s.customerMessagesPerHour, st.customerMessagesPerHour),
    agentRunsPerDay: butun(s.agentRunsPerDay, st.agentRunsPerDay),
  };
}

/** Forma holati: hamma maydon matn (bo'sh — tanlanmagan / chegarasiz / kun bo'yi). */
export type AgentSozlamaFormasi = {
  isEnabled: boolean;
  priceType: string;
  warehouseId: string;
  draftOwnerId: string;
  debtLimitUzs: string;
  debtLimitUsd: string;
  managerQuietMinutes: string;
  workStart: string;
  workEnd: string;
  extraInstructions: string;
  customerMessagesPerHour: string;
  agentRunsPerDay: string;
};

/** "1500000.00" → "1500000" (SummaMaydoni guruhlab ko'rsatadi; ortiqcha nol o'zgarish deb hisoblanmasin). */
function summaMatni(qiymat: string | null): string {
  if (qiymat === null) return "";
  const son = Number(qiymat);
  return Number.isFinite(son) ? String(son) : "";
}

export function formagaAylantirish(s: SavdoAgentiSozlamalari): AgentSozlamaFormasi {
  return {
    isEnabled: s.isEnabled,
    priceType: s.priceType,
    warehouseId: s.warehouseId ?? "",
    draftOwnerId: s.draftOwnerId ?? "",
    debtLimitUzs: summaMatni(s.debtLimitUzs),
    debtLimitUsd: summaMatni(s.debtLimitUsd),
    managerQuietMinutes: String(s.managerQuietMinutes),
    workStart: s.workStart ?? "",
    workEnd: s.workEnd ?? "",
    extraInstructions: s.extraInstructions,
    customerMessagesPerHour: String(s.customerMessagesPerHour),
    agentRunsPerDay: String(s.agentRunsPerDay),
  };
}

/** Maydon xatosi: `kod` — tarjima kaliti (`sozlama.errors.<kod>`), `params` — matndagi sonlar. */
export type AgentSozlamaXatosi = { kod: string; params?: Record<string, number> };

/**
 * Saqlashdan oldingi tekshiruv (backend ham xuddi shunday tekshiradi): yoqish uchun ombor va qoralama egasi, narx turi (tannarx emas,
 * sotuv sozlamalarida yoqilgan), ish vaqti boshi va oxiri birga, son chegaralari. `ruxsatliTurlar` — /settings/sales priceTypes (null — noma'lum).
 */
export function agentSozlamaXatolari(
  f: AgentSozlamaFormasi,
  ruxsatliTurlar: readonly string[] | null = null
): Record<string, AgentSozlamaXatosi> {
  const xatolar: Record<string, AgentSozlamaXatosi> = {};
  if (!AGENT_NARX_TURLARI.includes(f.priceType as AgentNarxTuri) || (ruxsatliTurlar && !ruxsatliTurlar.includes(f.priceType))) {
    xatolar.priceType = { kod: "priceType" };
  }
  if (f.isEnabled && !f.warehouseId) xatolar.warehouseId = { kod: "requiredToEnable" };
  if (f.isEnabled && !f.draftOwnerId) xatolar.draftOwnerId = { kod: "requiredToEnable" };
  for (const kalit of ["debtLimitUzs", "debtLimitUsd"] as const) {
    const matn = f[kalit].trim();
    if (!matn) continue;
    const son = Number(matn);
    if (!Number.isFinite(son) || son < 0) xatolar[kalit] = { kod: "amount" };
  }
  for (const kalit of Object.keys(AGENT_SON_CHEGARALARI) as Array<keyof typeof AGENT_SON_CHEGARALARI>) {
    const { min, max } = AGENT_SON_CHEGARALARI[kalit];
    const matn = f[kalit].trim();
    const son = Number(matn);
    if (!matn || !Number.isInteger(son) || son < min || son > max) xatolar[kalit] = { kod: "range", params: { min, max } };
  }
  const boshi = f.workStart.trim();
  const oxiri = f.workEnd.trim();
  if (Boolean(boshi) !== Boolean(oxiri)) xatolar[boshi ? "workEnd" : "workStart"] = { kod: "workHoursPair" };
  else {
    if (boshi && !soatMi(boshi)) xatolar.workStart = { kod: "time" };
    if (oxiri && !soatMi(oxiri)) xatolar.workEnd = { kod: "time" };
  }
  if (f.extraInstructions.trim().length > AGENT_KORSATMA_UZUNLIGI) {
    xatolar.extraInstructions = { kod: "tooLong", params: { max: AGENT_KORSATMA_UZUNLIGI } };
  }
  return xatolar;
}

export type AgentSozlamaPatch = Partial<{
  isEnabled: boolean;
  priceType: string;
  warehouseId: string | null;
  draftOwnerId: string | null;
  debtLimitUzs: number | null;
  debtLimitUsd: number | null;
  managerQuietMinutes: number;
  workStart: string | null;
  workEnd: string | null;
  extraInstructions: string;
  customerMessagesPerHour: number;
  agentRunsPerDay: number;
}>;

const summaQiymati = (matn: string) => (matn.trim() ? Number(matn) : null);
const ixtiyoriyMatn = (matn: string) => (matn.trim() ? matn.trim() : null);

/** PATCH qisman: faqat o'zgargan maydonlar (bo'sh ombor/ega/chegara/vaqt — null). Hech narsa o'zgarmagan bo'lsa bo'sh obyekt. */
export function agentSozlamaOzgarishlari(asl: AgentSozlamaFormasi, joriy: AgentSozlamaFormasi): AgentSozlamaPatch {
  const patch: AgentSozlamaPatch = {};
  if (asl.isEnabled !== joriy.isEnabled) patch.isEnabled = joriy.isEnabled;
  if (asl.priceType !== joriy.priceType) patch.priceType = joriy.priceType;
  if (asl.warehouseId !== joriy.warehouseId) patch.warehouseId = joriy.warehouseId || null;
  if (asl.draftOwnerId !== joriy.draftOwnerId) patch.draftOwnerId = joriy.draftOwnerId || null;
  for (const kalit of ["debtLimitUzs", "debtLimitUsd"] as const) {
    if (summaQiymati(asl[kalit]) !== summaQiymati(joriy[kalit])) patch[kalit] = summaQiymati(joriy[kalit]);
  }
  for (const kalit of ["managerQuietMinutes", "customerMessagesPerHour", "agentRunsPerDay"] as const) {
    if (Number(asl[kalit]) !== Number(joriy[kalit])) patch[kalit] = Number(joriy[kalit]);
  }
  // Ish vaqti boshi va oxiri birga tekshiriladi: bittasi o'zgarsa ikkalasi ham yuboriladi.
  if (ixtiyoriyMatn(asl.workStart) !== ixtiyoriyMatn(joriy.workStart) || ixtiyoriyMatn(asl.workEnd) !== ixtiyoriyMatn(joriy.workEnd)) {
    patch.workStart = ixtiyoriyMatn(joriy.workStart);
    patch.workEnd = ixtiyoriyMatn(joriy.workEnd);
  }
  if (asl.extraInstructions.trim() !== joriy.extraInstructions.trim()) patch.extraInstructions = joriy.extraInstructions.trim();
  return patch;
}

// ── Tasdiq kutayotgan agent buyurtmalari ──────────────────────────────────────────────────────────

export type AgentQoralamaQatori = {
  id: string;
  quantity: number;
  price: number;
  total: number;
  currency: string;
  priceType: string | null;
  mahsulot: string;
  variant: string;
};

export type AgentQoralamasi = {
  id: string;
  createdAt: string;
  currency: string;
  note: string;
  jami: number;
  mijozId: string | null;
  mijozNomi: string;
  mijozTelefoni: string;
  /** Mijoz kartasiga bog'lanmagan suhbat — walk-in sotuv. */
  yangiMijoz: boolean;
  suhbatId: string | null;
  qarzOgohlantirishi: boolean;
  oluvchi: string;
  oluvchiTelefoni: string;
  manzil: string;
  yetkazishIzohi: string;
  qatorlar: AgentQoralamaQatori[];
};

const matn = (qiymat: unknown) => (typeof qiymat === "string" ? qiymat.trim() : "");
const son = (qiymat: unknown) => {
  const n = Number(qiymat);
  return Number.isFinite(n) ? n : 0;
};

/** Backend sotuvi (delivery, customer, items bilan) → ekran uchun tekis shakl; id'siz yozuv — null. */
export function agentQoralamasiniTozalash(xom: unknown): AgentQoralamasi | null {
  const s = obyekt(xom);
  const id = matn(s.id);
  if (!id) return null;
  const yetkazish = obyekt(s.delivery);
  const mijoz = s.customer && typeof s.customer === "object" ? obyekt(s.customer) : null;
  const currency = matn(s.currency) || "UZS";
  const qatorlar = (Array.isArray(s.items) ? s.items : []).map((q, tartib): AgentQoralamaQatori => {
    const qator = obyekt(q);
    const modifikatsiya = obyekt(qator.modification);
    const mahsulot = matn(obyekt(modifikatsiya.product).name);
    const variant = matn(modifikatsiya.name);
    const miqdor = son(qator.quantity);
    const narx = son(qator.price);
    return {
      id: matn(qator.id) || `${id}-${tartib}`,
      quantity: miqdor,
      price: narx,
      total: qator.total === undefined || qator.total === null ? miqdor * narx : son(qator.total),
      currency: matn(qator.currency) || currency,
      priceType: matn(qator.priceType) || null,
      mahsulot: mahsulot || variant,
      variant: mahsulot && variant && variant !== mahsulot ? variant : "",
    };
  });
  const qatorlarJami = qatorlar.reduce((jami, q) => jami + q.total, 0);
  const totalAmount = son(s.totalAmount);
  const mijozIsmi = mijoz ? [matn(mijoz.firstName), matn(mijoz.lastName)].filter(Boolean).join(" ") : "";
  return {
    id,
    createdAt: matn(s.createdAt),
    currency,
    note: matn(s.note),
    jami: totalAmount > 0 ? totalAmount : qatorlarJami,
    mijozId: mijoz ? matn(mijoz.id) || null : null,
    mijozNomi: mijozIsmi || matn(s.walkInCustomerName) || matn(yetkazish.recipientName),
    mijozTelefoni: (mijoz ? matn(mijoz.phone) : "") || matn(s.walkInCustomerPhone) || matn(yetkazish.recipientPhone),
    yangiMijoz: !mijoz,
    suhbatId: matn(yetkazish.chatThreadId) || null,
    qarzOgohlantirishi: yetkazish.debtWarning === true,
    oluvchi: matn(yetkazish.recipientName),
    oluvchiTelefoni: matn(yetkazish.recipientPhone),
    manzil: matn(yetkazish.address),
    yetkazishIzohi: matn(yetkazish.note),
    qatorlar,
  };
}

/** Rad etish izohi mijozga yuboriladi: 500 belgigacha (backend chegarasi). */
export const RAD_ETISH_IZOHI_UZUNLIGI = 500;
