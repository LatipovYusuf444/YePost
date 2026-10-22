// lib/valyuta.ts testi uchun: backendga chiqmaydigan valyuta API'si.
export const valyutaApi = {
  async rejimniOlish() {
    return { enabled: true, reportCurrency: 'UZS' };
  },
  async amaldagiKurs() {
    return { date: '2026-10-22', rate: 12100, rateDate: '2026-10-22' };
  },
};

export function kursniSongaAylantirish(qiymat) {
  if (qiymat === null || qiymat === undefined || qiymat === '') return null;
  const son = Number(qiymat);
  return Number.isFinite(son) && son > 0 ? son : null;
}
