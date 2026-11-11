// lib/valyuta.ts testi uchun: backendga chiqmaydigan valyuta API'si.
export const valyutaApi = {
  async rejimniOlish() {
    return { enabled: true, reportCurrency: 'UZS' };
  },
  async amaldagiKurs() {
    return { date: '2026-10-22', rate: 12100, rateDate: '2026-10-22' };
  },
};

export function rejimKodiniOlish(rejim) {
  const kod = typeof rejim?.mode === 'string' ? rejim.mode.trim().toUpperCase() : '';
  if (['DUAL', 'UZS_ONLY', 'USD_ONLY'].includes(kod)) return kod;
  return rejim?.enabled ? 'DUAL' : 'UZS_ONLY';
}

export function rejimValyutasi(rejim) {
  return rejim === 'UZS_ONLY' ? 'UZS' : rejim === 'USD_ONLY' ? 'USD' : null;
}

export function kursniSongaAylantirish(qiymat) {
  if (qiymat === null || qiymat === undefined || qiymat === '') return null;
  const son = Number(qiymat);
  return Number.isFinite(son) && son > 0 ? son : null;
}
