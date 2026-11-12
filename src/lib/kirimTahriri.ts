// Kirim qoralamasini "Yangi kirim" oynasida tahrirlash (PATCH /inventory/purchases/:id) uchun saqlangan hujjatni forma qiymatlariga
// o'girish (UI'siz — testlarda to'g'ridan-to'g'ri ishlaydi).
import type { TovarBirligi } from "./kopBirlik.ts";

export type KirimIzohi = { nomi: string; izoh: string; fayllar: Array<{ id: string; nomi: string; url: string }> };

/**
 * Yaratishda `note` shunday yig'iladi: "Nomi: <nom> | <izoh> | Fayl: <nom> (<url>)". Tahrirda qismlar o'z maydonlariga qaytadi,
 * saqlashda xuddi shu tartibda qayta yig'iladi (nom va fayllar yo'qolmaydi).
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
