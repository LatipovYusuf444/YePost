// Telegram nakladnoy: mijozga xabar yuborish (TZ 701). UI'siz va tashqi importlarsiz yozilgan — alohida sinash mumkin.
// Backend: GET /notification-logs, POST /sales/:id/notify, POST/DELETE /partners/customers/:id/telegram-link, GET /sales/:id/nakladnoy.pdf.

/**
 * Telegram bot sozlamasida bot token kiritilishi kerakmi: bot yoqilgan, maydonga yangi token yozilmagan va saqlangan token yo'q
 * (backend javobida `botTokenLast4` bo'sh). Maydon bo'sh qolsa eski token saqlanadi, shuning uchun faqat `botTokenLast4` bor-yo'qligi tekshiriladi.
 * Chat ID tekshirilmaydi: mijozlarga xabar yuboradigan bot uchun u kerak emas (backend bo'sh qiymatni qabul qiladi).
 */
export function botTokenKerakmi(p: { yoniq: boolean; yangiToken: string; oxirgi4?: string | null }): boolean {
  return p.yoniq && !p.yangiToken.trim() && !String(p.oxirgi4 ?? "").trim();
}

export type XabarnomaHodisasi = "SALE_CONFIRMED" | "PAYMENT" | "SALE_CANCELLED";
export type XabarnomaHolati = "QUEUED" | "SENT" | "FAILED" | "BLOCKED" | "SKIPPED";

export type XabarnomaYozuvi = {
  id: string;
  event: XabarnomaHodisasi | string;
  status: XabarnomaHolati | string;
  /** Sabab: "not linked", "turned off", "turned off by customer" yoki Telegram xatosi matni. */
  lastError: string | null;
  attempts: number;
  sentAt: string | null;
  createdAt: string | null;
  saleId: string | null;
  customerId: string | null;
  /** PAYMENT hodisasida — to'lov id. */
  docId: string | null;
};

/** Sotuv kartasidagi "Telegram: ..." belgisi turi. */
export type SotuvXabarTuri =
  | "yuborilmagan"
  | "yuborildi"
  | "navbatda"
  | "xato"
  | "bloklangan"
  | "ulanmagan"
  | "ochirilgan"
  | "mijozOchirgan"
  | "otkazilgan";

type Obyekt = Record<string, unknown>;

function obyekt(qiymat: unknown): Obyekt | null {
  return qiymat && typeof qiymat === "object" && !Array.isArray(qiymat) ? (qiymat as Obyekt) : null;
}

function matn(qiymat: unknown): string | null {
  return typeof qiymat === "string" && qiymat.trim() ? qiymat.trim() : null;
}

const vaqtQiymati = (qiymat: string | null) => {
  const vaqt = qiymat ? Date.parse(qiymat) : NaN;
  return Number.isFinite(vaqt) ? vaqt : 0;
};

/** GET /notification-logs javobi (massiv, `{ items }`, `{ data }` yoki `{ data: { items } }`) → yozuvlar, yangisi birinchi. */
export function xabarnomaYozuvlari(raw: unknown): XabarnomaYozuvi[] {
  const asosiy = obyekt(raw);
  const ichki = obyekt(asosiy?.data);
  const royxat = [raw, asosiy?.items, asosiy?.data, ichki?.items].find(Array.isArray) as unknown[] | undefined;
  const yozuvlar: XabarnomaYozuvi[] = [];
  for (const element of royxat ?? []) {
    const yozuv = obyekt(element);
    const id = matn(yozuv?.id);
    const status = matn(yozuv?.status);
    if (!yozuv || !id || !status) continue;
    yozuvlar.push({
      id,
      event: (matn(yozuv.event) ?? "").toUpperCase(),
      status: status.toUpperCase(),
      lastError: matn(yozuv.lastError),
      attempts: Number.isFinite(Number(yozuv.attempts)) ? Number(yozuv.attempts) : 0,
      sentAt: matn(yozuv.sentAt),
      createdAt: matn(yozuv.createdAt),
      saleId: matn(yozuv.saleId),
      customerId: matn(yozuv.customerId),
      docId: matn(yozuv.docId),
    });
  }
  return yozuvlar.sort((a, b) => vaqtQiymati(b.createdAt) - vaqtQiymati(a.createdAt));
}

/** SKIPPED/FAILED sababi (backend `lastError`) → belgi turi; noma'lum SKIPPED sababi "otkazilgan". */
function otkazilganTuri(sabab: string | null): SotuvXabarTuri {
  const kichik = (sabab ?? "").toLowerCase();
  if (kichik.includes("not linked")) return "ulanmagan";
  if (kichik.includes("turned off by customer")) return "mijozOchirgan";
  if (kichik.includes("turned off")) return "ochirilgan";
  return "otkazilgan";
}

/** Bitta yozuvning belgi turi. */
export function xabarTuri(yozuv: Pick<XabarnomaYozuvi, "status" | "lastError">): SotuvXabarTuri {
  switch (String(yozuv.status).toUpperCase()) {
    case "SENT":
      return "yuborildi";
    case "QUEUED":
      return "navbatda";
    case "FAILED":
      return "xato";
    case "BLOCKED":
      return "bloklangan";
    case "SKIPPED":
      return otkazilganTuri(yozuv.lastError);
    default:
      return "yuborilmagan";
  }
}

/**
 * Sotuv kartasi belgisi: sotuv tasdiqlanganda yuborilgan xabarning (SALE_CONFIRMED) oxirgi holati; u bo'lmasa — eng oxirgi yozuv.
 * Yozuv yo'q bo'lsa — "yuborilmagan".
 */
export function sotuvXabarHolati(yozuvlar: XabarnomaYozuvi[]): { tur: SotuvXabarTuri; yozuv: XabarnomaYozuvi | null } {
  const tartiblangan = [...yozuvlar].sort((a, b) => vaqtQiymati(b.createdAt) - vaqtQiymati(a.createdAt));
  const yozuv = tartiblangan.find((element) => element.event === "SALE_CONFIRMED") ?? tartiblangan[0] ?? null;
  return { tur: yozuv ? xabarTuri(yozuv) : "yuborilmagan", yozuv };
}

/** Telegram'dan kelgan xato matni (FAILED) — foydalanuvchiga ko'rsatiladigan sabab; SKIPPED sabablari tarjima qilinadi, bu yerda `null`. */
export function xabarXatoMatni(yozuv: Pick<XabarnomaYozuvi, "status" | "lastError">): string | null {
  const status = String(yozuv.status).toUpperCase();
  if (status !== "FAILED" && status !== "BLOCKED") return null;
  return yozuv.lastError;
}

/** Navbatdagi yozuv bormi (backend hali yubormagan): holatni qayta so'rash kerak. */
export function navbatdaBormi(yozuvlar: XabarnomaYozuvi[]): boolean {
  return yozuvlar.some((yozuv) => String(yozuv.status).toUpperCase() === "QUEUED");
}

// ── Mijozni botga ulash ────────────────────────────────────────────────────────────────────────────

export type MijozTelegramHolati = {
  ulangan: boolean;
  ulanganVaqt: string | null;
  /** Mijoz botda /stop bosgan: xabar yuborilmaydi (telegramNotify === false). */
  ochirgan: boolean;
  /** Mijoz botni bloklagan (telegramBlocked === true). */
  bloklagan: boolean;
};

export type MijozTelegramTuri = "ulanmagan" | "ulangan" | "ochirgan" | "bloklagan";

/** Mijoz obyektining telegram* maydonlari (telegramChatId, telegramLinkedAt, telegramNotify, telegramBlocked) → holat. */
export function mijozTelegramHolati(mijoz: unknown): MijozTelegramHolati {
  const o = obyekt(mijoz);
  const chatId = o?.telegramChatId;
  return {
    ulangan: chatId !== null && chatId !== undefined && String(chatId).trim() !== "",
    ulanganVaqt: matn(o?.telegramLinkedAt),
    ochirgan: o?.telegramNotify === false,
    bloklagan: o?.telegramBlocked === true,
  };
}

/** Holatning bitta belgi turi: bloklagan > ulanmagan > mijoz o'chirgan > ulangan. */
export function mijozTelegramTuri(holat: MijozTelegramHolati): MijozTelegramTuri {
  if (holat.bloklagan) return "bloklagan";
  if (!holat.ulangan) return "ulanmagan";
  if (holat.ochirgan) return "ochirgan";
  return "ulangan";
}

export type TelegramHavola = { url: string; expiresAt: string | null };

/** POST /partners/customers/:id/telegram-link javobi (`{ url, expiresAt }`, o'rovli ham bo'lishi mumkin); url bo'lmasa `null`. */
export function telegramHavolasi(raw: unknown): TelegramHavola | null {
  const asosiy = obyekt(raw);
  const manba = matn(asosiy?.url) ? asosiy : obyekt(asosiy?.data);
  const url = matn(manba?.url);
  return url ? { url, expiresAt: matn(manba?.expiresAt) } : null;
}

// ── Nakladnoy PDF ──────────────────────────────────────────────────────────────────────────────────

/**
 * Content-Disposition'dan fayl nomi (`filename*=UTF-8''...` yoki `filename="..."`); bo'lmasa `Nakladnoy_<raqam>.pdf`.
 * Fayl nomidagi taqiqlangan belgilar almashtiriladi.
 */
export function nakladnoyFaylNomi(disposition: string | null | undefined, hujjatRaqami: string): string {
  const qiymat = disposition ?? "";
  let nomi = "";
  const utf8 = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(qiymat);
  if (utf8) {
    try {
      nomi = decodeURIComponent(utf8[1].trim());
    } catch {
      nomi = utf8[1].trim();
    }
  }
  if (!nomi) {
    const oddiy = /filename\s*=\s*"?([^";]+)"?/.exec(qiymat);
    nomi = oddiy ? oddiy[1].trim() : "";
  }
  if (!nomi) nomi = `Nakladnoy_${hujjatRaqami || "sotuv"}.pdf`;
  nomi = nomi.replace(/[\\/:*?"<>|]+/g, "_");
  return /\.pdf$/i.test(nomi) ? nomi : `${nomi}.pdf`;
}
