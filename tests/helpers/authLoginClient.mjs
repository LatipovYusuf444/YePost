// authStore testi uchun: backend login/chiqish so'rovlari o'rniga.
export const holat = { tokenlar: null, chiqishlar: 0 };
export async function login() { return holat.tokenlar; }
export async function backenddanChiqish() { holat.chiqishlar += 1; }
export function loginTokenlariniAjratish(tokens) { return tokens; }
