import { pulMatni } from "@/lib/valyuta";
import type { MahsulotModifikatsiyasi, OmborQoldigi } from "@/types/ombor";

export function sana(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function pul(value?: number) {
  return pulMatni(value);
}

export function modificationNomi(modification?: MahsulotModifikatsiyasi) {
  const productName = modification?.product?.name;
  const variantName = modification?.name;
  if (productName && variantName && productName !== variantName) {
    return `${productName} / ${variantName}`;
  }
  return productName ?? variantName ?? modification?.barcode ?? "Noma'lum";
}

// Yuklangan ro'yxatdan mahsulot qidirish. Tartib backenddagi GET /catalog/modifications/search bilan bir xil:
// avval shtrix-kod yoki artikul to'liq mos kelgani, keyin nomi to'liq mos kelgani, keyin qolganlari alifbo bo'yicha.
// Enter birinchi natijani qo'shgani uchun "3-6-35" yozilganda "3-6-350" emas, aynan "3-6-35" birinchi turishi shart.
// Qidiruv matni bo'sh bo'lsa ro'yxat o'zgarishsiz qaytariladi.
export function mahsulotQidiruvi(qoldiqlar: OmborQoldigi[], qidiruv: string): OmborQoldigi[] {
  const q = qidiruv.trim().toLowerCase();
  if (!q) return qoldiqlar;
  const kichik = (qiymat?: string | null) => (qiymat ?? "").trim().toLowerCase();
  const natija: Array<{ qoldiq: OmborQoldigi; daraja: number; nom: string }> = [];
  for (const qoldiq of qoldiqlar) {
    const modifikatsiya = qoldiq.modification;
    const nom = modificationNomi(modifikatsiya);
    const barcode = kichik(modifikatsiya?.barcode);
    const artikul = kichik(modifikatsiya?.article);
    if (!nom.toLowerCase().includes(q) && !barcode.includes(q) && !artikul.includes(q)) continue;
    const nomAniq = [nom, modifikatsiya?.product?.name, modifikatsiya?.name].some((qiymat) => kichik(qiymat) === q);
    natija.push({ qoldiq, daraja: barcode === q || artikul === q ? 0 : nomAniq ? 1 : 2, nom });
  }
  return natija
    .sort((a, b) => a.daraja - b.daraja || a.nom.localeCompare(b.nom, "uz", { sensitivity: "base" }))
    .map((item) => item.qoldiq);
}

export function qoldiqMiqdori(qoldiq: OmborQoldigi) {
  const qiymat = qoldiq.availableQuantity ?? qoldiq.quantity ?? qoldiq.balance ?? 0;
  const miqdor = Number(qiymat);
  return Number.isFinite(miqdor) && miqdor >= 0 ? miqdor : 0;
}

export function hujjatRaqami(hujjat: { id?: string; documentNumber?: string; docNumber?: string; number?: string }) {
  return (
    hujjat.documentNumber ||
    hujjat.docNumber ||
    hujjat.number ||
    hujjat.id?.slice(0, 8).toUpperCase() ||
    "Hujjat"
  );
}

export function holat(value?: string) {
  const status = String(value ?? "DRAFT").toUpperCase();
  const labels: Record<string, string> = {
    DRAFT: "Qoralama",
    CONFIRMED: "Tasdiqlangan",
    CANCELLED: "Bekor qilingan",
    CANCELED: "Bekor qilingan",
    SENT: "Jo'natilgan",
    RECEIVED: "Qabul qilingan",
  };
  return labels[status] ?? status;
}
