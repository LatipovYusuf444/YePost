// "21,777,000 so'm" → katta raqam + kichik birlik. Birlik topilmasa (masalan "$1,716" yoki "5") qiymat o'zgarishsiz qoladi.
export function summaniAjratish(value: string) {
  const mos = /^(.*\d)\s+(\D+)$/.exec(value);
  return mos ? { raqam: mos[1], birlik: mos[2] } : { raqam: value, birlik: "" };
}

// "2026-09-08" → "08.09.2026". Boshqa ko'rinishdagi matn o'zgarishsiz qaytariladi.
export function sanaMatni(value: string) {
  const mos = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return mos ? `${mos[3]}.${mos[2]}.${mos[1]}` : value;
}
