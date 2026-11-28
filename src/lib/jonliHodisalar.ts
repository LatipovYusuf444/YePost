import { API_BASE_URL, TOGRIDAN_MANZIL } from "@/api/apiConfig";
import { accessTokenniQaytaOlish } from "@/api/axios";
import { AUTH_SESSION_CHANGED_EVENT, accessTokenniSaqlash, authSessiyaYaroqli, authTokenlarniOlish } from "@/lib/authTokenStorage";
import { JonliOqim, type OqimHodisasi, type OqimHolati } from "./jonliOqim";

/**
 * Jonli hodisalar (SSE) — butun tab uchun har kanalga bitta ulanish. Ekranlar `jonliObuna` (yoki `useJonliYangilash`) bilan
 * tinglaydi: birinchi tinglovchi kelganda oqim ochiladi, oxirgisi ketgach (qisqa kutishdan keyin) yopiladi.
 * - "workspace": GET /events — support, CRM suhbatlar, bildirishnomalar.
 * - "platform": GET /platform/events — staff paneli (support hodisalari workspaceId bilan).
 */
export type JonliKanal = "workspace" | "platform";

export type JonliTinglovchi = {
  hodisa?: (hodisa: OqimHodisasi) => void;
  /** `open` / `resync`: ekranni to'liq qayta olish. */
  hammasi?: () => void;
  holat?: (holat: OqimHolati) => void;
};

// Oqim Vercel proksisi orqali emas, to'g'ridan-to'g'ri API domeniga ulanadi (backend CORS shu domenlarga ochiq).
// Lokal dev / preview domenlarda REST qaysi yo'ldan ketsa (Vite proksi), oqim ham o'shandan — ishlamasa ekranlar polling bilan qoladi.
const TOGRIDAN_SSE_DOMENLAR = new Set(["ye-post.vercel.app", "aisa-savdo.vercel.app"]);
const YOPISH_KECHIKISHI_MS = 3_000;

function oqimBazasi() {
  if (/^https?:\/\//i.test(API_BASE_URL)) return API_BASE_URL.replace(/\/+$/, "");
  if (typeof window !== "undefined" && TOGRIDAN_SSE_DOMENLAR.has(window.location.hostname)) return TOGRIDAN_MANZIL;
  return API_BASE_URL.replace(/\/+$/, "");
}

const YOLLAR: Record<JonliKanal, string> = { workspace: "/events", platform: "/platform/events" };

function joriyToken() {
  const tokenlar = authTokenlarniOlish();
  return authSessiyaYaroqli(tokenlar) ? tokenlar.accessToken : null;
}

async function tokenniYangilash() {
  const tokenlar = authTokenlarniOlish();
  if (!authSessiyaYaroqli(tokenlar) || !tokenlar.refreshToken) return null;
  try {
    const yangi = await accessTokenniQaytaOlish(tokenlar.refreshToken);
    accessTokenniSaqlash(yangi);
    return yangi;
  } catch {
    // Sessiya tugagan: REST so'rovlari login sahifasiga o'tkazadi; oqim jim to'xtaydi.
    return null;
  }
}

type KanalHolati = {
  oqim: JonliOqim | null;
  tinglovchilar: Set<JonliTinglovchi>;
  holat: OqimHolati;
  yopishTaymer: number | null;
};

const kanallar: Record<JonliKanal, KanalHolati> = {
  workspace: { oqim: null, tinglovchilar: new Set(), holat: "toxtagan", yopishTaymer: null },
  platform: { oqim: null, tinglovchilar: new Set(), holat: "toxtagan", yopishTaymer: null },
};

function hammaga(kanal: JonliKanal, amal: (t: JonliTinglovchi) => void) {
  for (const tinglovchi of Array.from(kanallar[kanal].tinglovchilar)) {
    try {
      amal(tinglovchi);
    } catch {
      // bitta ekran xatosi boshqalarga ta'sir qilmasin
    }
  }
}

function oqimYarat(kanal: JonliKanal) {
  const k = kanallar[kanal];
  return new JonliOqim({
    url: `${oqimBazasi()}${YOLLAR[kanal]}`,
    tokenOl: joriyToken,
    tokenYangila: tokenniYangilash,
    hodisa: (hodisa) => hammaga(kanal, (t) => t.hodisa?.(hodisa)),
    hammasiniYangila: () => hammaga(kanal, (t) => t.hammasi?.()),
    holat: (holat) => {
      k.holat = holat;
      hammaga(kanal, (t) => t.holat?.(holat));
    },
  });
}

function ishgaTushir(kanal: JonliKanal) {
  const k = kanallar[kanal];
  if (k.yopishTaymer !== null) {
    window.clearTimeout(k.yopishTaymer);
    k.yopishTaymer = null;
  }
  if (!k.oqim) k.oqim = oqimYarat(kanal);
  if (k.oqim.holat === "toxtagan" && joriyToken()) k.oqim.boshla();
}

/** Ekran oqimni tinglaydi. Qaytgan funksiya obunani bekor qiladi. */
export function jonliObuna(kanal: JonliKanal, tinglovchi: JonliTinglovchi): () => void {
  if (typeof window === "undefined" || typeof fetch === "undefined" || typeof ReadableStream === "undefined") return () => undefined;
  const k = kanallar[kanal];
  k.tinglovchilar.add(tinglovchi);
  global();
  ishgaTushir(kanal);
  tinglovchi.holat?.(k.holat);
  return () => {
    k.tinglovchilar.delete(tinglovchi);
    if (k.tinglovchilar.size > 0 || k.yopishTaymer !== null) return;
    // Sahifa almashganda (bir ekran ketib boshqasi kelguncha) oqim uzilib-ulanmasin.
    k.yopishTaymer = window.setTimeout(() => {
      k.yopishTaymer = null;
      if (k.tinglovchilar.size === 0) k.oqim?.toxtat();
    }, YOPISH_KECHIKISHI_MS);
  };
}

export function jonliHolat(kanal: JonliKanal): OqimHolati {
  return kanallar[kanal].holat;
}

let globalOrnatildi = false;

/** Login/logout va internet qaytishi: barcha kanallarga. */
function global() {
  if (globalOrnatildi) return;
  globalOrnatildi = true;
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, () => {
    const token = joriyToken();
    for (const kanal of Object.keys(kanallar) as JonliKanal[]) {
      const k = kanallar[kanal];
      if (!token) {
        k.oqim?.toxtat();
        continue;
      }
      // Token har 15 daqiqada yangilanadi — ishlab turgan oqimga tegilmaydi; faqat to'xtab qolgani (login) qayta ochiladi.
      if (k.tinglovchilar.size > 0 && k.oqim && k.oqim.holat === "toxtagan") k.oqim.boshla();
    }
  });
  window.addEventListener("online", () => {
    for (const kanal of Object.keys(kanallar) as JonliKanal[]) {
      const k = kanallar[kanal];
      if (k.tinglovchilar.size > 0) k.oqim?.hozirUlan();
    }
  });
}
