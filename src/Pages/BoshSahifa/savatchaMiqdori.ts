/** Qo'lda yozilgan miqdor: vergul/nuqta qabul qilinadi, qoldiqdan ortig'i kesiladi. */
export function savatchaMiqdoriniOqish(matn: string, qoldiq: number, nolMumkin = false) {
  if (!/^\d*([.,]\d*)?$/.test(matn) || !Number.isFinite(qoldiq) || qoldiq <= 0) return null;
  const kiritilgan = Number(matn.replace(",", "."));
  if (nolMumkin && matn !== "" && kiritilgan === 0) return { matn, soni: 0 };
  if (!(kiritilgan > 0)) return { matn, soni: undefined };
  const soni = Math.min(kiritilgan, qoldiq);
  return { soni, matn: kiritilgan > qoldiq ? String(soni) : matn };
}
