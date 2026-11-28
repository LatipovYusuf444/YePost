// Tovar qidiruvi (backend bilan bir xil qoida): har bir so'z alohida, istalgan tartibda izlanadi.
// "akfix 705", "705 kley", "kley akfix" — hammasi "AKFIX MDF 705 KLEY 200 gr" ni topadi; bitta so'z avvalgidek (nom ichidan) izlanadi.
// Katta-kichik harf farqi yo'q; o'zbekcha apostroflar (ʻ ʼ ‘ ’ ` ´) bir xil hisoblanadi.

const APOSTROFLAR = /[ʻʼ‘’`´]/g;

export function qidiruvNormallash(matn: string | null | undefined): string {
  return String(matn ?? "").toLowerCase().replace(APOSTROFLAR, "'").replace(/\s+/g, " ").trim();
}

/** Qidiruv so'zlari (bo'sh joylar bo'yicha). Bo'sh qidiruv — bo'sh ro'yxat. */
export function qidiruvSozlari(qidiruv: string | null | undefined): string[] {
  const toza = qidiruvNormallash(qidiruv);
  return toza ? toza.split(" ") : [];
}

/**
 * Har bir qidiruv so'zi matnda (yoki maydonlar yig'indisida) bormi. Bo'sh qidiruv — true.
 * `matn` massiv bo'lsa, maydonlar (nom, shtrix-kod, artikul...) bitta matn sifatida qaraladi: so'zlar turli maydonlarda bo'lishi mumkin.
 */
export function sozlarMos(matn: string | null | undefined | ReadonlyArray<unknown>, qidiruv: string | null | undefined): boolean {
  const sozlar = qidiruvSozlari(qidiruv);
  if (sozlar.length === 0) return true;
  const manba = qidiruvNormallash(
    Array.isArray(matn)
      ? matn.filter((qiymat) => qiymat !== null && qiymat !== undefined && qiymat !== "").map(String).join(" ")
      : (matn as string | null | undefined)
  );
  return sozlar.every((soz) => manba.includes(soz));
}
