// Savdo agenti (Telegram suhbatlar + lidlar) uchun toza yordamchilar: sahifa ham, testlar ham shularni ishlatadi.

export type SuhbatNomiManbai = {
  id: string;
  displayName?: string | null;
  telegramUsername?: string | null;
  telegramChatId?: string | null;
};

/** Suhbat nomi: ism → @username → Telegram chat id → qisqa id. */
export function suhbatNomi(suhbat: SuhbatNomiManbai | null | undefined): string {
  if (!suhbat) return "";
  const ism = suhbat.displayName?.trim();
  if (ism) return ism;
  const username = suhbat.telegramUsername?.trim().replace(/^@/, "");
  if (username) return `@${username}`;
  const chat = suhbat.telegramChatId?.trim();
  if (chat) return chat;
  return `#${suhbat.id.slice(0, 8)}`;
}

/** Avatar harflari: ismdan 1–2 bosh harf, bo'lmasa "@". */
export function suhbatBoshHarflari(nom: string): string {
  const toza = nom.replace(/^[@#]/, "").trim();
  if (!toza) return "@";
  const qismlar = toza.split(/\s+/).filter(Boolean);
  const harflar = qismlar.length > 1 ? `${qismlar[0][0]}${qismlar[1][0]}` : toza.slice(0, 2);
  return harflar.toUpperCase();
}

/** TELEGRAM_BUSINESS — do'konning o'z Telegram akkaunti; qolgani (TELEGRAM_BOT, noma'lum) — bot. */
export function kanalTuri(kanal?: string | null): "BUSINESS" | "BOT" {
  return kanal === "TELEGRAM_BUSINESS" ? "BUSINESS" : "BOT";
}

export type XabarMuallifi = "mijoz" | "xodim" | "akkaunt";

/**
 * IN — mijoz yozgan. OUT va `sentById === null` — do'kon akkaunti egasi Telegram ilovasidan yozgan
 * (tizim orqali emas). OUT va xodim id'si (yoki maydon umuman kelmagan eski javob) — tizimdagi xodim.
 */
export function xabarMuallifi(xabar: { direction?: string | null; sentById?: string | null }): XabarMuallifi {
  if (xabar.direction !== "OUT") return "mijoz";
  return xabar.sentById === null ? "akkaunt" : "xodim";
}

type VaqtliXabar = { id?: string; createdAt?: string };

/**
 * Sahifalar birlashtiriladi: takror id'lar bitta bo'ladi (yangisi ustun), natija eskidan yangiga tartiblanadi.
 * Backend sahifani eng yangisidan beradi, chat esa yuqoridan pastga eskidan yangiga o'qiladi.
 */
export function xabarlarniBirlashtirish<T extends VaqtliXabar>(...toplamlar: T[][]): T[] {
  const idBoyicha = new Map<string, T>();
  const idsizlar: T[] = [];
  for (const toplam of toplamlar) {
    for (const xabar of toplam) {
      if (xabar.id) idBoyicha.set(xabar.id, xabar);
      else idsizlar.push(xabar);
    }
  }
  const vaqt = (xabar: T) => {
    const ms = xabar.createdAt ? Date.parse(xabar.createdAt) : NaN;
    return Number.isFinite(ms) ? ms : 0;
  };
  return [...idBoyicha.values(), ...idsizlar]
    .map((xabar, tartib) => ({ xabar, tartib }))
    .sort((a, b) => vaqt(a.xabar) - vaqt(b.xabar) || (a.xabar.id ?? "").localeCompare(b.xabar.id ?? "") || a.tartib - b.tartib)
    .map(({ xabar }) => xabar);
}

/** Birinchi javob vaqti (soniya) → soat/daqiqa/soniya; matnni komponent tarjima bilan yig'adi. */
export function davomiylikQismlari(soniya?: number | null): { soat: number; daqiqa: number; soniya: number } | null {
  if (soniya === null || soniya === undefined || !Number.isFinite(soniya) || soniya < 0) return null;
  const butun = Math.round(soniya);
  return { soat: Math.floor(butun / 3600), daqiqa: Math.floor((butun % 3600) / 60), soniya: butun % 60 };
}

/** Voronka ulushi (foiz, butun): jami 0 bo'lsa 0. */
export function ulush(qism: number, jami: number): number {
  if (!jami || !Number.isFinite(qism)) return 0;
  return Math.round((qism / jami) * 100);
}

/** SALE va LOST lidni yopadi. */
export function lidYopiqmi(lid: { stage?: string | null; closedAt?: string | null }): boolean {
  return lid.stage === "SALE" || lid.stage === "LOST" || Boolean(lid.closedAt);
}

/** Bosqich o'zgarishi so'rovi: LOST uchun sabab majburiy, aks holda null (yuborilmaydi). */
export function bosqichSorovi(
  joriy: string,
  yangi: string,
  sabab?: string | null
): { stage: string; lostReason?: string } | null {
  if (!yangi || yangi === joriy) return null;
  if (yangi === "LOST") return sabab ? { stage: yangi, lostReason: sabab } : null;
  return { stage: yangi };
}

export type NisbiyVaqt = { tur: "hozir" | "daqiqa" | "soat" | "kun"; n: number } | null;

/** "12 daq oldin" uchun: 1 daqiqadan kam — hozir, soatgacha daqiqa, sutkagacha soat, keyin kun. Kelajak vaqt — hozir. */
export function nisbiyVaqt(qiymat: string | null | undefined, hozir: number = Date.now()): NisbiyVaqt {
  if (!qiymat) return null;
  const ms = Date.parse(qiymat);
  if (!Number.isFinite(ms)) return null;
  const soniya = Math.max(0, Math.floor((hozir - ms) / 1000));
  if (soniya < 60) return { tur: "hozir", n: 0 };
  if (soniya < 3600) return { tur: "daqiqa", n: Math.floor(soniya / 60) };
  if (soniya < 86400) return { tur: "soat", n: Math.floor(soniya / 3600) };
  return { tur: "kun", n: Math.floor(soniya / 86400) };
}

export type TezDavr = "bugun" | "hafta" | "oy";
const TEZ_DAVR_KUNLARI: Record<TezDavr, number> = { bugun: 1, hafta: 7, oy: 30 };

function kunSurish(kun: string, farq: number) {
  const [yil, oy, sana] = kun.split("-").map(Number);
  return new Date(Date.UTC(yil, oy - 1, sana + farq)).toISOString().slice(0, 10);
}

/** Tezkor davr: bugun (bugun..bugun), hafta (oxirgi 7 kun), oy (oxirgi 30 kun). `bugun` — "YYYY-MM-DD" (Toshkent kuni). */
export function tezDavrOraligi(tur: TezDavr, bugun: string): { dateFrom: string; dateTo: string } {
  return { dateFrom: kunSurish(bugun, -(TEZ_DAVR_KUNLARI[tur] - 1)), dateTo: bugun };
}

/** Joriy oraliq qaysi tezkor davrga to'g'ri keladi (tugma faol ko'rinishi uchun). */
export function faolTezDavr(dateFrom: string, dateTo: string, bugun: string): TezDavr | "hammasi" | null {
  if (!dateFrom && !dateTo) return "hammasi";
  return (Object.keys(TEZ_DAVR_KUNLARI) as TezDavr[]).find((tur) => {
    const oraliq = tezDavrOraligi(tur, bugun);
    return oraliq.dateFrom === dateFrom && oraliq.dateTo === dateTo;
  }) ?? null;
}

/**
 * Davriy yangilash: eng yangi sahifa (`yangi`) bilan ekrandagi ro'yxatni moslaydi. Telegram'da o'chirilgan xabar backend tarixidan
 * yo'qoladi — sahifa qamrab olgan vaqt oralig'ida (eng eski xabaridan qat'iy yangiroq) bo'lib, sahifada yo'q xabarlar olib tashlanadi;
 * tahrirlangan matn id bo'yicha yangilanadi. `toliq` (nextCursor yo'q) — sahifa butun tarix: ro'yxat aynan shu bo'ladi.
 */
export function oynaniYangilash<T extends VaqtliXabar>(joriy: T[], yangi: T[], toliq: boolean): T[] {
  if (toliq) return xabarlarniBirlashtirish(yangi);
  const idlar = new Set(yangi.map((x) => x.id).filter(Boolean));
  const vaqtlar = yangi.map((x) => (x.createdAt ? Date.parse(x.createdAt) : NaN)).filter(Number.isFinite);
  if (!vaqtlar.length) return xabarlarniBirlashtirish(joriy, yangi);
  const chegara = Math.min(...vaqtlar);
  const qolgan = joriy.filter((x) => {
    if (!x.id || idlar.has(x.id)) return true;
    const ms = x.createdAt ? Date.parse(x.createdAt) : NaN;
    return !Number.isFinite(ms) || ms <= chegara;
  });
  return xabarlarniBirlashtirish(qolgan, yangi);
}
