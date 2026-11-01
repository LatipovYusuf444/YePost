import type { QoldiqTanlovi } from "../../types/savdo.ts";
import { birlikTopish, shtrixBirligi, type TovarBirligi } from "../../lib/kopBirlik.ts";
import { mahsulotNomi, qoldiqMiqdori, savatNomi, tanlovKaliti } from "./posMahsulotlari.ts";

// Headerdagi tezkor qidiruvning toza qismi (UI'siz, testlanadi): qator turi va qidirish/saralash qoidasi.

export type Qator = {
  kalit: string;
  item: QoldiqTanlovi;
  warehouseId: string;
  warehouseName: string;
  qoldiq: number;
  // Qo'shimcha birlik (pochka) shtrix-kodi aniq mos kelgan: mahsulot savatchaga shu birlikda qo'shiladi.
  birlik?: TovarBirligi;
};

// Bitta ombor bo'yicha server qidiruvi natijasi. `warehouseId` bo'sh — ombor ko'rsatilmagan (qoldiq hamma omborlar yig'indisi).
export type OmborQidiruvNatijasi = { warehouseId: string; warehouseName: string; qatorlar: QoldiqTanlovi[] };

// Server qidiruvining bir sahifasi (TZ: pageSize=20); ko'proq kerak bo'lsa pastga tushganda keyingi sahifa olinadi.
export const SERVER_SAHIFA_HAJMI = 20;

// Yozuv bilan qidirilganda ko'rsatiladigan eng ko'p natija; kategoriya ro'yxati (yozuvsiz) ko'rinishida ro'yxat uzunroq.
export const KO_RSATILADIGAN_SONI = 50;
export const KATEGORIYA_RO_YXATI_SONI = 200;

function kichik(qiymat?: string | null) {
  return (qiymat ?? "").trim().toLowerCase();
}

function mahsulotIdsi(item: QoldiqTanlovi) {
  return item.modification?.product?.id || item.productId || "";
}

// Backend qidiruvi bilan bir xil tartib: avval shtrix-kod/artikul to'liq mos, keyin nomi to'liq mos, keyin qolganlari.
// Bir xil darajada qoldig'i borlar, so'ng nom bo'yicha alifbo tartibida.
// `kategoriyaIdlari` berilsa faqat shu kategoriya mahsulotlari qoladi (yozuvsiz — kategoriyaning butun ro'yxati); skaner kodi
// (shtrix-kod/artikul aniq mos) esa kategoriyadan qat'i nazar topiladi — skanerlangan mahsulot filtr sababli yo'qolmasin.
export function qidirish(qatorlar: Qator[], soz: string, kategoriyaIdlari: ReadonlySet<string> | null = null) {
  const q = kichik(soz);
  if (!q && !kategoriyaIdlari) return [];
  const kodAniqMi = (qator: Qator) => {
    const mod = qator.item.modification;
    return Boolean(q) && (kichik(mod?.barcode) === q || kichik(mod?.article) === q);
  };
  return qatorlar
    .filter((qator) => {
      if (kategoriyaIdlari && !kategoriyaIdlari.has(mahsulotIdsi(qator.item)) && !kodAniqMi(qator)) return false;
      if (!q) return true;
      return [savatNomi(qator.item), qator.item.modification?.barcode, qator.item.modification?.article]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .map((qator) => {
      const mod = qator.item.modification;
      const nomAniq = Boolean(q) && [savatNomi(qator.item), mahsulotNomi(qator.item), mod?.name].some((nom) => kichik(nom) === q);
      return { qator, daraja: kodAniqMi(qator) ? 0 : nomAniq ? 1 : 2, nom: savatNomi(qator.item) };
    })
    .sort(
      (a, b) =>
        a.daraja - b.daraja ||
        Number(b.qator.qoldiq > 0) - Number(a.qator.qoldiq > 0) ||
        a.nom.localeCompare(b.nom, "uz") ||
        b.qator.qoldiq - a.qator.qoldiq
    )
    .slice(0, q ? KO_RSATILADIGAN_SONI : KATEGORIYA_RO_YXATI_SONI)
    .map((item) => ({ ...item.qator, daraja: item.daraja }));
}

// Qo'shimcha birlikning aniq mos shtrix-kodi. Javobdagi `unitId` ga ishoniladi, lekin birlik shtrix-kodi ma'lum bo'lsa u so'zga aniq teng bo'lishi kerak:
// qisman yozuv (masalan "pack") skaner kabi avtomatik qo'shilib ketmasin.
function aniqBirlik(item: QoldiqTanlovi, q: string) {
  const birlik = birlikTopish(item.birliklar, item.qidiruvBirligi) ?? shtrixBirligi(item.birliklar, q);
  return birlik && !birlik.asosiy && (!birlik.shtrix || kichik(birlik.shtrix) === q) ? birlik : undefined;
}

// Server javoblarini (har ombor bo'yicha) ro'yxatga yig'adi: tartib serverniki (aniq moslar birinchi), mahsulot ichida qoldig'i ko'p ombor oldin.
// Qoldig'i bor (yoki minusdagi) omborlar alohida qator. Hech qayerda qoldiq yo'q mahsulot bitta qator: yagona ombor bo'lsa shu ombor, aks holda ombor tanlanmagan.
export function serverQatorlari(natijalar: OmborQidiruvNatijasi[], soz: string) {
  const q = kichik(soz);
  const mahsulotlar = new Map<string, Qator[]>();
  for (const natija of natijalar) {
    for (const item of natija.qatorlar) {
      const qator = { kalit: tanlovKaliti(item.modificationId, natija.warehouseId), item, warehouseId: natija.warehouseId, warehouseName: natija.warehouseName, qoldiq: qoldiqMiqdori(item) };
      mahsulotlar.set(item.modificationId, [...(mahsulotlar.get(item.modificationId) ?? []), qator]);
    }
  }
  const omborlarSoni = natijalar.length;
  return Array.from(mahsulotlar.entries())
    .flatMap(([modificationId, qatorlar]) => {
      const qoldiqli = qatorlar.filter((qator) => qator.qoldiq !== 0).sort((a, b) => b.qoldiq - a.qoldiq);
      if (qoldiqli.length) return qoldiqli;
      return [omborlarSoni === 1 ? qatorlar[0] : { ...qatorlar[0], kalit: tanlovKaliti(modificationId, ""), warehouseId: "", warehouseName: "" }];
    })
    .map((qator) => {
      const mod = qator.item.modification;
      const birlik = aniqBirlik(qator.item, q);
      const kodAniq = kichik(mod?.barcode) === q || kichik(mod?.article) === q || Boolean(birlik);
      const nomAniq = [savatNomi(qator.item), mahsulotNomi(qator.item), mod?.name].some((nom) => kichik(nom) === q);
      return { ...qator, ...(birlik ? { birlik } : {}), daraja: kodAniq ? 0 : nomAniq ? 1 : 2 };
    })
    .sort((a, b) => a.daraja - b.daraja);
}

// Keyingi sahifa qatorlari ro'yxat oxiriga qo'shiladi (takrorlanmasdan).
export function qatorlarniUlash<T extends Pick<Qator, "kalit">>(oldingi: T[], yangi: T[]) {
  const bor = new Set(oldingi.map((qator) => qator.kalit));
  return [...oldingi, ...yangi.filter((qator) => !bor.has(qator.kalit))];
}
