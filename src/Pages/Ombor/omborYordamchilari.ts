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
export function modifikatsiyaQidiruvi<T>(
  royxat: T[],
  qidiruv: string,
  modifikatsiyasi: (element: T) => MahsulotModifikatsiyasi | undefined
): T[] {
  const q = qidiruv.trim().toLowerCase();
  if (!q) return royxat;
  const kichik = (qiymat?: string | null) => (qiymat ?? "").trim().toLowerCase();
  const natija: Array<{ element: T; daraja: number; nom: string }> = [];
  for (const element of royxat) {
    const modifikatsiya = modifikatsiyasi(element);
    const nom = modificationNomi(modifikatsiya);
    const barcode = kichik(modifikatsiya?.barcode);
    const artikul = kichik(modifikatsiya?.article);
    if (!nom.toLowerCase().includes(q) && !barcode.includes(q) && !artikul.includes(q)) continue;
    const nomAniq = [nom, modifikatsiya?.product?.name, modifikatsiya?.name].some((qiymat) => kichik(qiymat) === q);
    natija.push({ element, daraja: barcode === q || artikul === q ? 0 : nomAniq ? 1 : 2, nom });
  }
  return natija
    .sort((a, b) => a.daraja - b.daraja || a.nom.localeCompare(b.nom, "uz", { sensitivity: "base" }))
    .map((item) => item.element);
}

export function mahsulotQidiruvi(qoldiqlar: OmborQoldigi[], qidiruv: string): OmborQoldigi[] {
  return modifikatsiyaQidiruvi(qoldiqlar, qidiruv, (qoldiq) => qoldiq.modification);
}

// Shtrix-kod yoki artikul to'liq mos kelgan modifikatsiyalar (skaner uchun). Katta-kichik harfga qaramaydi.
export function kodBilanTopish<T>(
  royxat: T[],
  kod: string,
  modifikatsiyasi: (element: T) => MahsulotModifikatsiyasi | undefined
): T[] {
  const q = kod.trim().toLowerCase();
  if (!q) return [];
  return royxat.filter((element) => {
    const modifikatsiya = modifikatsiyasi(element);
    return (
      (modifikatsiya?.barcode ?? "").trim().toLowerCase() === q ||
      (modifikatsiya?.article ?? "").trim().toLowerCase() === q
    );
  });
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
