import type { QollabQuvvatlashXabari } from "@/types/support";

// Qo'llab-quvvatlash chatining umumiy yordamchi funksiyalari.

function kunBoshi(sana: Date) {
  return new Date(sana.getFullYear(), sana.getMonth(), sana.getDate()).getTime();
}

export function vaqtMatni(iso: string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return "";
  return `${String(sana.getHours()).padStart(2, "0")}:${String(sana.getMinutes()).padStart(2, "0")}`;
}

export function sanaSarlavhasi(iso: string, t: (key: string) => string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return "";
  const bugun = kunBoshi(new Date());
  const kun = kunBoshi(sana);
  if (kun === bugun) return t("today");
  if (kun === bugun - 86400000) return t("yesterday");
  return sana.toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });
}

function sanaSarlavhasiKaliti(iso: string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return iso;
  return String(kunBoshi(sana));
}

export type Guruh = { sana: string; xabarlar: QollabQuvvatlashXabari[][] };

// Ketma-ket kelgan bir xil yo'nalishdagi xabarlarni kun va yo'nalish bo'yicha guruhlaydi.
export function guruhlash(xabarlar: QollabQuvvatlashXabari[]): Guruh[] {
  const kunlar: Guruh[] = [];

  for (const xabar of xabarlar) {
    const sanaKaliti = sanaSarlavhasiKaliti(xabar.createdAt);
    let kun = kunlar.at(-1);
    if (!kun || kun.sana !== sanaKaliti) {
      kun = { sana: sanaKaliti, xabarlar: [] };
      kunlar.push(kun);
    }
    const oxirgiGuruh = kun.xabarlar.at(-1);
    if (oxirgiGuruh && oxirgiGuruh[0].direction === xabar.direction) {
      oxirgiGuruh.push(xabar);
    } else {
      kun.xabarlar.push([xabar]);
    }
  }

  return kunlar;
}
