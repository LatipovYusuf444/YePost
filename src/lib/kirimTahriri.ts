// Kirim qoralamasini "Yangi kirim" oynasida tahrirlash (PATCH /inventory/purchases/:id) uchun saqlangan hujjatni forma qiymatlariga
// o'girish (UI'siz — testlarda to'g'ridan-to'g'ri ishlaydi).
import type { TovarBirligi } from "./kopBirlik.ts";

export type KirimIzohi = { nomi: string; izoh: string; fayllar: Array<{ id: string; nomi: string; url: string }> };

/**
 * `note` qismlari ("|" bilan): foydalanuvchi izohi, "Nomi: <nom>" (faqat qo'lda yozilgan nom) va eski hujjatlardagi
 * "Fayl: <nom> (<url>)". Qismlar istalgan tartibda o'qiladi (eski format "Nomi: ... | izoh | Fayl: ..." ham).
 */
export function kirimIzohiniAjratish(note?: string | null): KirimIzohi {
  const natija: KirimIzohi = { nomi: "", izoh: "", fayllar: [] };
  const izohlar: string[] = [];
  for (const qism of (note ?? "").split("|").map((item) => item.trim()).filter(Boolean)) {
    const nomi = qism.match(/^Nomi:\s*(.+)$/);
    const fayl = qism.match(/^Fayl:\s*(.+?)\s*\((\S+)\)$/);
    if (nomi && !natija.nomi) natija.nomi = nomi[1].trim();
    else if (fayl) natija.fayllar.push({ id: fayl[2], nomi: fayl[1], url: fayl[2] });
    else izohlar.push(qism);
  }
  natija.izoh = izohlar.join(" | ");
  return natija;
}

type SaqlanganQator = {
  quantity?: number | string | null;
  price?: number | string | null;
  unitId?: string | null;
  unitQuantity?: number | string | null;
  unitPrice?: number | string | null;
  factorSnapshot?: number | string | null;
  unitName?: string | null;
  serial?: string | null;
};

const son = (qiymat: unknown) => {
  const raqam = Number(qiymat);
  return Number.isFinite(raqam) ? raqam : 0;
};

/**
 * Saqlangan qator forma ko'rinishida: qo'shimcha birlikda (qop, korobka) kiritilgan bo'lsa — o'sha birlikdagi son va narx
 * (`unitQuantity`/`unitPrice`; narx kelmasa asosiy narx × koeffitsient), aks holda asosiy birlikdagi `quantity`/`price`.
 */
export function kirimQatoriFormaga(item: SaqlanganQator) {
  const birlikda = Boolean(item.unitId) && item.unitQuantity != null && son(item.unitQuantity) > 0;
  if (birlikda) {
    const koeff = son(item.factorSnapshot) || 1;
    const narx = item.unitPrice != null && item.unitPrice !== "" ? son(item.unitPrice) : Math.round(son(item.price) * koeff * 100) / 100;
    return { quantity: son(item.unitQuantity), price: narx, birlikId: String(item.unitId), serial: item.serial ?? "" };
  }
  return { quantity: son(item.quantity), price: son(item.price), birlikId: "", serial: item.serial ?? "" };
}

/**
 * Qo'shimcha birlikda saqlangan qatorning birligi (javobdagi nom va koeffitsient bo'yicha). Tovar birliklari fonda yuklanguncha
 * (yoki yuklab bo'lmasa) qator shu birlikda qoladi: saqlashda `unitId` yo'qolib, 10 korobka 10 dona bo'lib ketmaydi.
 */
export function saqlanganBirlik(item: SaqlanganQator): TovarBirligi | null {
  if (!item.unitId) return null;
  const nomi = item.unitName?.trim() || String(item.unitId);
  return {
    unitId: String(item.unitId), kod: null, nomi, qisqa: nomi, kasr: true, koeff: son(item.factorSnapshot) || 1,
    asosiy: false, qabul: true, sotuv: false, chakana: null, ulgurji: null, shtrix: null,
  };
}

/** Yuklangan birliklar ro'yxati: saqlangan birlik unda bo'lmasa (yoki ro'yxat bo'sh bo'lsa) u ham qoladi. */
export function birliklarniBirlashtirish(yuklangan: readonly TovarBirligi[], saqlangan: TovarBirligi | null): TovarBirligi[] {
  if (!saqlangan || yuklangan.some((birlik) => birlik.unitId === saqlangan.unitId)) return [...yuklangan];
  return [...yuklangan, saqlangan];
}

/**
 * Avtomatik kirim nomi — `note`ga yozilmaydi (ro'yxat va oynada o'rniga hujjat raqami ko'rinadi):
 *  - `namunalar` — tarjimadagi shablonlar (uz va ru: "Kirim hujjati #{{number}}", "Приходный документ №{{number}}"), `{{number}}` — istalgan raqam;
 *  - `aniqNomlar` — aynan shunday nomlar (eski kod yozgan raqamsiz "Kirim hujjati", hujjat raqami "KR-2", "—").
 */
export function avtomatikKirimNomimi(nom: string, namunalar: string | readonly string[], aniqNomlar: readonly string[] = []) {
  const toza = nom.trim();
  if (!toza) return true;
  if (aniqNomlar.some((aniq) => aniq.trim() && aniq.trim() === toza)) return true;
  return (typeof namunalar === "string" ? [namunalar] : namunalar).some((namuna) => {
    const qismlar = namuna.split("{{number}}").map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return qismlar.length === 2 && new RegExp(`^${qismlar[0]}\\d+${qismlar[1]}$`).test(toza);
  });
}

// Izohning "Nomi:" yoki "Fayl:" bilan boshlangan qismi texnik qism deb o'qilmasligi uchun boshiga ko'rinmas belgi (U+200B) qo'yiladi.
const izohQisminiHimoyalash = (qism: string) => qism.replace(/^(\s*)(Nomi|Fayl):/, "$1​$2:");

/**
 * Kirim `note`i. Backend kirim TASDIQLANGANDA `note`ni yetkazib beruvchiga Telegram bot orqali "📝 Izoh: …" qilib yuboradi
 * (backend `feat/purchase-note-to-supplier`), shuning uchun izoh BIRINCHI turadi va texnik qismlar iloji boricha yozilmaydi:
 *  - avtomatik nom ("Kirim hujjati #N") yozilmaydi, faqat qo'lda o'zgartirilgan nom ("Nomi: …") izohdan keyin;
 *  - yangi fayllar `note`ga emas, hujjat ilovalariga yuklanadi; faqat eski hujjatlarda allaqachon bor "Fayl: …" havolalari saqlanadi.
 */
export function kirimNotesiniYigish(p: { izoh: string; nomi: string; avtomatikNom: (nom: string) => boolean; eskiFayllar?: Array<{ nomi: string; url: string }> }) {
  const qismlar: string[] = [];
  const izoh = p.izoh.trim().split("|").map(izohQisminiHimoyalash).join("|");
  if (izoh) qismlar.push(izoh);
  const nomi = p.nomi.trim();
  if (nomi && !p.avtomatikNom(nomi)) qismlar.push(`Nomi: ${nomi}`);
  for (const fayl of p.eskiFayllar ?? []) qismlar.push(`Fayl: ${fayl.nomi} (${fayl.url})`);
  return qismlar.join(" | ");
}
