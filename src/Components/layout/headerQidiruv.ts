import type { QoldiqTanlovi } from "../../types/savdo.ts";
import { mahsulotNomi, savatNomi } from "./posMahsulotlari.ts";

// Headerdagi tezkor qidiruvning toza qismi (UI'siz, testlanadi): qator turi va qidirish/saralash qoidasi.

export type Qator = {
  kalit: string;
  item: QoldiqTanlovi;
  warehouseId: string;
  warehouseName: string;
  qoldiq: number;
};

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
