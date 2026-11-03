// Forma maydonlari xatolari (butun loyiha uchun): server xatosini formaning qaysi maydoniga tegishli ekanini aniqlash va
// store orqali yuborilgan so'rovning server javobini formaga yetkazish. UI'siz, tashqi importlarsiz — alohida sinaladi.

/** Mijoz tekshiruvining xatosi: i18n kaliti (yoki matn) va xatoli maydon yo'li (backend nomi bilan, qatorda "items.2.quantity"). */
export type FormaXatosi = { xato: string; maydon?: string };

/** Forma maydonini server xatosi bilan bog'lash qoidasi: backend maydon nomlari, xato kodidagi so'zlar va xabardagi so'zlar (uz/ru). */
export type XatoMaydonQoidasi = { maydonlar: string[]; kodlar?: string[]; sozlar?: string[] };

type Obyekt = Record<string, unknown>;
const obyekt = (value: unknown): Obyekt => (value && typeof value === "object" && !Array.isArray(value) ? (value as Obyekt) : {});

/**
 * Server xatosi formaning qaysi maydoniga tegishli. Avval validatsiya `errors[].field`: qoidadagi backend nomiga mos kelsa shu kalit,
 * aks holda maydon yo'lining o'zi (`items[1].quantity` → `items.1.quantity`). Keyin `code`ning oxirgi qismi
 * (masalan, errors.production.recipe_not_active → retsept), oxirida `message`dagi so'zlar. Topilmasa bo'sh obyekt.
 */
export function serverXatoMaydonlari(tafsilot: unknown, qoidalar: Record<string, XatoMaydonQoidasi>): Record<string, string> {
  const malumot = obyekt(tafsilot);
  const xabar = Array.isArray(malumot.message) ? malumot.message.join(" ") : typeof malumot.message === "string" ? malumot.message : "";
  const natija: Record<string, string> = {};
  const sabablar = Array.isArray(malumot.errors) ? malumot.errors : [];
  for (const sabab of sabablar) {
    const qism = obyekt(sabab);
    const yol = String(qism.field ?? "").replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
    if (!yol) continue;
    const maydon = Object.keys(qoidalar).find((kalit) => qoidalar[kalit].maydonlar.some((backendNomi) => backendNomi.toLowerCase() === yol.toLowerCase())) ?? yol;
    if (natija[maydon]) continue;
    const cheklovlar = Array.isArray(qism.constraints) ? qism.constraints : [];
    natija[maydon] = cheklovlar.map((cheklov) => String(obyekt(cheklov).message ?? "").trim()).filter(Boolean).join(" ") || xabar;
  }
  if (Object.keys(natija).length) return natija;
  // Faqat kodning oxirgi qismi: "errors.production.recipe_not_active" dagi modul nomi (production ⊃ product) adashtirmasin.
  const kod = typeof malumot.code === "string" ? malumot.code.split(".").pop()?.toLowerCase() ?? "" : "";
  for (const [maydon, qoida] of Object.entries(qoidalar)) {
    if (kod && (qoida.kodlar ?? []).some((soz) => kod.includes(soz.toLowerCase()))) natija[maydon] = xabar;
  }
  if (Object.keys(natija).length || !xabar) return natija;
  const matn = xabar.toLocaleLowerCase();
  const maydon = Object.keys(qoidalar).find((kalit) => (qoidalar[kalit].sozlar ?? []).some((soz) => matn.includes(soz.toLocaleLowerCase())));
  return maydon ? { [maydon]: xabar } : {};
}

// ── Oxirgi API xatosi ─────────────────────────────────────────────────────────────────────────────
// Store'lar xatoni matnga aylantiradi (getApiErrorMessage): forma maydon xatolarini olishi uchun axios interceptori har bir xato
// javobini shu yerga yozadi. Forma so'rovdan oldin belgi oladi va faqat undan keyin kelgan xatoni o'qiydi.
let tartib = 0;
let oxirgi: { tartib: number; tafsilot: unknown; url?: string; ozgartirish: boolean } | null = null;

export function apiXatosiniYozish(tafsilot: unknown, url?: string, method?: string) {
  tartib += 1;
  oxirgi = { tartib, tafsilot, url, ozgartirish: Boolean(method) && method?.toLowerCase() !== "get" };
}

export function xatoBelgisi() {
  return tartib;
}

/**
 * Belgidan keyin kelgan oxirgi API xatosining javob tanasi (bo'lmasa `undefined`). `faqatOzgartirish` — faqat POST/PATCH/PUT/DELETE xatosi
 * (fondagi GET so'rovlar, masalan o'qilmagan xabarlar tekshiruvi, formaga tegishli emas).
 */
export function belgidanKeyingiXato(belgi: number, faqatOzgartirish = false) {
  if (!oxirgi || oxirgi.tartib <= belgi || (faqatOzgartirish && !oxirgi.ozgartirish)) return undefined;
  return oxirgi.tafsilot;
}

// ── Ko'rinish ─────────────────────────────────────────────────────────────────────────────────────
/** Xatoli maydon o'ramining klasslari: ichidagi kiritish, tanlash tugmasi, select va matn maydoni qizil ramka bilan. */
export const MAYDON_XATOSI =
  "[&_input:not([type=checkbox]):not([type=radio]):not([type=hidden])]:!border-red-400 [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden])]:ring-4 [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden])]:ring-red-100 [&_button[aria-haspopup]]:!border-red-400 [&_button[aria-haspopup]]:ring-4 [&_button[aria-haspopup]]:ring-red-100 [&_select]:!border-red-400 [&_select]:ring-4 [&_select]:ring-red-100 [&_textarea]:!border-red-400 [&_textarea]:ring-4 [&_textarea]:ring-red-100 [&_[data-maydon-boshqaruvi]]:!border-red-400 [&_[data-maydon-boshqaruvi]]:ring-4 [&_[data-maydon-boshqaruvi]]:ring-red-100";

/** Maydon bo'lmagan element (belgilash kartasi, qator kartasi) xatoli bo'lsa: qizil ramka. `data-maydon-xato` bilan birga ishlatiladi. */
export const xatoRamkasi = "!border-red-400 ring-4 ring-red-100";
