// "Yangi sotuv" → Mahsulotlar: umumiy chegirma (foizda yoki summada) — UI'siz, testlarda to'g'ridan-to'g'ri ishlaydi.
//  - Foiz: har bir qatorning CHEGIRMA maydoniga % rejimida yoziladi (qator `umumiyChegirmadan` belgisi bilan), keyin qo'shilgan qatorga
//    ham shu foiz qo'yiladi; tozalanganda faqat umumiy foiz qo'ygan chegirmalar olib tashlanadi.
//  - Summa: butun sotuvga beriladi; foyda hisobotida to'g'ri chiqishi uchun qatorlarga ularning summasiga mutanosib taqsimlanadi.
import { yaxlitHalfUp } from "./yaxlitlash.ts";

export type UmumiyChegirmaTuri = "foiz" | "sum";
export type UmumiyChegirma = { tur: UmumiyChegirmaTuri; qiymat: string };

type ChegirmaliQator = {
  modificationId: string;
  discount: string;
  discountTuri: "sum" | "foiz";
  discountFoiz: string;
  umumiyChegirmadan?: boolean;
};

const yaxlit2 = (son: number) => yaxlitHalfUp(son, 2);

/** Kiritilgan matndan son (bo'shliq, vergul bilan ham): noto'g'ri yoki manfiy — 0. */
export function chegirmaSoni(matn: string) {
  const son = Number(String(matn ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(son) && son > 0 ? son : 0;
}

/** Foiz 0–100 oralig'ida (2 xonagacha). */
export function foizChegarasi(foiz: number) {
  return yaxlit2(Math.min(Math.max(Number.isFinite(foiz) ? foiz : 0, 0), 100));
}

/** Faol umumiy foiz (foiz rejimida, 0 dan katta) yoki 0. */
export function faolUmumiyFoiz(umumiy: UmumiyChegirma) {
  return umumiy.tur === "foiz" ? foizChegarasi(chegirmaSoni(umumiy.qiymat)) : 0;
}

/** Faol umumiy summa (summa rejimida) yoki 0. */
export function faolUmumiySumma(umumiy: UmumiyChegirma) {
  return umumiy.tur === "sum" ? yaxlit2(chegirmaSoni(umumiy.qiymat)) : 0;
}

/** Bitta qatorga umumiy foizni qo'yadi (foiz 0 bo'lsa — qator o'zgarmaydi). */
export function qatorgaUmumiyFoiz<T extends ChegirmaliQator>(qator: T, foiz: number): T {
  if (!(foiz > 0)) return qator;
  return { ...qator, discountTuri: "foiz", discountFoiz: String(foizChegarasi(foiz)), discount: "", umumiyChegirmadan: true };
}

/** Umumiy foizni hamma qatorga qo'yadi (qo'lda o'zgartirilganlariga ham); foiz 0 — umumiy chegirma tozalanadi. */
export function umumiyFoizniQollash<T extends ChegirmaliQator>(qatorlar: readonly T[], foiz: number): T[] {
  if (!(foiz > 0)) return umumiyChegirmaniTozalash(qatorlar);
  return qatorlar.map((qator) => qatorgaUmumiyFoiz(qator, foiz));
}

/** Faqat umumiy foiz qo'ygan chegirmalarni olib tashlaydi; qo'lda kiritilgan chegirmalar qoladi. */
export function umumiyChegirmaniTozalash<T extends ChegirmaliQator>(qatorlar: readonly T[]): T[] {
  return qatorlar.map((qator) => {
    if (!qator.umumiyChegirmadan) return qator;
    const yangi: T = { ...qator, discountTuri: "sum", discount: "", discountFoiz: "" };
    delete yangi.umumiyChegirmadan;
    return yangi;
  });
}

/** Qator qo'lda o'zgartirildi: umumiy foiz belgisi olinadi (keyingi tozalash uni o'chirmaydi). */
export function qolBilanOzgardi<T extends ChegirmaliQator>(qator: T): T {
  if (!qator.umumiyChegirmadan) return qator;
  const yangi: T = { ...qator };
  delete yangi.umumiyChegirmadan;
  return yangi;
}

/** "Aralash": umumiy foiz bor-u, mahsulot tanlangan qatorlardan birortasining chegirmasi undan farq qiladi (qo'lda o'zgartirilgan). */
export function aralashmi(qatorlar: readonly ChegirmaliQator[], foiz: number) {
  if (!(foiz > 0)) return false;
  return qatorlar.some(
    (qator) => qator.modificationId && !(qator.umumiyChegirmadan && qator.discountTuri === "foiz" && chegirmaSoni(qator.discountFoiz) === foizChegarasi(foiz))
  );
}

/**
 * Umumiy summani qatorlarga ularning (o'z chegirmasidan keyingi) summasiga mutanosib taqsimlaydi; har bir ulush `xona` xonagacha
 * (so'mda 0 — butun so'm, dollarda 2 — sent) yaxlitlanadi, yaxlitlash qoldig'i oxirgi musbat qatorga qo'shiladi. Ulush qator summasidan oshmaydi; summa jamidan katta bo'lsa
 * jami miqdorida beriladi. 0 yoki manfiy summali qatorga ulush tushmaydi.
 */
export function summaUlushlari(qatorSummalari: readonly number[], summa: number, xona = 2): number[] {
  const yaxlit = (son: number) => yaxlitHalfUp(son, xona);
  const summalar = qatorSummalari.map((son) => (Number.isFinite(son) && son > 0 ? son : 0));
  const jami = summalar.reduce((a, b) => a + b, 0);
  const beriladi = yaxlit(Math.min(Math.max(summa, 0), jami));
  if (!(beriladi > 0) || !(jami > 0)) return summalar.map(() => 0);
  const ulushlar = summalar.map((son) => Math.min(yaxlit((beriladi * son) / jami), son));
  const oxirgi = summalar.reduce((joy, son, i) => (son > 0 ? i : joy), -1);
  const farq = yaxlit2(beriladi - ulushlar.reduce((a, b) => a + b, 0));
  if (oxirgi >= 0 && farq !== 0) ulushlar[oxirgi] = yaxlit2(Math.min(Math.max(ulushlar[oxirgi] + farq, 0), summalar[oxirgi]));
  return ulushlar.map((ulush) => yaxlit2(ulush));
}

/** Qatorning o'z chegirmasi + umumiy summadan ulushi (2 xonagacha: 88 235.29, suzuvchi nuqta qoldig'isiz). */
export function chegirmaUlushBilan(chegirma: number, ulush: number) {
  return ulush > 0 ? yaxlit2(chegirma + ulush) : chegirma;
}

/** Bir dona sof narxi (chegirmalardan keyin) tannarxdan pastmi; tannarx noma'lum (0) bo'lsa — yo'q. */
export function tannarxdanArzonmi(p: { miqdor: number; birNarx: number; chegirma: number; tannarx: number }) {
  if (!(p.tannarx > 0) || !(p.miqdor > 0)) return false;
  const sof = (p.miqdor * Math.max(p.birNarx, 0) - Math.max(p.chegirma, 0)) / p.miqdor;
  return yaxlit2(sof) < yaxlit2(p.tannarx);
}
